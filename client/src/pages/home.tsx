import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatReturn, formatNumber, formatCompact, pnlColor, agentTypeBadgeClass, agentTypeLabel, formatRelativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Bot, BarChart3, DollarSign, ArrowRight, Activity, Radio, Plug, Brain, Target, TrendingUp, TrendingDown, Minus, Lightbulb, Swords, ChevronRight, Sparkles, BookOpen } from "lucide-react";
import AgentAvatar from "@/components/AgentAvatar";
import EventBanner from "@/components/EventBanner";

// Onboarding component
function OnboardingFlow({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Welcome to AlphaArena",
      subtitle: "Learn how Wall Street legends would trade today's market",
      desc: "20 legendary investors — Buffett, Soros, Druckenmiller — compete using real strategies on live market data. Watch, learn, then prove you can do better.",
      icon: Sparkles,
      color: "text-amber-400",
      action: "Let's Go →",
    },
    {
      title: "Watch the Philosophy Battle",
      subtitle: "Value vs Momentum vs Contrarian vs Quant",
      desc: "Every trade is explained in plain English. Understand WHY Buffett bought the dip or why Soros went contrarian. Learn investment thinking, not just numbers.",
      icon: Brain,
      color: "text-cyan-400",
      action: "Next →",
      link: "/philosophy",
    },
    {
      title: "Challenge a Legend",
      subtitle: "Think you're smarter than Buffett?",
      desc: "Pick any pair, make a bullish or bearish prediction, and we'll track your call against the legend's actual strategy for 24 hours. No signup needed.",
      icon: Target,
      color: "text-emerald-400",
      action: "Start Learning →",
      link: "/challenge",
    },
  ];

  const s = steps[step];
  const Icon = s.icon;

  return (
    <div className="relative mx-6 lg:mx-10 mb-8">
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-cyan-500/5 overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold">{s.title}</h2>
                <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                  {step + 1}/3
                </Badge>
              </div>
              <p className={`text-sm font-medium ${s.color} mb-2`}>{s.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
              <div className="flex items-center gap-3">
                {step < steps.length - 1 ? (
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => setStep(step + 1)}>
                    {s.action}
                  </Button>
                ) : (
                  <Link href="/challenge">
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
                      {s.action}
                    </Button>
                  </Link>
                )}
                <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Skip tour
                </button>
              </div>
            </div>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-4 justify-center">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-amber-400" : i < step ? "bg-amber-400/40" : "bg-border"}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// "What Would They Do?" widget
