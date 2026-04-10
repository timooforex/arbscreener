const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const Trade = require('../models/Trade');
const Exchange = require('../models/Exchange');
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
    const [trades, exchanges] = await Promise.all([
      Trade.countDocuments({ isActive: true }),
      Exchange.countDocuments({ isActive: true }),
    ]);
    res.json({ trades, exchanges });
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
