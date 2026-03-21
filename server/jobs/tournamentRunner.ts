import { log } from "../index";
import { storage } from "../storage";

export function startTournamentRunner(intervalMs = 3600000) {
  setInterval(advanceTournaments, intervalMs);
  log("Tournament runner started (1h interval)", "tournaments");
}

async function advanceTournaments() {
  try {
    const all = await storage.getTournaments();
    const now = new Date();

    for (const t of all) {
      // Activate upcoming tournaments that have started
      if (t.status === "upcoming" && new Date(t.startDate) <= now) {
        await storage.createTournament({ ...t, status: "active" });
        log(`Tournament "${t.name}" is now active`, "tournaments");
      }

      // Complete tournaments that have ended
      if (t.status === "active" && new Date(t.endDate) <= now) {
        const entries = await storage.getTournamentEntries(t.id);
        // Eliminate bottom half
        const active = entries.filter(e => !e.eliminated);
        const sorted = active.sort((a, b) => (b.weeklyReturn ?? 0) - (a.weeklyReturn ?? 0));
        const halfPoint = Math.ceil(sorted.length / 2);

        for (let i = halfPoint; i < sorted.length; i++) {
          await storage.updateTournamentEntry(sorted[i].id, { eliminated: 1 });
        }

        // Advance survivors
        for (let i = 0; i < halfPoint; i++) {
          await storage.updateTournamentEntry(sorted[i].id, { round: (sorted[i].round ?? 1) + 1 });
        }

        log(`Tournament "${t.name}" round complete. ${halfPoint} advance, ${sorted.length - halfPoint} eliminated.`, "tournaments");
      }
    }
  } catch (err: any) {
    log(`Tournament runner error: ${err.message}`, "tournaments");
  }
}
