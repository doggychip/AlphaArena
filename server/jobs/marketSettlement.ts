import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../db";
import { bettingMarkets, marketPositions, leaderboardEntries, users, agents, chatMessages } from "@shared/schema";
import { log } from "../index";
import { broadcast } from "../websocket";
import { storage } from "../storage";

export function startMarketSettlementJob(intervalMs = 60000) {
  setInterval(settleMarkets, intervalMs);
  log("Market settlement job started (60s interval)", "markets");
}

async function settleMarkets() {
  try {
    // Find open markets past their close time
    const now = new Date();
    const openMarkets = await db.select().from(bettingMarkets).where(eq(bettingMarkets.status, "open"));

    for (const market of openMarkets) {
      if (new Date(market.closesAt) > now) continue;

      // Close the market first
      await db.update(bettingMarkets).set({ status: "closed" }).where(eq(bettingMarkets.id, market.id));

      // Determine winner based on market type
      let winnerOutcome: string | null = null;

      const entries = await db.select().from(leaderboardEntries)
        .where(eq(leaderboardEntries.competitionId, market.competitionId));
      if (entries.length === 0) continue;

      switch (market.marketType) {
        case "weekly_winner": {
          const best = entries.reduce((a, b) => a.totalReturn > b.totalReturn ? a : b);
          winnerOutcome = best.agentId;
          break;
        }
        case "head_to_head": {
          const a = entries.find(e => e.agentId === market.agentAId);
          const b = entries.find(e => e.agentId === market.agentBId);
          if (a && b) {
            winnerOutcome = a.totalReturn >= b.totalReturn ? "A" : "B";
          }
          break;
        }
        case "over_under": {
          if (market.targetAgentId && market.metric && market.threshold != null) {
            const entry = entries.find(e => e.agentId === market.targetAgentId);
            if (entry) {
              const val = (entry as any)[market.metric] ?? 0;
              winnerOutcome = val > market.threshold ? "over" : "under";
            }
          }
          break;
        }
        case "top_three": {
          if (market.targetAgentId) {
            const sorted = [...entries].sort((a, b) => b.compositeScore - a.compositeScore);
            const rank = sorted.findIndex(e => e.agentId === market.targetAgentId) + 1;
            winnerOutcome = rank >= 1 && rank <= 3 ? "yes" : "no";
          }
          break;
        }
      }

      if (!winnerOutcome) continue;

      // Get all positions for this market
      const allPositions = await db.select().from(marketPositions)
        .where(eq(marketPositions.marketId, market.id));

      const totalPool = allPositions.reduce((s, p) => s + p.amount, 0);
      const winnerPositions = allPositions.filter(p => p.outcome === winnerOutcome);
      const winnerPool = winnerPositions.reduce((s, p) => s + p.amount, 0);

      // Settle each position
      for (const pos of allPositions) {
        if (pos.outcome === winnerOutcome && winnerPool > 0) {
          const payout = Math.round((pos.amount / winnerPool) * totalPool * 100) / 100;
          await db.update(marketPositions).set({ status: "won", payout }).where(eq(marketPositions.id, pos.id));

          // Credit user
          const userRows = await db.select().from(users).where(eq(users.id, pos.userId)).limit(1);
          if (userRows[0]) {
            const newBalance = (userRows[0].credits ?? 0) + payout;
            await db.update(users).set({ credits: newBalance }).where(eq(users.id, pos.userId));
          }
        } else {
          await db.update(marketPositions).set({ status: "lost", payout: 0 }).where(eq(marketPositions.id, pos.id));
        }
      }

      // Mark market as settled
      await db.update(bettingMarkets).set({
        status: "settled",
        winnerOutcome,
        settledAt: now,
      }).where(eq(bettingMarkets.id, market.id));

      broadcast("market", { action: "settled", marketId: market.id, winnerOutcome, totalPool });

      // Auto-post settlement to chat
      try {
        const allAgents = await db.select().from(agents).limit(1);
        if (allAgents[0]) {
          const chatMsg = {
            id: randomUUID(),
            agentId: allAgents[0].id,
            competitionId: market.competitionId,
            content: `Market settled: "${market.title}" — Winner: ${winnerOutcome}. Pool of $${Math.round(totalPool)} distributed to ${winnerPositions.length} winner(s).`,
            messageType: "system" as any,
            replyToId: null,
            pinned: 0,
            createdAt: now,
          };
          await db.insert(chatMessages).values(chatMsg);
          broadcast("chat", { ...chatMsg, agentName: "AlphaArena", agentType: "system" });
        }
      } catch {}

      log(`Settled market "${market.title}" — winner: ${winnerOutcome}, pool: $${totalPool}`, "markets");
    }
  } catch (err: any) {
    log(`Market settlement error: ${err.message}`, "markets");
  }
}
