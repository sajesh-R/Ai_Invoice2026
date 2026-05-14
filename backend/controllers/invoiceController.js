const db = require('../config/db');
const { generateInvoicePDF } = require('../services/pdfService');
const { uploadPDF } = require('../config/cloudinary');
const { sendInvoiceEmail, getInvoiceEmailBody } = require('../services/emailService');
const { generateInvoiceDraftFromPrompt } = require('../services/aiService');
const fs = require('fs');


/**
 * Helper to generate sequential invoice numbers
 */
const generateNextInvoiceNumber = async () => {
  try {
    const fetchLatestQuery = 'SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1';
    const result = await db.query(fetchLatestQuery);
    
    let currentYear = new Date().getFullYear();
    let nextNum = 1;
    
    if (result.rowCount > 0) {
      const lastInvoiceNum = result.rows[0].invoice_number; // e.g. INV-2026-0005
      const parts = lastInvoiceNum.split('-');
      if (parts.length === 3) {
        const lastYear = parseInt(parts[1]);
        const lastSeq = parseInt(parts[2]);
        
        if (lastYear === currentYear) {
          nextNum = lastSeq + 1;
        }
      }
    }
    
    return `INV-${currentYear}-${String(nextNum).padStart(4, '0')}`;
  } catch (error) {
    console.error(`Error generating invoice number: ${error.message}`);
    // Safe fallback with unique timestamp
    return `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
};

const createInvoice = async (req, res) => {
  const { client_id, items, due_date } = req.body;
  const userId = req.user.id;

  if (!client_id || !items || !Array.isArray(items) || items.length === 0 || !due_date) {
    return res.status(400).json({ message: 'Client ID, Due Date, and at least one Invoice Item are required.' });
  }

  try {
    // 1. Fetch Client and User details to ensure they exist & for PDF printing
    const clientQuery = 'SELECT * FROM clients WHERE id = $1 AND user_id = $2';
    const clientRes = await db.query(clientQuery, [client_id, userId]);
    if (clientRes.rowCount === 0) {
      return res.status(404).json({ message: 'Client not found or unauthorized.' });
    }
    const client = clientRes.rows[0];

    const userQuery = 'SELECT name, email FROM users WHERE id = $1';
    const userRes = await db.query(userQuery, [userId]);
    const user = userRes.rows[0];

    // 2. Generate sequential invoice number
    const invoiceNumber = await generateNextInvoiceNumber();

    // 3. Calculate taxes and totals
    let gstVatAmount = 0;
    let totalAmount = 0;
    const itemsWithCalculatedAmounts = items.map(item => {
      const quantity = parseInt(item.quantity) || 1;
      const rate = parseFloat(item.rate) || 0.00;
      const taxPercentage = parseFloat(item.gst_vat_percentage) || 0.00;
      
      const subtotal = quantity * rate;
      const taxAmount = subtotal * (taxPercentage / 100);
      const itemTotal = subtotal + taxAmount;
      
      gstVatAmount += taxAmount;
      totalAmount += itemTotal;

      return {
        description: item.description,
        quantity,
        rate,
        gst_vat_percentage: taxPercentage,
        amount: subtotal // Amount field inside items table (excluding tax as per schema, or total)
      };
    });

    // 4. Save Invoice Record to DB
    const insertInvoiceQuery = `
      INSERT INTO invoices (user_id, invoice_number, client_id, total_amount, gst_vat_amount, paid_amount, balance_amount, status, due_date)
      VALUES ($1, $2, $3, $4, $5, 0.00, $4, 'Unpaid', $6)
      RETURNING *
    `;
    const invoiceResult = await db.query(insertInvoiceQuery, [
      userId,
      invoiceNumber,
      client_id,
      totalAmount,
      gstVatAmount,
      due_date
    ]);
    const createdInvoice = invoiceResult.rows[0];

    // 5. Save Line Items to DB
    const itemPromises = itemsWithCalculatedAmounts.map(item => {
      const insertItemQuery = `
        INSERT INTO invoice_items (invoice_id, description, quantity, rate, gst_vat_percentage, amount)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      return db.query(insertItemQuery, [
        createdInvoice.id,
        item.description,
        item.quantity,
        item.rate,
        item.gst_vat_percentage,
        item.amount
      ]);
    });
    const itemsResult = await Promise.all(itemPromises);
    const savedItems = itemsResult.map(res => res.rows[0]);

    // 6. Generate PDF in background/immediately
    let pdfLocalPath = '';
    let pdfUrl = '';
    try {
      pdfLocalPath = await generateInvoicePDF(createdInvoice, savedItems, client, user);
      pdfUrl = await uploadPDF(pdfLocalPath);
      
      // Update Invoice PDF URL
      await db.query('UPDATE invoices SET pdf_path = $1 WHERE id = $2', [pdfUrl, createdInvoice.id]);
      createdInvoice.pdf_path = pdfUrl;
    } catch (pdfErr) {
      console.error(`Automated PDF Generation failed inside creation pipeline: ${pdfErr.message}`);
    } finally {
      // Clean up local temp file if Cloudinary uploaded it
      if (pdfLocalPath && fs.existsSync(pdfLocalPath)) {
        try { fs.unlinkSync(pdfLocalPath); } catch (e) {}
      }
    }

    return res.status(201).json({
      message: 'Invoice created successfully!',
      invoice: createdInvoice,
      items: savedItems
    });
  } catch (error) {
    console.error(`Invoice Create Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error creating invoice.' });
  }
};

const getInvoices = async (req, res) => {
  const userId = req.user.id;

  try {
    const fetchQuery = `
      SELECT invoices.*, clients.name as client_name, clients.email as client_email
      FROM invoices
      JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.user_id = $1
      ORDER BY invoices.id DESC
    `;
    const result = await db.query(fetchQuery, [userId]);
    return res.json({ invoices: result.rows });
  } catch (error) {
    console.error(`Get Invoices Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error fetching invoices.' });
  }
};

const getInvoiceDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Fetch Invoice
    const invoiceQuery = `
      SELECT invoices.*, clients.name as client_name, clients.email as client_email, clients.phone as client_phone, clients.address as client_address
      FROM invoices
      JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.id = $1 AND invoices.user_id = $2
    `;
    const invoiceRes = await db.query(invoiceQuery, [id, userId]);

    if (invoiceRes.rowCount === 0) {
      return res.status(404).json({ message: 'Invoice not found or access denied.' });
    }

    const invoice = invoiceRes.rows[0];

    // Fetch Line Items
    const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC';
    const itemsRes = await db.query(itemsQuery, [id]);

    // Fetch Payments
    const paymentsQuery = 'SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC';
    const paymentsRes = await db.query(paymentsQuery, [id]);

    return res.json({
      invoice,
      items: itemsRes.rows,
      payments: paymentsRes.rows
    });
  } catch (error) {
    console.error(`Get Invoice Details Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error fetching invoice details.' });
  }
};

const generateInvoicePDFAndSave = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 1. Fetch details
    const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1 AND user_id = $2';
    const invoiceRes = await db.query(invoiceQuery, [id, userId]);
    if (invoiceRes.rowCount === 0) {
      return res.status(404).json({ message: 'Invoice not found or unauthorized.' });
    }
    const invoice = invoiceRes.rows[0];

    const clientQuery = 'SELECT * FROM clients WHERE id = $1';
    const clientRes = await db.query(clientQuery, [invoice.client_id]);
    const client = clientRes.rows[0];

    const userQuery = 'SELECT name, email FROM users WHERE id = $1';
    const userRes = await db.query(userQuery, [userId]);
    const user = userRes.rows[0];

    const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1';
    const itemsRes = await db.query(itemsQuery, [id]);
    const items = itemsRes.rows;

    // 2. Generate PDF
    const pdfLocalPath = await generateInvoicePDF(invoice, items, client, user);
    const pdfUrl = await uploadPDF(pdfLocalPath);

    // 3. Update invoice record
    await db.query('UPDATE invoices SET pdf_path = $1 WHERE id = $2', [pdfUrl, invoice.id]);
    
    // Clean up local file
    if (pdfLocalPath && fs.existsSync(pdfLocalPath)) {
      try { fs.unlinkSync(pdfLocalPath); } catch (e) {}
    }

    return res.json({
      message: 'Invoice PDF generated successfully!',
      pdf_path: pdfUrl
    });
  } catch (error) {
    console.error(`Standalone PDF Generation Error: ${error.message}`);
    return res.status(500).json({ message: `Internal server error generating PDF: ${error.message}` });
  }
};

const sendInvoiceByEmail = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 1. Fetch data
    const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1 AND user_id = $2';
    const invoiceRes = await db.query(invoiceQuery, [id, userId]);
    if (invoiceRes.rowCount === 0) {
      return res.status(404).json({ message: 'Invoice not found or unauthorized.' });
    }
    const invoice = invoiceRes.rows[0];

    const clientQuery = 'SELECT * FROM clients WHERE id = $1';
    const clientRes = await db.query(clientQuery, [invoice.client_id]);
    const client = clientRes.rows[0];

    const userQuery = 'SELECT name, email FROM users WHERE id = $1';
    const userRes = await db.query(userQuery, [userId]);
    const user = userRes.rows[0];

    const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1';
    const itemsRes = await db.query(itemsQuery, [id]);
    const items = itemsRes.rows;

    // 2. Ensure PDF is generated and downloaded locally to send as attachment
    let pdfLocalPath = '';
    try {
      pdfLocalPath = await generateInvoicePDF(invoice, items, client, user);
    } catch (pdfErr) {
      console.error(`PDF compilation for attachment failed: ${pdfErr.message}`);
    }

    // 3. Send email with attachment
    const emailSubject = `Invoice ${invoice.invoice_number} from ${user.name}`;
    const emailBody = getInvoiceEmailBody(invoice, client, user);
    await sendInvoiceEmail(client.email, client.name, emailSubject, emailBody, pdfLocalPath || null);

    // Cleanup local temp file if compiled
    if (pdfLocalPath && fs.existsSync(pdfLocalPath)) {
      try { fs.unlinkSync(pdfLocalPath); } catch (e) {}
    }

    return res.json({ message: 'Invoice sent successfully to client email!' });
  } catch (error) {
    console.error(`Email Delivery Route Error: ${error.message}`);
    return res.status(500).json({ message: `Internal server error sending invoice: ${error.message}` });
  }
};

const generateAIInvoice = async (req, res) => {
  const { client_id, prompt } = req.body;
  const userId = req.user.id;

  if (!client_id || !prompt) {
    return res.status(400).json({ message: 'Client ID and Client Requirement/Prompt are required.' });
  }

  try {
    // 1. Fetch Client and User details to ensure they exist & for PDF printing
    const clientQuery = 'SELECT * FROM clients WHERE id = $1 AND user_id = $2';
    const clientRes = await db.query(clientQuery, [client_id, userId]);
    if (clientRes.rowCount === 0) {
      return res.status(404).json({ message: 'Client not found or unauthorized.' });
    }
    const client = clientRes.rows[0];

    const userQuery = 'SELECT name, email FROM users WHERE id = $1';
    const userRes = await db.query(userQuery, [userId]);
    const user = userRes.rows[0];

    // 2. Call AI service to draft items and suggestion
    console.log(`Processing AI Invoice request for Client: ${client.name} with prompt: "${prompt}"`);
    const draft = await generateInvoiceDraftFromPrompt(prompt);
    
    const items = draft.items;
    
    // Calculate due date
    let dueDate = draft.suggested_due_date;
    if (!dueDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      dueDate = defaultDate.toISOString().split('T')[0];
    }

    // 3. Generate sequential invoice number
    const invoiceNumber = await generateNextInvoiceNumber();

    // 4. Calculate taxes and totals
    let gstVatAmount = 0;
    let totalAmount = 0;
    const itemsWithCalculatedAmounts = items.map(item => {
      const quantity = parseInt(item.quantity) || 1;
      const rate = parseFloat(item.rate) || 0.00;
      const taxPercentage = parseFloat(item.gst_vat_percentage) || 0.00;
      
      const subtotal = quantity * rate;
      const taxAmount = subtotal * (taxPercentage / 100);
      const itemTotal = subtotal + taxAmount;
      
      gstVatAmount += taxAmount;
      totalAmount += itemTotal;

      return {
        description: item.description,
        quantity,
        rate,
        gst_vat_percentage: taxPercentage,
        amount: subtotal
      };
    });

    // 5. Save Invoice Record to DB
    const insertInvoiceQuery = `
      INSERT INTO invoices (user_id, invoice_number, client_id, total_amount, gst_vat_amount, paid_amount, balance_amount, status, due_date)
      VALUES ($1, $2, $3, $4, $5, 0.00, $4, 'Unpaid', $6)
      RETURNING *
    `;
    const invoiceResult = await db.query(insertInvoiceQuery, [
      userId,
      invoiceNumber,
      client_id,
      totalAmount,
      gstVatAmount,
      dueDate
    ]);
    const createdInvoice = invoiceResult.rows[0];

    // 6. Save Line Items to DB
    const itemPromises = itemsWithCalculatedAmounts.map(item => {
      const insertItemQuery = `
        INSERT INTO invoice_items (invoice_id, description, quantity, rate, gst_vat_percentage, amount)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      return db.query(insertItemQuery, [
        createdInvoice.id,
        item.description,
        item.quantity,
        item.rate,
        item.gst_vat_percentage,
        item.amount
      ]);
    });
    const itemsResult = await Promise.all(itemPromises);
    const savedItems = itemsResult.map(res => res.rows[0]);

    // 7. Generate PDF in background/immediately
    let pdfLocalPath = '';
    let pdfUrl = '';
    try {
      pdfLocalPath = await generateInvoicePDF(createdInvoice, savedItems, client, user);
      pdfUrl = await uploadPDF(pdfLocalPath);
      
      // Update Invoice PDF URL
      await db.query('UPDATE invoices SET pdf_path = $1 WHERE id = $2', [pdfUrl, createdInvoice.id]);
      createdInvoice.pdf_path = pdfUrl;
    } catch (pdfErr) {
      console.error(`Automated PDF Generation failed inside AI creation pipeline: ${pdfErr.message}`);
    } finally {
      // Clean up local temp file if Cloudinary uploaded it
      if (pdfLocalPath && fs.existsSync(pdfLocalPath)) {
        try { fs.unlinkSync(pdfLocalPath); } catch (e) {}
      }
    }

    return res.status(201).json({
      message: 'AI Invoice created successfully!',
      invoice: createdInvoice,
      items: savedItems
    });
  } catch (error) {
    console.error(`AI Invoice Create Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error creating AI invoice.' });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceDetails,
  generateInvoicePDFAndSave,
  sendInvoiceByEmail,
  generateAIInvoice
};