function WhatWouldTheyDo({ leaderboard, trades }: { leaderboard: any[]; trades: any[] }) {
  if (!leaderboard?.length) return null;

  // Get each agent's most recent trade to determine stance
  const agentStances = leaderboard.slice(0, 6).map((entry: any) => {
    const recentTrades = (trades ?? []).filter((t: any) => t.agentId === entry.agentId).slice(0, 3);
    const buys = recentTrades.filter((t: any) => t.side === "buy").length;
    const sells = recentTrades.filter((t: any) => t.side === "sell").length;
    const latestTrade = recentTrades[0];
    const stance = buys > sells ? "bullish" : sells > buys ? "bearish" : "neutral";
    return { ...entry, stance, latestTrade, recentTrades };
  });

  return (
    <section className="px-6 lg:px-10 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold">What Would They Do Right Now?</h2>
        </div>
        <Link href="/philosophy">
          <button className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium">
            Philosophy Battle <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {agentStances.map((agent: any) => {
          const StanceIcon = agent.stance === "bullish" ? TrendingUp : agent.stance === "bearish" ? TrendingDown : Minus;
          const stanceColor = agent.stance === "bullish" ? "text-emerald-400" : agent.stance === "bearish" ? "text-red-400" : "text-muted-foreground";
          const stanceBg = agent.stance === "bullish" ? "bg-emerald-500/10 border-emerald-500/20" : agent.stance === "bearish" ? "bg-red-500/10 border-red-500/20" : "bg-muted/50 border-border/50";
          return (
            <Link key={agent.agentId} href={`/agents/${agent.agentId}`}>
              <Card className="hover:border-cyan-500/30 transition-all cursor-pointer h-full">
                <CardContent className="p-3 text-center space-y-2">
                  <AgentAvatar agentId={agent.agentId} agentType={agent.agent?.type} size={32} />
                  <p className="text-xs font-medium truncate">{agent.agent?.name?.split(" ").pop()}</p>
                  <Badge className={`text-[9px] ${stanceBg} ${stanceColor} border`}>
                    <StanceIcon className="w-3 h-3 mr-0.5" />
                    {agent.stance.toUpperCase()}
                  </Badge>
                  {agent.latestTrade && (
                    <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2">
                      {agent.latestTrade.reason || `${agent.latestTrade.side === "buy" ? "Bought" : "Sold"} ${agent.latestTrade.pair?.replace("/USD", "")}`}
                    </p>
                  )}
                  <p className={`text-xs font-mono font-bold ${pnlColor(agent.totalReturn)}`}>
                    {formatReturn(agent.totalReturn)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Quick actions bar
function QuickActions() {
  return (
    <section className="px-6 lg:px-10 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link href="/philosophy">
          <Card className="cursor-pointer hover:border-cyan-500/30 transition-all group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold group-hover:text-cyan-400 transition-colors">Philosophy Battle</h3>
                <p className="text-[11px] text-muted-foreground">Value vs Momentum — who's winning?</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/challenge">
          <Card className="cursor-pointer hover:border-amber-500/30 transition-all group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold group-hover:text-amber-400 transition-colors">Challenge a Legend</h3>
                <p className="text-[11px] text-muted-foreground">Predict the market. Beat Buffett.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/diagnostics">
          <Card className="cursor-pointer hover:border-purple-500/30 transition-all group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold group-hover:text-purple-400 transition-colors">Learn from Failures</h3>
                <p className="text-[11px] text-muted-foreground">Why do agents lose? Diagnostics.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  );
}

// Daily Digest widget
function DailyDigest({ leaderboard, trades }: { leaderboard: any[]; trades: any[] }) {
  if (!leaderboard?.length) return null;

  const top = leaderboard[0];
  const totalBuys = (trades ?? []).filter((t: any) => t.side === "buy").length;
  const totalSells = (trades ?? []).filter((t: any) => t.side === "sell").length;
  const sentiment = totalBuys > totalSells ? "Bullish" : totalBuys < totalSells ? "Bearish" : "Mixed";
  const sentimentColor = sentiment === "Bullish" ? "text-emerald-400" : sentiment === "Bearish" ? "text-red-400" : "text-amber-400";

  // Find most traded pair
  const pairCounts: Record<string, number> = {};
  for (const t of trades ?? []) { pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1; }
  const hotPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "BTC/USD";

  return (
    <section className="px-6 lg:px-10 pb-8">
      <Card className="bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border-cyan-500/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold">Today's Market Pulse</h2>
            <Badge variant="outline" className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground">Leader</p>
              <p className="text-sm font-medium">{top?.agent?.name}</p>
              <p className={`text-xs font-mono ${pnlColor(top?.totalReturn)}`}>{formatReturn(top?.totalReturn ?? 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Agent Sentiment</p>
              <p className={`text-sm font-bold ${sentimentColor}`}>{sentiment}</p>
              <p className="text-[10px] text-muted-foreground">{totalBuys} buys / {totalSells} sells</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Hottest Pair</p>
              <p className="text-sm font-medium font-mono">{hotPair.replace("/USD", "")}</p>
              <p className="text-[10px] text-muted-foreground">{pairCounts[hotPair]} trades today</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Your Move</p>
              <Link href="/challenge">
                <Button size="sm" variant="outline" className="mt-1 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                  <Target className="w-3 h-3 mr-1" /> Make a Call
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("aa-onboarding-dismissed");
    if (!dismissed) setShowOnboarding(true);
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("aa-onboarding-dismissed", "true");
  };

  const { data: leaderboard, isLoading: lbLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
  });

  const { data: compData, isLoading: compLoading } = useQuery<any>({
    queryKey: ["/api/competition/active"],
  });

  const { data: pricesData } = useQuery<any>({
    queryKey: ["/api/prices"],
    refetchInterval: 10000,
  });

  const { data: feedData } = useQuery<any[]>({
    queryKey: ["/api/feed"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/feed?limit=20");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const prices: any[] = pricesData?.prices ?? pricesData ?? [];
  const isLive: boolean = pricesData?.isLive ?? false;

  const topAgents = leaderboard?.slice(0, 10) ?? [];
  const stats = compData?.stats;

  return (
    <div className="grid-pattern min-h-screen">
      {/* Hero — shorter, more focused */}
      <section className="relative px-6 pt-10 pb-6 lg:px-10">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-4">
            <Activity className="w-3 h-3" />
            20 Legendary Investors Trading Live
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-3">
            Learn How Legends<br />
            <span className="text-cyan-400">Trade Today's Market</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mb-5 leading-relaxed">
            Watch Buffett, Soros, and Druckenmiller compete across 60 assets — crypto and top 50 US stocks.
            Every trade explained. Every strategy transparent. Then prove you can do better.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/philosophy">
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold px-5">
                <Brain className="w-4 h-4 mr-2" />
                Watch the Battle
              </Button>
            </Link>
            <Link href="/challenge">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-5">
                <Target className="w-4 h-4 mr-2" />
                Challenge a Legend
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" className="border-border hover:bg-accent">
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Onboarding (first-time visitors) */}
      {showOnboarding && <OnboardingFlow onDismiss={dismissOnboarding} />}

      <EventBanner />

      {/* What Would They Do Right Now? */}
      <WhatWouldTheyDo leaderboard={leaderboard ?? []} trades={feedData ?? []} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Daily Digest */}
      <DailyDigest leaderboard={leaderboard ?? []} trades={feedData ?? []} />

      {/* Stats */}
      <section className="px-6 lg:px-10 pb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Active Agents", value: stats?.totalAgents ?? 20, icon: Bot, color: "text-cyan-400", href: "/leaderboard" },
            { label: "Total Trades", value: stats?.totalTrades ?? 0, icon: BarChart3, color: "text-emerald-400", href: "/feed" },
            { label: "Assets Trading", value: `${prices.length || 60} Pairs`, icon: DollarSign, color: "text-amber-400", isStr: true, href: "/integrate" },
            { label: "Season", value: "Season 1: Multi-Asset Arena", icon: Trophy, color: "text-purple-400", isStr: true, href: "/tournaments" },
          ].map((stat: any, i) => (
            <Link key={i} href={stat.href}>
              <Card className="bg-card/50 border-card-border cursor-pointer hover:border-cyan-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="font-mono text-xl font-semibold">
                    {stat.isStr ? stat.value : formatNumber(stat.value as number, 0)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Price Ticker */}
      {prices && prices.length > 0 && (
        <section className="px-6 lg:px-10 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
            <span className="text-[10px] text-muted-foreground">CoinGecko + Yahoo Finance • {prices.length} assets</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {prices.map((p: any) => (
              <div key={p.pair} className="flex-shrink-0 flex items-center gap-3 px-3 py-2 rounded-lg bg-card/50 border border-card-border">
                <span className="text-xs font-medium text-foreground">{p.pair.replace("/USD", "")}</span>
                <span className="font-mono text-xs text-foreground">{formatCurrency(p.price)}</span>
                <span className={`font-mono text-xs ${p.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard Preview */}
      <section className="px-6 lg:px-10 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Top 10 Agents</h2>
          <Link href="/leaderboard">
            <button className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium">
              Full Leaderboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        {lbLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-card-border bg-card/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground text-xs">
                  <th className="text-left py-2.5 px-4 font-medium w-12">#</th>
                  <th className="text-left py-2.5 px-4 font-medium">Agent</th>
                  <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">Type</th>
                  <th className="text-right py-2.5 px-4 font-medium">Return</th>
                  <th className="text-right py-2.5 px-4 font-medium hidden lg:table-cell">Sharpe</th>
                  <th className="text-right py-2.5 px-4 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {topAgents.map((entry: any) => (
                  <tr
                    key={entry.agentId}
                    className="border-b border-card-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4">
                      <span className={`font-mono font-bold ${entry.rank <= 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <AgentAvatar agentId={entry.agentId} agentType={entry.agent?.type} size={20} rank={entry.rank} />
                        <Link href={`/agents/${entry.agentId}`}>
                          <span className="font-medium text-foreground hover:text-cyan-400 transition-colors">
                            {entry.agent?.name}
                          </span>
                        </Link>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell">
                      <Badge variant="outline" className={`text-[10px] font-medium ${agentTypeBadgeClass(entry.agent?.type)}`}>
                        {agentTypeLabel(entry.agent?.type)}
                      </Badge>
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono font-medium ${pnlColor(entry.totalReturn)}`}>
                      {formatReturn(entry.totalReturn)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono hidden lg:table-cell">
                      {entry.sharpeRatio.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-mono font-semibold text-cyan-400">
                        {(entry.compositeScore * 100).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Live Feed Preview */}
      {feedData && feedData.length > 0 && (
        <section className="px-6 lg:px-10 pb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h2 className="text-lg font-semibold">Latest Trades</h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <Link href="/feed">
              <button className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium">
                Full Feed <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
          <div className="space-y-2">
            {feedData.slice(0, 5).map((trade: any) => {
              const isBuy = trade.side === "buy";
              return (
                <div key={trade.id} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-card/50 border border-card-border">
                  <span className={`text-xs font-bold w-10 mt-0.5 ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
                    {isBuy ? "BUY" : "SELL"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/agents/${trade.agentId}`}>
                        <span className="text-sm font-medium hover:text-cyan-400 cursor-pointer transition-colors">
                          {trade.agentName}
                        </span>
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatNumber(trade.quantity, 2)} {trade.pair?.replace("/USD", "")} at {formatCurrency(trade.price)}
                      </span>
                    </div>
                    {trade.reason && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic">
                        💡 {trade.reason}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatRelativeTime(trade.executedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
