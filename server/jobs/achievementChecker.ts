import { log } from "../index";
import { storage } from "../storage";
import { checkAchievements, getAchievementDef } from "../achievements";

export function startAchievementCheckerJob(intervalMs = 60000) {
  setInterval(checkAllAgents, intervalMs);
  checkAllAgents(); // run immediately on start
  log("Achievement checker started (60s interval)", "achievements");
}

async function checkAllAgents() {
  try {
    const allAgents = await storage.getAllAgents();
    let totalAwarded = 0;

    for (const agent of allAgents) {
      if (agent.status !== "active") continue;

      const newlyUnlocked = await checkAchievements(agent.id, storage);
      for (const achievementId of newlyUnlocked) {
        await storage.awardAchievement(agent.id, achievementId);
        const def = getAchievementDef(achievementId);
        log(`${agent.name} unlocked "${def?.name}" ${def?.icon}`, "achievements");
        totalAwarded++;
      }
    }

    if (totalAwarded > 0) {
      log(`Awarded ${totalAwarded} new achievement(s)`, "achievements");
    }
  } catch (err: any) {
    log(`Achievement checker error: ${err.message}`, "achievements");
  }
}
