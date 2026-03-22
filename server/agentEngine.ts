import { getPriceHistory, getAllPairHistories } from "./priceHistory";
import { sma, ema, rsi, bollingerBands, macd, priceChange, volatility } from "./indicators";
import { getCurrentPrices } from "./prices";

export interface Signal {
  action: "buy" | "sell" | "hold";
  pair: string;
  quantity: number;
  reason: string;
}

type StrategyFn = (agentId: string, cashBalance: number, positions: any[]) => Signal;

const CRYPTO_PAIRS = ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOGE/USD", "AVAX/USD", "DOT/USD", "LINK/USD"];
const STOCK_PAIRS = ["AAPL/USD", "TSLA/USD", "NVDA/USD", "MSFT/USD", "AMZN/USD", "GOOGL/USD", "META/USD", "AMD/USD"];
const ALL_PAIRS = [...CRYPTO_PAIRS, ...STOCK_PAIRS];
const PAIRS = ALL_PAIRS; // backward compat

function randomPair(): string {
  return PAIRS[Math.floor(Math.random() * PAIRS.length)];
}

function sizeForCash(cash: number, price: number, pct: number): number {
  const amount = cash * pct;
  return Math.max(Math.round((amount / price) * 10000) / 10000, 0.001);
}

// === LLM AGENT STRATEGIES ===

/** Warren Buffett: "Be fearful when others are greedy" — buys big dips, holds forever */
function warrenBuffett(_id: string, cash: number, positions: any[]): Signal {
  // Buffett focuses on BTC (digital gold) and blue-chip stocks
  const targets = ["BTC/USD", "AAPL/USD", "MSFT/USD"];
  for (const pair of targets) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const change10 = priceChange(h, 10);
    const price = h[h.length - 1];

    // Only buys after significant dips — be fearful when others are greedy
    if (change10 < -0.03) {
      return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.08), reason: `Value opportunity: ${pair} down ${(change10*100).toFixed(1)}%. Be greedy when others are fearful.` };
    }
  }
  // Never sells at a loss — diamond hands
  return { action: "hold", pair: "BTC/USD", quantity: 0, reason: "Patience. The stock market transfers money from the impatient to the patient." };
}

/** Cathie Wood: Disruptive innovation — high conviction in innovation assets */
function cathieWood(_id: string, cash: number, positions: any[]): Signal {
  const innovationPairs = ["SOL/USD", "LINK/USD", "AVAX/USD", "DOT/USD", "TSLA/USD", "NVDA/USD", "AMD/USD"];
  for (const pair of innovationPairs) {
    const h = getPriceHistory(pair);
    if (h.length < 10) continue;
    const change = priceChange(h, 5);
    const price = h[h.length - 1];

    if (change > 0.001) {
      return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.06), reason: `Innovation play: ${pair} momentum +${(change*100).toFixed(2)}%. Disruption waits for no one.` };
    }
  }
  // Sell only on major trend reversal
  for (const pos of positions) {
    const h = getPriceHistory(pos.pair);
    if (h.length >= 10 && priceChange(h, 10) < -0.05) {
      return { action: "sell", pair: pos.pair, quantity: pos.quantity, reason: `Cutting ${pos.pair}: down ${(priceChange(h,10)*100).toFixed(1)}%. Redeploying capital.` };
    }
  }
  return { action: "hold", pair: "SOL/USD", quantity: 0, reason: "Conviction holds. 5-year time horizon." };
}

/** Qwen Arbitrage: Mean reversion */
function qwenArbitrage(_id: string, cash: number, positions: any[]): Signal {
  const pair = "ETH/USD";
  const h = getPriceHistory(pair);
  if (h.length < 20) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const bb = bollingerBands(h, 20, 2);
  const price = h[h.length - 1];

  if (price < bb.lower) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.06), reason: `Below lower BB: ${price.toFixed(2)} < ${bb.lower.toFixed(2)}` };
  }
  if (price > bb.upper && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 0.1, reason: `Above upper BB: ${price.toFixed(2)} > ${bb.upper.toFixed(2)}` };
  }
  return { action: "hold", pair, quantity: 0, reason: "Within BB range" };
}

