const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  rate: { type: Number, default: 0.00 },
  gst_vat_percentage: { type: Number, default: 0.00 },
  amount: { type: Number, default: 0.00 }
});

module.exports = mongoose.model('InvoiceItem', invoiceItemSchema);
