const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  coin:           { type: String, required: true, uppercase: true },
  pair:           { type: String, required: true },
  buyAt:          { type: String, required: true },
  buyPrice:       { type: Number, required: true },
  sellAt:         { type: String, required: true },
  sellPrice:      { type: Number, required: true },
  profit:         { type: Number, required: true },  // percentage
  depositStatus:  { type: String, enum: ['ok','warn','bad'], default: 'ok' },
  wdStatus:       { type: String, enum: ['ok','warn','bad'], default: 'ok' },
  isManual:       { type: Boolean, default: false },  // true = admin added manually
  isActive:       { type: Boolean, default: true },
  updatedAt:      { type: Date, default: Date.now },
  createdAt:      { type: Date, default: Date.now },
});

// Auto-calculate profit before save
tradeSchema.pre('save', function(next) {
  if (this.buyPrice && this.sellPrice) {
    this.profit = +((( this.sellPrice - this.buyPrice ) / this.buyPrice) * 100).toFixed(2);
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Trade', tradeSchema);
