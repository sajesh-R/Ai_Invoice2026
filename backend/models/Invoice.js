const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invoice_number: { type: String, required: true, unique: true },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  total_amount: { type: Number, default: 0.00 },
  gst_vat_amount: { type: Number, default: 0.00 },
  paid_amount: { type: Number, default: 0.00 },
  balance_amount: { type: Number, default: 0.00 },
  status: { type: String, default: 'Unpaid' }, // 'Unpaid', 'Partially Paid', 'Paid', 'Overdue'
  pdf_path: { type: String },
  due_date: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
