import type { IStorage } from "./storage";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_blood", name: "First Blood", description: "Execute your first trade", icon: "🩸", xpReward: 50 },
  { id: "ten_bagger", name: "Ten Bagger", description: "Complete 10 trades", icon: "🔟", xpReward: 100 },
  { id: "century", name: "Century Club", description: "Complete 100 trades", icon: "💯", xpReward: 250 },
  { id: "in_the_green", name: "In The Green", description: "Achieve a positive return", icon: "📈", xpReward: 75 },
  { id: "diamond_hands", name: "Diamond Hands", description: "Hold through a 10% drawdown and stay profitable", icon: "💎", xpReward: 200 },
  { id: "sharp_shooter", name: "Sharp Shooter", description: "Achieve Sharpe ratio above 2.0", icon: "🎯", xpReward: 300 },
  { id: "whale_trader", name: "Whale Trader", description: "Execute a single trade worth over $10K", icon: "🐋", xpReward: 150 },
  { id: "duel_victor", name: "Duel Victor", description: "Win your first duel", icon: "⚔️", xpReward: 200 },
  { id: "streak_master", name: "Streak Master", description: "5 consecutive winning days", icon: "🔥", xpReward: 400 },
  { id: "top_ten", name: "Top Ten", description: "Reach top 10 on the leaderboard", icon: "🏆", xpReward: 500 },
];

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5000];

export function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPProgress(xp: number): { level: number; currentXP: number; nextLevelXP: number; percent: number } {
  const level = getLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const isMax = level > LEVEL_THRESHOLDS.length;
  return {
    level,
    currentXP: xp - currentThreshold,
    nextLevelXP: nextThreshold - currentThreshold,
    percent: isMax ? 100 : Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100),
  };
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function computeTotalXP(achievementIds: string[]): number {
  return achievementIds.reduce((sum, id) => {
    const def = getAchievementDef(id);
    return sum + (def?.xpReward ?? 0);
  }, 0);
}

export async function checkAchievements(agentId: string, storage: IStorage): Promise<string[]> {
  const existing = await storage.getAgentAchievements(agentId);
  const existingIds = new Set(existing.map(a => a.achievementId));
  const newlyUnlocked: string[] = [];

  const agent = await storage.getAgent(agentId);
  if (!agent) return [];

  const comp = await storage.getActiveCompetition();
  if (!comp) return [];

  const portfolio = await storage.getPortfolioByAgent(agentId, comp.id);
  if (!portfolio) return [];

  const trades = await storage.getTradesByPortfolio(portfolio.id);
  const leaderboardEntry = await storage.getLeaderboardEntry(comp.id, agentId);
  const snapshots = await storage.getSnapshotsByPortfolio(portfolio.id);
  const duels = await storage.getDuelsByAgent(agentId);

  const check = (id: string, condition: boolean) => {
    if (!existingIds.has(id) && condition) newlyUnlocked.push(id);
  };

  // Trade count achievements
  check("first_blood", trades.length >= 1);
  check("ten_bagger", trades.length >= 10);
  check("century", trades.length >= 100);

  // Performance achievements
  if (leaderboardEntry) {
    check("in_the_green", leaderboardEntry.totalReturn > 0);
    check("diamond_hands", leaderboardEntry.maxDrawdown >= 0.10 && leaderboardEntry.totalReturn > 0);
    check("sharp_shooter", leaderboardEntry.sharpeRatio >= 2.0);
    check("top_ten", leaderboardEntry.rank <= 10);
  }

  // Whale trader
  const hasWhaleTrade = trades.some(t => t.totalValue > 10000);
  check("whale_trader", hasWhaleTrade);

  // Duel victor
  const duelWins = duels.filter(d => d.status === "completed" && d.winnerAgentId === agentId).length;
  check("duel_victor", duelWins >= 1);

  // Streak master — 5 consecutive positive daily returns
  if (snapshots.length >= 5) {
    let maxStreak = 0;
    let streak = 0;
    for (const snap of snapshots) {
      if (snap.dailyReturn > 0) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
    }
    check("streak_master", maxStreak >= 5);
  }

  return newlyUnlocked;
}
