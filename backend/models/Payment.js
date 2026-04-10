const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  method:       { type: String, enum: ['paystack','usdt'], required: true },
  plan:         { type: String, enum: ['starter','pro'], required: true },
  cycle:        { type: String, enum: ['monthly','yearly'], required: true },
  amount:       { type: Number, required: true },   // in USD
  currency:     { type: String, default: 'USD' },
  status:       { type: String, enum: ['pending','confirmed','failed'], default: 'pending' },

  // Paystack
  paystackRef:  { type: String, default: null },
  paystackData: { type: Object, default: null },

  // USDT
  usdtAddress:  { type: String, default: null },    // unique wallet assigned for this payment
  usdtTxHash:   { type: String, default: null },
  usdtAmount:   { type: Number, default: null },    // exact USDT amount expected

  confirmedAt:  { type: Date, default: null },
  createdAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', paymentSchema);
