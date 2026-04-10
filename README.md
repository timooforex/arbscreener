# CryptoArb Screener

Full-stack crypto arbitrage screener with live prices, tiered access plans, Paystack + USDT payments, and admin panel.

---

## Project Structure

```
arbscreener/
├── backend/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── middleware/       # Auth & access control
│   ├── services/         # Price engine (14 exchanges)
│   ├── server.js         # Entry point
│   ├── package.json
│   └── .env.example      # ← copy to .env and fill in
└── frontend/
    └── public/
        └── index.html    # Complete frontend (served by backend)
```

---

## Setup Instructions

### Step 1 — Install dependencies
```bash
cd backend
npm install
```

### Step 2 — Configure environment
```bash
cp .env.example .env
# Edit .env and fill in all values
```

### Step 3 — Run locally
```bash
npm run dev
# Visit http://localhost:5000
```

---

## Deploy to Railway (Your Part)

### 1. Push to GitHub
- Create a GitHub account at github.com
- Create a new repository called `arbscreener`
- Upload the entire project folder

### 2. Create MongoDB Atlas database (FREE)
- Go to mongodb.com/atlas → Sign up free
- Create a cluster (free tier M0)
- Click Connect → Drivers → Copy the connection string
- Replace `<password>` with your password
- Paste into your .env as MONGODB_URI

### 3. Deploy on Railway
- Go to railway.app → Sign up with GitHub
- Click "New Project" → Deploy from GitHub repo
- Select your `arbscreener` repo
- Set the **Root Directory** to `backend`
- Railway auto-detects Node.js and runs `npm start`

### 4. Add Environment Variables on Railway
In your Railway project → Variables tab, add ALL values from your .env file:
- MONGODB_URI
- JWT_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
- ADMIN_EMAIL (your email — this gets admin access)
- PAYSTACK_SECRET_KEY (from dashboard.paystack.com)
- PAYSTACK_PUBLIC_KEY
- USDT_MASTER_WALLET (your TRC20 wallet address)
- STARTER_MONTHLY_PRICE, STARTER_YEARLY_PRICE
- PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE
- FRONTEND_URL (your Railway URL, e.g. https://arbscreener.railway.app)
- PORT=5000
- NODE_ENV=production

### 5. Get your live URL
Railway gives you a URL like: `https://arbscreener-production.railway.app`
That's your site — live 24/7.

---

## Admin Access
- Register/login with the email set as ADMIN_EMAIL in your .env
- Admin panel button appears automatically in the nav
- From admin panel you can: manage exchanges, trades, users, payments, plan config

## Plans
- **Free**: Coin + profit % visible, no exchange names
- **Starter**: Exchange names visible for admin-configured profit range
- **Pro**: Full access to all opportunities

## Price Engine
Fetches live prices every 30 seconds from:
Binance, OKX, Bybit, KuCoin, Gate.io, HTX, Bitget, MEXC, Kraken, Bitfinex, Poloniex, CoinEx, Phemex, Bitstamp

## USDT Payments
- Each user gets a unique TRC20 address per payment (no mixed transactions)
- Admin manually confirms after verifying on blockchain explorer
- Go to Admin → Payments tab → Enter Payment ID + TX Hash → Confirm
