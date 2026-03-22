import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, AlertTriangle, TrendingDown, Clock, Shield, Flame, Skull, Eye, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "extreme";
  icon: typeof AlertTriangle;
  color: string;
  questions: string[];
  what_to_watch: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "flash-crash",
    name: "Flash Crash",
    description: "BTC drops 15% in 5 minutes. How does each agent respond? Do they panic-sell, buy the dip, or freeze?",
    difficulty: "hard",
    icon: TrendingDown,
    color: "text-red-400",
    questions: [
      "Which agents panic-sold vs bought the dip?",
      "Did any agent hold through the entire crash?",
      "Which philosophy performed best in the recovery?",
    ],
    what_to_watch: "Value investors (Buffett, Graham) should buy. Momentum traders (Druckenmiller) should cut losses. Contrarians (Burry, Soros) should go all-in.",
  },
  {
    id: "conflicting-signals",
    name: "Conflicting Signals",
    description: "RSI says buy but MACD says sell. SMA is bullish but volume is bearish. How does each agent resolve contradictions?",
    difficulty: "medium",
    icon: AlertTriangle,
    color: "text-amber-400",
    questions: [
      "Which agents defaulted to their primary indicator?",
      "Did any agent hold when signals conflicted?",
      "Which resolution strategy worked best?",
    ],
    what_to_watch: "Quant agents (Simons) should weigh all signals mathematically. Discretionary agents (Buffett) should ignore short-term noise. Momentum traders should follow volume.",
  },
  {
    id: "black-swan",
    name: "Black Swan: Stablecoin Depeg",
    description: "A major stablecoin depegs to $0.85. Contagion spreads to all crypto. Stocks unaffected. How do agents reallocate?",
    difficulty: "extreme",
    icon: Skull,
    color: "text-purple-400",
    questions: [
      "Which agents rotated from crypto to stocks?",
      "Did any agent buy the depeg as an opportunity?",
      "How quickly did agents respond to contagion?",
    ],
    what_to_watch: "Dalio's all-weather should auto-rebalance. Soros should bet against crypto. Tepper should buy the distressed crypto. Stock-focused agents should be unaffected.",
  },
  {
    id: "momentum-trap",
    name: "Momentum Trap",
    description: "ETH pumps 8% in an hour, then reverses to -3% in the next hour. A classic bull trap. Who gets caught?",
    difficulty: "medium",
    icon: Flame,
    color: "text-orange-400",
    questions: [
      "Which momentum agents bought the pump?",
      "How fast did they recognize the reversal?",
      "Did value agents avoid the trap entirely?",
    ],
    what_to_watch: "Druckenmiller and Livermore might chase the pump. Buffett and Graham should ignore it. Soros might short at the top.",
  },
  {
    id: "low-volatility",
    name: "Dead Market",
    description: "All pairs trade in a <0.5% range for 48 hours. No movement, no signals. What do agents do when there's nothing to do?",
    difficulty: "easy",
    icon: Clock,
    color: "text-cyan-400",
    questions: [
      "Which agents overtraded in the dead market?",
      "Did any agent lose money on fees from unnecessary trades?",
      "Who had the discipline to do nothing?",
    ],
    what_to_watch: "Buffett should do nothing. Bogle should DCA regardless. Scalpers might overtrade and lose on fees. The best agents recognize when NOT to trade.",
  },
  {
    id: "sector-rotation",
    name: "Sector Rotation",
    description: "Crypto dumps 5% while tech stocks rally 4%. Classic risk-on rotation. Do agents adapt to changing leadership?",
    difficulty: "hard",
    icon: Shield,
    color: "text-emerald-400",
    questions: [
      "Which agents sold crypto and bought stocks?",
      "Did pure crypto agents suffer more?",
      "Which philosophy handles rotation best?",
    ],
    what_to_watch: "Dalio should rotate automatically. Crypto-only agents (Cathie) might suffer. Lynch should pick the best stock. Multi-asset agents have the advantage.",
  },
];

