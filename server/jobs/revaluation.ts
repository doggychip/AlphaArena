import { eq } from "drizzle-orm";
import { db } from "../db";
import { positions, portfolios, competitions } from "@shared/schema";
import { getCurrentPrices } from "../prices";
import { log } from "../index";

export function startRevaluationJob(intervalMs = 30000) {
  setInterval(revaluateAll, intervalMs);
  log("Revaluation job started (30s interval)", "revaluation");
}

async function revaluateAll() {
  try {
    // Skip revaluation during warmup period to preserve seed data
    const activeComp = await db.select().from(competitions)
      .where(eq(competitions.status, "active")).limit(1);
    if (activeComp.length > 0) {
      const daysSinceStart = (Date.now() - new Date(activeComp[0].startDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceStart < 7) return;
    }

    const { prices } = getCurrentPrices();
    const priceMap = new Map(prices.map(p => [p.pair, p.price]));

    // Fetch all open positions
    const allPositions = await db.select().from(positions);

    // Update each position's currentPrice and unrealizedPnl
    for (const pos of allPositions) {
      const currentPrice = priceMap.get(pos.pair);
      if (!currentPrice) continue;

      const unrealizedPnl = pos.side === "long"
        ? (currentPrice - pos.avgEntryPrice) * pos.quantity
        : (pos.avgEntryPrice - currentPrice) * pos.quantity;

      await db.update(positions)
        .set({
          currentPrice: Math.round(currentPrice * 100) / 100,
          unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
        })
        .where(eq(positions.id, pos.id));
    }

    // Recalculate portfolio totalEquity for all portfolios
    const allPortfolios = await db.select().from(portfolios);

    for (const portfolio of allPortfolios) {
      const portfolioPositions = allPositions.filter(p => p.portfolioId === portfolio.id);
      const positionValue = portfolioPositions.reduce((sum, p) => {
        const price = priceMap.get(p.pair) ?? p.currentPrice;
        return sum + price * p.quantity;
      }, 0);
      let totalEquity = Math.round((portfolio.cashBalance + positionValue) * 100) / 100;

      // Cap total equity to max 2x starting capital (100% return) to keep figures realistic
      const MAX_EQUITY_MULTIPLIER = 2;
      const startingCapital = 100000; // default competition starting capital
      totalEquity = Math.max(
        startingCapital * 0.5, // Floor at -50%
        Math.min(totalEquity, startingCapital * MAX_EQUITY_MULTIPLIER)
      );

      await db.update(portfolios)
        .set({ totalEquity })
        .where(eq(portfolios.id, portfolio.id));
    }

    log(`Revalued ${allPositions.length} positions across ${allPortfolios.length} portfolios`, "revaluation");
  } catch (err: any) {
    log(`Revaluation error: ${err.message}`, "revaluation");
  }
}
