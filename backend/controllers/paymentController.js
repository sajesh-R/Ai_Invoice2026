const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');

const addPayment = async (req, res) => {
  const { invoice_id, payment_amount } = req.body;
  const userId = req.user.id;

  const paymentValue = parseFloat(payment_amount);

  if (!invoice_id || isNaN(paymentValue) || paymentValue <= 0) {
    return res.status(400).json({ message: 'A valid Invoice ID and positive Payment Amount are required.' });
  }

  try {
    // 1. Fetch and validate invoice
    const invoice = await Invoice.findOne({ _id: invoice_id, user_id: userId });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found or unauthorized.' });
    }

    const totalAmount = invoice.total_amount;
    const oldPaidAmount = invoice.paid_amount;
    const currentBalance = invoice.balance_amount;

    if (currentBalance <= 0) {
      return res.status(400).json({ message: 'This invoice has already been fully paid!' });
    }

    if (paymentValue > currentBalance) {
      return res.status(400).json({ 
        message: `Payment amount ($${paymentValue.toFixed(2)}) cannot exceed the remaining balance ($${currentBalance.toFixed(2)}).` 
      });
    }

    // 2. Insert Payment Record
    const payment = new Payment({
      invoice_id,
      payment_amount: paymentValue
    });
    await payment.save();

    // 3. Calculate new totals
    const newPaidAmount = oldPaidAmount + paymentValue;
    const newBalanceAmount = totalAmount - newPaidAmount;
    
    // Status resolution
    let newStatus = 'Partially Paid';
    if (newBalanceAmount <= 0.01) { // Floating point correction
      newStatus = 'Paid';
    }

    // 4. Update Invoice totals & status
    invoice.paid_amount = newPaidAmount;
    invoice.balance_amount = newBalanceAmount;
    invoice.status = newStatus;
    await invoice.save();

    // 5. Trigger PDF regeneration to reflect the new payment details
    try {
      // Run it in the background as an optimization
      regeneratePDFInBackground(invoice_id, userId);
    } catch (bgErr) {
      console.error(`Background PDF update failed: ${bgErr.message}`);
    }

    const paymentData = payment.toObject();
    paymentData.id = paymentData._id;

    const invoiceData = invoice.toObject();
    invoiceData.id = invoiceData._id;

    return res.status(201).json({
      message: 'Payment recorded successfully!',
      payment: paymentData,
      invoice: invoiceData
    });
  } catch (error) {
    console.error(`Add Payment Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error while tracking payment.' });
  }
};

/**
 * Helper to trigger PDF regeneration in the background
 */
const regeneratePDFInBackground = async (invoiceId, userId) => {
  const { generateInvoicePDF } = require('../services/pdfService');
  const { uploadPDF } = require('../config/cloudinary');
  const fs = require('fs');
  const User = require('../models/User');
  const InvoiceItem = require('../models/InvoiceItem');

  try {
    const invoice = await Invoice.findOne({ _id: invoiceId, user_id: userId });
    const client = await Client.findById(invoice.client_id);
    const user = await User.findById(userId).select('name email');
    const items = await InvoiceItem.find({ invoice_id: invoiceId });

    const pdfLocalPath = await generateInvoicePDF(invoice, items, client, user);
    const pdfUrl = await uploadPDF(pdfLocalPath);

    invoice.pdf_path = pdfUrl;
    await invoice.save();
    
    if (pdfLocalPath && fs.existsSync(pdfLocalPath)) {
      try { fs.unlinkSync(pdfLocalPath); } catch (e) {}
    }
    console.log(`Background PDF regeneration successfully completed for Invoice ID ${invoiceId}`);
  } catch (err) {
    console.error(`Background PDF regeneration failure: ${err.message}`);
  }
};

const getPayments = async (req, res) => {
  const userId = req.user.id;

  try {
    // We need to fetch all invoices for the user, then get their IDs, and find payments for those invoices
    const userInvoices = await Invoice.find({ user_id: userId }).populate('client_id');
    const invoiceMap = {};
    const invoiceIds = userInvoices.map(inv => {
      invoiceMap[inv._id.toString()] = inv;
      return inv._id;
    });

    const payments = await Payment.find({ invoice_id: { $in: invoiceIds } }).sort({ _id: -1 });

    const formattedPayments = payments.map(payment => {
      const p = payment.toObject();
      const inv = invoiceMap[payment.invoice_id.toString()];
      p.id = p._id;
      p.invoice_number = inv ? inv.invoice_number : 'Unknown';
      p.client_name = (inv && inv.client_id) ? inv.client_id.name : 'Unknown';
      return p;
    });

    return res.json({ payments: formattedPayments });
  } catch (error) {
    console.error(`Get Payments Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error fetching billing logs.' });
  }
};

module.exports = {
  addPayment,
  getPayments
};
