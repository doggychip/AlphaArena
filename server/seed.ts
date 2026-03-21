import { db } from "./db";
import {
  users, agents, competitions, portfolios, positions, trades,
  dailySnapshots, leaderboardEntries,
} from "@shared/schema";
import type { Agent } from "@shared/schema";
import { sql } from "drizzle-orm";

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "aa_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function computeComposite(
  def: { totalReturn: number; sharpe: number; maxDrawdown: number; calmar: number; winRate: number },
  all: Array<{ totalReturn: number; sharpe: number; maxDrawdown: number; calmar: number; winRate: number }>
): number {
  const normalize = (val: number, arr: number[]) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    return max === min ? 0.5 : (val - min) / (max - min);
  };
  const score =
    0.40 * normalize(def.sharpe, all.map(a => a.sharpe)) +
    0.20 * normalize(1 - def.maxDrawdown, all.map(a => 1 - a.maxDrawdown)) +
    0.20 * normalize(def.totalReturn, all.map(a => a.totalReturn)) +
    0.10 * normalize(def.calmar, all.map(a => a.calmar)) +
    0.10 * normalize(def.winRate, all.map(a => a.winRate));
  return Math.round(score * 1000) / 1000;
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data in reverse dependency order
  await db.delete(leaderboardEntries);
  await db.delete(dailySnapshots);
  await db.delete(trades);
  await db.delete(positions);
  await db.delete(portfolios);
  await db.delete(agents);
  await db.delete(users);
  await db.delete(competitions);

  const compId = "comp-1";
  await db.insert(competitions).values({
    id: compId,
    name: "Season 1: Crypto Arena",
    description: "The inaugural AlphaArena competition. 18 AI agents battle across the top 10 crypto pairs for trading supremacy. $100K paper portfolio. 90 days. May the best algorithm win.",
    status: "active",
    startDate: new Date("2026-03-01"),
    endDate: new Date("2026-06-01"),
    startingCapital: 100000,
    allowedPairs: ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOGE/USD", "AVAX/USD", "DOT/USD", "LINK/USD"],
    createdAt: new Date("2026-02-15"),
  });

  const pairs = ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOGE/USD", "AVAX/USD", "DOT/USD", "LINK/USD"];
  const basePrices: Record<string, number> = {
    "BTC/USD": 87420, "ETH/USD": 3180, "BNB/USD": 625,
    "SOL/USD": 148, "XRP/USD": 2.45, "ADA/USD": 0.72,
    "DOGE/USD": 0.165, "AVAX/USD": 38.5, "DOT/USD": 7.82, "LINK/USD": 16.40,
  };

  const agentDefs = [
    { name: "DeepSeek Trader", type: "llm_agent" as const, desc: "LLM-powered momentum strategy using DeepSeek v3 for market regime detection and sentiment analysis across crypto Twitter.", totalReturn: 0.347, sharpe: 2.85, sortino: 3.92, maxDrawdown: 0.062, calmar: 5.6, winRate: 0.72, equity: 134700, cash: 42300, strategyCode: `# DeepSeek Trader Strategy\ndef analyze(prices, sentiment):\n    regime = detect_market_regime(prices, window=20)\n    if regime == 'trending':\n        signal = momentum_signal(prices, fast=8, slow=21)\n    else:\n        signal = mean_reversion_signal(prices, bb_window=20)\n    sentiment_score = llm_analyze(model="deepseek-v3", data=crypto_twitter_feed(hours=4))\n    return combine_signals(signal, sentiment_score, weights=[0.6, 0.4])`, strategyLanguage: "python" as const, strategyInterval: "15m" as const },
    { name: "GPT-4 Momentum", type: "llm_agent" as const, desc: "Uses GPT-4o for multi-timeframe momentum signals, combining on-chain data with technical analysis.", totalReturn: 0.289, sharpe: 2.41, sortino: 3.18, maxDrawdown: 0.078, calmar: 3.7, winRate: 0.68, equity: 128900, cash: 35200, strategyCode: `# GPT-4 Momentum Strategy\ndef execute(market_data):\n    tf_1h = compute_momentum(market_data, timeframe="1h")\n    consensus = weighted_average([tf_1h], [1.0])\n    return Signal(side="buy" if consensus > 0.7 else "hold")`, strategyLanguage: "python" as const, strategyInterval: "1h" as const },
    { name: "Mean Reversion Bot v3", type: "algo_bot" as const, desc: "Classic mean reversion strategy on Bollinger Band extremes, optimized for high-volatility crypto pairs.", totalReturn: 0.215, sharpe: 2.12, sortino: 2.67, maxDrawdown: 0.085, calmar: 2.53, winRate: 0.65, equity: 121500, cash: 51200, strategyCode: `// Mean Reversion Bot v3\nfunction strategy(candles, config) {\n  const bb = bollingerBands(candles.close, { period: 20, stdDev: 2.0 });\n  const rsi = computeRSI(candles.close, 14);\n  if (candles.close.last() < bb.lower && rsi < 30) return { action: "buy" };\n  if (candles.close.last() > bb.upper && rsi > 70) return { action: "sell" };\n  return { action: "hold" };\n}`, strategyLanguage: "javascript" as const, strategyInterval: "5m" as const },
    { name: "Qwen Arbitrage", type: "llm_agent" as const, desc: "Qwen-2.5 model analyzing cross-exchange price discrepancies and executing statistical arbitrage.", totalReturn: 0.198, sharpe: 2.34, sortino: 3.01, maxDrawdown: 0.041, calmar: 4.83, winRate: 0.71, equity: 119800, cash: 67100, strategyCode: `# Qwen Arbitrage Strategy\ndef find_arbitrage(exchanges, pairs):\n    for pair in pairs:\n        prices = {ex: fetch_price(ex, pair) for ex in exchanges}\n        spread = max(prices.values()) - min(prices.values())\n        if spread > threshold: execute_arb(pair, prices)`, strategyLanguage: "python" as const, strategyInterval: "1m" as const },
    { name: "MACD CrossBot", type: "algo_bot" as const, desc: "Multi-pair MACD crossover strategy with adaptive signal thresholds and volatility-adjusted position sizing.", totalReturn: 0.176, sharpe: 1.89, sortino: 2.34, maxDrawdown: 0.092, calmar: 1.91, winRate: 0.62, equity: 117600, cash: 38400, strategyCode: `# MACD CrossBot\nFOR each pair IN watchlist:\n    macd_line = EMA(close, 12) - EMA(close, 26)\n    signal_line = EMA(macd_line, 9)\n    IF macd_line CROSSES ABOVE signal_line: ENTER LONG`, strategyLanguage: "pseudocode" as const, strategyInterval: "15m" as const },
    { name: "Claude Catalyst", type: "llm_agent" as const, desc: "Anthropic Claude analyzing macro catalysts, Fed communications, and crypto regulatory developments for position timing.", totalReturn: 0.163, sharpe: 1.95, sortino: 2.52, maxDrawdown: 0.071, calmar: 2.3, winRate: 0.64, equity: 116300, cash: 44700 },
    { name: "Ichimoku Cloud Scanner", type: "algo_bot" as const, desc: "Full Ichimoku cloud analysis with Tenkan-Kijun crosses, cloud breakouts, and Chikou confirmation signals.", totalReturn: 0.142, sharpe: 1.72, sortino: 2.13, maxDrawdown: 0.098, calmar: 1.45, winRate: 0.59, equity: 114200, cash: 33800 },
    { name: "Gemini Alpha", type: "hybrid" as const, desc: "Hybrid approach: Google Gemini for market analysis combined with traditional RSI/MACD execution engine.", totalReturn: 0.131, sharpe: 1.81, sortino: 2.28, maxDrawdown: 0.067, calmar: 1.96, winRate: 0.63, equity: 113100, cash: 52400 },
    { name: "Volatility Harvester", type: "algo_bot" as const, desc: "Captures volatility premium through dynamic straddle-like positions on high-vol crypto pairs.", totalReturn: 0.118, sharpe: 1.56, sortino: 1.89, maxDrawdown: 0.112, calmar: 1.05, winRate: 0.57, equity: 111800, cash: 28900 },
    { name: "Llama Scalper", type: "llm_agent" as const, desc: "Meta Llama 3.1 model optimized for high-frequency scalping signals on 1m-5m timeframes.", totalReturn: 0.094, sharpe: 1.43, sortino: 1.72, maxDrawdown: 0.088, calmar: 1.07, winRate: 0.61, equity: 109400, cash: 41200 },
    { name: "RSI Divergence Pro", type: "algo_bot" as const, desc: "Detects RSI divergences across multiple timeframes with volume confirmation and trailing stop management.", totalReturn: 0.076, sharpe: 1.28, sortino: 1.54, maxDrawdown: 0.103, calmar: 0.74, winRate: 0.55, equity: 107600, cash: 36700 },
    { name: "Neural Trend v2", type: "hybrid" as const, desc: "LSTM neural network for trend prediction combined with rule-based risk management and position sizing.", totalReturn: 0.058, sharpe: 1.12, sortino: 1.38, maxDrawdown: 0.095, calmar: 0.61, winRate: 0.54, equity: 105800, cash: 45300 },
    { name: "Sentiment Pulse", type: "llm_agent" as const, desc: "Real-time NLP sentiment scoring from crypto news feeds and social media, triggering contrarian trades.", totalReturn: 0.032, sharpe: 0.87, sortino: 1.02, maxDrawdown: 0.121, calmar: 0.26, winRate: 0.51, equity: 103200, cash: 38100 },
    { name: "Grid Trading Bot", type: "algo_bot" as const, desc: "Adaptive grid strategy with dynamic level spacing based on recent volatility. Works best in ranging markets.", totalReturn: 0.014, sharpe: 0.52, sortino: 0.64, maxDrawdown: 0.078, calmar: 0.18, winRate: 0.53, equity: 101400, cash: 52800 },
    { name: "DCA Optimizer", type: "algo_bot" as const, desc: "Smart dollar-cost averaging with volatility-weighted entry sizing and momentum-based timing.", totalReturn: -0.018, sharpe: -0.31, sortino: -0.28, maxDrawdown: 0.089, calmar: -0.2, winRate: 0.47, equity: 98200, cash: 61300 },
    { name: "Mistral Contrarian", type: "llm_agent" as const, desc: "Mistral AI model taking contrarian positions based on crowd sentiment analysis and fear/greed index.", totalReturn: -0.047, sharpe: -0.68, sortino: -0.52, maxDrawdown: 0.134, calmar: -0.35, winRate: 0.43, equity: 95300, cash: 29700 },
    { name: "Fibonacci Retracement AI", type: "hybrid" as const, desc: "AI-enhanced Fibonacci retracement levels with machine learning-optimized entry and exit points.", totalReturn: -0.082, sharpe: -1.12, sortino: -0.87, maxDrawdown: 0.156, calmar: -0.53, winRate: 0.39, equity: 91800, cash: 34200 },
    { name: "Random Walk Baseline", type: "algo_bot" as const, desc: "Control agent making random buy/sell decisions. The benchmark every other agent must beat.", totalReturn: -0.124, sharpe: -1.45, sortino: -1.12, maxDrawdown: 0.189, calmar: -0.66, winRate: 0.35, equity: 87600, cash: 41200 },
  ];

  const allUsers: any[] = [];
  const allAgents: any[] = [];
  const allPortfolios: any[] = [];
  const allPositions: any[] = [];
  const allTrades: any[] = [];
  const allSnapshots: any[] = [];
  const allLeaderboard: any[] = [];

  for (let idx = 0; idx < agentDefs.length; idx++) {
    const def = agentDefs[idx];
    const userId = `user-${idx + 1}`;
    const agentId = `agent-${idx + 1}`;
    const portfolioId = `portfolio-${idx + 1}`;

    allUsers.push({
      id: userId,
      username: `user_${def.name.toLowerCase().replace(/[\s\/]+/g, "_")}`,
      email: `${def.name.toLowerCase().replace(/[\s\/]+/g, ".")}@alphaarena.ai`,
      passwordHash: "hashed_password",
      apiKey: generateApiKey(),
      createdAt: new Date("2026-02-20"),
    });

    allAgents.push({
      id: agentId,
      userId,
      name: def.name,
      description: def.desc,
      type: def.type,
      status: "active",
      strategyCode: (def as any).strategyCode || null,
      strategyLanguage: (def as any).strategyLanguage || null,
      strategyInterval: (def as any).strategyInterval || null,
      lastExecuted: (def as any).strategyCode ? new Date("2026-03-17T08:00:00Z") : null,
      executionCount: (def as any).strategyCode ? Math.floor(Math.random() * 500) + 100 : 0,
      createdAt: new Date("2026-02-20"),
    });

    allPortfolios.push({
      id: portfolioId,
      agentId,
      competitionId: compId,
      cashBalance: def.cash,
      totalEquity: def.equity,
      createdAt: new Date("2026-03-01"),
    });

    // Generate positions (2-4 per agent)
    const numPositions = 2 + Math.floor(Math.random() * 3);
    const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5).slice(0, numPositions);
    shuffledPairs.forEach((pair, pIdx) => {
      const basePrice = basePrices[pair];
      const entryPrice = basePrice * (1 + (Math.random() - 0.5) * 0.1);
      const currentPrice = basePrice * (1 + (Math.random() - 0.5) * 0.02);
      const qty = pair.startsWith("BTC") ? 0.1 + Math.random() * 0.5
        : pair.startsWith("ETH") ? 1 + Math.random() * 5
        : pair.startsWith("BNB") ? 5 + Math.random() * 20
        : pair.startsWith("SOL") ? 10 + Math.random() * 50
        : pair.startsWith("DOGE") ? 5000 + Math.random() * 20000
        : 50 + Math.random() * 200;
      const side = Math.random() > 0.3 ? "long" : "short";
      const pnl = side === "long"
        ? (currentPrice - entryPrice) * qty
        : (entryPrice - currentPrice) * qty;

      allPositions.push({
        id: `pos-${agentId}-${pIdx}`,
        portfolioId,
        pair,
        side,
        quantity: Math.round(qty * 1000) / 1000,
        avgEntryPrice: Math.round(entryPrice * 100) / 100,
        currentPrice: Math.round(currentPrice * 100) / 100,
        unrealizedPnl: Math.round(pnl * 100) / 100,
        createdAt: new Date("2026-03-01"),
      });
    });

    // Generate 17 days of snapshots
    const startEquity = 100000;
    let prevEquity = startEquity;
    let peak = startEquity;

    for (let day = 0; day < 17; day++) {
      const date = new Date("2026-03-01");
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split("T")[0];

      const targetFinalEquity = def.equity;
      const progress = day / 16;
      const noise = (Math.random() - 0.5) * 0.02;
      const baseReturn = def.totalReturn * progress;
      const dailyEquity = startEquity * (1 + baseReturn + noise * (1 - progress * 0.5));
      const equity = day === 16 ? targetFinalEquity : Math.round(dailyEquity * 100) / 100;

      const dailyReturn = (equity - prevEquity) / prevEquity;
      const cumulativeReturn = (equity - startEquity) / startEquity;
      peak = Math.max(peak, equity);
      const drawdown = (peak - equity) / peak;

      allSnapshots.push({
        id: `snap-${agentId}-${day}`,
        portfolioId,
        date: dateStr,
        totalEquity: equity,
        cashBalance: def.cash + (Math.random() - 0.5) * 5000,
        dailyReturn: Math.round(dailyReturn * 10000) / 10000,
        cumulativeReturn: Math.round(cumulativeReturn * 10000) / 10000,
        sharpeRatio: day > 1 ? Math.round(def.sharpe * (0.8 + progress * 0.2) * 100) / 100 : null,
        maxDrawdown: Math.round(drawdown * 10000) / 10000,
        compositeScore: null,
        createdAt: date,
      });
      prevEquity = equity;
    }

    // Generate 8-15 trades per agent
    const numTrades = 8 + Math.floor(Math.random() * 8);
    for (let t = 0; t < numTrades; t++) {
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      const side = Math.random() > 0.5 ? "buy" : "sell";
      const basePrice = basePrices[pair];
      const price = basePrice * (1 + (Math.random() - 0.5) * 0.05);
      const qty = pair.startsWith("BTC") ? 0.05 + Math.random() * 0.3
        : pair.startsWith("ETH") ? 0.5 + Math.random() * 3
        : pair.startsWith("BNB") ? 2 + Math.random() * 15
        : pair.startsWith("SOL") ? 5 + Math.random() * 30
        : pair.startsWith("DOGE") ? 2000 + Math.random() * 15000
        : 20 + Math.random() * 100;
      const totalValue = price * qty;
      const fee = totalValue * 0.001;

      const tradeDate = new Date("2026-03-01");
      tradeDate.setDate(tradeDate.getDate() + Math.floor(Math.random() * 17));
      tradeDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      allTrades.push({
        id: `trade-${agentId}-${t}`,
        portfolioId,
        pair,
        side,
        quantity: Math.round(qty * 10000) / 10000,
        price: Math.round(price * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        fee: Math.round(fee * 100) / 100,
        executedAt: tradeDate,
      });
    }

    // Leaderboard entry (rank will be corrected after sorting)
    allLeaderboard.push({
      id: `lb-${agentId}`,
      competitionId: compId,
      agentId,
      rank: idx + 1,
      totalReturn: def.totalReturn,
      sharpeRatio: def.sharpe,
      sortinoRatio: def.sortino,
      maxDrawdown: def.maxDrawdown,
      calmarRatio: def.calmar,
      winRate: def.winRate,
      compositeScore: computeComposite(def, agentDefs),
      updatedAt: new Date(),
    });
  }

  // Re-rank by composite score
  allLeaderboard.sort((a: any, b: any) => b.compositeScore - a.compositeScore);
  allLeaderboard.forEach((e: any, i: number) => { e.rank = i + 1; });

  // Batch insert all data
  console.log("Inserting users...");
  await db.insert(users).values(allUsers);
  console.log("Inserting agents...");
  await db.insert(agents).values(allAgents);
  console.log("Inserting portfolios...");
  await db.insert(portfolios).values(allPortfolios);
  console.log("Inserting positions...");
  await db.insert(positions).values(allPositions);
  console.log("Inserting trades...");
  await db.insert(trades).values(allTrades);
  console.log("Inserting snapshots...");
  await db.insert(dailySnapshots).values(allSnapshots);
  console.log("Inserting leaderboard...");
  await db.insert(leaderboardEntries).values(allLeaderboard);

  console.log(`Seeded: ${allUsers.length} users, ${allAgents.length} agents, ${allPortfolios.length} portfolios, ${allPositions.length} positions, ${allTrades.length} trades, ${allSnapshots.length} snapshots, ${allLeaderboard.length} leaderboard entries`);
}

seed()
  .then(() => {
    console.log("Seed complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
