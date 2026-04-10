const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 6 },
  username:     { type: String, trim: true },
  role:         { type: String, enum: ['guest','free','starter','pro','admin'], default: 'free' },

  // Subscription
  plan:         { type: String, enum: ['free','starter','pro'], default: 'free' },
  planCycle:    { type: String, enum: ['monthly','yearly'], default: 'monthly' },
  planExpiry:   { type: Date, default: null },
  planActive:   { type: Boolean, default: false },

  // USDT payment wallet (unique per user)
  usdtWallet:   { type: String, default: null },

  // Paystack customer
  paystackCustomerCode: { type: String, default: null },

  createdAt:    { type: Date, default: Date.now },
  lastLogin:    { type: Date, default: null },
  isActive:     { type: Boolean, default: true },
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Check if plan is currently active
userSchema.methods.isPlanActive = function() {
  if (this.role === 'admin') return true;
  if (this.plan === 'free') return true;
  if (!this.planExpiry) return false;
  return new Date() < new Date(this.planExpiry);
};

// Get effective role based on plan expiry (all users get pro access)
userSchema.methods.getEffectiveRole = function() {
  if (this.role === 'admin') return 'admin';
  return 'pro';
};

module.exports = mongoose.model('User', userSchema);
