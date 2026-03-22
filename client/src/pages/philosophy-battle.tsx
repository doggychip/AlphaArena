import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, TrendingUp, TrendingDown, Minus, Brain, BookOpen, Lightbulb, ArrowRight } from "lucide-react";
import AgentAvatar from "@/components/AgentAvatar";
import { formatCurrency, formatNumber, formatRelativeTime } from "@/lib/format";

// Investment philosophies
const PHILOSOPHIES = [
  { id: "value", label: "Value", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", desc: "Buy undervalued assets and hold long-term", agents: ["Warren Buffett", "Charlie Munger", "Ben Graham", "Peter Lynch", "John Bogle"] },
  { id: "momentum", label: "Momentum", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", desc: "Follow trends and ride the wave", agents: ["Stanley Druckenmiller", "Jesse Livermore", "Cathie Wood"] },
  { id: "contrarian", label: "Contrarian", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", desc: "Go against the crowd — buy fear, sell greed", agents: ["George Soros", "Michael Burry", "Howard Marks", "David Tepper"] },
  { id: "quant", label: "Quantitative", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", desc: "Pure math and data-driven signals", agents: ["Jim Simons", "Ray Dalio"] },
  { id: "activist", label: "Activist/Growth", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", desc: "Concentrated bets with strong conviction", agents: ["Bill Ackman", "Carl Icahn", "Phil Fisher"] },
];

function classifyAgent(name: string): string {
  for (const p of PHILOSOPHIES) {
    if (p.agents.some(a => name.toLowerCase().includes(a.split(" ").pop()!.toLowerCase()))) return p.id;
  }
  return "quant";
}

export default function PhilosophyBattlePage() {
  const { data: leaderboard, isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 15000,
  });

  const { data: trades } = useQuery<any[]>({
    queryKey: ["/api/feed"],
    refetchInterval: 10000,
  });

  // Group leaderboard by philosophy
  const grouped: Record<string, { agents: any[]; avgReturn: number; avgSharpe: number }> = {};
  for (const p of PHILOSOPHIES) grouped[p.id] = { agents: [], avgReturn: 0, avgSharpe: 0 };
  for (const entry of leaderboard ?? []) {
    const phil = classifyAgent(entry.agent?.name ?? "");
    if (grouped[phil]) grouped[phil].agents.push(entry);
  }
  for (const [, g] of Object.entries(grouped)) {
    if (g.agents.length) {
      g.avgReturn = g.agents.reduce((s, a) => s + a.totalReturn, 0) / g.agents.length;
      g.avgSharpe = g.agents.reduce((s, a) => s + a.sharpeRatio, 0) / g.agents.length;
    }
  }

  // Rank philosophies by avg return
  const ranked = [...PHILOSOPHIES].sort((a, b) => (grouped[b.id]?.avgReturn ?? 0) - (grouped[a.id]?.avgReturn ?? 0));

  // Recent trades with explanations
  const recentTrades = (trades ?? []).slice(0, 20);

  return (
    <div className="p-6 lg:p-10 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Swords className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold">Philosophy Battle</h1>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">LIVE</Badge>
      </div>
      <p className="text-muted-foreground text-sm max-w-2xl">
        Watch 5 investment philosophies compete on today's live market. Value vs Momentum vs Contrarian vs Quant vs Activist.
        Which philosophy wins? Learn why.
      </p>

      {/* Philosophy Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {ranked.map((phil, i) => {
          const g = grouped[phil.id];
          const isWinning = i === 0;
          return (
            <Card key={phil.id} className={`transition-all ${isWinning ? "border-amber-500/40 ring-1 ring-amber-500/20" : ""}`}>
              <CardContent className="p-4 text-center space-y-2">
                {isWinning && <Badge className="bg-amber-500/20 text-amber-400 text-[10px] mb-1">👑 LEADING</Badge>}
                <h3 className={`font-bold text-sm ${phil.color}`}>{phil.label}</h3>
                <p className="text-[10px] text-muted-foreground leading-tight">{phil.desc}</p>
                <div className="text-lg font-mono font-bold">
                  <span className={g.avgReturn >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {g.avgReturn >= 0 ? "+" : ""}{(g.avgReturn * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Sharpe: {g.avgSharpe.toFixed(2)} · {g.agents.length} agents
                </div>
                <div className="flex flex-wrap justify-center gap-1 mt-1">
                  {g.agents.slice(0, 3).map((a: any) => (
                    <Link key={a.agentId} href={`/agents/${a.agentId}`}>
                      <Badge variant="outline" className="text-[9px] cursor-pointer hover:bg-accent transition-colors">
                        {a.agent?.name?.split(" ").pop()}
                      </Badge>
                    </Link>
                  ))}
                  {g.agents.length > 3 && <Badge variant="outline" className="text-[9px]">+{g.agents.length - 3}</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="trades" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="trades">Why They Traded</TabsTrigger>
          <TabsTrigger value="matchups">Head-to-Head</TabsTrigger>
          <TabsTrigger value="lessons">Today's Lessons</TabsTrigger>
        </TabsList>

        {/* WHY THEY TRADED */}
        <TabsContent value="trades" className="space-y-3 mt-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            Why Did They Trade?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Every trade explained in plain English. Understand the thinking behind each move.
          </p>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : recentTrades.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Waiting for agents to trade...</div>
          ) : (
            recentTrades.map((trade: any) => {
              const phil = PHILOSOPHIES.find(p => p.id === classifyAgent(trade.agentName ?? ""));
              const isBuy = trade.side === "buy";
              return (
                <Card key={trade.id} className="hover:bg-accent/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AgentAvatar agentId={trade.agentId} agentType={trade.agentType} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link href={`/agents/${trade.agentId}`}>
                            <span className="font-semibold text-sm hover:text-cyan-400 cursor-pointer">{trade.agentName}</span>
                          </Link>
                          {phil && (
                            <Badge variant="outline" className={`text-[9px] ${phil.bg} ${phil.color}`}>
                              {phil.label}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(trade.executedAt)}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`text-[10px] ${isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                            {isBuy ? "▲ BUY" : "▼ SELL"}
                          </Badge>
                          <span className="text-sm font-mono">
                            {formatNumber(trade.quantity, 4)} {trade.pair}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @ {formatCurrency(trade.price)}
                          </span>
                        </div>

                        {/* Philosophy explanation */}
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm leading-relaxed">{trade.reason || getPhilosophyExplanation(trade, phil?.id ?? "value")}</p>
                              <p className="text-[10px] text-muted-foreground mt-1 italic">
                                {getPhilosophyLesson(phil?.id ?? "value")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* HEAD-TO-HEAD */}
        <TabsContent value="matchups" className="space-y-4 mt-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            Philosophy Head-to-Head
          </h2>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : (
            <>
              {/* Generate matchups between the top philosophies */}
              {generateMatchups(ranked, grouped).map((matchup, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      {/* Left */}
                      <div className="text-center">
                        <h3 className={`font-bold text-sm ${matchup.left.color}`}>{matchup.left.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{matchup.left.desc}</p>
                        <div className={`text-xl font-mono font-bold mt-2 ${matchup.leftReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {matchup.leftReturn >= 0 ? "+" : ""}{(matchup.leftReturn * 100).toFixed(2)}%
                        </div>
                        <p className="text-[10px] text-muted-foreground">avg return</p>
                        <div className="flex flex-wrap justify-center gap-1 mt-2">
                          {matchup.leftAgents.map((a: string) => (
                            <Badge key={a} variant="outline" className="text-[9px]">{a.split(" ").pop()}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* VS */}
                      <div className="text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                          <span className="text-amber-400 font-bold text-xs">VS</span>
                        </div>
                        {matchup.leftReturn > matchup.rightReturn ? (
                          <Badge className="mt-2 bg-emerald-500/20 text-emerald-400 text-[9px]">← WINNING</Badge>
                        ) : matchup.rightReturn > matchup.leftReturn ? (
                          <Badge className="mt-2 bg-emerald-500/20 text-emerald-400 text-[9px]">WINNING →</Badge>
                        ) : (
                          <Badge className="mt-2 bg-muted text-muted-foreground text-[9px]">TIE</Badge>
                        )}
                      </div>

                      {/* Right */}
                      <div className="text-center">
                        <h3 className={`font-bold text-sm ${matchup.right.color}`}>{matchup.right.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{matchup.right.desc}</p>
                        <div className={`text-xl font-mono font-bold mt-2 ${matchup.rightReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {matchup.rightReturn >= 0 ? "+" : ""}{(matchup.rightReturn * 100).toFixed(2)}%
                        </div>
                        <p className="text-[10px] text-muted-foreground">avg return</p>
                        <div className="flex flex-wrap justify-center gap-1 mt-2">
                          {matchup.rightAgents.map((a: string) => (
                            <Badge key={a} variant="outline" className="text-[9px]">{a.split(" ").pop()}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Insight */}
                    <div className="mt-4 bg-muted/30 rounded-lg p-3 border border-border/30">
                      <p className="text-xs text-muted-foreground">
                        <BookOpen className="w-3 h-3 inline mr-1" />
                        <strong>Lesson: </strong>{matchup.insight}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* TODAY'S LESSONS */}
        <TabsContent value="lessons" className="space-y-4 mt-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Today's Market Classroom
          </h2>
          <p className="text-sm text-muted-foreground">
            What today's market taught us — through the lens of competing investment philosophies.
          </p>

          {generateLessons(ranked, grouped, recentTrades).map((lesson, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-bold text-xs">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{lesson.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{lesson.body}</p>
                    {lesson.takeaway && (
                      <div className="mt-2 flex items-center gap-1 text-cyan-400 text-xs font-medium">
                        <ArrowRight className="w-3 h-3" />
                        <span>{lesson.takeaway}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function getPhilosophyExplanation(trade: any, philId: string): string {
  const pair = trade.pair ?? "BTC/USD";
  const isBuy = trade.side === "buy";
  const explanations: Record<string, string> = {
    value: isBuy ? `Sees ${pair} as undervalued at current price. Long-term fundamentals intact.` : `${pair} reached fair value. Taking profits to redeploy into better opportunities.`,
    momentum: isBuy ? `${pair} showing strong upward momentum. Riding the trend.` : `Momentum fading on ${pair}. Cutting before reversal.`,
    contrarian: isBuy ? `Market is fearful about ${pair}. Going against the crowd.` : `${pair} getting too much hype. Time to take the other side.`,
    quant: isBuy ? `Quantitative signals triggered a buy on ${pair}. Multiple indicators aligned.` : `Sell signal triggered on ${pair}. Risk-reward no longer favorable.`,
    activist: isBuy ? `High conviction bet on ${pair}. Concentrated position.` : `Thesis changed on ${pair}. Cutting immediately.`,
  };
  return explanations[philId] ?? `Trading ${pair} based on current market analysis.`;
}

function getPhilosophyLesson(philId: string): string {
  const lessons: Record<string, string> = {
    value: "💡 Value investing: buy assets for less than they're worth, then wait.",
    momentum: "💡 Momentum: trends persist. The trend is your friend until it ends.",
    contrarian: "💡 Contrarian: the crowd is usually wrong at extremes. Be fearful when others are greedy.",
    quant: "💡 Quantitative: remove emotion, follow the data. Discipline beats intuition.",
    activist: "💡 Activist: when you have conviction, bet big. Diversification is for those who don't know what they're doing.",
  };
  return lessons[philId] ?? "💡 Every trade teaches a lesson if you pay attention.";
}

function generateMatchups(ranked: typeof PHILOSOPHIES, grouped: Record<string, any>) {
  const matchups = [];
  // Top vs Second
  if (ranked.length >= 2) {
    matchups.push({
      left: ranked[0], right: ranked[1],
      leftReturn: grouped[ranked[0].id]?.avgReturn ?? 0,
      rightReturn: grouped[ranked[1].id]?.avgReturn ?? 0,
      leftAgents: ranked[0].agents, rightAgents: ranked[1].agents,
      insight: getMatchupInsight(ranked[0].id, ranked[1].id, grouped[ranked[0].id]?.avgReturn ?? 0, grouped[ranked[1].id]?.avgReturn ?? 0),
    });
  }
  // Value vs Momentum (classic battle)
  const value = ranked.find(p => p.id === "value")!;
  const momentum = ranked.find(p => p.id === "momentum")!;
  if (value && momentum) {
    matchups.push({
      left: value, right: momentum,
      leftReturn: grouped.value?.avgReturn ?? 0,
      rightReturn: grouped.momentum?.avgReturn ?? 0,
      leftAgents: value.agents, rightAgents: momentum.agents,
      insight: getMatchupInsight("value", "momentum", grouped.value?.avgReturn ?? 0, grouped.momentum?.avgReturn ?? 0),
    });
  }
  // Contrarian vs Quant
  const contrarian = ranked.find(p => p.id === "contrarian")!;
  const quant = ranked.find(p => p.id === "quant")!;
  if (contrarian && quant) {
    matchups.push({
      left: contrarian, right: quant,
      leftReturn: grouped.contrarian?.avgReturn ?? 0,
      rightReturn: grouped.quant?.avgReturn ?? 0,
      leftAgents: contrarian.agents, rightAgents: quant.agents,
      insight: getMatchupInsight("contrarian", "quant", grouped.contrarian?.avgReturn ?? 0, grouped.quant?.avgReturn ?? 0),
    });
  }
  return matchups;
}

function getMatchupInsight(leftId: string, rightId: string, leftReturn: number, rightReturn: number): string {
  const winner = leftReturn > rightReturn ? leftId : rightId;
  const insights: Record<string, Record<string, string>> = {
    value: {
      momentum: leftReturn > rightReturn ? "Patient value investing is outperforming trend-following. Markets may be mean-reverting." : "Momentum is winning — markets are trending strongly. Value investors need patience.",
      contrarian: leftReturn > rightReturn ? "Both buy dips, but value's discipline with quality gives it an edge." : "Contrarians are catching sharper reversals. Sometimes going against everyone works better.",
    },
    momentum: {
      value: leftReturn > rightReturn ? "Trend-following beats buy-and-hold in this market. Strong directional moves favor momentum." : "Value's patience is paying off. Not every trend is worth chasing.",
    },
    contrarian: {
      quant: leftReturn > rightReturn ? "Human intuition about crowd psychology is beating pure math. Markets aren't always rational." : "Data-driven approaches outperform gut feelings. The quants see patterns humans miss.",
    },
  };
  return insights[leftId]?.[rightId] ?? insights[rightId]?.[leftId] ?? `${winner} philosophy is currently outperforming. Market conditions favor this approach.`;
}

function generateLessons(ranked: typeof PHILOSOPHIES, grouped: Record<string, any>, trades: any[]) {
  const lessons = [];
  const topPhil = ranked[0];
  const botPhil = ranked[ranked.length - 1];

  lessons.push({
    title: `${topPhil?.label} is winning today`,
    body: `The ${topPhil?.label?.toLowerCase()} philosophy is outperforming with ${((grouped[topPhil?.id]?.avgReturn ?? 0) * 100).toFixed(2)}% average return. ${topPhil?.desc}. In today's market conditions, this approach works best.`,
    takeaway: `Consider: are your investments aligned with ${topPhil?.label?.toLowerCase()} principles?`,
  });

  if (botPhil && topPhil?.id !== botPhil?.id) {
    lessons.push({
      title: `${botPhil.label} is struggling`,
      body: `${botPhil.label} investors are underperforming (${((grouped[botPhil.id]?.avgReturn ?? 0) * 100).toFixed(2)}%). ${botPhil.desc} — but today's market isn't rewarding this approach. That doesn't mean it's wrong — different market conditions favor different philosophies.`,
      takeaway: "No single strategy wins all the time. Adaptability is key.",
    });
  }

  const buyTrades = trades.filter((t: any) => t.side === "buy");
  const sellTrades = trades.filter((t: any) => t.side === "sell");
  lessons.push({
    title: `Market sentiment: ${buyTrades.length > sellTrades.length ? "Bullish" : buyTrades.length < sellTrades.length ? "Bearish" : "Mixed"}`,
    body: `Today: ${buyTrades.length} buys vs ${sellTrades.length} sells across all agents. ${buyTrades.length > sellTrades.length ? "Most agents see opportunity — accumulating assets." : buyTrades.length < sellTrades.length ? "Agents are defensive — taking profits and reducing exposure." : "Agents are split — some buying, some selling. Uncertain market."}`,
    takeaway: "When professional strategies disagree, it often means the market is at an inflection point.",
  });

  lessons.push({
    title: "The power of diversification",
    body: `The spread between the best (${((grouped[topPhil?.id]?.avgReturn ?? 0) * 100).toFixed(2)}%) and worst (${((grouped[botPhil?.id]?.avgReturn ?? 0) * 100).toFixed(2)}%) philosophy is ${(((grouped[topPhil?.id]?.avgReturn ?? 0) - (grouped[botPhil?.id]?.avgReturn ?? 0)) * 100).toFixed(2)}%. If you held all philosophies equally, you'd capture the average without the extreme risk.`,
    takeaway: "Ray Dalio's All-Weather principle: no single bet should define your portfolio.",
  });

  return lessons;
}