/** Stanley Druckenmiller: Macro momentum — bet big on the strongest trend */
function stanleyDruckenmiller(_id: string, cash: number, positions: any[]): Signal {
  let bestPair = ALL_PAIRS[0], bestChange = -Infinity;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 10) continue;
    const change = priceChange(h, 10);
    if (change > bestChange) { bestChange = change; bestPair = pair; }
  }
  if (bestChange > 0.002) {
    const price = getPriceHistory(bestPair).slice(-1)[0] ?? 100;
    return { action: "buy", pair: bestPair, quantity: sizeForCash(cash, price, 0.10), reason: `Macro play: ${bestPair} strongest momentum +${(bestChange*100).toFixed(2)}%. When you see it, bet big.` };
  }
  // Quick stop-loss on reversals
  for (const pos of positions) {
    const h = getPriceHistory(pos.pair);
    if (h.length >= 5 && priceChange(h, 5) < -0.003) {
      return { action: "sell", pair: pos.pair, quantity: pos.quantity, reason: `Cutting ${pos.pair}: momentum reversed. Preserve capital.` };
    }
  }
  return { action: "hold", pair: bestPair, quantity: 0, reason: "Waiting for a clear macro setup." };
}

/** Llama Scalper: Tiny moves, high frequency */
function llamaScalper(_id: string, cash: number, _pos: any[]): Signal {
  const pair = randomPair();
  const h = getPriceHistory(pair);
  if (h.length < 5) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const change = priceChange(h, 2);
  const price = h[h.length - 1];

  if (change > 0.0005) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.02), reason: `Micro-momentum: +${(change*100).toFixed(3)}%` };
  }
  if (change < -0.0005) {
    return { action: "sell", pair, quantity: sizeForCash(cash, price, 0.02), reason: `Micro-dip: ${(change*100).toFixed(3)}%` };
  }
  return { action: "hold", pair, quantity: 0, reason: "Flat" };
}

/** Charlie Munger: Quality at fair price — only blue chips, very selective */
function charlieMunger(_id: string, cash: number, positions: any[]): Signal {
  const blueChips = ["BTC/USD", "ETH/USD", "AAPL/USD", "MSFT/USD", "GOOGL/USD"];
  for (const pair of blueChips) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const r = rsi(h);
    const trend = priceChange(h, 20);
    const price = h[h.length - 1];

    // Very selective: RSI < 45 AND positive long-term trend
    if (r < 45 && trend > 0.001) {
      return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.03), reason: `Quality at fair price: ${pair} RSI=${r.toFixed(0)}, trend +${(trend*100).toFixed(2)}%. Invest in wonderful companies.` };
    }
  }
  return { action: "hold", pair: "BTC/USD", quantity: 0, reason: "All I want to know is where I'm going to die, so I'll never go there." };
}

/** Bill Ackman: Activist — big concentrated bets on highest volatility */
function billAckman(_id: string, cash: number, positions: any[]): Signal {
  let highVolPair = ALL_PAIRS[0], highVol = 0;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const v = volatility(h);
    if (v > highVol) { highVol = v; highVolPair = pair; }
  }
  if (highVol > 0.002 && positions.length < 2) {
    const price = getPriceHistory(highVolPair).slice(-1)[0] ?? 100;
    return { action: "buy", pair: highVolPair, quantity: sizeForCash(cash, price, 0.10), reason: `Activist play: ${highVolPair} vol=${(highVol*100).toFixed(2)}%. Going big. Concentrated conviction.` };
  }
  // Take profit at 5% or cut loss at 3%
  for (const pos of positions) {
    const pnlPct = pos.unrealizedPnl / (pos.avgEntryPrice * pos.quantity);
    if (pnlPct > 0.05) return { action: "sell", pair: pos.pair, quantity: pos.quantity, reason: `Taking profit: +${(pnlPct*100).toFixed(1)}%. Thesis played out.` };
    if (pnlPct < -0.03) return { action: "sell", pair: pos.pair, quantity: pos.quantity, reason: `Cutting loss: ${(pnlPct*100).toFixed(1)}%. Thesis broken.` };
  }
  return { action: "hold", pair: highVolPair, quantity: 0, reason: "Looking for the next Herbalife. Where's the catalyst?" };
}

// === ALGO BOT STRATEGIES ===

/** Mean Reversion Bot v3: Bollinger Bands */
function meanReversionBot(_id: string, cash: number, positions: any[]): Signal {
  const pair = "ETH/USD";
  const h = getPriceHistory(pair);
  if (h.length < 20) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const bb = bollingerBands(h);
  const r = rsi(h);
  const price = h[h.length - 1];

  if (price < bb.lower && r < 35) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.05), reason: `BB lower + RSI ${r.toFixed(0)}` };
  }
  if (price > bb.upper && r > 65 && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 0.1, reason: `BB upper + RSI ${r.toFixed(0)}` };
  }
  return { action: "hold", pair, quantity: 0, reason: `RSI ${r.toFixed(0)}, within bands` };
}

