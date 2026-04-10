const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !await user.comparePassword(password))
      return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isActive) return res.status(403).json({ error: 'Account deactivated' });

    // Re-assign admin role dynamically if env email matches
    if (email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() && user.role !== 'admin') {
      user.role = 'admin';
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        plan: user.getEffectiveRole(),
        planExpiry: user.planExpiry,
        planActive: user.isPlanActive(),
        isAdmin: user.role === 'admin',
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const u = req.user;
  res.json({
    id: u._id,
    email: u.email,
    username: u.username,
    role: u.role,
    plan: u.getEffectiveRole(),
    planExpiry: u.planExpiry,
    planActive: u.isPlanActive(),
    isAdmin: u.role === 'admin',
    usdtWallet: u.usdtWallet,
  });
});

module.exports = router;
