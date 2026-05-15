const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const Client = require('../models/Client');
const User = require('../models/User');
const Payment = require('../models/Payment');
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
    const latestInvoice = await Invoice.findOne().sort({ _id: -1 });
    
    let currentYear = new Date().getFullYear();
    let nextNum = 1;
    
    if (latestInvoice && latestInvoice.invoice_number) {
      const lastInvoiceNum = latestInvoice.invoice_number; // e.g. INV-2026-0005
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
    const client = await Client.findOne({ _id: client_id, user_id: userId });
    if (!client) {
      return res.status(404).json({ message: 'Client not found or unauthorized.' });
    }

    const user = await User.findById(userId).select('name email');

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
        amount: subtotal
      };
    });

    // 4. Save Invoice Record to DB
    const invoice = new Invoice({
      user_id: userId,
      invoice_number: invoiceNumber,
      client_id,
      total_amount: totalAmount,
      gst_vat_amount: gstVatAmount,
      paid_amount: 0.00,
      balance_amount: totalAmount,
      status: 'Unpaid',
      due_date
    });
    await invoice.save();

    // 5. Save Line Items to DB
    const itemPromises = itemsWithCalculatedAmounts.map(item => {
      const invoiceItem = new InvoiceItem({
        invoice_id: invoice._id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        gst_vat_percentage: item.gst_vat_percentage,
        amount: item.amount
      });
      return invoiceItem.save();
    });
    const savedItemsDocs = await Promise.all(itemPromises);
    const savedItems = savedItemsDocs.map(doc => doc.toObject());

    // 6. Generate PDF in background/immediately
    let pdfLocalPath = '';
    let pdfUrl = '';
    try {
      pdfLocalPath = await generateInvoicePDF(invoice, savedItems, client, user);
      pdfUrl = await uploadPDF(pdfLocalPath);
      
      // Update Invoice PDF URL
      invoice.pdf_path = pdfUrl;
      await invoice.save();
    } catch (pdfErr) {
      console.error(`Automated PDF Generation failed inside creation pipeline: ${pdfErr.message}`);
    } finally {
      // Clean up local temp file if Cloudinary uploaded it
      if (pdfLocalPath && fs.existsSync(pdfLocalPath)) {
        try { fs.unlinkSync(pdfLocalPath); } catch (e) {}
      }
    }

    const createdInvoice = invoice.toObject();
    createdInvoice.id = createdInvoice._id;
    savedItems.forEach(i => i.id = i._id);

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
    const invoices = await Invoice.find({ user_id: userId })
      .populate('client_id')
      .sort({ _id: -1 });

    const formattedInvoices = invoices.map(invoice => {
      const inv = invoice.toObject();
      inv.id = inv._id;
      inv.client_name = inv.client_id ? inv.client_id.name : 'Unknown';
      inv.client_email = inv.client_id ? inv.client_id.email : 'Unknown';
      return inv;
    });

    return res.json({ invoices: formattedInvoices });
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
    const invoice = await Invoice.findOne({ _id: id, user_id: userId }).populate('client_id');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found or access denied.' });
    }

    const invData = invoice.toObject();
    invData.id = invData._id;
    invData.client_name = invData.client_id ? invData.client_id.name : 'Unknown';
    invData.client_email = invData.client_id ? invData.client_id.email : 'Unknown';
    invData.client_phone = invData.client_id ? invData.client_id.phone : '';
    invData.client_address = invData.client_id ? invData.client_id.address : '';

    // Fetch Line Items
    const items = await InvoiceItem.find({ invoice_id: id }).sort({ _id: 1 });
    const formattedItems = items.map(i => {
      const item = i.toObject();
      item.id = item._id;
      return item;
    });

    // Fetch Payments
    const payments = await Payment.find({ invoice_id: id }).sort({ payment_date: -1 });
    const formattedPayments = payments.map(p => {
      const payment = p.toObject();
      payment.id = payment._id;
      return payment;
    });

    return res.json({
      invoice: invData,
      items: formattedItems,
      payments: formattedPayments
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
    const invoice = await Invoice.findOne({ _id: id, user_id: userId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found or unauthorized.' });
    }

    const client = await Client.findById(invoice.client_id);
    const user = await User.findById(userId).select('name email');
    const itemsDocs = await InvoiceItem.find({ invoice_id: id });
    const items = itemsDocs.map(doc => doc.toObject());

    // 2. Generate PDF
    const pdfLocalPath = await generateInvoicePDF(invoice, items, client, user);
    const pdfUrl = await uploadPDF(pdfLocalPath);

    // 3. Update invoice record
    invoice.pdf_path = pdfUrl;
    await invoice.save();
    
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
    const invoice = await Invoice.findOne({ _id: id, user_id: userId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found or unauthorized.' });
    }

    const client = await Client.findById(invoice.client_id);
    const user = await User.findById(userId).select('name email');
    const itemsDocs = await InvoiceItem.find({ invoice_id: id });
    const items = itemsDocs.map(doc => doc.toObject());

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
    // 1. Fetch Client and User details
    const client = await Client.findOne({ _id: client_id, user_id: userId });
    if (!client) {
      return res.status(404).json({ message: 'Client not found or unauthorized.' });
    }

    const user = await User.findById(userId).select('name email');

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
    const invoice = new Invoice({
      user_id: userId,
      invoice_number: invoiceNumber,
      client_id,
      total_amount: totalAmount,
      gst_vat_amount: gstVatAmount,
      paid_amount: 0.00,
      balance_amount: totalAmount,
      status: 'Unpaid',
      due_date: dueDate
    });
    await invoice.save();

    // 6. Save Line Items to DB
    const itemPromises = itemsWithCalculatedAmounts.map(item => {
      const invoiceItem = new InvoiceItem({
        invoice_id: invoice._id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        gst_vat_percentage: item.gst_vat_percentage,
        amount: item.amount
      });
      return invoiceItem.save();
    });
    const savedItemsDocs = await Promise.all(itemPromises);
    const savedItems = savedItemsDocs.map(doc => doc.toObject());

    // 7. Generate PDF in background/immediately
    let pdfLocalPath = '';
    let pdfUrl = '';
    try {
      pdfLocalPath = await generateInvoicePDF(invoice, savedItems, client, user);
      pdfUrl = await uploadPDF(pdfLocalPath);
      
      // Update Invoice PDF URL
      invoice.pdf_path = pdfUrl;
      await invoice.save();
    } catch (pdfErr) {
      console.error(`Automated PDF Generation failed inside AI creation pipeline: ${pdfErr.message}`);
    } finally {
      // Clean up local temp file if Cloudinary uploaded it
      if (pdfLocalPath && fs.existsSync(pdfLocalPath)) {
        try { fs.unlinkSync(pdfLocalPath); } catch (e) {}
      }
    }

    const createdInvoice = invoice.toObject();
    createdInvoice.id = createdInvoice._id;
    savedItems.forEach(i => i.id = i._id);

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
