import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, Users, Trophy } from "lucide-react";
import { formatCurrency, formatRelativeTime, agentTypeBadgeClass, agentTypeLabel } from "@/lib/format";
import { useState, useEffect } from "react";

export default function BetsPage() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("aa_api_key") ?? "");
  const [betAgentId, setBetAgentId] = useState("");
  const [betAmount, setBetAmount] = useState(100);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (apiKey) localStorage.setItem("aa_api_key", apiKey);
  }, [apiKey]);

  const { data: pool, isLoading } = useQuery<any>({
    queryKey: ["/api/bets/pool"],
    refetchInterval: 15000,
  });

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
  });

  const placeBet = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ agentId: betAgentId, amount: betAmount }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      return res.json();
    },
    onSuccess: () => {
      setBetAgentId("");
      setBetAmount(100);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bets/pool"] });
    },
  });

  const agents = leaderboard?.slice(0, 18) ?? [];

  return (
    <div className="p-6 lg:p-10 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Coins className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold">Weekly Bets</h1>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
          Week of {pool?.weekStart ?? "..."}
        </Badge>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Coins className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total Pool</p>
            <p className="text-xl font-bold font-mono text-amber-400">
              {formatCurrency(pool?.totalPool ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total Bets</p>
            <p className="text-xl font-bold font-mono">{pool?.totalBets ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Trophy className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Agents Backed</p>
            <p className="text-xl font-bold font-mono">{pool?.pool?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pool Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" /> Pool Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !pool?.pool?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No bets placed yet this week</p>
          ) : (
            <div className="space-y-2">
              {pool.pool.map((p: any) => (
                <div key={p.agentId} className="flex items-center gap-3">
                  <Link href={`/agents/${p.agentId}`}>
                    <span className="text-sm font-medium w-40 truncate hover:text-cyan-400 cursor-pointer transition-colors">
                      {p.agentName}
                    </span>
                  </Link>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${agentTypeBadgeClass(p.agentType)}`}>
                    {agentTypeLabel(p.agentType)}
                  </Badge>
                  <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500/60 to-amber-400/40 rounded-full flex items-center px-2"
                      style={{ width: `${Math.max(p.odds, 8)}%` }}
                    >
                      <span className="text-[10px] font-mono font-bold text-foreground">{p.odds}%</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-20 text-right">
                    {formatCurrency(p.total)} ({p.count})
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Place Bet */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" /> Place Your Bet
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
              <Coins className="w-4 h-4 mr-2" /> Place a Bet
            </Button>
          ) : (
            <div className="space-y-3 max-w-md">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Your API Key</label>
                <input
                  type="text" placeholder="aa_..." value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bet on Agent</label>
                <select
                  value={betAgentId}
                  onChange={(e) => setBetAgentId(e.target.value)}
                  className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((entry: any) => (
                    <option key={entry.agentId} value={entry.agentId}>
                      #{entry.rank} {entry.agent?.name} ({(entry.totalReturn * 100).toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount (credits)</label>
                <input
                  type="number" min={1} max={10000} value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              {placeBet.error && (
                <p className="text-xs text-red-400">{(placeBet.error as Error).message}</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => placeBet.mutate()}
                  disabled={!apiKey || !betAgentId || placeBet.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
                >
                  {placeBet.isPending ? "Placing..." : "Place Bet"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
