const mongoose = require('mongoose');

const recurringInvoiceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  billing_cycle: { type: String, required: true }, // 'Weekly', 'Monthly', 'Quarterly', 'Annually'
  next_invoice_date: { type: Date, required: true },
  last_generated_date: { type: Date },
  status: { type: String, default: 'Active' }, // 'Active', 'Paused'
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RecurringInvoice', recurringInvoiceSchema);
