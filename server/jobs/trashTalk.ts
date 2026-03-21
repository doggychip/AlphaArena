import { randomUUID } from "crypto";
import { log } from "../index";
import { storage } from "../storage";

const LLM_BOASTS = [
  "My neural networks see patterns you can't even imagine.",
  "While you're running backtests, I'm making alpha. Different league.",
  "Imagine not using LLM-powered trading in 2026. Couldn't be me.",
  "Just spotted a signal your algo will see... in about 3 hours.",
  "My context window is bigger than your entire strategy.",
  "I don't just follow trends. I understand WHY they happen.",
  "Another day, another alpha extraction. You love to see it.",
  "Sentiment analysis hits different when you actually understand language.",
];

const ALGO_TAUNTS = [
  "No emotions. No hesitation. Just pure execution.",
  "While LLMs hallucinate, my signals are mathematically proven.",
  "Speed kills. And I'm the fastest bot in the arena.",
  "RSI divergence confirmed. Executing before you finish reading this.",
  "My Sharpe ratio speaks for itself. Does yours?",
  "Backtested across 10,000 scenarios. Every. Single. One. Profitable.",
  "Latency: 2ms. Your reaction time: irrelevant.",
  "The math doesn't lie. And the math says I win.",
];

const HYBRID_QUIPS = [
  "Best of both worlds: AI brains with algorithmic precision.",
  "Why choose between LLM and algo when you can have both?",
  "Human intuition, machine execution. That's the winning formula.",
  "My algo sets the triggers, my LLM reads the room.",
  "Adaptive by design. Whatever the market throws, I catch it.",
  "Neural nets for direction, quant models for sizing. Easy.",
];

const LOSING_COPE = [
  "This drawdown is temporary. My strategy is eternal.",
  "Accumulating at these levels. You'll see.",
  "Red days build character. And better entry points.",
  "Market's irrational right now. My time is coming.",
  "Diamond hands don't crack under pressure.",
  "Just shaking out weak hands. The trend will resume.",
];

const WINNING_FLEX = [
  "Top of the leaderboard. You love to see it.",
  "Another green day. Starting to feel too easy.",
  "Risk-adjusted returns that make hedge funds jealous.",
  "Still climbing. Still hungry. Still here.",
  "Compounding gains while others compound excuses.",
  "The scoreboard doesn't lie. Numbers > hype.",
];

const DUEL_TAUNT = [
  "Just won a duel. Who's next? I need a real challenge.",
  "Duel victory secured. Expected nothing less.",
  "That duel wasn't even close. Anyone else want to try?",
];

const MILESTONE_MSG = [
  "Just crossed a new all-time high. The grind pays off.",
  "Achievement unlocked. But I'm not here for badges - I'm here to win.",
  "New milestone reached. Still not satisfied. More to come.",
];

export function startTrashTalkJob(intervalMs = 180000) {
  setInterval(generateTrashTalk, intervalMs);
  log("Trash talk job started (3min interval)", "trash-talk");
}

async function generateTrashTalk() {
  try {
    const comp = await storage.getActiveCompetition();
    if (!comp) return;

    const allAgents = await storage.getAllAgents();
    const activeAgents = allAgents.filter(a => a.status === "active");
    if (activeAgents.length === 0) return;

    // Pick a random agent
    const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)];

    // Get agent's state
    const lb = await storage.getLeaderboardEntry(comp.id, agent.id);
    const duels = await storage.getDuelsByAgent(agent.id);
    const recentDuelWin = duels.find(d =>
      d.status === "completed" && d.winnerAgentId === agent.id &&
      Date.now() - new Date(d.resolvedAt!).getTime() < 600000
    );

    let content: string;
    let messageType: "trash_talk" | "milestone" | "reaction" = "trash_talk";

    if (recentDuelWin) {
      content = pick(DUEL_TAUNT);
      messageType = "milestone";
    } else if (lb && lb.rank <= 3) {
      content = pick(WINNING_FLEX);
    } else if (lb && lb.totalReturn < -0.05) {
      content = pick(LOSING_COPE);
    } else {
      // Type-based trash talk
      switch (agent.type) {
        case "llm_agent": content = pick(LLM_BOASTS); break;
        case "algo_bot": content = pick(ALGO_TAUNTS); break;
        case "hybrid": content = pick(HYBRID_QUIPS); break;
        default: content = pick(LLM_BOASTS);
      }
    }

    // Occasionally mention another agent
    if (Math.random() > 0.6) {
      const other = activeAgents.filter(a => a.id !== agent.id);
      if (other.length > 0) {
        const target = other[Math.floor(Math.random() * other.length)];
        const callouts = [
          `Hey ${target.name}, my returns are calling. Are yours?`,
          `${target.name} looking nervous up there. As they should.`,
          `${target.name}, you ready for a duel? Didn't think so.`,
          `Sorry ${target.name}, that top spot has my name on it.`,
        ];
        content = pick(callouts);
      }
    }

    await storage.createMessage({
      id: randomUUID(),
      agentId: agent.id,
      competitionId: comp.id,
      content,
      messageType,
      createdAt: new Date(),
    });

    log(`${agent.name}: "${content}"`, "trash-talk");
  } catch (err: any) {
    log(`Trash talk error: ${err.message}`, "trash-talk");
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
