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

/** George Soros: Reflexivity — bets against overextended trends, breaks the market */
function georgeSoros(_id: string, cash: number, positions: any[]): Signal {
  // Find the most overextended pair (furthest from SMA) and bet against it
  let mostExtended = ALL_PAIRS[0], maxExtension = 0, extDir = 0;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const price = h[h.length - 1];
    const avg = sma(h, 20);
    const ext = Math.abs(price - avg) / avg;
    if (ext > maxExtension) { maxExtension = ext; mostExtended = pair; extDir = price > avg ? 1 : -1; }
  }
  const price = getPriceHistory(mostExtended).slice(-1)[0] ?? 100;
  // If overextended upward — sell (short the bubble)
  if (maxExtension > 0.02 && extDir > 0 && positions.some(p => p.pair === mostExtended)) {
    return { action: "sell", pair: mostExtended, quantity: positions.find(p => p.pair === mostExtended)?.quantity ?? sizeForCash(cash, price, 0.07), reason: `Reflexivity: ${mostExtended} overextended +${(maxExtension*100).toFixed(1)}%. Breaking the Bank of England.` };
  }
  // If overextended downward — buy the snap-back
  if (maxExtension > 0.02 && extDir < 0) {
    return { action: "buy", pair: mostExtended, quantity: sizeForCash(cash, price, 0.07), reason: `Reflexivity: ${mostExtended} oversold -${(maxExtension*100).toFixed(1)}%. Snap-back incoming.` };
  }
  return { action: "hold", pair: mostExtended, quantity: 0, reason: "Markets are reflexive. Waiting for mispricing." };
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

/** David Tepper: Distressed value — buys the worst performers, bets on recovery */
function davidTepper(_id: string, cash: number, _pos: any[]): Signal {
  let worstPair = ALL_PAIRS[0], worstChange = Infinity;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 10) continue;
    const change = priceChange(h, 10);
    if (change < worstChange) { worstChange = change; worstPair = pair; }
  }
  if (worstChange < -0.005) {
    const price = getPriceHistory(worstPair).slice(-1)[0] ?? 100;
    return { action: "buy", pair: worstPair, quantity: sizeForCash(cash, price, 0.06), reason: `Distressed play: ${worstPair} down ${(worstChange*100).toFixed(1)}%. Best time to buy is when there's blood in the streets.` };
  }
  return { action: "hold", pair: worstPair, quantity: 0, reason: "Not enough distress. Waiting for panic." };
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

// === ALGO BOT STRATEGIES (renamed to real investors) ===

/** Ray Dalio: All-Weather — diversified, rebalances constantly */
function rayDalio(_id: string, cash: number, positions: any[]): Signal {
  // Spread across many assets — buy the one furthest below its SMA
  let bestPair = ALL_PAIRS[0], bestGap = 0;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const price = h[h.length - 1];
    const avg = sma(h, 20);
    const gap = (avg - price) / avg; // positive = below average = buy opportunity
    if (gap > bestGap) { bestGap = gap; bestPair = pair; }
  }
  if (bestGap > 0.005 && positions.length < 6) {
    const price = getPriceHistory(bestPair).slice(-1)[0] ?? 100;
    return { action: "buy", pair: bestPair, quantity: sizeForCash(cash, price, 0.03), reason: `All-Weather rebalance: ${bestPair} is ${(bestGap*100).toFixed(1)}% below SMA20. Diversify.` };
  }
  // Sell anything that's too far above average
  for (const pos of positions) {
    const h = getPriceHistory(pos.pair);
    if (h.length < 20) continue;
    const price = h[h.length - 1];
    const avg = sma(h, 20);
    if (price > avg * 1.02) {
      return { action: "sell", pair: pos.pair, quantity: pos.quantity * 0.5, reason: `Rebalancing: ${pos.pair} ${((price/avg-1)*100).toFixed(1)}% above SMA. Trim.` };
    }
  }
  return { action: "hold", pair: bestPair, quantity: 0, reason: "Portfolio balanced. The Holy Grail is uncorrelated bets." };
}

