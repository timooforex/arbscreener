const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const Trade = require('../models/Trade');
const Exchange = require('../models/Exchange');
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');

function makeImageUpload(name, maxMb) {
  const storage = multer.diskStorage({
    destination: path.join(__dirname, '../uploads'),
    filename: (req, file, cb) => { cb(null, `${name}${path.extname(file.originalname).toLowerCase()}`); },
  });
  return multer({
    storage,
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ['.png','.jpg','.jpeg','.svg','.webp','.gif'];
      cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
    },
  });
}
const uploadLogo  = makeImageUpload('logo',  2);
const uploadFlyer = makeImageUpload('flyer', 8);

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// ── DASHBOARD STATS ───────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [users, trades, exchanges, payments, activeSubs] = await Promise.all([
      User.countDocuments(),
      Trade.countDocuments({ isActive: true }),
      Exchange.countDocuments({ isActive: true }),
      Payment.countDocuments({ status: 'confirmed' }),
      User.countDocuments({ plan: { $ne: 'free' }, planExpiry: { $gt: new Date() } }),
    ]);
    const revenue = await Payment.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    res.json({ users, trades, exchanges, payments, activeSubs, revenue: revenue[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SETTINGS ──────────────────────────────────────────────────────────────
router.get('/settings', async (req, res) => {
  try {
    const docs = await Settings.find().lean();
    const settings = {};
    docs.forEach(d => { settings[d.key] = d.value; });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    await Promise.all(Object.entries(updates).map(([k, v]) => Settings.set(k, v)));
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── USER MANAGEMENT ───────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { plan, planExpiry, planCycle, isActive, role } = req.body;
    const update = {};
    if (plan !== undefined) update.plan = plan;
    if (planExpiry !== undefined) update.planExpiry = planExpiry;
    if (planCycle !== undefined) update.planCycle = planCycle;
    if (isActive !== undefined) update.isActive = isActive;
    if (role !== undefined) update.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ error: 'Cannot delete yourself' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PLAN CONFIG ───────────────────────────────────────────────────────────
// Starter profit range (what profit% starter users can see)
router.put('/plan-config', async (req, res) => {
  try {
    const { starterMin, starterMax, starterMonthly, starterYearly, proMonthly, proYearly } = req.body;
    const updates = {};
    if (starterMin !== undefined || starterMax !== undefined) {
      updates.starterProfitRange = { min: starterMin ?? 0, max: starterMax ?? 10 };
    }
    if (starterMonthly !== undefined) updates.starterMonthlyPrice = starterMonthly;
    if (starterYearly !== undefined) updates.starterYearlyPrice = starterYearly;
    if (proMonthly !== undefined) updates.proMonthlyPrice = proMonthly;
    if (proYearly !== undefined) updates.proYearlyPrice = proYearly;
    await Promise.all(Object.entries(updates).map(([k, v]) => Settings.set(k, v)));
    res.json({ message: 'Plan config updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LOGO UPLOAD ───────────────────────────────────────────────────────────
router.post('/upload-logo', uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file or invalid file type' });
    const url = `/uploads/${req.file.filename}`;
    await Settings.set('brandLogo', url);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── FLYER UPLOAD ──────────────────────────────────────────────────────────
router.post('/upload-flyer', uploadFlyer.single('flyer'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file or invalid file type' });
    const url = `/uploads/${req.file.filename}`;
    await Settings.set('flyerImage', url);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
