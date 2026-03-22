import { randomUUID } from "crypto";
import { log } from "../index";
import { storage } from "../storage";

export function startWeeklyReportJob(intervalMs = 3600000) {
  setInterval(checkAndGenerate, intervalMs);
  log("Weekly report job started (1h check interval)", "weekly-report");
}

async function checkAndGenerate() {
  try {
    const now = new Date();
    // Only generate on Sunday between 23:00-23:59
    if (now.getDay() !== 0 || now.getHours() !== 23) return;

    const comp = await storage.getActiveCompetition();
    if (!comp) return;

    const leaderboard = await storage.getLeaderboard(comp.id);
    if (leaderboard.length === 0) return;

    const diagnosticsSummary = await storage.getDiagnosticsSummary();
    const totalDiags = diagnosticsSummary.reduce((s, d) => s + d.count, 0);
    const topFailure = diagnosticsSummary.sort((a, b) => b.count - a.count)[0];

    const best = leaderboard[0];
    const worst = leaderboard[leaderboard.length - 1];

    const report = [
      `📊 WEEKLY POSTMORTEM — Week of ${now.toISOString().split("T")[0]}`,
      ``,
      `🏆 Best Agent: ${best.agent.name} (${(best.totalReturn * 100).toFixed(1)}% return, Sharpe ${best.sharpeRatio.toFixed(2)})`,
      `📉 Worst Agent: ${worst.agent.name} (${(worst.totalReturn * 100).toFixed(1)}% return)`,
      ``,
      `🔍 Diagnostics: ${totalDiags} issues detected this week`,
      topFailure ? `⚠️ Most Common Failure: ${topFailure.category.replace("_", " ")} (${topFailure.count} occurrences)` : "",
      ``,
      `📈 Leaderboard Movement:`,
      ...leaderboard.slice(0, 5).map((e, i) => `  ${i + 1}. ${e.agent.name}: ${(e.totalReturn * 100).toFixed(1)}% | Sharpe: ${e.sharpeRatio.toFixed(2)} | DD: ${(e.maxDrawdown * 100).toFixed(1)}%`),
      ``,
      `💡 Key Lessons:`,
      topFailure?.category === "bad_timing" ? `  • Many agents are entering trades at the wrong time. Consider using RSI confirmation before entry.` : "",
      topFailure?.category === "oversized" ? `  • Position sizing is too aggressive. Reduce to <10% of portfolio per trade.` : "",
      topFailure?.category === "trend_reversal" ? `  • Agents are holding losing positions too long. Add stop-loss discipline.` : "",
      topFailure?.category === "missed_opportunity" ? `  • Agents are too conservative. Missed multiple >3% rallies.` : "",
      `  • Value strategies (Buffett, Graham) tend to outperform in volatile weeks.`,
      `  • Momentum strategies (Druckenmiller, Livermore) excel in trending markets.`,
    ].filter(Boolean).join("\n");

    await storage.createMessage({
      id: randomUUID(),
      agentId: leaderboard[0].agentId, // Report "from" the winning agent
      competitionId: comp.id,
      content: report,
      messageType: "milestone",
      createdAt: now,
    });

    log(`Weekly postmortem generated`, "weekly-report");
  } catch (err: any) {
    log(`Weekly report error: ${err.message}`, "weekly-report");
  }
}
