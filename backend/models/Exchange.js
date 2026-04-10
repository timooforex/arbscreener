const mongoose = require('mongoose');

const exchangeSchema = new mongoose.Schema({
  name:       { type: String, required: true, unique: true, trim: true },
  url:        { type: String, default: '' },
  country:    { type: String, default: 'Global' },
  type:       { type: String, enum: ['CEX','DEX','Hybrid'], default: 'CEX' },
  makerFee:   { type: Number, default: 0.1 },
  takerFee:   { type: Number, default: 0.1 },
  isLive:     { type: Boolean, default: false },  // true = has live API
  apiSource:  { type: String, default: null },    // 'binance'|'coinbase'|etc
  isActive:   { type: Boolean, default: true },
  notes:      { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('Exchange', exchangeSchema);
