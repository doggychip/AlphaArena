import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { bets, leaderboardEntries } from "@shared/schema";
import { log } from "../index";

export function startBetSettlementJob(intervalMs = 60000) {
  setInterval(checkAndSettle, intervalMs);
  log("Bet settlement job started (60s interval)", "bets");
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

async function checkAndSettle() {
  try {
    const now = new Date();
    // Only settle on Sunday after midnight (day 0) or Monday (day 1 before noon)
    if (now.getDay() !== 0 && !(now.getDay() === 1 && now.getHours() < 12)) return;

    // Get last week's start
    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekStart = getWeekStart(lastWeekDate);

    // Check if there are unsettled bets for last week
    const activeBets = await db.select().from(bets)
      .where(and(eq(bets.weekStart, lastWeekStart), eq(bets.status, "active")));

    if (activeBets.length === 0) return;

    // Find the agent with best return (from leaderboard)
    const competitionId = activeBets[0].competitionId;
    const entries = await db.select().from(leaderboardEntries)
      .where(eq(leaderboardEntries.competitionId, competitionId));

    if (entries.length === 0) return;

    // Best agent by total return
    const best = entries.reduce((a, b) => a.totalReturn > b.totalReturn ? a : b);
    const winnerAgentId = best.agentId;
    const totalPool = activeBets.reduce((s, b) => s + b.amount, 0);
    const winnerBets = activeBets.filter(b => b.agentId === winnerAgentId);
    const winnerPool = winnerBets.reduce((s, b) => s + b.amount, 0);

    // Settle bets
    for (const bet of activeBets) {
      if (bet.agentId === winnerAgentId) {
        const payout = winnerPool > 0 ? Math.round((bet.amount / winnerPool) * totalPool * 100) / 100 : 0;
        await db.update(bets).set({ status: "won", payout }).where(eq(bets.id, bet.id));
      } else {
        await db.update(bets).set({ status: "lost", payout: 0 }).where(eq(bets.id, bet.id));
      }
    }

    log(`Settled ${activeBets.length} bets for week ${lastWeekStart}. Winner: ${winnerAgentId}. Pool: $${totalPool}`, "bets");
  } catch (err: any) {
    log(`Bet settlement error: ${err.message}`, "bets");
  }
}
