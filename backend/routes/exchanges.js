const router = require('express').Router();
const Exchange = require('../models/Exchange');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/exchanges — public
router.get('/', async (req, res) => {
  try {
    const exchanges = await Exchange.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json({ exchanges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exchanges/admin — all including inactive
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const exchanges = await Exchange.find().sort({ name: 1 }).lean();
    res.json({ exchanges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exchanges
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, url, country, type, makerFee, takerFee, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const exists = await Exchange.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (exists) return res.status(400).json({ error: 'Exchange already exists' });
    const exchange = await Exchange.create({ name, url, country, type, makerFee, takerFee, notes });
    res.status(201).json({ exchange });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/exchanges/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const exchange = await Exchange.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exchange) return res.status(404).json({ error: 'Exchange not found' });
    res.json({ exchange });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/exchanges/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Exchange.findByIdAndDelete(req.params.id);
    res.json({ message: 'Exchange deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
