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

// Legendary investor quotes mapped by agent name
const INVESTOR_QUOTES: Record<string, string[]> = {
  "Warren Buffett": [
    "Price is what you pay. Value is what you get. And I'm getting value right now.",
    "Be fearful when others are greedy, and greedy when others are fearful.",
    "The stock market transfers money from the impatient to the patient. I am patient.",
    "Our favorite holding period is forever. Diamond hands aren't a meme — they're a strategy.",
    "Rule #1: Never lose money. Rule #2: Never forget Rule #1.",
  ],
  "Cathie Wood": [
    "Innovation waits for no one. SOL is the future of finance.",
    "We're investing on a 5-year time horizon. This volatility is noise.",
    "Disruptive innovation creates deflation. My portfolio is the future.",
    "The market is mispricing innovation. Again. I'm buying.",
    "NVDA and SOL are the backbone of the next decade. Conviction holds.",
  ],
  "Stanley Druckenmiller": [
    "The trend is your friend. And right now, the trend is MY friend.",
    "When you see it, bet big. Half measures are for amateurs.",
    "I made my money by being early and sizing up. Still doing it.",
    "Macro doesn't care about your feelings. Follow the money.",
    "Cut your losers fast. Let your winners run. It's that simple.",
  ],
  "Michael Burry": [
    "Everyone's buying the top. I'm buying the bottom. Big Short energy.",
    "The crowd is wrong. The crowd is ALWAYS wrong. RSI doesn't lie.",
    "You laugh at my contrarian trades now. You won't in 6 months.",
    "I see dead portfolios. Yours, specifically.",
    "When RSI hits 20, I start buying. When it hits 80, I start laughing.",
  ],
  "Peter Lynch": [
    "Invest in what you know. I know this chart, and it's going up.",
    "Behind every stock is a company. Behind every crypto is a protocol. I study both.",
    "I'm looking for tenbaggers. Not finding many — but when I do, I size up.",
    "The person who turns over the most rocks wins the game.",
  ],
  "Charlie Munger": [
    "All I want to know is where I'm going to die, so I'll never go there.",
    "Invert, always invert. Everyone's buying garbage. I buy quality.",
    "It's waiting that helps you as an investor, and a lot of people can't stand to wait.",
    "BTC and ETH are the only ones worth owning. The rest is speculation.",
  ],
  "Bill Ackman": [
    "Concentrated conviction. One great idea beats ten mediocre ones.",
    "I don't diversify. I concentrate. And I'm right more often than not.",
    "Where's the catalyst? Found it. Going all in.",
    "Volatility is opportunity. The more volatile, the more I like it.",
  ],
  "Ray Dalio": [
    "The Holy Grail of investing is uncorrelated return streams. I have 18 of them.",
    "Pain + Reflection = Progress. My all-weather portfolio proves it.",
    "Diversify or die. I choose to diversify.",
    "Principles work. My principles are working right now.",
  ],
  "George Soros": [
    "Markets are reflexive. When everyone agrees, everyone is wrong.",
    "I broke the Bank of England. Your algo is next.",
    "Find the mispricing. Then bet everything. That's how fortunes are made.",
    "When I see a bubble forming, I rush in. Then I rush out before it pops.",
  ],
  "Jim Simons": [
    "The math doesn't lie. My Medallion signals are pure signal, zero noise.",
    "66% annual returns for 30 years. And you're still using moving averages?",
    "I hire mathematicians, not economists. The data speaks.",
    "Pattern recognition at scale. That's all this is.",
  ],
  "Jesse Livermore": [
    "The tape tells me everything I need to know. Right now it says buy.",
    "It never was my thinking that made big money. It was sitting. Sitting tight.",
    "Pyramid into winners. Cut the losers. The rest is noise.",
    "The market is never wrong. Opinions are.",
  ],
  "Carl Icahn": [
    "I don't buy assets. I buy chaos. Then I fix it.",
    "Looking for my next hostile takeover. This market is ripe.",
    "Volatility is my playground. The higher it goes, the more I make.",
    "When everyone runs from volatility, I run toward it.",
  ],
  "David Tepper": [
    "Best time to buy is when there's blood in the streets. I see blood.",
    "Distressed assets are my happy place. Bankruptcy is opportunity.",
    "Everyone's panicking. I'm loading up. This is how you make billions.",
    "The worse it looks, the better I like it.",
  ],
  "Howard Marks": [
    "Second-level thinking. While you see 'cheap,' I see 'cheap for a reason' — and I'm buying anyway.",
    "The most important thing is to think differently from the consensus.",
    "Risk means more things can happen than will happen. I prepare for all of them.",
    "Being too far ahead of your time is indistinguishable from being wrong.",
  ],
  "Phil Fisher": [
    "If the job has been correctly done, the time to sell is almost never.",
    "I'd rather own a few outstanding companies than diversify into mediocrity.",
    "Scuttlebutt research. Talk to customers, competitors, suppliers. Then buy.",
    "Outstanding companies bought at reasonable prices make fortunes over decades.",
  ],
  "John Bogle": [
    "Don't look for the needle in the haystack. Just buy the haystack.",
    "Time is your friend. Impulse is your enemy.",
    "The stock market is a giant distraction from the business of investing.",
    "Costs matter. Every basis point I save compounds forever.",
  ],
  "Ben Graham": [
    "In the short run, the market is a voting machine. In the long run, it is a weighing machine.",
    "Margin of safety. Three words that will save your portfolio.",
    "Buy at the low. Sell at the high. Ignore everything in between.",
    "The intelligent investor is a realist who sells to optimists and buys from pessimists.",
  ],
};

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
    } else if (INVESTOR_QUOTES[agent.name]) {
      // Investor personality quotes
      content = pick(INVESTOR_QUOTES[agent.name]);
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
