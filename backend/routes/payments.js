const router = require('express').Router();
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');

const PLANS = {
  starter: { monthly: +process.env.STARTER_MONTHLY_PRICE || 9.99, yearly: +process.env.STARTER_YEARLY_PRICE || 79.99 },
  pro:     { monthly: +process.env.PRO_MONTHLY_PRICE    || 24.99, yearly: +process.env.PRO_YEARLY_PRICE    || 199.99 },
};

function getDurationDays(cycle) {
  return cycle === 'yearly' ? 365 : 30;
}

// Generate a deterministic USDT sub-address per user+payment
// In production replace with actual HD wallet derivation or a crypto payment API like CoinPayments
function generateUSDTAddress(userId, paymentId) {
  const hash = crypto.createHash('sha256')
    .update(`${process.env.USDT_MASTER_WALLET}:${userId}:${paymentId}`)
    .digest('hex');
  // Returns a placeholder — replace with real HD wallet logic
  return `T${hash.slice(0, 33).toUpperCase()}`;
}

// ── GET PLAN PRICES ───────────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

// ── INITIATE PAYSTACK PAYMENT ─────────────────────────────────────────────
router.post('/paystack/init', protect, async (req, res) => {
  try {
    const { plan, cycle } = req.body;
    if (!PLANS[plan] || !PLANS[plan][cycle])
      return res.status(400).json({ error: 'Invalid plan or cycle' });

    const amount = PLANS[plan][cycle];
    const amountKobo = Math.round(amount * 100 * 1500); // USD → NGN approx, adjust as needed
    const ref = `ARB-${Date.now()}-${req.user._id.toString().slice(-6)}`;

    const { data } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: amountKobo,
        reference: ref,
        metadata: { userId: req.user._id.toString(), plan, cycle },
        callback_url: `${process.env.FRONTEND_URL}/payment/verify?ref=${ref}`,
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    // Save pending payment
    const payment = await Payment.create({
      user: req.user._id,
      method: 'paystack',
      plan, cycle,
      amount,
      status: 'pending',
      paystackRef: ref,
    });

    res.json({ authorizationUrl: data.data.authorization_url, reference: ref, paymentId: payment._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VERIFY PAYSTACK PAYMENT ───────────────────────────────────────────────
router.post('/paystack/verify', protect, async (req, res) => {
  try {
    const { reference } = req.body;
    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    if (data.data.status !== 'success')
      return res.status(400).json({ error: 'Payment not successful' });

    const meta = data.data.metadata;
    const payment = await Payment.findOne({ paystackRef: reference });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });
    if (payment.status === 'confirmed') return res.json({ message: 'Already confirmed' });

    // Activate plan
    const days = getDurationDays(payment.cycle);
    const expiry = new Date(Date.now() + days * 86400000);
    await User.findByIdAndUpdate(payment.user, {
      plan: payment.plan,
      planCycle: payment.cycle,
      planExpiry: expiry,
      planActive: true,
      role: payment.plan === 'pro' ? 'pro' : 'starter',
    });

    payment.status = 'confirmed';
    payment.confirmedAt = new Date();
    payment.paystackData = data.data;
    await payment.save();

    res.json({ message: 'Payment confirmed', plan: payment.plan, expiry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── INITIATE USDT PAYMENT ─────────────────────────────────────────────────
router.post('/usdt/init', protect, async (req, res) => {
  try {
    const { plan, cycle } = req.body;
    if (!PLANS[plan] || !PLANS[plan][cycle])
      return res.status(400).json({ error: 'Invalid plan or cycle' });

    const amount = PLANS[plan][cycle]; // amount in USD = amount in USDT (1:1)

    // Create pending payment first to get ID
    const payment = await Payment.create({
      user: req.user._id,
      method: 'usdt',
      plan, cycle, amount,
      status: 'pending',
      usdtAmount: amount,
    });

    // Generate unique wallet for this payment
    const usdtAddress = generateUSDTAddress(req.user._id.toString(), payment._id.toString());
    payment.usdtAddress = usdtAddress;
    await payment.save();

    // Also store on user for quick reference
    await User.findByIdAndUpdate(req.user._id, { usdtWallet: usdtAddress });

    res.json({
      address: usdtAddress,
      amount,
      network: process.env.USDT_NETWORK || 'TRC20',
      paymentId: payment._id,
      note: `Send exactly ${amount} USDT to this address. Your plan activates within 30 minutes of confirmation.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: MANUALLY CONFIRM USDT PAYMENT ─────────────────────────────────
router.post('/usdt/confirm', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Admin only' });

    const { paymentId, txHash } = req.body;
    const payment = await Payment.findById(paymentId).populate('user');
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const days = getDurationDays(payment.cycle);
    const expiry = new Date(Date.now() + days * 86400000);

    await User.findByIdAndUpdate(payment.user._id, {
      plan: payment.plan,
      planCycle: payment.cycle,
      planExpiry: expiry,
      planActive: true,
      role: payment.plan === 'pro' ? 'pro' : 'starter',
    });

    payment.status = 'confirmed';
    payment.confirmedAt = new Date();
    payment.usdtTxHash = txHash || 'manual';
    await payment.save();

    res.json({ message: 'USDT payment confirmed', plan: payment.plan, expiry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET USER PAYMENT HISTORY ──────────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: ALL PAYMENTS ───────────────────────────────────────────────────
router.get('/admin/all', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const payments = await Payment.find().populate('user','email plan role').sort({ createdAt: -1 }).lean();
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
