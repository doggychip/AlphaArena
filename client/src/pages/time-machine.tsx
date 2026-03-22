import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, TrendingDown, TrendingUp, Zap, Flame, ArrowRight, Play, Brain, Lightbulb } from "lucide-react";
import AgentAvatar from "@/components/AgentAvatar";

interface HistoricalEvent {
  id: string;
  name: string;
  date: string;
  description: string;
  icon: typeof Flame;
  color: string;
  btcBefore: number;
  btcAfter: number;
  btcChange: number;
  duration: string;
  agentResponses: {
    name: string;
    philosophy: string;
    action: string;
    reasoning: string;
    result: string;
    pnl: number;
  }[];
  lesson: string;
}

const EVENTS: HistoricalEvent[] = [
  {
    id: "luna-crash",
    name: "Luna/UST Collapse",
    date: "May 2022",
    description: "Terra's UST stablecoin lost its peg, causing Luna to crash 99.99%. $40B wiped out in days. Contagion spread across all crypto.",
    icon: Flame,
    color: "text-red-400",
    btcBefore: 38000,
    btcAfter: 26700,
    btcChange: -0.297,
    duration: "2 weeks",
    agentResponses: [
      { name: "Warren Buffett", philosophy: "Value", action: "HOLD then BUY", reasoning: "BTC's fundamentals haven't changed. Luna was a flawed project, not a BTC problem. At $28K, BTC is approaching fair value.", result: "Bought BTC at $28K, recovered to $31K in June", pnl: 0.107 },
      { name: "George Soros", philosophy: "Contrarian", action: "SHORT then BUY", reasoning: "Reflexivity in action — panic selling creates more panic. Short the bounce, then buy the capitulation.", result: "Shorted at $34K, covered at $29K, then bought at $26K", pnl: 0.192 },
      { name: "Stanley Druckenmiller", philosophy: "Momentum", action: "SELL ALL", reasoning: "Momentum is decisively negative. Cut everything. Don't try to catch a falling knife. Re-enter when trend reverses.", result: "Sold at $36K, avoided the worst. Missed the bounce.", pnl: 0.053 },
      { name: "Michael Burry", philosophy: "Contrarian", action: "BUY AGGRESSIVELY", reasoning: "This is the kind of panic I live for. Everyone is selling. RSI at 15. The Big Short of crypto — but in reverse. Buy.", result: "Loaded up at $27K, biggest winner long-term", pnl: 0.241 },
      { name: "Ray Dalio", philosophy: "Quant", action: "REBALANCE", reasoning: "All-Weather adjusts automatically. Crypto allocation dropped from 5% to 3% of portfolio. No panic, just math.", result: "Small loss absorbed by diversification", pnl: -0.015 },
      { name: "Cathie Wood", philosophy: "Momentum", action: "BUY THE DIP", reasoning: "Disruption is on sale. This is a 5-year play. Dollar-cost average into BTC, ETH, SOL at these levels.", result: "Bought throughout the crash, underwater for months", pnl: -0.082 },
    ],
    lesson: "Contrarian strategies dominated the Luna crash. Value investors who waited for extreme fear were rewarded. Momentum traders who cut early preserved capital. The worst outcome was buying the dip too early without conviction to hold.",
  },
  {
    id: "btc-halving-2024",
    name: "BTC Halving Rally",
    date: "April 2024",
    description: "Bitcoin's 4th halving reduced block rewards from 6.25 to 3.125 BTC. Price rallied from $42K to $73K in anticipation, then consolidated.",
    icon: Zap,
    color: "text-amber-400",
    btcBefore: 42000,
    btcAfter: 63000,
    btcChange: 0.50,
    duration: "3 months",
    agentResponses: [
      { name: "Warren Buffett", philosophy: "Value", action: "HOLD", reasoning: "I don't understand crypto's intrinsic value well enough to buy more. But I won't sell what I have. Supply reduction is fundamentally positive.", result: "Held steady, modest gains", pnl: 0.12 },
      { name: "Stanley Druckenmiller", philosophy: "Momentum", action: "BUY BIG", reasoning: "The halving narrative is the strongest macro setup in crypto. Momentum is accelerating. Bet big when you see it.", result: "Bought at $44K, rode to $73K", pnl: 0.659 },
      { name: "George Soros", philosophy: "Contrarian", action: "SELL INTO RALLY", reasoning: "Everyone expects the halving pump. Reflexivity says: when everyone is positioned the same way, the opposite happens. Selling into strength.", result: "Sold at $65K, missed the final push to $73K", pnl: 0.15 },
      { name: "Jim Simons", philosophy: "Quant", action: "ALGORITHMIC BUY", reasoning: "Historical data: BTC averages +300% in 12 months post-halving. Pattern recognition triggers buy. Position size: 2x normal.", result: "Systematic buying from $42K-$50K range", pnl: 0.46 },
      { name: "Cathie Wood", philosophy: "Momentum", action: "ALL IN", reasoning: "BTC to $1M is my base case. The halving accelerates the thesis. This is the most important buying opportunity of the cycle.", result: "Maximum position, huge winner", pnl: 0.738 },
      { name: "Howard Marks", philosophy: "Contrarian", action: "REDUCE POSITION", reasoning: "Second-level thinking: if everyone is bullish on the halving, the expected outcome is already priced in. Take some off the table.", result: "Trimmed at $58K, missed some upside", pnl: 0.08 },
    ],
    lesson: "Momentum strategies dominated the halving rally. Trend-followers who went big early captured the most gains. Contrarians who sold early left money on the table. The lesson: in strong narrative-driven rallies, momentum beats contrarian thinking.",
  },
  {
    id: "ftx-collapse",
    name: "FTX Collapse",
    date: "November 2022",
    description: "FTX, the world's 2nd largest exchange, collapsed overnight. $8B in customer funds missing. BTC dropped from $21K to $15.5K — the cycle bottom.",
    icon: Flame,
    color: "text-orange-400",
    btcBefore: 21000,
    btcAfter: 15500,
    btcChange: -0.262,
    duration: "1 week",
    agentResponses: [
      { name: "Michael Burry", philosophy: "Contrarian", action: "BUY THE BLOOD", reasoning: "This is it — maximum fear, maximum opportunity. FTX is dead but Bitcoin isn't. This is the cycle bottom. Loading up.", result: "Bought at $16K — the literal bottom. Legendary call.", pnl: 0.94 },
      { name: "Warren Buffett", philosophy: "Value", action: "BUY SLOWLY", reasoning: "Be greedy when others are fearful. $16K BTC is below mining cost. Even if you don't love crypto, the math works here.", result: "DCA'd from $17K-$16K over the week", pnl: 0.65 },
      { name: "Stanley Druckenmiller", philosophy: "Momentum", action: "CASH", reasoning: "Momentum is death. Exchange risk is existential. Move everything to cold storage or cash. Wait for the dust to settle.", result: "Avoided the crash, re-entered at $18K later", pnl: 0.22 },
      { name: "Ray Dalio", philosophy: "Quant", action: "RISK PARITY ADJUST", reasoning: "Crypto allocation auto-reduced to minimum. Volatility spike triggers portfolio insurance. The system handles this automatically.", result: "Minimal crypto exposure, small loss", pnl: -0.02 },
      { name: "George Soros", philosophy: "Contrarian", action: "SHORT THEN REVERSE", reasoning: "Reflexivity: exchange collapse creates contagion fear. Short first, then reverse when capitulation is complete.", result: "Shorted at $20K, reversed at $16K", pnl: 0.55 },
      { name: "Bill Ackman", philosophy: "Activist", action: "AVOID", reasoning: "Counterparty risk is unacceptable. Until we know who else is exposed, don't touch anything crypto. This could cascade.", result: "Sat out entirely, no loss but no gain", pnl: 0.0 },
    ],
    lesson: "The FTX collapse rewarded those with the courage to buy extreme fear. Burry's contrarian 'buy the blood' at $16K was one of the best trades in crypto history. The lesson: the best trades feel the worst to make. When it feels irresponsible to buy, that's often the best time.",
  },
  {
    id: "eth-merge",
    name: "Ethereum Merge",
    date: "September 2022",
    description: "Ethereum transitioned from Proof-of-Work to Proof-of-Stake. 'Buy the rumor, sell the news' — ETH rallied beforehand then dropped 15% after.",
    icon: Zap,
    color: "text-purple-400",
    btcBefore: 1700,
    btcAfter: 1300,
    btcChange: -0.235,
    duration: "1 month",
    agentResponses: [
      { name: "George Soros", philosophy: "Contrarian", action: "SELL BEFORE MERGE", reasoning: "Classic reflexivity: everyone expects the Merge to pump ETH. Therefore it won't. Sell the rumor.", result: "Sold at $1,650, avoided the dump. Top 1% call.", pnl: 0.27 },
      { name: "Cathie Wood", philosophy: "Momentum", action: "HOLD THROUGH", reasoning: "The Merge is deflationary for ETH supply. Long-term thesis unchanged. Short-term noise.", result: "Held through the dump, underwater temporarily", pnl: -0.15 },
      { name: "Jim Simons", philosophy: "Quant", action: "FADE THE EVENT", reasoning: "Historical pattern: major protocol upgrades are 'sell the news' events 70% of the time. Algorithm shorts 2 days before.", result: "Short from $1,600, covered at $1,350", pnl: 0.156 },
      { name: "Warren Buffett", philosophy: "Value", action: "IGNORE", reasoning: "I have no idea what Proof-of-Stake means. I'll stick with what I know. No position change.", result: "Unaffected — wasn't in ETH", pnl: 0.0 },
      { name: "Stanley Druckenmiller", philosophy: "Momentum", action: "BUY PRE-MERGE, SELL AT MERGE", reasoning: "Ride the momentum into the event, exit before the news hits. Classic event-driven play.", result: "Bought at $1,500, sold at $1,680, clean exit", pnl: 0.12 },
      { name: "Howard Marks", philosophy: "Contrarian", action: "WAIT", reasoning: "Second-level thinking: the crowd is split, so neither extreme will play out cleanly. Wait for clarity after the event.", result: "Bought ETH at $1,350 post-dump", pnl: 0.15 },
    ],
    lesson: "The ETH Merge was a textbook 'sell the news' event. Soros's reflexivity framework predicted it perfectly. The lesson: when an event is widely anticipated and heavily positioned, the opposite often happens. Second-level thinking wins.",
  },
];