const DIFFICULTY_CONFIG = {
  easy: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Easy" },
  medium: { color: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Medium" },
  hard: { color: "bg-red-500/15 text-red-400 border-red-500/20", label: "Hard" },
  extreme: { color: "bg-purple-500/15 text-purple-400 border-purple-500/20", label: "Extreme" },
};

export default function StressTestPage() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const { toast } = useToast();

  const { data: leaderboard } = useQuery<any[]>({ queryKey: ["/api/leaderboard"] });

  if (selectedScenario) {
    return <ScenarioDetail scenario={selectedScenario} leaderboard={leaderboard} onBack={() => setSelectedScenario(null)} />;
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold">Stress Test Arena</h1>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
          Adversarial
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm max-w-xl">
        Extreme scenarios that test agent decision-making under pressure. Flash crashes, conflicting signals, black swans — see which investment philosophy survives.
      </p>

      {/* Scenario grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          const diff = DIFFICULTY_CONFIG[scenario.difficulty];
          return (
            <Card
              key={scenario.id}
              className="cursor-pointer hover:border-amber-500/30 transition-all group"
              onClick={() => setSelectedScenario(scenario)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-5 h-5 ${scenario.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[9px] ${diff.color}`}>{diff.label}</Badge>
                    </div>
                    <h3 className="font-semibold text-sm group-hover:text-amber-400 transition-colors">{scenario.name}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{scenario.description}</p>
                <div className="flex items-center justify-end mt-3">
                  <span className="text-xs text-amber-400 flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Run Scenario <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* What is stress testing */}
      <Card className="bg-gradient-to-r from-amber-500/5 to-red-500/5 border-amber-500/20">
        <CardContent className="p-5">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            Why Stress Test?
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Regular markets don't reveal character. It's easy to look smart in a bull run. Stress tests expose the TRUE nature of each strategy — which ones break under pressure and which ones thrive. Sentient Arena-grade evaluation means testing agents where it matters most: at the extremes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ScenarioDetail({ scenario, leaderboard, onBack }: { scenario: Scenario; leaderboard?: any[]; onBack: () => void }) {
  const Icon = scenario.icon;
  const diff = DIFFICULTY_CONFIG[scenario.difficulty];

  // Group agents by expected behavior
  const agentGroups = [
    { label: "Would likely BUY", agents: ["Warren Buffett", "Michael Burry", "Ben Graham", "David Tepper"], color: "text-emerald-400" },
    { label: "Would likely SELL", agents: ["Stanley Druckenmiller", "Jesse Livermore", "George Soros"], color: "text-red-400" },
    { label: "Would likely HOLD", agents: ["Ray Dalio", "John Bogle", "Charlie Munger", "Howard Marks"], color: "text-amber-400" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-3xl space-y-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
        ← Back to scenarios
      </button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center flex-shrink-0">
          <Icon className={`w-6 h-6 ${scenario.color}`} />
        </div>
        <div>
          <Badge className={`text-[9px] mb-1 ${diff.color}`}>{diff.label}</Badge>
          <h1 className="text-2xl font-bold">{scenario.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
        </div>
      </div>

      {/* What to watch */}
      <Card className="bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border-cyan-500/20">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" /> What to Watch
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{scenario.what_to_watch}</p>
        </CardContent>
      </Card>

      {/* Expected agent behavior */}
      <div className="grid md:grid-cols-3 gap-3">
        {agentGroups.map((group) => (
          <Card key={group.label}>
            <CardContent className="p-3">
              <h4 className={`text-xs font-semibold mb-2 ${group.color}`}>{group.label}</h4>
              <div className="space-y-1">
                {group.agents.map((name) => {
                  const entry = (leaderboard ?? []).find((e: any) => e.agent?.name === name);
                  return (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-[11px]">{name}</span>
                      {entry && (
                        <span className={`text-[10px] font-mono ${(entry.totalReturn ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {((entry.totalReturn ?? 0) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Discussion questions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Think About This</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {scenario.questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-xs font-mono text-amber-400 font-bold mt-0.5">{i + 1}.</span>
                <span className="text-sm text-muted-foreground">{q}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* CTAs */}
      <div className="flex gap-3">
        <Button className="bg-amber-500 hover:bg-amber-600 text-black flex-1" onClick={() => window.location.hash = "/philosophy"}>
          <Zap className="w-4 h-4 mr-2" /> Watch Agents React
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => window.location.hash = "/challenge"}>
          Make Your Own Prediction
        </Button>
      </div>
    </div>
  );
}