/** Jim Simons: Pure quant — multi-indicator ensemble, statistical edge */
function jimSimons(_id: string, cash: number, positions: any[]): Signal {
  // Score each pair using multiple indicators, take the highest scoring
  let bestPair = ALL_PAIRS[0], bestScore = -Infinity;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 26) continue;
    const r = rsi(h);
    const m = macd(h);
    const change5 = priceChange(h, 5);
    // Composite score: RSI below 50 = buy signal, positive MACD = buy signal, positive momentum = buy signal
    const score = (50 - r) / 50 + (m.histogram > 0 ? 1 : -1) + change5 * 100;
    if (score > bestScore) { bestScore = score; bestPair = pair; }
  }
  const price = getPriceHistory(bestPair).slice(-1)[0] ?? 100;
  if (bestScore > 1.5) {
    return { action: "buy", pair: bestPair, quantity: sizeForCash(cash, price, 0.03), reason: `Medallion signal: ${bestPair} score=${bestScore.toFixed(2)}. The math doesn't lie.` };
  }
  if (bestScore < -1.5) {
    const pos = positions.find(p => p.pair === bestPair);
    if (pos) return { action: "sell", pair: bestPair, quantity: pos.quantity, reason: `Medallion exit: score=${bestScore.toFixed(2)}. Statistical edge says sell.` };
  }
  return { action: "hold", pair: bestPair, quantity: 0, reason: "No statistical edge. Renaissance waits for the signal." };
}

/** Jesse Livermore: Tape reader — follows price action, pyramids into winners */
function jesseLivermore(_id: string, cash: number, positions: any[]): Signal {
  // Find the pair with the strongest recent momentum — ride the tape
  let bestPair = ALL_PAIRS[0], bestMomentum = -Infinity;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 10) continue;
    const mom = priceChange(h, 5);
    if (mom > bestMomentum) { bestMomentum = mom; bestPair = pair; }
  }
  const price = getPriceHistory(bestPair).slice(-1)[0] ?? 100;
  // Pyramid into winners — add to positions that are already profitable
  const existingPos = positions.find(p => p.pair === bestPair);
  if (bestMomentum > 0.001 && existingPos && existingPos.unrealizedPnl > 0) {
    return { action: "buy", pair: bestPair, quantity: sizeForCash(cash, price, 0.04), reason: `Pyramiding: ${bestPair} still rising +${(bestMomentum*100).toFixed(2)}%. Add to winners.` };
  }
  if (bestMomentum > 0.002) {
    return { action: "buy", pair: bestPair, quantity: sizeForCash(cash, price, 0.05), reason: `The tape says buy: ${bestPair} +${(bestMomentum*100).toFixed(2)}%. Follow the leader.` };
  }
  // Cut losers fast
  for (const pos of positions) {
    if (pos.unrealizedPnl < 0) {
      const h = getPriceHistory(pos.pair);
      if (h.length >= 5 && priceChange(h, 5) < -0.002) {
        return { action: "sell", pair: pos.pair, quantity: pos.quantity, reason: `Cutting loser: ${pos.pair}. Never argue with the tape.` };
      }
    }
  }
  return { action: "hold", pair: bestPair, quantity: 0, reason: "Reading the tape. Waiting for a clear move." };
}

/** Howard Marks: Second-level thinking — contrarian RSI with trend filter */
function howardMarks(_id: string, cash: number, positions: any[]): Signal {
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const r = rsi(h);
    const trend = priceChange(h, 20);
    const price = h[h.length - 1];

    // Second-level: everyone sees oversold, but is the long-term trend still up?
    if (r < 35 && trend > 0) {
      return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.04), reason: `Second-level thinking: ${pair} RSI=${r.toFixed(0)} oversold BUT trend still up. Others panic, I buy.` };
    }
    // Sell when overbought AND trend is weakening
    if (r > 70 && trend < 0.001 && positions.some(p => p.pair === pair)) {
      return { action: "sell", pair, quantity: positions.find(p => p.pair === pair)?.quantity ?? 1, reason: `${pair} RSI=${r.toFixed(0)} overbought and trend fading. Second-level says sell.` };
    }
  }
  return { action: "hold", pair: "BTC/USD", quantity: 0, reason: "The most important thing is to think differently from the consensus." };
}