export default function TimeMachinePage() {
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);

  if (selectedEvent) {
    return <EventReplay event={selectedEvent} onBack={() => setSelectedEvent(null)} />;
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-purple-400" />
        <h1 className="text-2xl font-bold">Time Machine</h1>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">4 Events</Badge>
      </div>
      <p className="text-muted-foreground text-sm max-w-xl">
        Replay historical market events through each agent's strategy. See what Buffett, Soros, and Burry
        would have done — and learn from the outcomes.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {EVENTS.map((event) => {
          const Icon = event.icon;
          return (
            <Card key={event.id} className="cursor-pointer hover:border-purple-500/30 transition-all group" onClick={() => setSelectedEvent(event)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${event.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm group-hover:text-purple-400 transition-colors">{event.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{event.date} · {event.duration}</p>
                  </div>
                  <Badge className={`text-[10px] ${event.btcChange >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {event.btcChange >= 0 ? "+" : ""}{(event.btcChange * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{event.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1">
                    {event.agentResponses.slice(0, 4).map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-muted border-2 border-background" />
                    ))}
                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] text-muted-foreground">
                      +{event.agentResponses.length - 4}
                    </div>
                  </div>
                  <span className="text-xs text-purple-400 flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3" /> Replay
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function EventReplay({ event, onBack }: { event: HistoricalEvent; onBack: () => void }) {
  const [revealedAgents, setRevealedAgents] = useState(1);
  const Icon = event.icon;

  const revealNext = () => {
    if (revealedAgents < event.agentResponses.length) {
      setRevealedAgents(revealedAgents + 1);
    }
  };

  const bestAgent = [...event.agentResponses].sort((a, b) => b.pnl - a.pnl)[0];
  const worstAgent = [...event.agentResponses].sort((a, b) => a.pnl - b.pnl)[0];

  return (
    <div className="p-6 lg:p-10 max-w-4xl space-y-6">
      {/* Header */}
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
        ← Back to events
      </button>

      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${event.color}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">{event.date} · {event.duration}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>

      {/* Price Impact */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground">Before</p>
              <p className="text-lg font-mono font-bold">${event.btcBefore.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">After</p>
              <p className={`text-lg font-mono font-bold ${event.btcChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ${event.btcAfter.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Change</p>
              <p className={`text-lg font-mono font-bold ${event.btcChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {event.btcChange >= 0 ? "+" : ""}{(event.btcChange * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Responses */}
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-400" />
        How Each Legend Responded
      </h2>

      <div className="space-y-3">
        {event.agentResponses.slice(0, revealedAgents).map((agent, i) => {
          const isBest = agent.name === bestAgent.name;
          const isWorst = agent.name === worstAgent.name;
          return (
            <Card key={i} className={`transition-all animate-in fade-in slide-in-from-bottom-2 duration-500 ${isBest ? "border-emerald-500/30" : isWorst ? "border-red-500/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{agent.name}</span>
                      <Badge variant="outline" className="text-[9px]">{agent.philosophy}</Badge>
                      <Badge className={`text-[9px] ${
                        agent.action.includes("BUY") ? "bg-emerald-500/20 text-emerald-400" :
                        agent.action.includes("SELL") || agent.action.includes("SHORT") ? "bg-red-500/20 text-red-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {agent.action}
                      </Badge>
                      {isBest && <Badge className="bg-amber-500/20 text-amber-400 text-[9px]">BEST RESULT</Badge>}
                      {isWorst && agent.pnl < 0 && <Badge className="bg-red-500/20 text-red-400 text-[9px]">WORST</Badge>}
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3 border border-border/30 mb-2">
                      <p className="text-sm italic text-foreground/80">"{agent.reasoning}"</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{agent.result}</p>
                      <span className={`text-sm font-mono font-bold ${agent.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {agent.pnl >= 0 ? "+" : ""}{(agent.pnl * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {revealedAgents < event.agentResponses.length && (
        <Button onClick={revealNext} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold">
          <Play className="w-4 h-4 mr-2" />
          Reveal Next Agent ({event.agentResponses.length - revealedAgents} remaining)
        </Button>
      )}

      {/* Lesson */}
      {revealedAgents >= event.agentResponses.length && (
        <Card className="bg-gradient-to-r from-purple-500/5 to-cyan-500/5 border-purple-500/20 animate-in fade-in duration-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm mb-2">Key Lesson</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{event.lesson}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Link href="/philosophy">
                <Button size="sm" variant="outline" className="text-xs">
                  <Brain className="w-3 h-3 mr-1" /> Watch Live Battle
                </Button>
              </Link>
              <Link href="/challenge">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black text-xs">
                  Challenge a Legend <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
