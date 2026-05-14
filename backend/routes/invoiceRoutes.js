const express = require('express');
const router = express.Router();
const { 
  createInvoice, 
  getInvoices, 
  getInvoiceDetails, 
  generateInvoicePDFAndSave, 
  sendInvoiceByEmail,
  generateAIInvoice 
} = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // Protect all invoice routes

router.post('/', createInvoice);
router.post('/ai', generateAIInvoice);
router.get('/', getInvoices);
router.get('/:id', getInvoiceDetails);
router.post('/:id/pdf', generateInvoicePDFAndSave);
router.post('/:id/send', sendInvoiceByEmail);

module.exports = router;
