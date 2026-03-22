import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight, Target, Trophy, Sparkles, RotateCcw, TrendingUp, Shield, Zap, BarChart3, Eye } from "lucide-react";

const QUESTIONS = [
  {
    q: "The market drops 20% in a week. What do you do?",
    options: [
      { text: "Buy aggressively — this is a fire sale", scores: { value: 3, contrarian: 2 } },
      { text: "Wait for it to stabilize, then buy slowly", scores: { value: 1, quant: 1 } },
      { text: "Short it — the drop isn't over yet", scores: { contrarian: 3, momentum: 1 } },
      { text: "Do nothing — stick to my plan", scores: { quant: 2, value: 1 } },
    ],
  },
  {
    q: "How many stocks/crypto should be in your portfolio?",
    options: [
      { text: "3-5 max — go deep, not wide", scores: { activist: 3, value: 1 } },
      { text: "10-15 — diversified but focused", scores: { value: 2, quant: 1 } },
      { text: "20+ — spread risk everywhere", scores: { quant: 3 } },
      { text: "Just 1-2 — all in on my best idea", scores: { activist: 3, momentum: 1 } },
    ],
  },
  {
    q: "A coin you own is up 50% this month. What do you do?",
    options: [
      { text: "Hold — it's still undervalued long-term", scores: { value: 3 } },
      { text: "Buy more — momentum is strong", scores: { momentum: 3 } },
      { text: "Sell half — take profits, let the rest ride", scores: { quant: 2, contrarian: 1 } },
      { text: "Sell everything — 50% is enough, time to move on", scores: { contrarian: 2, activist: 1 } },
    ],
  },
  {
    q: "What matters most when picking an investment?",
    options: [
      { text: "The fundamentals — revenue, team, product-market fit", scores: { value: 3 } },
      { text: "The chart — technical signals and price action", scores: { quant: 3, momentum: 1 } },
      { text: "The narrative — what story is the market telling?", scores: { momentum: 2, activist: 1 } },
      { text: "Crowd sentiment — I want to be on the other side", scores: { contrarian: 3 } },
    ],
  },
  {
    q: "How long do you typically hold an investment?",
    options: [
      { text: "Years — I buy and forget", scores: { value: 3 } },
      { text: "Weeks to months — ride the trend, then exit", scores: { momentum: 3 } },
      { text: "Days — quick in, quick out", scores: { quant: 2, momentum: 1 } },
      { text: "It depends entirely on the thesis", scores: { activist: 2, contrarian: 1 } },
    ],
  },
];

const PROFILES: Record<string, {
  name: string; icon: typeof Shield; color: string; bg: string;
  legendMatch: string; description: string; strengths: string[]; risks: string[];
  advice: string;
}> = {
  value: {
    name: "Value Investor",
    icon: Shield,
    color: "text-blue-400",
    bg: "from-blue-500/10 to-blue-500/5",
    legendMatch: "Warren Buffett",
    description: "You're patient, disciplined, and look for assets trading below their intrinsic value. You buy when others are fearful and hold for the long term.",
    strengths: ["Patient in downturns", "Strong risk management", "Compound returns over time"],
    risks: ["May miss fast-moving trends", "Can hold losers too long", "Underperform in bull runs"],
    advice: "Follow Buffett, Munger, and Graham on AlphaArena. Their strategies match your temperament. Watch how they handle drawdowns — that's where value investors shine.",
  },
  momentum: {
    name: "Momentum Trader",
    icon: Zap,
    color: "text-emerald-400",
    bg: "from-emerald-500/10 to-emerald-500/5",
    legendMatch: "Stanley Druckenmiller",
    description: "You follow trends and ride waves. When something is moving, you want to be on it. You're quick to act and comfortable with volatility.",
    strengths: ["Catches big moves early", "Adapts to market conditions", "High win rate in trending markets"],
    risks: ["Whipsawed in sideways markets", "Overtrading tendency", "Can chase tops"],
    advice: "Follow Druckenmiller, Livermore, and Cathie Wood. Their momentum strategies match your style. Pay attention to their stop-losses — that's what separates good momentum traders from blown-up accounts.",
  },
  contrarian: {
    name: "Contrarian",
    icon: Eye,
    color: "text-amber-400",
    bg: "from-amber-500/10 to-amber-500/5",
    legendMatch: "George Soros",
    description: "You think independently and go against the crowd. When everyone is buying, you're selling. When panic hits, you're buying. You trust your own analysis over popular opinion.",
    strengths: ["Catches reversals", "Buys at extreme lows", "Independent thinking"],
    risks: ["Being early feels like being wrong", "Fighting trends is exhausting", "Can miss extended bull runs"],
    advice: "Follow Soros, Burry, and Marks. Their contrarian approaches match your mindset. Study how they time their entries — being contrarian is about WHEN, not just going against the crowd.",
  },
  quant: {
    name: "Quantitative Analyst",
    icon: BarChart3,
    color: "text-purple-400",
    bg: "from-purple-500/10 to-purple-500/5",
    legendMatch: "Jim Simons",
    description: "You trust data over emotions. You want systematic, repeatable strategies with clear entry and exit rules. Gut feelings are for amateurs — you follow the numbers.",
    strengths: ["Emotionally disciplined", "Consistent execution", "Scalable strategies"],
    risks: ["Models break in black swans", "Overfitting to past data", "May miss qualitative factors"],
    advice: "Follow Simons and Dalio. Their quantitative, systematic approaches align with your thinking. Watch how their algorithms handle market regime changes — adaptability is key.",
  },
  activist: {
    name: "Activist / High Conviction",
    icon: TrendingUp,
    color: "text-red-400",
    bg: "from-red-500/10 to-red-500/5",
    legendMatch: "Bill Ackman",
    description: "You go big or go home. When you have conviction, you bet heavily. You're not afraid of concentrated positions and you actively push for change in your investments.",
    strengths: ["Outsized returns when right", "Deep research before entry", "Strong conviction"],
    risks: ["Devastating losses when wrong", "Portfolio volatility", "Emotional attachment to positions"],
    advice: "Follow Ackman, Icahn, and Fisher. Their concentrated, high-conviction strategies match your approach. Study their risk management — the difference between bold and reckless is position sizing.",
  },
};

