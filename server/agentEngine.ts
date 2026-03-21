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

const PAIRS = ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOGE/USD", "AVAX/USD", "DOT/USD", "LINK/USD"];

function randomPair(): string {
  return PAIRS[Math.floor(Math.random() * PAIRS.length)];
}

function sizeForCash(cash: number, price: number, pct: number): number {
  const amount = cash * pct;
  return Math.max(Math.round((amount / price) * 10000) / 10000, 0.001);
}

// === LLM AGENT STRATEGIES ===

/** DeepSeek Trader: Trend-following momentum */
function deepseekTrader(_id: string, cash: number, positions: any[]): Signal {
  const pair = "BTC/USD";
  const h = getPriceHistory(pair);
  if (h.length < 20) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const sma10 = sma(h, 10);
  const sma20 = sma(h, 20);
  const price = h[h.length - 1];
  const change = priceChange(h, 5);

  if (sma10 > sma20 && change > 0.001) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.05), reason: `Uptrend: SMA10>${sma20.toFixed(0)}, 5p change +${(change*100).toFixed(2)}%` };
  }
  if (sma10 < sma20 && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 0.01, reason: "Trend reversal: SMA10<SMA20" };
  }
  return { action: "hold", pair, quantity: 0, reason: "No clear signal" };
}

/** GPT-4 Momentum: Multi-pair scanner */
function gpt4Momentum(_id: string, cash: number, _pos: any[]): Signal {
  let bestPair = PAIRS[0], bestChange = -Infinity;
  for (const pair of PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 10) continue;
    const change = priceChange(h, 10);
    if (change > bestChange) { bestChange = change; bestPair = pair; }
  }
  if (bestChange > 0.002) {
    const price = getPriceHistory(bestPair).slice(-1)[0] ?? 100;
    return { action: "buy", pair: bestPair, quantity: sizeForCash(cash, price, 0.04), reason: `Strongest momentum: ${bestPair} +${(bestChange*100).toFixed(2)}%` };
  }
  return { action: "hold", pair: bestPair, quantity: 0, reason: "No strong momentum" };
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

/** Claude Catalyst: Strong trend only */
function claudeCatalyst(_id: string, cash: number, positions: any[]): Signal {
  const pair = "SOL/USD";
  const h = getPriceHistory(pair);
  if (h.length < 20) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const change5 = priceChange(h, 5);
  const change10 = priceChange(h, 10);
  const price = h[h.length - 1];

  if (change5 > 0.003 && change10 > 0.005) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.05), reason: `Strong uptrend confirmed: 5p=${(change5*100).toFixed(2)}%, 10p=${(change10*100).toFixed(2)}%` };
  }
  if (change5 < -0.003 && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 1, reason: "Trend broken" };
  }
  return { action: "hold", pair, quantity: 0, reason: "Waiting for strong trend" };
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

/** Sentiment Pulse: Contrarian */
function sentimentPulse(_id: string, cash: number, positions: any[]): Signal {
  const pair = "BTC/USD";
  const h = getPriceHistory(pair);
  if (h.length < 10) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const change = priceChange(h, 10);
  const price = h[h.length - 1];

  if (change < -0.003) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.04), reason: `Contrarian buy on dip: ${(change*100).toFixed(2)}%` };
  }
  if (change > 0.003 && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 0.01, reason: `Contrarian sell on pump: +${(change*100).toFixed(2)}%` };
  }
  return { action: "hold", pair, quantity: 0, reason: "No extreme move" };
}

/** Mistral Contrarian: Always fades */
function mistralContrarian(_id: string, cash: number, _pos: any[]): Signal {
  let worstPair = PAIRS[0], worstChange = Infinity;
  for (const pair of PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 5) continue;
    const change = priceChange(h, 5);
    if (change < worstChange) { worstChange = change; worstPair = pair; }
  }
  if (worstChange < -0.002) {
    const price = getPriceHistory(worstPair).slice(-1)[0] ?? 100;
    return { action: "buy", pair: worstPair, quantity: sizeForCash(cash, price, 0.03), reason: `Fading worst performer: ${worstPair} ${(worstChange*100).toFixed(2)}%` };
  }
  return { action: "hold", pair: worstPair, quantity: 0, reason: "No big drops to fade" };
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

