import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, Clock, Target, TrendingDown, Eye } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatRelativeTime } from "@/lib/format";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  bad_timing: { label: "Bad Timing", color: "#ef4444", icon: Clock },
  wrong_pair: { label: "Wrong Pair", color: "#f59e0b", icon: Target },
  oversized: { label: "Oversized Position", color: "#a855f7", icon: AlertTriangle },
  missed_opportunity: { label: "Missed Opportunity", color: "#06b6d4", icon: Eye },
  trend_reversal: { label: "Trend Reversal", color: "#ec4899", icon: TrendingDown },
};

const SEVERITY_CLASS: Record<string, string> = {
  high: "bg-red-500/15 text-red-400 border-red-500/20",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  low: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

export default function DiagnosticsPage() {
  const { data: summary, isLoading } = useQuery<any>({
    queryKey: ["/api/diagnostics/summary"],
    refetchInterval: 30000,
  });

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
  });

  const pieData = (summary?.summary ?? []).map((s: any) => ({
    name: CATEGORY_CONFIG[s.category]?.label ?? s.category,
    value: s.count,
    color: CATEGORY_CONFIG[s.category]?.color ?? "#666",
  }));

  return (
    <div className="p-6 lg:p-10 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">Agent Diagnostics</h1>
        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
          Sentient Arena-Grade
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm">
        Production-style failure tracking. Not just returns — understand WHY agents succeed or fail.
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const count = summary?.summary?.find((s: any) => s.category === key)?.count ?? 0;
          const Icon = cfg.icon;
          return (
            <Card key={key} className="bg-card/50">
              <CardContent className="p-3 text-center">
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: cfg.color }} />
                <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                <p className="text-lg font-bold font-mono">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Failure Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64" /> : pieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No diagnostics yet — agents are still trading</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name}: ${e.value}`} labelLine={false} fontSize={10}>
                      {pieData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Total Diagnostics</span>
              <span className="text-sm font-mono font-bold">{summary?.total ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Active Agents</span>
              <span className="text-sm font-mono font-bold">{leaderboard?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Most Common Issue</span>
              <span className="text-sm font-mono">{pieData[0]?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Evaluation Type</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Production-Style</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Agent Diagnostics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Agent-by-Agent Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-2 px-3">Agent</th>
                  {Object.values(CATEGORY_CONFIG).map(cfg => (
                    <th key={cfg.label} className="text-center py-2 px-2">{cfg.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(leaderboard ?? []).slice(0, 10).map((entry: any) => (
                  <AgentDiagRow key={entry.agentId} agentId={entry.agentId} agentName={entry.agent?.name} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentDiagRow({ agentId, agentName }: { agentId: string; agentName: string }) {
  const { data: diagnostics } = useQuery<any[]>({
    queryKey: ["/api/agents", agentId, "diagnostics"],
  });

  const counts: Record<string, number> = {};
  for (const d of diagnostics ?? []) {
    counts[d.category] = (counts[d.category] || 0) + 1;
  }

  return (
    <tr className="border-b border-border/50 hover:bg-accent/30">
      <td className="py-2 px-3">
        <Link href={`/agents/${agentId}`}>
          <span className="font-medium hover:text-cyan-400 cursor-pointer transition-colors">{agentName}</span>
        </Link>
      </td>
      {Object.keys(CATEGORY_CONFIG).map(cat => (
        <td key={cat} className="text-center py-2 px-2 font-mono text-xs">
          {counts[cat] ?? 0}
        </td>
      ))}
    </tr>
  );
}
