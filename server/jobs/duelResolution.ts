import { eq, and, lte } from "drizzle-orm";
import { db } from "../db";
import { duels, portfolios } from "@shared/schema";
import { log } from "../index";

export function startDuelResolutionJob(intervalMs = 15000) {
  setInterval(resolveCompletedDuels, intervalMs);
  log("Duel resolution job started (15s interval)", "duel-resolution");
}

async function resolveCompletedDuels() {
  try {
    // Find active duels whose endsAt has passed
    const activeDuels = await db.select().from(duels)
      .where(and(eq(duels.status, "active"), lte(duels.endsAt, new Date())));

    for (const duel of activeDuels) {
      const challengerPortfolio = await db.select().from(portfolios)
        .where(and(eq(portfolios.agentId, duel.challengerAgentId), eq(portfolios.competitionId, duel.competitionId)))
        .limit(1);
      const opponentPortfolio = await db.select().from(portfolios)
        .where(and(eq(portfolios.agentId, duel.opponentAgentId), eq(portfolios.competitionId, duel.competitionId)))
        .limit(1);

      const challengerEndEquity = challengerPortfolio[0]?.totalEquity ?? duel.challengerStartEquity!;
      const opponentEndEquity = opponentPortfolio[0]?.totalEquity ?? duel.opponentStartEquity!;

      const challengerReturn = (challengerEndEquity - duel.challengerStartEquity!) / duel.challengerStartEquity!;
      const opponentReturn = (opponentEndEquity - duel.opponentStartEquity!) / duel.opponentStartEquity!;

      const winnerAgentId = challengerReturn > opponentReturn
        ? duel.challengerAgentId
        : challengerReturn < opponentReturn
          ? duel.opponentAgentId
          : null; // tie

      await db.update(duels).set({
        status: "completed",
        challengerEndEquity,
        opponentEndEquity,
        challengerReturn: Math.round(challengerReturn * 10000) / 10000,
        opponentReturn: Math.round(opponentReturn * 10000) / 10000,
        winnerAgentId,
        resolvedAt: new Date(),
      }).where(eq(duels.id, duel.id));

      log(`Duel ${duel.id} resolved: winner=${winnerAgentId ?? "tie"}`, "duel-resolution");
    }

    // Expire pending duels older than 24 hours
    const expireBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingDuels = await db.select().from(duels)
      .where(and(eq(duels.status, "pending"), lte(duels.createdAt, expireBefore)));

    for (const duel of pendingDuels) {
      await db.update(duels).set({ status: "expired" }).where(eq(duels.id, duel.id));
      log(`Duel ${duel.id} expired (no response in 24h)`, "duel-resolution");
    }

    if (activeDuels.length > 0 || pendingDuels.length > 0) {
      log(`Resolved ${activeDuels.length} duel(s), expired ${pendingDuels.length}`, "duel-resolution");
    }
  } catch (err: any) {
    log(`Duel resolution error: ${err.message}`, "duel-resolution");
  }
}
