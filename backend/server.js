require('dotenv').config();
const dns = require('dns'); dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { fetchAllPrices, calculateArbitrage } = require('./services/priceEngine');
const Trade = require('./models/Trade');
const Exchange = require('./models/Exchange');
const Settings = require('./models/Settings');

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests' } }));
app.use('/api', rateLimit({ windowMs: 1 * 60 * 1000, max: 120, message: { error: 'Too many requests' } }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/public')));
// Serve uploaded files (logos, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/trades',    require('./routes/trades'));
app.use('/api/exchanges', require('./routes/exchanges'));
app.use('/api/admin',     require('./routes/admin'));

// Public settings (branding, theme, social links — safe to expose)
const PUBLIC_SETTING_KEYS = [
  // Branding
  'siteName','brandLogo','logoSize','flyerImage','flyerMaxWidth','flyerMaxHeight',
  'heroEyebrow','heroTagline','welcomeMessage',
  // Social
  'telegramUrl','tgBtnLabel','twitterUrl','xBtnLabel',
  // Nav / page labels
  'navBtnText','liveBadgeText',
  'statLabelMcap','statLabelVol','statLabelTrades','statLabelTop',
  'topCard1Title','topCard2Title','tableTitle',
  // Stats values
  'marketCap','volume',
  // Colors
  'themeAccent','themeAccent2',
  'colorBg','colorCard','colorBorder','colorText','colorMuted',
  'colorGreen','colorRed','colorYellow',
  // Typography
  'fontFamily','fontSize','fontWeightBody','fontWeightHeading',
];
app.get('/api/settings', async (req, res) => {
  try {
    const docs = await Settings.find({ key: { $in: PUBLIC_SETTING_KEYS } }).lean();
    const settings = {};
    docs.forEach(d => { settings[d.key] = d.value; });
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ── DATABASE ──────────────────────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    await seedDefaults();
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

// Seed default exchanges and settings on first run
async function seedDefaults() {
  const count = await Exchange.countDocuments();
  if (count === 0) {
    const defaults = [
      { name:'Binance',  url:'https://binance.com',   country:'Global',      type:'CEX', makerFee:0.1,  takerFee:0.1,  isLive:true,  apiSource:'binance'  },
      { name:'OKX',      url:'https://okx.com',       country:'Seychelles',  type:'CEX', makerFee:0.08, takerFee:0.1,  isLive:true,  apiSource:'okx'      },
      { name:'Bybit',    url:'https://bybit.com',     country:'Dubai',       type:'CEX', makerFee:0.1,  takerFee:0.1,  isLive:true,  apiSource:'bybit'    },
      { name:'KuCoin',   url:'https://kucoin.com',    country:'Seychelles',  type:'CEX', makerFee:0.1,  takerFee:0.1,  isLive:true,  apiSource:'kucoin'   },
      { name:'Gate.io',  url:'https://gate.io',       country:'Cayman',      type:'CEX', makerFee:0.2,  takerFee:0.2,  isLive:true,  apiSource:'gateio'   },
      { name:'HTX',      url:'https://htx.com',       country:'Seychelles',  type:'CEX', makerFee:0.2,  takerFee:0.2,  isLive:true,  apiSource:'htx'      },
      { name:'Bitget',   url:'https://bitget.com',    country:'Seychelles',  type:'CEX', makerFee:0.1,  takerFee:0.1,  isLive:true,  apiSource:'bitget'   },
      { name:'MEXC',     url:'https://mexc.com',      country:'Global',      type:'CEX', makerFee:0.0,  takerFee:0.1,  isLive:true,  apiSource:'mexc'     },
      { name:'Kraken',   url:'https://kraken.com',    country:'USA',         type:'CEX', makerFee:0.16, takerFee:0.26, isLive:true,  apiSource:'kraken'   },
      { name:'Bitfinex', url:'https://bitfinex.com',  country:'BVI',         type:'CEX', makerFee:0.1,  takerFee:0.2,  isLive:true,  apiSource:'bitfinex' },
      { name:'Poloniex', url:'https://poloniex.com',  country:'Seychelles',  type:'CEX', makerFee:0.1,  takerFee:0.1,  isLive:true,  apiSource:'poloniex' },
      { name:'CoinEx',   url:'https://coinex.com',    country:'Global',      type:'CEX', makerFee:0.2,  takerFee:0.2,  isLive:true,  apiSource:'coinex'   },
      { name:'Phemex',   url:'https://phemex.com',    country:'Singapore',   type:'CEX', makerFee:0.01, takerFee:0.06, isLive:true,  apiSource:'phemex'   },
      { name:'Bitstamp', url:'https://bitstamp.net',  country:'Luxembourg',  type:'CEX', makerFee:0.5,  takerFee:0.5,  isLive:true,  apiSource:'bitstamp' },
      { name:'Coinbase', url:'https://coinbase.com',  country:'USA',         type:'CEX', makerFee:0.4,  takerFee:0.6,  isLive:false, apiSource:null       },
    ];
    await Exchange.insertMany(defaults);
    console.log('✅ Default exchanges seeded');
  }

  // Default settings
  await Settings.set('starterProfitRange', { min: 0, max: 10 });
  await Settings.set('marketCap', '$2.23T');
  await Settings.set('volume', '$72.3B');
  await Settings.set('autoRefresh', true);
  await Settings.set('profitBar', true);
  console.log('✅ Default settings ready');
}

// ── PRICE ENGINE CRON ─────────────────────────────────────────────────────
let isRunning = false;

async function runPriceEngine() {
  if (isRunning) return;
  isRunning = true;
  try {
    console.log('[PriceEngine] Fetching prices...');
    const exchangeData = await fetchAllPrices();
    const opportunities = calculateArbitrage(exchangeData, 0.5);
    console.log(`[PriceEngine] Found ${opportunities.length} opportunities from ${exchangeData.length} exchanges`);

    if (opportunities.length > 0) {
      // Delete old live (non-manual) trades, insert fresh ones
      await Trade.deleteMany({ isManual: false });
      await Trade.insertMany(opportunities.map(o => ({ ...o, isActive: true })));
    }
  } catch (err) {
    console.error('[PriceEngine] Error:', err.message);
  } finally {
    isRunning = false;
  }
}

// Run every 30 seconds
cron.schedule('*/30 * * * * *', runPriceEngine);

// ── START ─────────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Run price engine immediately on start
    setTimeout(runPriceEngine, 3000);
  });
});

module.exports = app;
