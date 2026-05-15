const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', clientSchema);
