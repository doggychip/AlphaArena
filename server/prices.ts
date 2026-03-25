import { log } from "./index";

// CoinGecko ID to pair mapping
const COINGECKO_ID_MAP: Record<string, string> = {
  bitcoin: "BTC/USD",
  ethereum: "ETH/USD",
  binancecoin: "BNB/USD",
  solana: "SOL/USD",
  ripple: "XRP/USD",
  cardano: "ADA/USD",
  dogecoin: "DOGE/USD",
  "avalanche-2": "AVAX/USD",
  polkadot: "DOT/USD",
  chainlink: "LINK/USD",
};

const COINGECKO_IDS = Object.keys(COINGECKO_ID_MAP).join(",");
const COINGECKO_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true`;

// Top 50 US stocks by market cap
const STOCK_TICKERS = [
  // Mega caps
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "BRK-B", "AVGO", "LLY", "TSM",
  // Large caps
  "JPM", "TSLA", "WMT", "V", "UNH", "MA", "XOM", "JNJ", "PG", "HD",
  // Tech & growth
  "ORCL", "COST", "AMD", "CRM", "NFLX", "ADBE", "CSCO", "ACN", "QCOM", "INTC",
  // Healthcare & finance
  "PFE", "MRK", "ABT", "BAC", "KO", "PEP", "TMO", "ABBV", "CVX", "MCD",
  // Industrial & consumer
  "DIS", "NKE", "LIN", "TXN", "AMGN", "UNP", "PM", "HON", "RTX", "LOW",
];

// Fallback simulated prices
const basePrices: Record<string, number> = {
  "BTC/USD": 87420,
  "ETH/USD": 3180,
  "BNB/USD": 625,
  "SOL/USD": 148,
  "XRP/USD": 2.45,
  "ADA/USD": 0.72,
  "DOGE/USD": 0.165,
  "AVAX/USD": 38.5,
  "DOT/USD": 7.82,
  "LINK/USD": 16.4,
  // Mega caps
  "AAPL/USD": 178.50, "MSFT/USD": 420.15, "NVDA/USD": 125.80, "GOOGL/USD": 155.40,
  "AMZN/USD": 185.60, "META/USD": 505.20, "BRK-B/USD": 420.50, "AVGO/USD": 168.30,
  "LLY/USD": 785.40, "TSM/USD": 155.20,
  // Large caps
  "JPM/USD": 195.80, "TSLA/USD": 245.30, "WMT/USD": 165.90, "V/USD": 280.40,
  "UNH/USD": 520.60, "MA/USD": 465.30, "XOM/USD": 108.70, "JNJ/USD": 155.20,
  "PG/USD": 162.80, "HD/USD": 345.60,
  // Tech & growth
  "ORCL/USD": 125.40, "COST/USD": 735.80, "AMD/USD": 125.90, "CRM/USD": 265.40,
  "NFLX/USD": 625.30, "ADBE/USD": 485.60, "CSCO/USD": 52.40, "ACN/USD": 335.20,
  "QCOM/USD": 165.80, "INTC/USD": 32.50,
  // Healthcare & finance
  "PFE/USD": 28.90, "MRK/USD": 125.60, "ABT/USD": 112.40, "BAC/USD": 38.50,
  "KO/USD": 60.80, "PEP/USD": 175.30, "TMO/USD": 565.40, "ABBV/USD": 168.20,
  "CVX/USD": 155.60, "MCD/USD": 285.40,
  // Industrial & consumer
  "DIS/USD": 112.30, "NKE/USD": 98.50, "LIN/USD": 445.60, "TXN/USD": 175.80,
  "AMGN/USD": 285.30, "UNP/USD": 245.60, "PM/USD": 118.40, "HON/USD": 205.30,
  "RTX/USD": 98.60, "LOW/USD": 235.40,
};

interface PriceData {
  pair: string;
  price: number;
  change24h: number;
}

interface PriceCache {
  prices: PriceData[];
  timestamp: number;
  isLive: boolean;
}

let cache: PriceCache = {
  prices: [],
  timestamp: 0,
  isLive: false,
};

// Simulated prices state
let simulatedPrices: Record<string, number> = { ...basePrices };
let lastSimUpdate = 0;

function getSimulatedPrices(): PriceData[] {
  const now = Date.now();
  if (now - lastSimUpdate > 5000) {
    lastSimUpdate = now;
    const MAX_DRIFT = 0.20; // Cap at +/-20% from base price
    for (const pair of Object.keys(simulatedPrices)) {
      const base = basePrices[pair];
      const change = (Math.random() - 0.5) * 0.004; // +/-0.2%
      // Add mean reversion: pull back toward base when drifting too far
      const drift = (simulatedPrices[pair] - base) / base;
      const reversion = -drift * 0.02; // 2% mean reversion force
      let newPrice = simulatedPrices[pair] * (1 + change + reversion);
      // Hard clamp to max drift range
      newPrice = Math.max(base * (1 - MAX_DRIFT), Math.min(base * (1 + MAX_DRIFT), newPrice));
      simulatedPrices[pair] = Math.round(newPrice * 100) / 100;
    }
  }
  return Object.entries(simulatedPrices).map(([pair, price]) => {
    const base = basePrices[pair];
    const change24h = ((price - base) / base) * 100;
    return { pair, price, change24h: Math.round(change24h * 100) / 100 };
  });
}

// Initialize simulated prices with slight variations (max +/-0.5%)
for (const pair of Object.keys(simulatedPrices)) {
  const change = (Math.random() - 0.5) * 0.01;
  simulatedPrices[pair] =
    Math.round(basePrices[pair] * (1 + change) * 100) / 100;
}

// When live prices are available, sync simulated base prices so they stay realistic
export function syncSimulatedBasePrices(livePrices: PriceData[]) {
  for (const p of livePrices) {
    if (basePrices[p.pair] !== undefined) {
      basePrices[p.pair] = p.price;
      // Also reset simulated price if it has drifted far from new base
      const drift = Math.abs(simulatedPrices[p.pair] - p.price) / p.price;
      if (drift > 0.05) {
        simulatedPrices[p.pair] = p.price;
      }
    }
  }
}

async function fetchCoinGeckoPrices(): Promise<PriceData[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(COINGECKO_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      log(`CoinGecko API returned ${res.status}`, "prices");
      return null;
    }

    const data = await res.json();
    const prices: PriceData[] = [];

    for (const [geckoId, pair] of Object.entries(COINGECKO_ID_MAP)) {
      const entry = data[geckoId];
      if (entry && typeof entry.usd === "number") {
        prices.push({
          pair,
          price: entry.usd,
          change24h:
            Math.round((entry.usd_24h_change ?? 0) * 100) / 100,
        });
      }
    }

    if (prices.length === 0) return null;
    return prices;
  } catch (err: any) {
    if (err.name !== "AbortError") {
      log(`CoinGecko fetch error: ${err.message}`, "prices");
    }
    return null;
  }
}

async function fetchStockPrices(): Promise<PriceData[]> {
  const prices: PriceData[] = [];
  // Fetch in batches of 10 concurrently to avoid rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < STOCK_TICKERS.length; i += BATCH_SIZE) {
    const batch = STOCK_TICKERS.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (ticker) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) return null;
        const meta = result.meta;
        const price = meta.regularMarketPrice ?? meta.previousClose;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change24h = prevClose > 0 ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;
        return { pair: `${ticker}/USD`, price: Math.round(price * 100) / 100, change24h } as PriceData;
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) prices.push(r.value);
    }
  }
  return prices;
}

async function refreshPrices() {
  const [livePrices, stockPrices] = await Promise.all([
    fetchCoinGeckoPrices().catch(() => null),
    fetchStockPrices().catch(() => [] as PriceData[]),
  ]);
  const allLive = [...(livePrices ?? []), ...stockPrices];

  // Sync live prices into simulated base so simulated prices stay realistic
  if (allLive.length > 0) {
    syncSimulatedBasePrices(allLive);
  }

  // Fill in any missing pairs from simulated prices so every pair always has a price
  const livePairSet = new Set(allLive.map(p => p.pair));
  const simulated = getSimulatedPrices();
  for (const sim of simulated) {
    if (!livePairSet.has(sim.pair)) {
      allLive.push(sim);
    }
  }

  cache = {
    prices: allLive,
    timestamp: Date.now(),
    isLive: (livePrices?.length ?? 0) > 0,
  };

  const liveCount = livePrices?.length ?? 0;
  const stockCount = stockPrices.length;
  const simCount = allLive.length - liveCount - stockCount;
  if (liveCount > 0 || stockCount > 0) {
    log(`Fetched live prices for ${liveCount + stockCount} pairs (${liveCount} crypto + ${stockCount} stocks${simCount > 0 ? ` + ${simCount} simulated` : ""})`, "prices");
  } else {
    log("Using simulated prices (APIs unavailable)", "prices");
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export async function startPriceEngine() {
  // Initial fetch — try to get live prices but fall back to simulated if APIs are unreachable
  try {
    await refreshPrices();
  } catch (err: any) {
    log(`Initial price fetch failed, using simulated prices: ${err.message}`, "prices");
    cache = {
      prices: getSimulatedPrices(),
      timestamp: Date.now(),
      isLive: false,
    };
  }
  // Refresh every 30 seconds
  intervalHandle = setInterval(refreshPrices, 30000);
  log("Price engine started (30s refresh interval)", "prices");
}

export function getCurrentPrices(): {
  prices: PriceData[];
  isLive: boolean;
} {
  // If cache is empty (engine just started), return simulated
  if (cache.prices.length === 0) {
    return { prices: getSimulatedPrices(), isLive: false };
  }

  // If using simulated prices, update them on each call for responsiveness
  if (!cache.isLive) {
    return { prices: getSimulatedPrices(), isLive: false };
  }

  return { prices: cache.prices, isLive: cache.isLive };
}

// Also export price lookup for trade execution
export function getPriceForPair(pair: string): number | undefined {
  const { prices } = getCurrentPrices();
  const found = prices.find((p) => p.pair === pair);
  return found?.price;
}
