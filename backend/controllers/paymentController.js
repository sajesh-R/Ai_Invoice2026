const db = require('../config/db');

const addPayment = async (req, res) => {
  const { invoice_id, payment_amount } = req.body;
  const userId = req.user.id;

  const paymentValue = parseFloat(payment_amount);

  if (!invoice_id || isNaN(paymentValue) || paymentValue <= 0) {
    return res.status(400).json({ message: 'A valid Invoice ID and positive Payment Amount are required.' });
  }

  try {
    // 1. Fetch and validate invoice
    const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1 AND user_id = $2';
    const invoiceRes = await db.query(invoiceQuery, [invoice_id, userId]);

    if (invoiceRes.rowCount === 0) {
      return res.status(404).json({ message: 'Invoice not found or unauthorized.' });
    }

    const invoice = invoiceRes.rows[0];
    const totalAmount = parseFloat(invoice.total_amount);
    const oldPaidAmount = parseFloat(invoice.paid_amount);
    const currentBalance = parseFloat(invoice.balance_amount);

    if (currentBalance <= 0) {
      return res.status(400).json({ message: 'This invoice has already been fully paid!' });
    }

    if (paymentValue > currentBalance) {
      return res.status(400).json({ 
        message: `Payment amount ($${paymentValue.toFixed(2)}) cannot exceed the remaining balance ($${currentBalance.toFixed(2)}).` 
      });
    }

    // 2. Insert Payment Record
    const insertPaymentQuery = `
      INSERT INTO payments (invoice_id, payment_amount)
      VALUES ($1, $2)
      RETURNING *
    `;
    const paymentResult = await db.query(insertPaymentQuery, [invoice_id, paymentValue]);
    const createdPayment = paymentResult.rows[0];

    // 3. Calculate new totals
    const newPaidAmount = oldPaidAmount + paymentValue;
    const newBalanceAmount = totalAmount - newPaidAmount;
    
    // Status resolution
    let newStatus = 'Partially Paid';
    if (newBalanceAmount <= 0.01) { // Floating point correction
      newStatus = 'Paid';
    }

    // 4. Update Invoice totals & status
    const updateInvoiceQuery = `
      UPDATE invoices
      SET paid_amount = $1, balance_amount = $2, status = $3
      WHERE id = $4
      RETURNING *
    `;
    const updatedInvoiceResult = await db.query(updateInvoiceQuery, [
      newPaidAmount,
      newBalanceAmount,
      newStatus,
      invoice_id
    ]);
    const updatedInvoice = updatedInvoiceResult.rows[0];

    // 5. Trigger PDF regeneration to reflect the new payment details
    try {
      // Run it in the background as an optimization
      regeneratePDFInBackground(invoice_id, userId);
    } catch (bgErr) {
      console.error(`Background PDF update failed: ${bgErr.message}`);
    }

    return res.status(201).json({
      message: 'Payment recorded successfully!',
      payment: createdPayment,
      invoice: updatedInvoice
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

  try {
    const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1 AND user_id = $2';
    const invoiceRes = await db.query(invoiceQuery, [invoiceId, userId]);
    const invoice = invoiceRes.rows[0];

    const clientQuery = 'SELECT * FROM clients WHERE id = $1';
    const clientRes = await db.query(clientQuery, [invoice.client_id]);
    const client = clientRes.rows[0];

    const userQuery = 'SELECT name, email FROM users WHERE id = $1';
    const userRes = await db.query(userQuery, [userId]);
    const user = userRes.rows[0];

    const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1';
    const itemsRes = await db.query(itemsQuery, [invoiceId]);
    const items = itemsRes.rows;

    const pdfLocalPath = await generateInvoicePDF(invoice, items, client, user);
    const pdfUrl = await uploadPDF(pdfLocalPath);

    await db.query('UPDATE invoices SET pdf_path = $1 WHERE id = $2', [pdfUrl, invoiceId]);
    
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
    const fetchQuery = `
      SELECT payments.*, invoices.invoice_number, clients.name as client_name
      FROM payments
      JOIN invoices ON payments.invoice_id = invoices.id
      JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.user_id = $1
      ORDER BY payments.id DESC
    `;
    const result = await db.query(fetchQuery, [userId]);
    return res.json({ payments: result.rows });
  } catch (error) {
    console.error(`Get Payments Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error fetching billing logs.' });
  }
};

module.exports = {
  addPayment,
  getPayments
};
