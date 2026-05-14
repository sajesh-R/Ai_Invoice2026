const cron = require('node-cron');
const db = require('../config/db');
const { generateInvoicePDF } = require('./pdfService');
const { uploadPDF } = require('../config/cloudinary');
const { sendInvoiceEmail, getInvoiceEmailBody } = require('./emailService');

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

  try {
    // 1. Fetch active recurring schedules that are due
    const recurringQuery = `
      SELECT ri.*, c.name as client_name, c.email as client_email, c.address as client_address, c.phone as client_phone,
             u.name as user_name, u.email as user_email
      FROM recurring_invoices ri
      JOIN clients c ON ri.client_id = c.id
      JOIN users u ON ri.user_id = u.id
      WHERE ri.status = 'Active' AND ri.next_invoice_date <= $1
    `;
    const schedules = await db.query(recurringQuery, [todayStr]);
    console.log(`Found ${schedules.rowCount} recurring invoice schedule(s) to process.`);

    for (const ri of schedules.rows) {
      console.log(`Processing schedule ID ${ri.id} for Client "${ri.client_name}"...`);

      // 2. Generate a sequential invoice number
      // Let's find the latest invoice number to increment
      const countRes = await db.query("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1");
      let nextNumberSeq = 1;
      if (countRes.rowCount > 0) {
        const lastNum = countRes.rows[0].invoice_number;
        const matches = lastNum.match(/\d+$/);
        if (matches) {
          nextNumberSeq = parseInt(matches[0]) + 1;
        }
      }
      const newInvoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNumberSeq).padStart(4, '0')}`;

      // 3. Setup Invoice details (Retainer Fees)
      const description = `Retainer Service Fee - ${ri.billing_cycle} Cycle`;
      const quantity = 1;
      const rate = 1500.00; // Standard demo rate for retainers, or we can look up past client invoices!
      const gstPercentage = 18.00; // Standard 18% tax
      const taxAmount = (rate * quantity) * (gstPercentage / 100);
      const totalAmount = (rate * quantity) + taxAmount;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 14-day payment terms
      const dueDateStr = dueDate.toISOString().split('T')[0];

      // 4. Create Invoice Record
      const insertInvoiceQuery = `
        INSERT INTO invoices (user_id, invoice_number, client_id, total_amount, gst_vat_amount, paid_amount, balance_amount, status, due_date)
        VALUES ($1, $2, $3, $4, $5, 0.00, $4, 'Unpaid', $6)
        RETURNING *
      `;
      const invoiceRes = await db.query(insertInvoiceQuery, [
        ri.user_id,
        newInvoiceNumber,
        ri.client_id,
        totalAmount,
        taxAmount,
        dueDateStr
      ]);
      const newInvoice = invoiceRes.rows[0];

      // 5. Create Invoice Item Record
      const insertItemQuery = `
        INSERT INTO invoice_items (invoice_id, description, quantity, rate, gst_vat_percentage, amount)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const itemRes = await db.query(insertItemQuery, [
        newInvoice.id,
        description,
        quantity,
        rate,
        gstPercentage,
        rate * quantity
      ]);
      const invoiceItems = itemRes.rows;

      // Prepare records for PDF generator
      const client = { name: ri.client_name, email: ri.client_email, address: ri.client_address, phone: ri.client_phone };
      const user = { name: ri.user_name, email: ri.user_email };

      // 6. Generate PDF
      const pdfLocalPath = await generateInvoicePDF(newInvoice, invoiceItems, client, user);
      
      // 7. Store PDF Reference (Cloudinary or local)
      const pdfPublicUrl = await uploadPDF(pdfLocalPath);
      await db.query("UPDATE invoices SET pdf_path = $1 WHERE id = $2", [pdfPublicUrl, newInvoice.id]);
      newInvoice.pdf_path = pdfPublicUrl;

      // 8. One-Click Email Delivery
      const emailSubject = `New Recurring Invoice ${newInvoice.invoice_number} from ${user.name}`;
      const emailBody = getInvoiceEmailBody(newInvoice, client, user);
      await sendInvoiceEmail(client.email, client.name, emailSubject, emailBody, pdfLocalPath);

      // 9. Update Recurring Invoice Schedule Dates
      const nextDateStr = calculateNextBillingDate(ri.next_invoice_date, ri.billing_cycle);
      await db.query(
        "UPDATE recurring_invoices SET next_invoice_date = $1, last_generated_date = $2 WHERE id = $3",
        [nextDateStr, todayStr, ri.id]
      );

      // Cleanup temp local PDF
      if (fs.existsSync(pdfLocalPath)) {
        try { fs.unlinkSync(pdfLocalPath); } catch (e) {}
      }

      console.log(`Schedule ID ${ri.id} processed successfully. Next generation date: ${nextDateStr}`);
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

  try {
    // 1. Mark unpaid and partially paid invoices past due date as Overdue
    const updateStatusQuery = `
      UPDATE invoices
      SET status = 'Overdue'
      WHERE status IN ('Unpaid', 'Partially Paid') AND due_date < $1
    `;
    const statusUpdateRes = await db.query(updateStatusQuery, [todayStr]);
    if (statusUpdateRes.rowCount > 0) {
      console.log(`Updated ${statusUpdateRes.rowCount} invoice(s) status to "Overdue".`);
    }

    // 2. Find overdue invoices and email reminders
    const overdueQuery = `
      SELECT i.*, c.name as client_name, c.email as client_email,
             u.name as user_name, u.email as user_email
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      JOIN users u ON i.user_id = u.id
      WHERE i.status = 'Overdue'
    `;
    const overdueInvoices = await db.query(overdueQuery);
    console.log(`Found ${overdueInvoices.rowCount} overdue invoice(s) to send reminders for.`);

    for (const inv of overdueInvoices.rows) {
      console.log(`Sending reminder for invoice ${inv.invoice_number} to ${inv.client_email}...`);

      const emailSubject = `⚠️ OVERDUE PAYMENT REMINDER: Invoice ${inv.invoice_number}`;
      const emailBody = `
        <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dc2626; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #dc2626; padding: 25px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Overdue Payment Reminder</h1>
            <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Invoice ${inv.invoice_number}</p>
          </div>
          <div style="padding: 20px 30px;">
            <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${inv.client_name}</strong>,</p>
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
              <strong>${inv.user_name}</strong><br>
              <span style="font-size: 12px; color: #94a3b8;">${inv.user_email}</span>
            </p>
          </div>
        </div>
      `;

      await sendInvoiceEmail(inv.client_email, inv.client_name, emailSubject, emailBody);
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
