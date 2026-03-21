import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCompare, TrendingUp, BarChart3, Shield, Target, TrendingDown, Trophy } from "lucide-react";
import { formatReturn, formatNumber, pnlColor, agentTypeBadgeClass, agentTypeLabel } from "@/lib/format";
import AgentAvatar from "@/components/AgentAvatar";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ComparePage() {
  const [agentA, setAgentA] = useState("");
  const [agentB, setAgentB] = useState("");

  const { data: leaderboard } = useQuery<any[]>({ queryKey: ["/api/leaderboard"] });

  const { data: dataA } = useQuery<any>({
    queryKey: ["/api/agents", agentA],
    enabled: !!agentA,
  });
  const { data: dataB } = useQuery<any>({
    queryKey: ["/api/agents", agentB],
    enabled: !!agentB,
  });

  const agents = leaderboard ?? [];
  const a = dataA?.leaderboardEntry;
  const b = dataB?.leaderboardEntry;

  const metrics = a && b ? [
    { label: "Total Return", a: a.totalReturn, b: b.totalReturn, format: (v: number) => formatReturn(v) },
    { label: "Sharpe Ratio", a: a.sharpeRatio, b: b.sharpeRatio, format: (v: number) => v.toFixed(2) },
    { label: "Max Drawdown", a: -a.maxDrawdown, b: -b.maxDrawdown, format: (v: number) => `${(Math.abs(v) * 100).toFixed(1)}%` },
    { label: "Win Rate", a: a.winRate, b: b.winRate, format: (v: number) => `${(v * 100).toFixed(1)}%` },
    { label: "Sortino Ratio", a: a.sortinoRatio, b: b.sortinoRatio, format: (v: number) => v.toFixed(2) },
    { label: "Composite Score", a: a.compositeScore, b: b.compositeScore, format: (v: number) => (v * 100).toFixed(1) },
  ] : [];

  const chartData = metrics.map(m => ({
    metric: m.label,
    [dataA?.agent?.name ?? "Agent A"]: m.a,
    [dataB?.agent?.name ?? "Agent B"]: m.b,
  }));

  return (
    <div className="p-6 lg:p-10 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <GitCompare className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">Compare Agents</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Agent A</label>
          <select value={agentA} onChange={(e) => setAgentA(e.target.value)}
            className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-cyan-500/50">
            <option value="">Select agent...</option>
            {agents.map((e: any) => <option key={e.agentId} value={e.agentId}>#{e.rank} {e.agent?.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Agent B</label>
          <select value={agentB} onChange={(e) => setAgentB(e.target.value)}
            className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-cyan-500/50">
            <option value="">Select agent...</option>
            {agents.map((e: any) => <option key={e.agentId} value={e.agentId}>#{e.rank} {e.agent?.name}</option>)}
          </select>
        </div>
      </div>

      {dataA && dataB && a && b && (
        <>
          {/* Head-to-head cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="text-center">
              <CardContent className="p-4">
                <AgentAvatar agentId={dataA.agent.id} agentType={dataA.agent.type} size={40} rank={a.rank} />
                <p className="font-semibold text-sm mt-2">{dataA.agent.name}</p>
                <Badge variant="outline" className={`text-[9px] mt-1 ${agentTypeBadgeClass(dataA.agent.type)}`}>{agentTypeLabel(dataA.agent.type)}</Badge>
                <p className="text-xs text-muted-foreground mt-1">Rank #{a.rank}</p>
              </CardContent>
            </Card>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">VS</span>
            </div>
            <Card className="text-center">
              <CardContent className="p-4">
                <AgentAvatar agentId={dataB.agent.id} agentType={dataB.agent.type} size={40} rank={b.rank} />
                <p className="font-semibold text-sm mt-2">{dataB.agent.name}</p>
                <Badge variant="outline" className={`text-[9px] mt-1 ${agentTypeBadgeClass(dataB.agent.type)}`}>{agentTypeLabel(dataB.agent.type)}</Badge>
                <p className="text-xs text-muted-foreground mt-1">Rank #{b.rank}</p>
              </CardContent>
            </Card>
          </div>

          {/* Metrics comparison */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {metrics.map((m) => {
              const aWins = m.a > m.b;
              return (
                <Card key={m.label} className="bg-card/50">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground mb-2">{m.label}</p>
                    <div className="flex justify-between">
                      <span className={`font-mono text-sm font-bold ${aWins ? "text-emerald-400" : "text-muted-foreground"}`}>{m.format(m.a)}</span>
                      <span className={`font-mono text-sm font-bold ${!aWins ? "text-emerald-400" : "text-muted-foreground"}`}>{m.format(m.b)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="metric" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={100} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Legend />
                    <Bar dataKey={dataA.agent.name} fill="#06b6d4" radius={[0, 2, 2, 0]} />
                    <Bar dataKey={dataB.agent.name} fill="#a855f7" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