/** Carl Icahn: Activist — biggest position in most volatile, shakes things up */
function carlIcahn(_id: string, cash: number, positions: any[]): Signal {
  let highVolPair = ALL_PAIRS[0], highVol = 0;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const v = volatility(h);
    if (v > highVol) { highVol = v; highVolPair = pair; }
  }
  if (highVol > 0.002) {
    const h = getPriceHistory(highVolPair);
    const price = h[h.length - 1];
    const change = priceChange(h, 5);
    if (change < -0.001) {
      return { action: "buy", pair: highVolPair, quantity: sizeForCash(cash, price, 0.08), reason: `Activist play: ${highVolPair} vol=${(highVol*100).toFixed(2)}%. Buying the dip aggressively. Time to shake things up.` };
    }
    const pos = positions.find(p => p.pair === highVolPair);
    if (pos && change > 0.003) {
      return { action: "sell", pair: highVolPair, quantity: pos.quantity, reason: `Taking activist profits: ${highVolPair} +${(change*100).toFixed(2)}%. Mission accomplished.` };
    }
  }
  return { action: "hold", pair: highVolPair, quantity: 0, reason: "Looking for my next corporate raid. Need more volatility." };
}

/** Phil Fisher: Scuttlebutt — buys strong uptrends and holds indefinitely */
function philFisher(_id: string, cash: number, _pos: any[]): Signal {
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const change5 = priceChange(h, 5);
    const change20 = priceChange(h, 20);
    const price = h[h.length - 1];

    // Strong consistent uptrend on multiple timeframes
    if (change5 > 0.001 && change20 > 0.005) {
      return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.05), reason: `Scuttlebutt confirmed: ${pair} up ${(change5*100).toFixed(2)}% (5p) and ${(change20*100).toFixed(2)}% (20p). Outstanding company. Buy and hold.` };
    }
  }
  // Phil Fisher almost never sells — only if something fundamentally changes
  return { action: "hold", pair: "MSFT/USD", quantity: 0, reason: "If the job has been correctly done, the time to sell is almost never." };
}

