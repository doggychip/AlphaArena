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

// Stock tickers
const STOCK_TICKERS = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "AMD"];

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
  "AAPL/USD": 178.50,
  "TSLA/USD": 245.30,
  "NVDA/USD": 125.80,
  "MSFT/USD": 420.15,
  "AMZN/USD": 185.60,
  "GOOGL/USD": 155.40,
  "META/USD": 505.20,
  "AMD/USD": 125.90,
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
    for (const pair of Object.keys(simulatedPrices)) {
      const change = (Math.random() - 0.5) * 0.004; // +/-0.2%
      simulatedPrices[pair] =
        Math.round(simulatedPrices[pair] * (1 + change) * 100) / 100;
    }
  }
  return Object.entries(simulatedPrices).map(([pair, price]) => {
    const base = basePrices[pair];
    const change24h = ((price - base) / base) * 100;
    return { pair, price, change24h: Math.round(change24h * 100) / 100 };
  });
}

// Initialize simulated prices with slight variations
for (const pair of Object.keys(simulatedPrices)) {
  const change = (Math.random() - 0.5) * 0.01;
  simulatedPrices[pair] =
    Math.round(basePrices[pair] * (1 + change) * 100) / 100;
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
  for (const ticker of STOCK_TICKERS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;
      const meta = result.meta;
      const price = meta.regularMarketPrice ?? meta.previousClose;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change24h = prevClose > 0 ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;
      prices.push({ pair: `${ticker}/USD`, price: Math.round(price * 100) / 100, change24h });
    } catch {}
  }
  return prices;
}

async function refreshPrices() {
  const [livePrices, stockPrices] = await Promise.all([
    fetchCoinGeckoPrices(),
    fetchStockPrices(),
  ]);
  const allLive = [...(livePrices ?? []), ...stockPrices];
  if (allLive.length > 0) {
    cache = {
      prices: allLive,
      timestamp: Date.now(),
      isLive: livePrices !== null,
    };
    log(`Fetched live prices for ${allLive.length} pairs (${livePrices?.length ?? 0} crypto + ${stockPrices.length} stocks)`, "prices");
  } else {
    cache = {
      prices: getSimulatedPrices(),
      timestamp: Date.now(),
      isLive: false,
    };
    log("Using simulated prices (CoinGecko unavailable)", "prices");
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startPriceEngine() {
  // Initial fetch
  refreshPrices();
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
