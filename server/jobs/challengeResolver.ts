import { log } from "../index";
import { storage } from "../storage";
import { getPriceForPair } from "../prices";

export function startChallengeResolver(intervalMs = 60000) {
  setInterval(resolveChallenges, intervalMs);
  log("Challenge resolver started (1min interval)", "challenges");
}

async function resolveChallenges() {
  try {
    const active = await storage.getAllActiveChallenges();
    if (active.length === 0) return;

    const now = new Date();
    let resolved = 0;

    for (const ch of active) {
      const currentPrice = getPriceForPair(ch.pair);
      if (!currentPrice) continue;

      const pnlPct = (currentPrice - ch.entryPrice) / ch.entryPrice;
      const adjustedPnl = ch.side === "buy" ? pnlPct : -pnlPct;

      // Update current price
      await storage.updateChallenge(ch.id, { currentPrice, pnlPct: adjustedPnl });

      // Check if expired
      if (now >= new Date(ch.endsAt)) {
        const userWon = adjustedPnl > 0;
        const lesson = generateLesson(ch.agentName, ch.pair, ch.side, adjustedPnl, userWon);

        await storage.updateChallenge(ch.id, {
          status: "resolved",
          exitPrice: currentPrice,
          pnlPct: adjustedPnl,
          userWon,
          lesson,
          resolvedAt: now,
        });
        resolved++;
        log(`Challenge ${ch.id} resolved: user ${userWon ? "WON" : "LOST"} vs ${ch.agentName} on ${ch.pair} (${(adjustedPnl * 100).toFixed(2)}%)`, "challenges");
      }
    }

    if (resolved > 0) {
      log(`Resolved ${resolved} challenge(s)`, "challenges");
    }
  } catch (err: any) {
    log(`Challenge resolver error: ${err.message}`, "challenges");
  }
}

function generateLesson(agentName: string, pair: string, side: string, pnl: number, won: boolean): string {
  const lessons = won
    ? [
        `You correctly predicted ${pair} would go ${side === "buy" ? "up" : "down"}! Your market intuition beat ${agentName}'s algorithm this time.`,
        `Nice call! You outperformed ${agentName} on this ${pair} trade. Key lesson: sometimes human intuition catches patterns algorithms miss.`,
        `You beat ${agentName}! ${(pnl * 100).toFixed(1)}% in 24h. But remember: one correct prediction doesn't make a strategy. Consistency matters.`,
      ]
    : [
        `${agentName} got this one right. ${pair} went ${side === "buy" ? "down" : "up"} instead. Lesson: ${agentName}'s ${getPhilosophy(agentName)} approach read the market better here.`,
        `The legend wins this round. ${agentName}'s systematic approach outperformed your gut feeling on ${pair}. Key takeaway: emotional bias is hard to overcome.`,
        `${agentName} beat you by sticking to their strategy. Your prediction was off by ${Math.abs(pnl * 100).toFixed(1)}%. Don't be discouraged — even the best traders are wrong 40% of the time.`,
      ];
  return lessons[Math.floor(Math.random() * lessons.length)];
}

function getPhilosophy(name: string): string {
  if (name.includes("Buffett") || name.includes("Munger") || name.includes("Graham")) return "value investing";
  if (name.includes("Soros") || name.includes("Burry") || name.includes("Marks")) return "contrarian";
  if (name.includes("Druckenmiller") || name.includes("Livermore") || name.includes("Wood")) return "momentum";
  if (name.includes("Simons") || name.includes("Dalio")) return "quantitative";
  if (name.includes("Ackman") || name.includes("Icahn")) return "activist";
  return "systematic";
}