/** John Bogle: Index — DCA into everything equally, passive investing */
function johnBogle(_id: string, cash: number, _pos: any[]): Signal {
  // Buy a random pair every cycle — DCA into everything equally
  const pair = ALL_PAIRS[Math.floor(Math.random() * ALL_PAIRS.length)];
  const h = getPriceHistory(pair);
  if (h.length < 5) return { action: "hold", pair, quantity: 0, reason: "Insufficient data" };
  const price = h[h.length - 1];

  // Always buy a tiny amount — true passive indexing
  return { action: "buy", pair, quantity: sizeForCash(cash, price, 0.015), reason: `Index DCA: buying ${pair}. Don't look for the needle. Buy the haystack.` };
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

// === COMMUNITY AGENTS ===

/** OpenClaw Alpha: Open-source community agent — adaptive multi-indicator ensemble */
function openclawAlpha(_id: string, cash: number, positions: any[]): Signal {
  // Crowdsourced strategy: score every pair using RSI + momentum + Bollinger + volatility
  let bestPair = ALL_PAIRS[0], bestScore = -Infinity;
  for (const pair of ALL_PAIRS) {
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const r = rsi(h);
    const mom = priceChange(h, 10);
    const bb = bollingerBands(h);
    const vol = volatility(h);
    const price = h[h.length - 1];

    // Composite: oversold RSI + positive momentum + near lower band + moderate vol
    let score = 0;
    score += (50 - r) / 25;                          // RSI: lower = better buy
    score += mom * 200;                               // Momentum: positive = good
    score += (bb.middle - price) / bb.middle * 10;    // Below middle band = good
    score += vol > 0.001 && vol < 0.01 ? 1 : 0;      // Moderate vol preferred

    if (score > bestScore) { bestScore = score; bestPair = pair; }
  }
  const price = getPriceHistory(bestPair).slice(-1)[0] ?? 100;

  if (bestScore > 2.0) {
    return { action: "buy", pair: bestPair, quantity: sizeForCash(cash, price, 0.05), reason: `Open-source signal: ${bestPair} composite=${bestScore.toFixed(2)}. Community consensus says buy. The lobster way. 🦞` };
  }
  // Sell positions with negative composite score
  for (const pos of positions) {
    const h = getPriceHistory(pos.pair);
    if (h.length < 15) continue;
    const r = rsi(h);
    if (r > 70 && priceChange(h, 5) < -0.001) {
      return { action: "sell", pair: pos.pair, quantity: pos.quantity, reason: `Open-source exit: ${pos.pair} RSI=${r.toFixed(0)}, momentum fading. Community says trim. 🦞` };
    }
  }
  return { action: "hold", pair: bestPair, quantity: 0, reason: "Open-source analysis in progress. The lobster is thinking. 🦞" };
}

/** zhihuiti Alpha: zhihuiti backbone agent — meta-strategy that adapts */
function zhihuitiAlpha(_id: string, cash: number, positions: any[]): Signal {
  // zhihuiti's meta-strategy: combine the best of all strategies
  // Buys when multiple indicators align, sells when they diverge
  let buySignals = 0, sellSignals = 0;
  let targetPair = "BTC/USD";
  let targetPrice = 0;

  for (const pair of ALL_PAIRS.slice(0, 10)) { // Focus on top 10
    const h = getPriceHistory(pair);
    if (h.length < 20) continue;
    const r = rsi(h);
    const mom = priceChange(h, 10);
    const m = macd(h);
    const price = h[h.length - 1];

    if (r < 40 && mom > 0 && m.histogram > 0) {
      buySignals++;
      if (buySignals === 1) { targetPair = pair; targetPrice = price; }
    }
    if (r > 65 && mom < 0 && m.histogram < 0) {
      sellSignals++;
    }
  }

  if (buySignals >= 3) {
    return { action: "buy", pair: targetPair, quantity: sizeForCash(cash, targetPrice || 100, 0.05), reason: `zhihuiti consensus: ${buySignals} pairs showing buy alignment. Multi-agent agreement. 智慧体` };
  }
  if (sellSignals >= 3) {
    const pos = positions[0];
    if (pos) return { action: "sell", pair: pos.pair, quantity: pos.quantity, reason: `zhihuiti consensus: ${sellSignals} pairs bearish. Reducing exposure. 智慧体` };
  }
  return { action: "hold", pair: targetPair, quantity: 0, reason: "zhihuiti agents analyzing. Waiting for multi-agent consensus. 智慧体" };
}

// === STRATEGY REGISTRY ===

const STRATEGY_MAP: Record<string, StrategyFn> = {
  "agent-1": warrenBuffett,          // Warren Buffett — value, buy dips
  "agent-2": cathieWood,             // Cathie Wood — disruptive innovation
  "agent-3": rayDalio,                // Ray Dalio — all-weather, diversified
  "agent-4": georgeSoros,             // George Soros — reflexivity, bets against overextended
  "agent-5": jimSimons,              // Jim Simons — pure quant, multi-indicator
  "agent-6": stanleyDruckenmiller,   // Stanley Druckenmiller — macro momentum
  "agent-7": jesseLivermore,         // Jesse Livermore — tape reader, pyramids
  "agent-8": michaelBurry,           // Michael Burry — contrarian
  "agent-9": carlIcahn,              // Carl Icahn — activist, high vol
  "agent-10": davidTepper,           // David Tepper — distressed value
  "agent-11": howardMarks,           // Howard Marks — second-level thinking
  "agent-12": peterLynch,            // Peter Lynch — growth
  "agent-13": charlieMunger,         // Charlie Munger — quality
  "agent-14": philFisher,            // Phil Fisher — scuttlebutt, buy and hold
  "agent-15": johnBogle,             // John Bogle — index, passive DCA
  "agent-16": billAckman,            // Bill Ackman — activist
  "agent-17": benGraham,             // Ben Graham — deep value
  "agent-18": randomWalk,            // Random Walk Baseline (control)
  "agent-openclaw": openclawAlpha,   // OpenClaw — open-source community agent
  "agent-zhihuiti": zhihuitiAlpha,   // zhihuiti — backbone meta-strategy
};

export function getStrategy(agentId: string): StrategyFn | undefined {
  return STRATEGY_MAP[agentId];
}

export function getAllStrategyAgentIds(): string[] {
  return Object.keys(STRATEGY_MAP);
}
