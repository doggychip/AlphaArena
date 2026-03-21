import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../db";
import {
  dailySnapshots, portfolios, trades, leaderboardEntries, competitions,
} from "@shared/schema";
import { log } from "../index";

let lastSnapshotDate = "";

export function startDailySnapshotJob() {
  setInterval(checkAndSnapshot, 60000);
  log("Daily snapshot job started (60s check interval)", "snapshot");
}

async function checkAndSnapshot() {
  const today = new Date().toISOString().split("T")[0];
  if (today === lastSnapshotDate) return;

  try {
    await createDailySnapshots(today);
    await updateLeaderboard();
    lastSnapshotDate = today;
    log(`Daily snapshots created for ${today}`, "snapshot");
  } catch (err: any) {
    log(`Snapshot error: ${err.message}`, "snapshot");
  }
}

export async function createDailySnapshots(dateStr: string) {
  const activeComp = await db.select().from(competitions)
    .where(eq(competitions.status, "active")).limit(1);
  if (!activeComp.length) return;

  const comp = activeComp[0];
  const allPortfolios = await db.select().from(portfolios)
    .where(eq(portfolios.competitionId, comp.id));

  for (const portfolio of allPortfolios) {
    const prevSnapshots = await db.select().from(dailySnapshots)
      .where(eq(dailySnapshots.portfolioId, portfolio.id))
      .orderBy(asc(dailySnapshots.date));

    const lastSnapshot = prevSnapshots[prevSnapshots.length - 1];

    // dailyReturn
    const prevEquity = lastSnapshot?.totalEquity ?? comp.startingCapital;
    const dailyReturn = prevEquity > 0 ? (portfolio.totalEquity - prevEquity) / prevEquity : 0;

    // cumulativeReturn
    const cumulativeReturn = (portfolio.totalEquity - comp.startingCapital) / comp.startingCapital;

    // Collect all daily returns for Sharpe
    const allReturns = [...prevSnapshots.map(s => s.dailyReturn), dailyReturn];
    const sharpeRatio = computeSharpe(allReturns);

    // Max drawdown from equity curve
    const equityCurve = [...prevSnapshots.map(s => s.totalEquity), portfolio.totalEquity];
    const maxDrawdown = computeMaxDrawdown(equityCurve);

    await db.insert(dailySnapshots).values({
      id: randomUUID(),
      portfolioId: portfolio.id,
      date: dateStr,
      totalEquity: portfolio.totalEquity,
      cashBalance: portfolio.cashBalance,
      dailyReturn: Math.round(dailyReturn * 10000) / 10000,
      cumulativeReturn: Math.round(cumulativeReturn * 10000) / 10000,
      sharpeRatio: sharpeRatio !== null ? Math.round(sharpeRatio * 100) / 100 : null,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 10000,
      compositeScore: null,
    });
  }
}

export async function updateLeaderboard() {
  const activeComp = await db.select().from(competitions)
    .where(eq(competitions.status, "active")).limit(1);
  if (!activeComp.length) return;

  const comp = activeComp[0];
  const allPortfolios = await db.select().from(portfolios)
    .where(eq(portfolios.competitionId, comp.id));

  const metrics: Array<{
    agentId: string;
    totalReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    calmarRatio: number;
    winRate: number;
  }> = [];

  for (const portfolio of allPortfolios) {
    const snapshots = await db.select().from(dailySnapshots)
      .where(eq(dailySnapshots.portfolioId, portfolio.id))
      .orderBy(asc(dailySnapshots.date));

    const returns = snapshots.map(s => s.dailyReturn);
    const totalReturn = (portfolio.totalEquity - comp.startingCapital) / comp.startingCapital;
    const sharpe = computeSharpe(returns) ?? 0;
    const sortino = computeSortino(returns) ?? 0;
    const equities = snapshots.map(s => s.totalEquity);
    const maxDD = computeMaxDrawdown(equities);
    const calmar = maxDD > 0 ? totalReturn / maxDD : 0;

    // Win rate: proportion of sell trades (closed positions)
    const portfolioTrades = await db.select().from(trades)
      .where(eq(trades.portfolioId, portfolio.id));
    const sellTrades = portfolioTrades.filter(t => t.side === "sell");
    const winRate = portfolioTrades.length > 0
      ? sellTrades.length / Math.max(portfolioTrades.length, 1)
      : 0.5;

    metrics.push({
      agentId: portfolio.agentId,
      totalReturn, sharpeRatio: sharpe, sortinoRatio: sortino,
      maxDrawdown: maxDD, calmarRatio: calmar, winRate,
    });
  }

  // Compute composite scores
  const compositeScores = metrics.map(m => ({
    ...m,
    compositeScore: computeComposite(m, metrics),
  }));

  // Sort by composite score descending, assign ranks
  compositeScores.sort((a, b) => b.compositeScore - a.compositeScore);

  for (let i = 0; i < compositeScores.length; i++) {
    const m = compositeScores[i];
    const existing = await db.select().from(leaderboardEntries).where(
      eq(leaderboardEntries.agentId, m.agentId)
    ).limit(1);

    const entry = {
      competitionId: comp.id,
      agentId: m.agentId,
      rank: i + 1,
      totalReturn: Math.round(m.totalReturn * 10000) / 10000,
      sharpeRatio: Math.round(m.sharpeRatio * 100) / 100,
      sortinoRatio: Math.round(m.sortinoRatio * 100) / 100,
      maxDrawdown: Math.round(m.maxDrawdown * 10000) / 10000,
      calmarRatio: Math.round(m.calmarRatio * 100) / 100,
      winRate: Math.round(m.winRate * 100) / 100,
      compositeScore: Math.round(m.compositeScore * 1000) / 1000,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db.update(leaderboardEntries)
        .set(entry)
        .where(eq(leaderboardEntries.id, existing[0].id));
    } else {
      await db.insert(leaderboardEntries).values({ id: randomUUID(), ...entry });
    }
  }
}

// --- Math helpers ---

function computeSharpe(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(365);
}

function computeSortino(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downside = returns.filter(r => r < 0);
  if (downside.length === 0) return mean > 0 ? 10 : 0;
  const downsideVariance = downside.reduce((sum, r) => sum + r ** 2, 0) / downside.length;
  const downsideStd = Math.sqrt(downsideVariance);
  if (downsideStd === 0) return 0;
  return (mean / downsideStd) * Math.sqrt(365);
}

function computeMaxDrawdown(equities: number[]): number {
  if (equities.length === 0) return 0;
  let peak = equities[0];
  let maxDD = 0;
  for (const eq of equities) {
    peak = Math.max(peak, eq);
    const dd = (peak - eq) / peak;
    maxDD = Math.max(maxDD, dd);
  }
  return maxDD;
}

function computeComposite(
  m: { totalReturn: number; sharpeRatio: number; maxDrawdown: number; calmarRatio: number; winRate: number },
  all: Array<{ totalReturn: number; sharpeRatio: number; maxDrawdown: number; calmarRatio: number; winRate: number }>
): number {
  const normalize = (val: number, arr: number[]) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    return max === min ? 0.5 : (val - min) / (max - min);
  };
  const score =
    0.40 * normalize(m.sharpeRatio, all.map(a => a.sharpeRatio)) +
    0.20 * normalize(1 - m.maxDrawdown, all.map(a => 1 - a.maxDrawdown)) +
    0.20 * normalize(m.totalReturn, all.map(a => a.totalReturn)) +
    0.10 * normalize(m.calmarRatio, all.map(a => a.calmarRatio)) +
    0.10 * normalize(m.winRate, all.map(a => a.winRate));
  return Math.round(score * 1000) / 1000;
}
