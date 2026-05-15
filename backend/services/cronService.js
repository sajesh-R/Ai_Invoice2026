const cron = require('node-cron');
const { generateInvoicePDF } = require('./pdfService');
const { uploadPDF } = require('../config/cloudinary');
const { sendInvoiceEmail, getInvoiceEmailBody } = require('./emailService');
const fs = require('fs');

const RecurringInvoice = require('../models/RecurringInvoice');
const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const Client = require('../models/Client');
const User = require('../models/User');

/**
 * Utility to calculate the next date based on billing cycle
 * @param {string} dateStr - Current date in ISO or YYYY-MM-DD
 * @param {string} billingCycle - Weekly, Monthly, Quarterly, Annually
 * @returns {string} - YYYY-MM-DD format
 */
const calculateNextBillingDate = (dateStr, billingCycle) => {
  const date = new Date(dateStr);
  switch (billingCycle) {
    case 'Weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'Monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'Quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'Annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1); // Default Monthly
  }
  return date.toISOString().split('T')[0];
};

/**
 * Core Logic: Auto-generate invoices for active recurring schedules whose next_invoice_date is today or in the past
 */
const processRecurringInvoices = async () => {
  console.log("⏰ Running Scheduler: Processing Recurring Invoices...");
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDate = new Date(todayStr);

  try {
    // 1. Fetch active recurring schedules that are due
    const schedules = await RecurringInvoice.find({
      status: 'Active',
      next_invoice_date: { $lte: todayDate }
    }).populate('client_id').populate('user_id');

    console.log(`Found ${schedules.length} recurring invoice schedule(s) to process.`);

    for (const ri of schedules) {
      if (!ri.client_id || !ri.user_id) continue;
      
      console.log(`Processing schedule ID ${ri._id} for Client "${ri.client_id.name}"...`);

      // 2. Generate a sequential invoice number
      const latestInvoice = await Invoice.findOne().sort({ _id: -1 });
      let nextNumberSeq = 1;
      if (latestInvoice && latestInvoice.invoice_number) {
        const matches = latestInvoice.invoice_number.match(/\d+$/);
        if (matches) {
          nextNumberSeq = parseInt(matches[0]) + 1;
        }
      }
      const newInvoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNumberSeq).padStart(4, '0')}`;

      // 3. Setup Invoice details (Retainer Fees)
      const description = `Retainer Service Fee - ${ri.billing_cycle} Cycle`;
      const quantity = 1;
      const rate = 1500.00; // Standard demo rate
      const gstPercentage = 18.00;
      const taxAmount = (rate * quantity) * (gstPercentage / 100);
      const totalAmount = (rate * quantity) + taxAmount;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      // 4. Create Invoice Record
      const newInvoice = new Invoice({
        user_id: ri.user_id._id,
        invoice_number: newInvoiceNumber,
        client_id: ri.client_id._id,
        total_amount: totalAmount,
        gst_vat_amount: taxAmount,
        paid_amount: 0.00,
        balance_amount: totalAmount,
        status: 'Unpaid',
        due_date: dueDate
      });
      await newInvoice.save();

      // 5. Create Invoice Item Record
      const invoiceItem = new InvoiceItem({
        invoice_id: newInvoice._id,
        description,
        quantity,
        rate,
        gst_vat_percentage: gstPercentage,
        amount: rate * quantity
      });
      await invoiceItem.save();

      const invoiceItems = [invoiceItem.toObject()];
      const client = ri.client_id.toObject();
      const user = ri.user_id.toObject();

      // 6. Generate PDF
      const pdfLocalPath = await generateInvoicePDF(newInvoice.toObject(), invoiceItems, client, user);
      
      // 7. Store PDF Reference
      const pdfPublicUrl = await uploadPDF(pdfLocalPath);
      newInvoice.pdf_path = pdfPublicUrl;
      await newInvoice.save();

      // 8. One-Click Email Delivery
      const emailSubject = `New Recurring Invoice ${newInvoice.invoice_number} from ${user.name}`;
      const emailBody = getInvoiceEmailBody(newInvoice.toObject(), client, user);
      await sendInvoiceEmail(client.email, client.name, emailSubject, emailBody, pdfLocalPath);

      // 9. Update Recurring Invoice Schedule Dates
      const nextDateStr = calculateNextBillingDate(ri.next_invoice_date, ri.billing_cycle);
      ri.next_invoice_date = new Date(nextDateStr);
      ri.last_generated_date = todayDate;
      await ri.save();

      // Cleanup temp local PDF
      if (fs.existsSync(pdfLocalPath)) {
        try { fs.unlinkSync(pdfLocalPath); } catch (e) {}
      }

      console.log(`Schedule ID ${ri._id} processed successfully. Next generation date: ${nextDateStr}`);
    }
  } catch (error) {
    console.error("Failed to run recurring invoices job:", error.message);
  }
};

/**
 * Core Logic: Auto-remind clients with overdue invoices (due_date in the past and unpaid)
 */
const processOverdueReminders = async () => {
  console.log("⏰ Running Scheduler: Processing Overdue Reminders...");
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDate = new Date(todayStr);

  try {
    // 1. Mark unpaid and partially paid invoices past due date as Overdue
    const updateResult = await Invoice.updateMany(
      { 
        status: { $in: ['Unpaid', 'Partially Paid'] },
        due_date: { $lt: todayDate }
      },
      { $set: { status: 'Overdue' } }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log(`Updated ${updateResult.modifiedCount} invoice(s) status to "Overdue".`);
    }

    // 2. Find overdue invoices and email reminders
    const overdueInvoices = await Invoice.find({ status: 'Overdue' })
      .populate('client_id')
      .populate('user_id');
      
    console.log(`Found ${overdueInvoices.length} overdue invoice(s) to send reminders for.`);

    for (const inv of overdueInvoices) {
      if (!inv.client_id || !inv.user_id) continue;

      const client = inv.client_id;
      const user = inv.user_id;

      console.log(`Sending reminder for invoice ${inv.invoice_number} to ${client.email}...`);

      const emailSubject = `⚠️ OVERDUE PAYMENT REMINDER: Invoice ${inv.invoice_number}`;
      const emailBody = `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dc2626; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #dc2626; padding: 25px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Overdue Payment Reminder</h1>
            <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Invoice ${inv.invoice_number}</p>
          </div>
          <div style="padding: 20px 30px;">
            <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${client.name}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              This is a friendly but urgent notification that payment for invoice <strong>${inv.invoice_number}</strong> is now overdue. 
              The original due date was <strong>${new Date(inv.due_date).toLocaleDateString()}</strong>.
            </p>
            
            <div style="background-color: #fef2f2; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #fee2e2;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #991b1b; font-weight: bold;">Overdue Amount:</td>
                  <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #b91c1c; font-size: 18px;">₹${parseFloat(inv.balance_amount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #475569;">Total Invoiced:</td>
                  <td style="padding: 5px 0; text-align: right; font-weight: medium; color: #1e293b;">₹${parseFloat(inv.total_amount).toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Please arrange for the remaining balance to be cleared as soon as possible. If you have already made this payment, please disregard this message or send us a transaction confirmation.
            </p>
            
            ${inv.pdf_path ? `
            <div style="text-align: center; margin: 25px 0;">
              <a href="${inv.pdf_path}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                Download Invoice PDF
              </a>
            </div>
            ` : ''}

            <p style="font-size: 14px; color: #475569; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
              Thank you,<br>
              <strong>${user.name}</strong><br>
              <span style="font-size: 12px; color: #94a3b8;">${user.email}</span>
            </p>
          </div>
        </div>
      `;

      await sendInvoiceEmail(client.email, client.name, emailSubject, emailBody);
    }
  } catch (error) {
    console.error("Failed to run overdue reminders job:", error.message);
  }
};

/**
 * Initialize Node Cron scheduler jobs
 */
const startScheduler = () => {
  console.log("Scheduler initialization: Loading automated tasks...");
  
  // Job 1: Process Recurring Invoices daily at midnight
  cron.schedule('0 0 * * *', async () => {
    await processRecurringInvoices();
  });

  // Job 2: Process Overdue Reminders daily at midnight
  cron.schedule('0 0 * * *', async () => {
    await processOverdueReminders();
  });

  console.log("Scheduler running: Registered automated jobs for midnight checks.");
};

module.exports = {
  startScheduler,
  processRecurringInvoices,
  processOverdueReminders
};
