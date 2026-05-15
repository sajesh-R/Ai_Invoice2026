const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  payment_amount: { type: Number, required: true },
  payment_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
