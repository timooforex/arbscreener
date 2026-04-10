const axios = require('axios');

// ── All exchanges with free public APIs ──────────────────────────────────
// Each fetcher returns: { [symbol]: { bid, ask, last } }

async function fetchBinance() {
  const { data } = await axios.get('https://api.binance.com/api/v3/ticker/bookTicker', { timeout: 8000 });
  const result = {};
  data.forEach(t => {
    result[t.symbol] = { bid: +t.bidPrice, ask: +t.askPrice, last: (+t.bidPrice + +t.askPrice) / 2 };
  });
  return { exchange: 'Binance', prices: result };
}

async function fetchCoinbase() {
  const { data } = await axios.get('https://api.exchange.coinbase.com/products', { timeout: 8000 });
  const result = {};
  await Promise.allSettled(
    data.slice(0, 80).map(async p => {
      try {
        const { data: ticker } = await axios.get(
          `https://api.exchange.coinbase.com/products/${p.id}/ticker`, { timeout: 5000 }
        );
        result[p.id.replace('-','/')] = { bid: +ticker.bid, ask: +ticker.ask, last: +ticker.price };
      } catch {}
    })
  );
  return { exchange: 'Coinbase', prices: result };
}

async function fetchKraken() {
  const { data } = await axios.get('https://api.kraken.com/0/public/Ticker', {
    params: { pair: 'XBTUSD,ETHUSD,SOLUSD,ADAUSD,DOTUSD,LINKUSD,LTCUSD,XRPUSD,DOGEUSD,AVAXUSD,MATICUSD,ATOMUSD' },
    timeout: 8000
  });
  const result = {};
  const map = { XXBTZUSD:'BTC/USD',XETHZUSD:'ETH/USD',SOLUSD:'SOL/USD',ADAUSD:'ADA/USD',
    DOTUSD:'DOT/USD',LINKUSD:'LINK/USD',XLTCZUSD:'LTC/USD',XXRPZUSD:'XRP/USD',
    DOGEUSD:'DOGE/USD',AVAXUSD:'AVAX/USD',MATICUSD:'MATIC/USD',ATOMUSD:'ATOM/USD' };
  Object.entries(data.result || {}).forEach(([k, v]) => {
    const sym = map[k] || k;
    result[sym] = { bid: +v.b[0], ask: +v.a[0], last: +v.c[0] };
  });
  return { exchange: 'Kraken', prices: result };
}

async function fetchOKX() {
  const { data } = await axios.get('https://www.okx.com/api/v5/market/tickers?instType=SPOT', { timeout: 8000 });
  const result = {};
  (data.data || []).forEach(t => {
    const sym = t.instId.replace('-','/');
    result[sym] = { bid: +t.bidPx, ask: +t.askPx, last: +t.last };
  });
  return { exchange: 'OKX', prices: result };
}

async function fetchBybit() {
  const { data } = await axios.get('https://api.bybit.com/v5/market/tickers?category=spot', { timeout: 8000 });
  const result = {};
  (data.result?.list || []).forEach(t => {
    const sym = t.symbol.replace(/([A-Z]+)(USDT|USDC|BTC|ETH|BNB)$/, '$1/$2');
    result[sym] = { bid: +t.bid1Price, ask: +t.ask1Price, last: +t.lastPrice };
  });
  return { exchange: 'Bybit', prices: result };
}

async function fetchKucoin() {
  const { data } = await axios.get('https://api.kucoin.com/api/v1/market/allTickers', { timeout: 8000 });
  const result = {};
  (data.data?.ticker || []).forEach(t => {
    const sym = t.symbol.replace('-','/');
    result[sym] = { bid: +t.buy, ask: +t.sell, last: +t.last };
  });
  return { exchange: 'KuCoin', prices: result };
}

async function fetchGateio() {
  const { data } = await axios.get('https://api.gateio.ws/api/v4/spot/tickers', { timeout: 8000 });
  const result = {};
  data.forEach(t => {
    const sym = t.currency_pair.replace('_','/');
    result[sym] = { bid: +t.highest_bid, ask: +t.lowest_ask, last: +t.last };
  });
  return { exchange: 'Gate.io', prices: result };
}

async function fetchHTX() {
  const { data } = await axios.get('https://api.huobi.pro/market/tickers', { timeout: 8000 });
  const result = {};
  (data.data || []).forEach(t => {
    const sym = t.symbol.toUpperCase().replace(/([A-Z]+)(USDT|USDC|BTC|ETH|HT)$/, '$1/$2');
    result[sym] = { bid: +t.bid, ask: +t.ask, last: +t.close };
  });
  return { exchange: 'HTX', prices: result };
}

async function fetchBitget() {
  const { data } = await axios.get('https://api.bitget.com/api/v2/spot/market/tickers', { timeout: 8000 });
  const result = {};
  (data.data || []).forEach(t => {
    const sym = t.symbol.replace(/([A-Z]+)(USDT|USDC|BTC|ETH)$/, '$1/$2');
    result[sym] = { bid: +t.bidPr, ask: +t.askPr, last: +t.lastPr };
  });
  return { exchange: 'Bitget', prices: result };
}

async function fetchMEXC() {
  const { data } = await axios.get('https://api.mexc.com/api/v3/ticker/bookTicker', { timeout: 8000 });
  const result = {};
  data.forEach(t => {
    const sym = t.symbol.replace(/([A-Z]+)(USDT|USDC|BTC|ETH)$/, '$1/$2');
    result[sym] = { bid: +t.bidPrice, ask: +t.askPrice, last: (+t.bidPrice + +t.askPrice) / 2 };
  });
  return { exchange: 'MEXC', prices: result };
}

