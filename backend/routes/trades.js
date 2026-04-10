const router = require('express').Router();
const Trade = require('../models/Trade');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/trades — fully public, all data visible
router.get('/', async (req, res) => {
  try {
    const trades = await Trade.find({ isActive: true }).sort({ profit: -1 }).limit(500).lean();
    res.json({ trades, total: trades.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────

// GET /api/trades/admin — all trades unfiltered
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const trades = await Trade.find().sort({ profit: -1 }).lean();
    res.json({ trades, total: trades.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trades — admin adds manual trade
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { coin, pair, buyAt, buyPrice, sellAt, sellPrice, depositStatus, wdStatus } = req.body;
    if (!coin || !pair || !buyAt || !sellAt || !buyPrice || !sellPrice)
      return res.status(400).json({ error: 'All fields required' });
    const trade = await Trade.create({
      coin, pair, buyAt, buyPrice, sellAt, sellPrice,
      depositStatus: depositStatus || 'ok',
      wdStatus: wdStatus || 'ok',
      isManual: true
    });
    res.status(201).json({ trade });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/trades/:id — admin updates trade
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const trade = await Trade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    res.json({ trade });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/trades/:id — admin deletes trade
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Trade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Trade deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trades/bulk — admin bulk import
router.post('/bulk', protect, adminOnly, async (req, res) => {
  try {
    const { trades } = req.body;
    if (!Array.isArray(trades)) return res.status(400).json({ error: 'trades must be array' });
    const docs = trades.map(t => ({ ...t, isManual: true }));
    const result = await Trade.insertMany(docs, { ordered: false });
    res.json({ inserted: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
