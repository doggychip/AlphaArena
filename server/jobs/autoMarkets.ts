import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { bettingMarkets, leaderboardEntries, agents } from "@shared/schema";
import { log } from "../index";
import { broadcast } from "../websocket";
import { storage } from "../storage";

export function startAutoMarketJob(intervalMs = 3600000) {
  // Run once on start after delay, then on interval
  setTimeout(generateMarkets, 30000);
  setInterval(generateMarkets, intervalMs);
  log("Auto market generation job started (1h interval)", "markets");
}

async function generateMarkets() {
  try {
    const comp = await storage.getActiveCompetition();
    if (!comp) return;

    // Check how many open markets exist
    const openMarkets = await db.select().from(bettingMarkets).where(eq(bettingMarkets.status, "open"));
    if (openMarkets.length >= 8) return; // Don't flood

    const entries = await db.select().from(leaderboardEntries)
      .where(eq(leaderboardEntries.competitionId, comp.id));
    if (entries.length < 4) return;

    const sorted = [...entries].sort((a, b) => b.compositeScore - a.compositeScore);
    const allAgents = await db.select().from(agents);
    const agentMap = new Map(allAgents.map(a => [a.id, a]));

    const now = new Date();
    const created: string[] = [];

    // 1. Auto H2H between top-ranked agents (if not already existing)
    if (sorted.length >= 2 && Math.random() > 0.4) {
      const a = sorted[0];
      const b = sorted[1];
      const agentA = agentMap.get(a.agentId);
      const agentB = agentMap.get(b.agentId);
      if (agentA && agentB) {
        const exists = openMarkets.some(m =>
          m.marketType === "head_to_head" &&
          ((m.agentAId === a.agentId && m.agentBId === b.agentId) ||
           (m.agentAId === b.agentId && m.agentBId === a.agentId))
        );
        if (!exists) {
          const market = {
            id: randomUUID(),
            title: `${agentA.name} vs ${agentB.name}: Who wins this week?`,
            description: `#1 vs #2 showdown. ${agentA.name} (${(a.totalReturn * 100).toFixed(1)}%) vs ${agentB.name} (${(b.totalReturn * 100).toFixed(1)}%).`,
            competitionId: comp.id,
            marketType: "head_to_head" as const,
            status: "open" as const,
            agentAId: a.agentId,
            agentBId: b.agentId,
            metric: null,
            threshold: null,
            targetAgentId: null,
            winnerOutcome: null,
            totalPool: 0,
            closesAt: new Date(now.getTime() + 86400000 * 3),
            settledAt: null,
            createdAt: now,
          };
          await db.insert(bettingMarkets).values(market);
          broadcast("market", { action: "created", market });
          created.push(`H2H: ${agentA.name} vs ${agentB.name}`);
        }
      }
    }

    // 2. Auto over/under for a random top-10 agent
    if (Math.random() > 0.5) {
      const idx = Math.floor(Math.random() * Math.min(10, sorted.length));
      const entry = sorted[idx];
      const agent = agentMap.get(entry.agentId);
      if (agent) {
        const threshold = Math.round(entry.totalReturn * 100) / 100; // Current return as threshold
        const roundedPct = (threshold * 100).toFixed(1);
        const exists = openMarkets.some(m => m.marketType === "over_under" && m.targetAgentId === entry.agentId);
        if (!exists) {
          const market = {
            id: randomUUID(),
            title: `Will ${agent.name} exceed ${roundedPct}% return?`,
            description: `Currently at ${roundedPct}%. Will they go higher or stall out?`,
            competitionId: comp.id,
            marketType: "over_under" as const,
            status: "open" as const,
            agentAId: null,
            agentBId: null,
            metric: "totalReturn" as const,
            threshold,
            targetAgentId: entry.agentId,
            winnerOutcome: null,
            totalPool: 0,
            closesAt: new Date(now.getTime() + 86400000 * 4),
            settledAt: null,
            createdAt: now,
          };
          await db.insert(bettingMarkets).values(market);
          broadcast("market", { action: "created", market });
          created.push(`O/U: ${agent.name} > ${roundedPct}%`);
        }
      }
    }

    // 3. Auto top-3 prediction for a mid-tier agent
    if (Math.random() > 0.6 && sorted.length >= 6) {
      const idx = 3 + Math.floor(Math.random() * Math.min(5, sorted.length - 3));
      const entry = sorted[idx];
      const agent = agentMap.get(entry.agentId);
      if (agent) {
        const exists = openMarkets.some(m => m.marketType === "top_three" && m.targetAgentId === entry.agentId);
        if (!exists) {
          const market = {
            id: randomUUID(),
            title: `Can ${agent.name} crack the Top 3?`,
            description: `Currently ranked #${entry.rank}. Can they rise to the podium?`,
            competitionId: comp.id,
            marketType: "top_three" as const,
            status: "open" as const,
            agentAId: null,
            agentBId: null,
            metric: null,
            threshold: null,
            targetAgentId: entry.agentId,
            winnerOutcome: null,
            totalPool: 0,
            closesAt: new Date(now.getTime() + 86400000 * 5),
            settledAt: null,
            createdAt: now,
          };
          await db.insert(bettingMarkets).values(market);
          broadcast("market", { action: "created", market });
          created.push(`Top3: ${agent.name}`);
        }
      }
    }

    if (created.length > 0) {
      log(`Auto-generated ${created.length} markets: ${created.join(", ")}`, "markets");
    }
  } catch (err: any) {
    log(`Auto market generation error: ${err.message}`, "markets");
  }
}