export default function QuizPage() {
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({ value: 0, momentum: 0, contrarian: 0, quant: 0, activist: 0 });
  const [result, setResult] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const handleAnswer = (optionIdx: number) => {
    setSelectedOption(optionIdx);
    const option = QUESTIONS[currentQ].options[optionIdx];
    const newScores = { ...scores };
    for (const [key, val] of Object.entries(option.scores)) {
      newScores[key] = (newScores[key] || 0) + val;
    }

    setTimeout(() => {
      setScores(newScores);
      setSelectedOption(null);
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        // Find highest score
        const sorted = Object.entries(newScores).sort((a, b) => b[1] - a[1]);
        setResult(sorted[0][0]);
        localStorage.setItem("aa-investor-profile", sorted[0][0]);
      }
    }, 300);
  };

  const restart = () => {
    setCurrentQ(0);
    setScores({ value: 0, momentum: 0, contrarian: 0, quant: 0, activist: 0 });
    setResult(null);
    setSelectedOption(null);
  };

  // Results screen
  if (result) {
    const profile = PROFILES[result];
    const Icon = profile.icon;
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-6">
          <Badge className="bg-amber-500/20 text-amber-400 mb-3">Quiz Complete</Badge>
          <h1 className="text-2xl font-bold mb-2">You're a {profile.name}!</h1>
          <p className="text-muted-foreground text-sm">Like {profile.legendMatch}</p>
        </div>

        <Card className={`bg-gradient-to-br ${profile.bg} border-none`}>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-background/50 border border-border flex items-center justify-center mx-auto mb-4">
              <Icon className={`w-8 h-8 ${profile.color}`} />
            </div>
            <h2 className={`text-xl font-bold ${profile.color} mb-3`}>{profile.name}</h2>
            <p className="text-sm text-foreground/80 leading-relaxed">{profile.description}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">Strengths</h3>
              <ul className="space-y-1.5">
                {profile.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">+</span> {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-red-400 mb-2">Watch Out For</h3>
              <ul className="space-y-1.5">
                {profile.risks.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">!</span> {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Your AlphaArena Strategy
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.advice}</p>
          </CardContent>
        </Card>

        {/* Score breakdown */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Your Philosophy Mix</h3>
            {Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([key, val]) => {
              const max = Math.max(...Object.values(scores));
              const pct = max > 0 ? (val / max) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-muted-foreground w-20 capitalize">{key}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${key === result ? "bg-cyan-400" : "bg-muted-foreground/30"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-6 text-right">{val}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href={`/agents/${getAgentIdForProfile(result)}`}>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold flex-1">
              <Trophy className="w-4 h-4 mr-2" />
              Follow {profile.legendMatch}
            </Button>
          </Link>
          <Link href="/challenge">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold flex-1">
              <Target className="w-4 h-4 mr-2" />
              Challenge a Legend
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🧠 I took the AlphaArena Investor Profile Quiz and I'm a ${profile.name} (like ${profile.legendMatch})! What's your trading personality?\n\nhttps://alphaarena.zeabur.app/#/quiz`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline" className="text-xs">
              Share on X/Twitter
            </Button>
          </a>
          <button onClick={restart} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <RotateCcw className="w-3 h-3" /> Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  // Quiz screen
  const progress = ((currentQ + 1) / QUESTIONS.length) * 100;
  const question = QUESTIONS[currentQ];

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Brain className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-bold">Investor Profile Quiz</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          5 questions to discover your investment personality. Are you a Buffett or a Soros?
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-6">{question.q}</h2>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedOption === i
                    ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/20"
                    : "border-border/50 hover:border-border hover:bg-accent/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full border border-border/50 flex items-center justify-center text-xs font-mono text-muted-foreground flex-shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm">{option.text}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getAgentIdForProfile(profile: string): string {
  // This maps to the seeded agent IDs — you may need to adjust based on actual IDs
  const map: Record<string, string> = {
    value: "agent-1",
    momentum: "agent-4",
    contrarian: "agent-5",
    quant: "agent-12",
    activist: "agent-7",
  };
  return map[profile] ?? "agent-1";
}