async function fetchBitfinex() {
  const { data } = await axios.get('https://api-pub.bitfinex.com/v2/tickers?symbols=ALL', { timeout: 8000 });
  const result = {};
  data.filter(t => t[0].startsWith('t')).forEach(t => {
    const raw = t[0].slice(1);
    const sym = raw.includes(':') ? raw.replace(':','/') : raw.slice(0,-3)+'/'+raw.slice(-3);
    result[sym] = { bid: +t[1], ask: +t[3], last: +t[7] };
  });
  return { exchange: 'Bitfinex', prices: result };
}

async function fetchPoloniex() {
  const { data } = await axios.get('https://api.poloniex.com/markets/ticker24h', { timeout: 8000 });
  const result = {};
  data.forEach(t => {
    const sym = t.symbol.replace('_','/');
    result[sym] = { bid: +t.bid, ask: +t.ask, last: +t.close };
  });
  return { exchange: 'Poloniex', prices: result };
}

async function fetchBitstamp() {
  const { data } = await axios.get('https://www.bitstamp.net/api/v2/trading-pairs-info/', { timeout: 8000 });
  const result = {};
  await Promise.allSettled(
    data.slice(0, 40).map(async p => {
      try {
        const { data: ticker } = await axios.get(
          `https://www.bitstamp.net/api/v2/ticker/${p.url_symbol}/`, { timeout: 5000 }
        );
        result[p.name.replace('/','/').toUpperCase()] = { bid: +ticker.bid, ask: +ticker.ask, last: +ticker.last };
      } catch {}
    })
  );
  return { exchange: 'Bitstamp', prices: result };
}

async function fetchCoinEx() {
  const { data } = await axios.get('https://api.coinex.com/v2/spot/ticker', { timeout: 8000 });
  const result = {};
  (data.data || []).forEach(t => {
    const sym = t.market.replace(/([A-Z]+)(USDT|USDC|BTC|ETH)$/, '$1/$2');
    result[sym] = { bid: +t.best_bid_price, ask: +t.best_ask_price, last: +t.last };
  });
  return { exchange: 'CoinEx', prices: result };
}

async function fetchPhemex() {
  const { data } = await axios.get('https://api.phemex.com/md/spot/ticker/24hr/all', { timeout: 8000 });
  const result = {};
  (data.result?.list || []).forEach(t => {
    const sym = t.symbol.replace(/([A-Z]+)(USDT|USDC|BTC|ETH)$/, '$1/$2');
    result[sym] = { bid: +t.bidEp / 1e8, ask: +t.askEp / 1e8, last: +t.lastEp / 1e8 };
  });
  return { exchange: 'Phemex', prices: result };
}

// ── All fetchers list ────────────────────────────────────────────────────
const FETCHERS = [
  fetchBinance, fetchOKX, fetchBybit, fetchKucoin, fetchGateio,
  fetchHTX, fetchBitget, fetchMEXC, fetchKraken, fetchBitfinex,
  fetchPoloniex, fetchCoinEx, fetchPhemex, fetchBitstamp
  // Coinbase skipped from auto (rate limited) — can add back
];

// ── Main fetch function ──────────────────────────────────────────────────
// Returns array of { exchange, prices }
async function fetchAllPrices() {
  const results = await Promise.allSettled(FETCHERS.map(f => f()));
  const successful = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      successful.push(r.value);
    } else {
      console.warn(`[PriceEngine] ${FETCHERS[i].name} failed:`, r.reason?.message);
    }
  });
  return successful;
}

// ── Arbitrage calculator ─────────────────────────────────────────────────
// Takes array of { exchange, prices }, returns sorted arbitrage opportunities
function calculateArbitrage(exchangeData, minProfit = 0.5) {
  // Build symbol → exchange → price map
  const symbolMap = {}; // { 'BTC/USDT': { 'Binance': {bid,ask,last}, ... } }

  exchangeData.forEach(({ exchange, prices }) => {
    Object.entries(prices).forEach(([sym, price]) => {
      if (!price.bid || !price.ask || price.bid <= 0 || price.ask <= 0) return;
      if (!symbolMap[sym]) symbolMap[sym] = {};
      symbolMap[sym][exchange] = price;
    });
  });

  const opportunities = [];

  Object.entries(symbolMap).forEach(([pair, exchanges]) => {
    const exchList = Object.entries(exchanges);
    if (exchList.length < 2) return;

    // Find lowest ask (best buy price) and highest bid (best sell price)
    let bestBuy = null, bestSell = null;

    exchList.forEach(([exch, p]) => {
      if (!bestBuy || p.ask < bestBuy.price) bestBuy = { exchange: exch, price: p.ask };
      if (!bestSell || p.bid > bestSell.price) bestSell = { exchange: exch, price: p.bid };
    });

    if (!bestBuy || !bestSell || bestBuy.exchange === bestSell.exchange) return;
    if (bestSell.price <= bestBuy.price) return;

    const profit = +((( bestSell.price - bestBuy.price ) / bestBuy.price) * 100).toFixed(2);
    if (profit < minProfit) return;

    const coin = pair.split('/')[0];
    opportunities.push({
      coin,
      pair,
      buyAt: bestBuy.exchange,
      buyPrice: bestBuy.price,
      sellAt: bestSell.exchange,
      sellPrice: bestSell.price,
      profit,
      depositStatus: 'ok',
      wdStatus: 'ok',
      isManual: false,
      updatedAt: new Date(),
    });
  });

  return opportunities.sort((a, b) => b.profit - a.profit);
}

module.exports = { fetchAllPrices, calculateArbitrage, FETCHERS };
