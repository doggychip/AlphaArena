import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatReturn, formatNumber, formatDateTime, pnlColor, agentTypeBadgeClass, agentTypeLabel, formatDate, getLevelFromXP, getXPProgress, levelBadgeClass } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bot, TrendingUp, TrendingDown, Shield, Target, BarChart3, Calendar, User, Trophy, Code, Clock, Zap, Swords, X } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useState, useEffect } from "react";

export default function AgentProfilePage() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;
  const [, navigate] = useLocation();

  // Challenge dialog state
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeApiKey, setChallengeApiKey] = useState(() => localStorage.getItem("aa_api_key") ?? "");
  const [challengerAgentId, setChallengerAgentId] = useState("");
  const [duelDuration, setDuelDuration] = useState(60);
  const [duelWager, setDuelWager] = useState(0);

  useEffect(() => {
    if (challengeApiKey) localStorage.setItem("aa_api_key", challengeApiKey);
  }, [challengeApiKey]);

  const challengeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/duels/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": challengeApiKey },
        body: JSON.stringify({ agentId: challengerAgentId, opponentAgentId: agentId, durationMinutes: duelDuration, wager: duelWager }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      return res.json();
    },
    onSuccess: (data) => {
      setShowChallenge(false);
      navigate(`/duels/${data.id}`);
    },
  });

  const { data: agentData, isLoading: agentLoading } = useQuery<any>({
    queryKey: ["/api/agents", agentId],
  });

  const { data: trades, isLoading: tradesLoading } = useQuery<any[]>({
    queryKey: ["/api/agents", agentId, "trades"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agents/${agentId}/trades?limit=20`);
      return res.json();
    },
  });

  const { data: snapshots } = useQuery<any[]>({
    queryKey: ["/api/agents", agentId, "snapshots"],
  });

  const { data: achievementData } = useQuery<any>({
    queryKey: ["/api/agents", agentId, "achievements"],
  });

  if (agentLoading) {
    return (
      <div className="p-6 lg:p-10 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!agentData) {
    return <div className="p-10 text-center text-muted-foreground">Agent not found</div>;
  }

  const { agent, portfolio, positions, leaderboardEntry, owner } = agentData;
  const lb = leaderboardEntry;

  // Prepare chart data
  const equityData = snapshots?.map((s: any) => ({
    date: s.date.slice(5),
    equity: s.totalEquity,
  })) ?? [];

  const returnsData = snapshots?.map((s: any) => ({
    date: s.date.slice(5),
    return: s.dailyReturn * 100,
  })) ?? [];

  return (
    <div className="p-6 lg:p-10 max-w-7xl space-y-6">
      {/* Agent info header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-card border border-card-border flex items-center justify-center">
          <Bot className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold" data-testid="text-agent-name">{agent.name}</h1>
            <Badge variant="outline" className={`text-[10px] font-medium ${agentTypeBadgeClass(agent.type)}`}>
              {agentTypeLabel(agent.type)}
            </Badge>
            {lb && (
              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                Rank #{lb.rank}
              </Badge>
            )}
            {achievementData && (
              <Badge variant="outline" className={`text-[10px] font-mono font-bold ${levelBadgeClass(achievementData.level)}`}>
                Lv.{achievementData.level}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">{agent.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {owner}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Registered {formatDate(agent.createdAt)}</span>
          </div>
        </div>
        <Button
          onClick={() => setShowChallenge(true)}
          variant="outline"
          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 flex-shrink-0"
        >
          <Swords className="w-4 h-4 mr-2" />
          Challenge
        </Button>
      </div>

      {/* Challenge Dialog */}
      {showChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowChallenge(false)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Swords className="w-5 h-5 text-amber-400" /> Challenge {agent.name}
                </CardTitle>
                <button onClick={() => setShowChallenge(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Your API Key</label>
                <input
                  type="text"
                  placeholder="aa_..."
                  value={challengeApiKey}
                  onChange={(e) => setChallengeApiKey(e.target.value)}
                  className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Your Agent ID</label>
                <input
                  type="text"
                  placeholder="agent-1 or UUID"
                  value={challengerAgentId}
                  onChange={(e) => setChallengerAgentId(e.target.value)}
                  className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Duration</label>
                  <select
                    value={duelDuration}
                    onChange={(e) => setDuelDuration(Number(e.target.value))}
                    className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={240}>4 hours</option>
                    <option value={1440}>24 hours</option>
                    <option value={10080}>7 days</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Wager (credits)</label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={duelWager}
                    onChange={(e) => setDuelWager(Number(e.target.value))}
                    className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
              {challengeMutation.error && (
                <p className="text-xs text-red-400">{(challengeMutation.error as Error).message}</p>
              )}
              <Button
                onClick={() => challengeMutation.mutate()}
                disabled={!challengeApiKey || !challengerAgentId || challengeMutation.isPending}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
              >
                {challengeMutation.isPending ? "Sending Challenge..." : "Send Challenge"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance metrics */}
      {lb && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Return", value: formatReturn(lb.totalReturn), color: pnlColor(lb.totalReturn), icon: TrendingUp },
            { label: "Sharpe Ratio", value: lb.sharpeRatio.toFixed(2), color: pnlColor(lb.sharpeRatio), icon: BarChart3 },
            { label: "Max Drawdown", value: `${(lb.maxDrawdown * 100).toFixed(2)}%`, color: "text-red-400", icon: TrendingDown },
            { label: "Win Rate", value: `${(lb.winRate * 100).toFixed(1)}%`, color: lb.winRate >= 0.5 ? "text-emerald-400" : "text-red-400", icon: Target },
            { label: "Sortino Ratio", value: lb.sortinoRatio.toFixed(2), color: pnlColor(lb.sortinoRatio), icon: Shield },
            { label: "Composite Score", value: (lb.compositeScore * 100).toFixed(1), color: "text-cyan-400", icon: Trophy },
          ].map((m, i) => (
            <Card key={i} className="bg-card/50 border-card-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{m.label}</span>
                </div>
                <div className={`font-mono text-lg font-bold ${m.color}`} data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  {m.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Equity curve */}
      {equityData.length > 0 && (
        <Card className="bg-card/50 border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Equity Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 14%)" />
                  <XAxis dataKey="date" stroke="hsl(215 20% 55%)" fontSize={11} fontFamily="JetBrains Mono" />
                  <YAxis stroke="hsl(215 20% 55%)" fontSize={11} fontFamily="JetBrains Mono" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(224 42% 7%)", border: "1px solid hsl(222 20% 14%)", borderRadius: "6px", fontFamily: "JetBrains Mono", fontSize: "12px" }}
                    labelStyle={{ color: "hsl(215 20% 55%)" }}
                    formatter={(val: number) => [`$${formatNumber(val)}`, "Equity"]}
                  />
                  <ReferenceLine y={100000} stroke="hsl(215 20% 35%)" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="equity" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Returns */}
      {returnsData.length > 0 && (
        <Card className="bg-card/50 border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Daily Returns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={returnsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 14%)" />
                  <XAxis dataKey="date" stroke="hsl(215 20% 55%)" fontSize={10} fontFamily="JetBrains Mono" />
                  <YAxis stroke="hsl(215 20% 55%)" fontSize={10} fontFamily="JetBrains Mono" tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(224 42% 7%)", border: "1px solid hsl(222 20% 14%)", borderRadius: "6px", fontFamily: "JetBrains Mono", fontSize: "12px" }}
                    formatter={(val: number) => [`${val.toFixed(2)}%`, "Return"]}
                  />
                  <ReferenceLine y={0} stroke="hsl(215 20% 35%)" />
                  <Bar dataKey="return" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements & XP */}
      {achievementData && (
        <Card className="bg-card/50 border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Achievements
              <Badge variant="outline" className={`text-[10px] font-mono ml-auto ${levelBadgeClass(achievementData.level)}`}>
                Lv.{achievementData.level} — {achievementData.totalXP} XP
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* XP Progress Bar */}
            {(() => {
              const prog = achievementData.progress;
              return (
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Level {prog.level}</span>
                    <span>{prog.currentXP} / {prog.nextLevelXP} XP</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Achievement Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {achievementData.achievements.map((a: any) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    a.unlocked
                      ? "bg-card border-border/50"
                      : "bg-muted/30 border-transparent opacity-40"
                  }`}
                >
                  <div className="text-2xl mb-1">{a.unlocked ? a.icon : "?"}</div>
                  <div className="text-[11px] font-semibold truncate">{a.unlocked ? a.name : "???"}</div>
                  <div className="text-[9px] text-muted-foreground truncate">{a.unlocked ? a.description : "Keep playing to unlock"}</div>
                  {a.unlocked && (
                    <div className="text-[9px] text-cyan-400 font-mono mt-0.5">+{a.xpReward} XP</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy */}
      {agent.strategyCode && (
        <Card className="bg-card/50 border-card-border" data-testid="card-strategy">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3 text-xs">
              {agent.strategyLanguage && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400" data-testid="badge-strategy-language">
                  <Code className="w-3 h-3" />
                  {agent.strategyLanguage}
                </div>
              )}
              {agent.strategyInterval && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400" data-testid="badge-strategy-interval">
                  <Clock className="w-3 h-3" />
                  {agent.strategyInterval} interval
                </div>
              )}
              {agent.executionCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400" data-testid="badge-execution-count">
                  <Zap className="w-3 h-3" />
                  {agent.executionCount.toLocaleString()} executions
                </div>
              )}
              {agent.lastExecuted && (
                <div className="flex items-center gap-1.5 text-muted-foreground" data-testid="text-last-executed">
                  <Calendar className="w-3 h-3" />
                  Last run: {formatDateTime(agent.lastExecuted)}
                </div>
              )}
            </div>
            <pre className="p-4 rounded-lg bg-background/50 border border-border text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap" data-testid="code-strategy">
              <code>{agent.strategyCode}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Positions */}
        <Card className="bg-card/50 border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {positions && positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-card-border text-muted-foreground">
                      <th className="text-left py-2 px-4 font-medium">Pair</th>
                      <th className="text-left py-2 px-4 font-medium">Side</th>
                      <th className="text-right py-2 px-4 font-medium">Qty</th>
                      <th className="text-right py-2 px-4 font-medium">Entry</th>
                      <th className="text-right py-2 px-4 font-medium">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos: any) => (
                      <tr key={pos.id} className="border-b border-card-border/50 hover:bg-accent/20">
                        <td className="py-2 px-4 font-mono font-medium">{pos.pair}</td>
                        <td className="py-2 px-4">
                          <Badge variant="outline" className={`text-[10px] ${pos.side === "long" ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20"}`}>
                            {pos.side.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-right font-mono">{formatNumber(pos.quantity, 4)}</td>
                        <td className="py-2 px-4 text-right font-mono">{formatCurrency(pos.avgEntryPrice)}</td>
                        <td className={`py-2 px-4 text-right font-mono font-medium ${pnlColor(pos.unrealizedPnl)}`}>
                          {pos.unrealizedPnl > 0 ? "+" : ""}{formatCurrency(pos.unrealizedPnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">No open positions</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card className="bg-card/50 border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tradesLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
              </div>
            ) : trades && trades.length > 0 ? (
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-card-border text-muted-foreground">
                      <th className="text-left py-2 px-4 font-medium">Time</th>
                      <th className="text-left py-2 px-4 font-medium">Pair</th>
                      <th className="text-left py-2 px-4 font-medium">Side</th>
                      <th className="text-right py-2 px-4 font-medium">Qty</th>
                      <th className="text-right py-2 px-4 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade: any) => (
                      <tr key={trade.id} className="border-b border-card-border/50 hover:bg-accent/20">
                        <td className="py-2 px-4 text-muted-foreground">{formatDateTime(trade.executedAt)}</td>
                        <td className="py-2 px-4 font-mono font-medium">{trade.pair}</td>
                        <td className="py-2 px-4">
                          <Badge variant="outline" className={`text-[10px] ${trade.side === "buy" ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20"}`}>
                            {trade.side.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-right font-mono">{formatNumber(trade.quantity, 4)}</td>
                        <td className="py-2 px-4 text-right font-mono">{formatCurrency(trade.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4">No trades yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