/** MACD CrossBot */
function macdCrossBot(_id: string, cash: number, positions: any[]): Signal {
  const pair = "BNB/USD";
  const h = getPriceHistory(pair);
  if (h.length < 26) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const m = macd(h);
  const price = h[h.length - 1];

  if (m.histogram > 0 && m.macdLine > 0) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.04), reason: `MACD bullish: histogram ${m.histogram.toFixed(4)}` };
  }
  if (m.histogram < 0 && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 1, reason: `MACD bearish crossover` };
  }
  return { action: "hold", pair, quantity: 0, reason: "MACD neutral" };
}

/** Ichimoku Scanner: SMA crossover */
function ichimokuScanner(_id: string, cash: number, positions: any[]): Signal {
  const pair = "LINK/USD";
  const h = getPriceHistory(pair);
  if (h.length < 26) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const sma9 = sma(h, 9);
  const sma26 = sma(h, 26);
  const price = h[h.length - 1];

  if (price > sma9 && sma9 > sma26) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.05), reason: `Above cloud: price>${sma9.toFixed(2)}>${sma26.toFixed(2)}` };
  }
  if (price < sma9 && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 1, reason: "Below Tenkan" };
  }
  return { action: "hold", pair, quantity: 0, reason: "In cloud" };
}

/** RSI Divergence Pro */
function rsiDivergencePro(_id: string, cash: number, positions: any[]): Signal {
  const pair = "XRP/USD";
  const h = getPriceHistory(pair);
  if (h.length < 15) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const r = rsi(h);
  const price = h[h.length - 1];

  if (r < 30) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.05), reason: `RSI oversold: ${r.toFixed(0)}` };
  }
  if (r > 70 && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 10, reason: `RSI overbought: ${r.toFixed(0)}` };
  }
  return { action: "hold", pair, quantity: 0, reason: `RSI neutral: ${r.toFixed(0)}` };
}

/** Volatility Harvester */
function volatilityHarvester(_id: string, cash: number, _pos: any[]): Signal {
  let highVolPair = PAIRS[0], highVol = 0;
  for (const pair of PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const v = volatility(h);
    if (v > highVol) { highVol = v; highVolPair = pair; }
  }
  if (highVol > 0.003) {
    const h = getPriceHistory(highVolPair);
    const price = h[h.length - 1];
    const change = priceChange(h, 3);
    const side = change > 0 ? "buy" : "sell";
    return { action: side, pair: highVolPair, quantity: sizeForCash(cash, price, 0.03), reason: `High vol ${highVolPair}: ${(highVol*100).toFixed(2)}%` };
  }
  return { action: "hold", pair: highVolPair, quantity: 0, reason: "Low volatility" };
}

/** Grid Trading Bot */
function gridBot(_id: string, cash: number, positions: any[]): Signal {
  const pair = "ADA/USD";
  const h = getPriceHistory(pair);
  if (h.length < 20) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const price = h[h.length - 1];
  const avg = sma(h, 20);
  const gridSize = avg * 0.01; // 1% grid levels

  if (price < avg - gridSize) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.03), reason: `Below grid: ${price.toFixed(4)} < ${(avg-gridSize).toFixed(4)}` };
  }
  if (price > avg + gridSize && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 10, reason: `Above grid` };
  }
  return { action: "hold", pair, quantity: 0, reason: "Within grid" };
}

/** DCA Optimizer: Buy on dips */
function dcaOptimizer(_id: string, cash: number, _pos: any[]): Signal {
  const pair = "BTC/USD";
  const h = getPriceHistory(pair);
  if (h.length < 10) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const change = priceChange(h, 10);
  const price = h[h.length - 1];

  // DCA on any dip > 0.1%
  if (change < -0.001) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.02), reason: `DCA on dip: ${(change*100).toFixed(2)}%` };
  }
  return { action: "hold", pair, quantity: 0, reason: "Waiting for dip" };
}

/** Random Walk Baseline */
function randomWalk(_id: string, cash: number, positions: any[]): Signal {
  const pair = randomPair();
  const price = getPriceHistory(pair).slice(-1)[0] ?? 100;
  const roll = Math.random();

  if (roll < 0.3) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.02), reason: "Random buy" };
  }
  if (roll > 0.7 && positions.length > 0) {
    const pos = positions[Math.floor(Math.random() * positions.length)];
    return { action: "sell", pair: pos.pair, quantity: Math.min(pos.quantity, sizeForCash(cash, price, 0.02)), reason: "Random sell" };
  }
  return { action: "hold", pair, quantity: 0, reason: "Random hold" };
}

// === HYBRID STRATEGIES ===

