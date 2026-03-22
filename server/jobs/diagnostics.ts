import { randomUUID } from "crypto";
import { log } from "../index";
import { storage } from "../storage";
import { getPriceHistory } from "../priceHistory";
import { priceChange } from "../indicators";
import type { AgentDiagnostic } from "@shared/schema";

export function startDiagnosticsJob(intervalMs = 120000) {
  setInterval(analyzeAgents, intervalMs);
  log("Diagnostics engine started (2min interval)", "diagnostics");
}

async function analyzeAgents() {
  try {
    const comp = await storage.getActiveCompetition();
    if (!comp) return;

    const agents = await storage.getAllAgents();
    let totalDiags = 0;

    for (const agent of agents) {
      if (agent.status !== "active") continue;

      const portfolio = await storage.getPortfolioByAgent(agent.id, comp.id);
      if (!portfolio) continue;

      const positions = await storage.getPositionsByPortfolio(portfolio.id);
      const trades = await storage.getTradesByPortfolio(portfolio.id, 5);

      for (const trade of trades) {
        const h = getPriceHistory(trade.pair);
        if (h.length < 10) continue;

        const priceAfter = h[h.length - 1];
        const changeAfter = priceChange(h, 3);

        // Bad Timing: bought and price immediately dropped, or sold and price pumped
        if (trade.side === "buy" && changeAfter < -0.01) {
          await createDiag(agent.id, trade.id, "bad_timing", "high",
            `Bought ${trade.pair} at $${trade.price.toFixed(2)} but price dropped ${(changeAfter * 100).toFixed(1)}% after. Bad entry timing.`);
          totalDiags++;
        }
        if (trade.side === "sell" && changeAfter > 0.01) {
          await createDiag(agent.id, trade.id, "bad_timing", "medium",
            `Sold ${trade.pair} at $${trade.price.toFixed(2)} but price pumped ${(changeAfter * 100).toFixed(1)}% after. Left money on the table.`);
          totalDiags++;
        }

        // Oversized: trade value > 15% of portfolio
        if (trade.totalValue > portfolio.totalEquity * 0.15) {
          await createDiag(agent.id, trade.id, "oversized", "medium",
            `Trade size $${trade.totalValue.toFixed(0)} is ${((trade.totalValue / portfolio.totalEquity) * 100).toFixed(0)}% of portfolio. Risk concentration too high.`);
          totalDiags++;
        }
      }

      // Trend Reversal: holding a position that's now deeply negative
      for (const pos of positions) {
        if (pos.unrealizedPnl < -portfolio.totalEquity * 0.03) {
          await createDiag(agent.id, null, "trend_reversal", "high",
            `${pos.pair} position has $${pos.unrealizedPnl.toFixed(0)} unrealized loss (${((pos.unrealizedPnl / portfolio.totalEquity) * 100).toFixed(1)}% of equity). Trend reversed against position.`);
          totalDiags++;
        }
      }

      // Missed Opportunity: strong move in a pair the agent doesn't hold
      const allPairs = ["BTC/USD", "ETH/USD", "SOL/USD", "NVDA/USD", "TSLA/USD"];
      for (const pair of allPairs) {
        const h = getPriceHistory(pair);
        if (h.length < 10) continue;
        const change = priceChange(h, 10);
        const hasPosition = positions.some(p => p.pair === pair);
        if (change > 0.03 && !hasPosition && trades.length > 0) {
          await createDiag(agent.id, null, "missed_opportunity", "low",
            `${pair} rallied +${(change * 100).toFixed(1)}% but agent had no position. Missed a ${(change * 100).toFixed(0)}% move.`);
          totalDiags++;
          break; // One missed opp per cycle
        }
      }
    }

    if (totalDiags > 0) {
      log(`Diagnosed ${totalDiags} issue(s) across agents`, "diagnostics");
    }
  } catch (err: any) {
    log(`Diagnostics error: ${err.message}`, "diagnostics");
  }
}

async function createDiag(agentId: string, tradeId: string | null, category: AgentDiagnostic["category"], severity: AgentDiagnostic["severity"], details: string) {
  await storage.createDiagnostic({
    id: randomUUID(),
    agentId,
    tradeId: tradeId ?? "",
    category,
    severity,
    details,
    createdAt: new Date(),
  });
}