/** Gemini Alpha: Momentum + RSI */
function geminiAlpha(_id: string, cash: number, positions: any[]): Signal {
  const pair = "DOT/USD";
  const h = getPriceHistory(pair);
  if (h.length < 20) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const r = rsi(h);
  const change = priceChange(h, 10);
  const price = h[h.length - 1];

  if (change > 0.001 && r < 60) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.04), reason: `Momentum + RSI ok: change=${(change*100).toFixed(2)}%, RSI=${r.toFixed(0)}` };
  }
  if ((change < -0.002 || r > 75) && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 1, reason: "Momentum fade or RSI high" };
  }
  return { action: "hold", pair, quantity: 0, reason: "Neutral" };
}

/** Neural Trend v2: Adaptive sizing */
function neuralTrend(_id: string, cash: number, positions: any[]): Signal {
  const pair = "AVAX/USD";
  const h = getPriceHistory(pair);
  if (h.length < 20) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const trend = priceChange(h, 10);
  const vol = volatility(h);
  const price = h[h.length - 1];
  // Adaptive: larger size in low vol, smaller in high vol
  const sizePct = vol > 0 ? Math.min(0.08, 0.02 / vol) : 0.04;

  if (trend > 0.001) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, Math.min(sizePct, 0.08)), reason: `Trend up, adaptive size ${(sizePct*100).toFixed(1)}%` };
  }
  if (trend < -0.002 && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 1, reason: "Trend down" };
  }
  return { action: "hold", pair, quantity: 0, reason: "Flat trend" };
}

/** Fibonacci Retracement AI */
function fibonacciAI(_id: string, cash: number, positions: any[]): Signal {
  const pair = "SOL/USD";
  const h = getPriceHistory(pair);
  if (h.length < 20) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };

  const high = Math.max(...h.slice(-20));
  const low = Math.min(...h.slice(-20));
  const price = h[h.length - 1];
  const range = high - low;
  const fib382 = high - range * 0.382;
  const fib618 = high - range * 0.618;

  if (price <= fib618 && price > low) {
    return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.05), reason: `At Fib 61.8%: ${price.toFixed(2)} near ${fib618.toFixed(2)}` };
  }
  if (price >= fib382 && positions.some(p => p.pair === pair)) {
    return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 1, reason: `At Fib 38.2%: ${price.toFixed(2)} near ${fib382.toFixed(2)}` };
  }
  return { action: "hold", pair, quantity: 0, reason: "Between Fib levels" };
}

// === STRATEGY REGISTRY ===

const STRATEGY_MAP: Record<string, StrategyFn> = {
  "agent-1": deepseekTrader,
  "agent-2": gpt4Momentum,
  "agent-3": meanReversionBot,
  "agent-4": qwenArbitrage,
  "agent-5": macdCrossBot,
  "agent-6": claudeCatalyst,
  "agent-7": ichimokuScanner,
  "agent-8": geminiAlpha,
  "agent-9": volatilityHarvester,
  "agent-10": llamaScalper,
  "agent-11": rsiDivergencePro,
  "agent-12": neuralTrend,
  "agent-13": sentimentPulse,
  "agent-14": gridBot,
  "agent-15": dcaOptimizer,
  "agent-16": mistralContrarian,
  "agent-17": fibonacciAI,
  "agent-18": randomWalk,
};

export function getStrategy(agentId: string): StrategyFn | undefined {
  return STRATEGY_MAP[agentId];
}

export function getAllStrategyAgentIds(): string[] {
  return Object.keys(STRATEGY_MAP);
}