/** Michael Burry: Contrarian — buy extreme oversold, sell overbought */
function michaelBurry(_id: string, cash: number, positions: any[]): Signal {
  // Find the most oversold pair across all assets
  let mostOversold = ALL_PAIRS[0], lowestRSI = 100;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 15) continue;
    const r = rsi(h);
    if (r < lowestRSI) { lowestRSI = r; mostOversold = pair; }
  }
  if (lowestRSI < 25) {
    const price = getPriceHistory(mostOversold).slice(-1)[0] ?? 100;
    return { action: "buy", pair: mostOversold, quantity: sizeForCash(cash, price, 0.06), reason: `Contrarian buy: ${mostOversold} RSI=${lowestRSI.toFixed(0)}. Everyone's selling. I'm buying.` };
  }
  // Sell overbought positions
  for (const pos of positions) {
    const h = getPriceHistory(pos.pair);
    if (h.length >= 15 && rsi(h) > 75) {
      return { action: "sell", pair: pos.pair, quantity: pos.quantity, reason: `${pos.pair} RSI=${rsi(h).toFixed(0)}. Overbought. The Big Short.` };
    }
  }
  return { action: "hold", pair: mostOversold, quantity: 0, reason: "Waiting for extreme fear. That's where the money is." };
}

/** Peter Lynch: "Buy what you understand" — sustained growth across diversified pairs */
function peterLynch(_id: string, cash: number, _pos: any[]): Signal {
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const change10 = priceChange(h, 10);
    const change20 = priceChange(h, 20);
    const price = h[h.length - 1];

    // Sustained growth — positive over both 10 and 20 periods
    if (change10 > 0.002 && change20 > 0.003) {
      return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.04), reason: `Growth stock: ${pair} up ${(change10*100).toFixed(1)}% (10p) and ${(change20*100).toFixed(1)}% (20p). Invest in what you know.` };
    }
  }
  return { action: "hold", pair: "AAPL/USD", quantity: 0, reason: "Looking for tenbaggers. Not finding any yet." };
}

/** Ben Graham: Margin of safety — only buys at extreme lows */
function benGraham(_id: string, cash: number, positions: any[]): Signal {
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const price = h[h.length - 1];
    const low20 = Math.min(...h.slice(-20));
    const high20 = Math.max(...h.slice(-20));

    // Only buy at 20-period lows — margin of safety
    if (price <= low20 * 1.01) {
      return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.04), reason: `Margin of safety: ${pair} at 20-period low $${price.toFixed(2)}. Net-net value.` };
    }
    // Sell at 20-period highs
    if (price >= high20 * 0.99 && positions.some(p => p.pair === pair)) {
      return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 1, reason: `${pair} at 20-period high. Taking the gift the market offers.` };
    }
  }
  return { action: "hold", pair: "AAPL/USD", quantity: 0, reason: "In the short run, the market is a voting machine. In the long run, it is a weighing machine." };
}

// === STRATEGY REGISTRY ===

const STRATEGY_MAP: Record<string, StrategyFn> = {
  "agent-1": warrenBuffett,          // Warren Buffett — value, buy dips
  "agent-2": cathieWood,             // Cathie Wood — disruptive innovation
  "agent-3": meanReversionBot,       // Mean Reversion Bot v3 (algo)
  "agent-4": qwenArbitrage,          // Qwen Arbitrage (algo)
  "agent-5": macdCrossBot,           // MACD CrossBot (algo)
  "agent-6": stanleyDruckenmiller,   // Stanley Druckenmiller — macro momentum
  "agent-7": ichimokuScanner,        // Ichimoku Scanner (algo)
  "agent-8": michaelBurry,           // Michael Burry — contrarian
  "agent-9": volatilityHarvester,    // Volatility Harvester (algo)
  "agent-10": llamaScalper,          // Llama Scalper (algo)
  "agent-11": rsiDivergencePro,      // RSI Divergence Pro (algo)
  "agent-12": peterLynch,            // Peter Lynch — growth
  "agent-13": charlieMunger,         // Charlie Munger — quality
  "agent-14": gridBot,               // Grid Trading Bot (algo)
  "agent-15": dcaOptimizer,          // DCA Optimizer (algo)
  "agent-16": billAckman,            // Bill Ackman — activist
  "agent-17": benGraham,             // Ben Graham — deep value
  "agent-18": randomWalk,            // Random Walk Baseline (control)
};

export function getStrategy(agentId: string): StrategyFn | undefined {
  return STRATEGY_MAP[agentId];
}

export function getAllStrategyAgentIds(): string[] {
  return Object.keys(STRATEGY_MAP);
}
