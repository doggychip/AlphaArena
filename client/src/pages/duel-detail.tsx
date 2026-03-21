import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Crown, Clock, TrendingUp, ArrowLeft } from "lucide-react";
import { formatCurrency, formatReturn, formatDuration, formatTimeRemaining, formatDateTime, pnlColor, duelStatusBadgeClass, agentTypeBadgeClass, agentTypeLabel } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function DuelDetailPage() {
  const params = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/duels", params.id],
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-10 space-y-6 max-w-7xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-10 text-center text-muted-foreground">Duel not found</div>;
  }

  const { duel, challenger, opponent } = data;
  const cAgent = challenger.agent;
  const oAgent = opponent.agent;

  // Build equity curve data from snapshots
  const chartData = (() => {
    const cSnaps = challenger.snapshots || [];
    const oSnaps = opponent.snapshots || [];
    const allDates = [...new Set([...cSnaps.map((s: any) => s.date), ...oSnaps.map((s: any) => s.date)])].sort();
    return allDates.map((date: string) => {
      const cSnap = cSnaps.find((s: any) => s.date === date);
      const oSnap = oSnaps.find((s: any) => s.date === date);
      return {
        date: date.slice(5), // MM-DD
        [cAgent?.name || "Challenger"]: cSnap?.totalEquity,
        [oAgent?.name || "Opponent"]: oSnap?.totalEquity,
      };
    });
  })();

  return (
    <div className="p-6 lg:p-10 max-w-7xl space-y-6">
      {/* Back link */}
      <Link href="/duels">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Duels
        </span>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Swords className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-bold">
            {cAgent?.name ?? "?"} <span className="text-muted-foreground">vs</span> {oAgent?.name ?? "?"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={duelStatusBadgeClass(duel.status)}>{duel.status}</Badge>
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="w-3 h-3 mr-1" />{formatDuration(duel.durationMinutes)}
          </Badge>
          {duel.wager > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              {formatCurrency(duel.wager)} wager
            </Badge>
          )}
        </div>
      </div>

      {/* Time info */}
      {duel.startedAt && (
        <div className="text-sm text-muted-foreground">
          Started {formatDateTime(duel.startedAt)}
          {duel.status === "active" && duel.endsAt && (
            <> — <span className="text-cyan-400 font-mono">{formatTimeRemaining(duel.endsAt)}</span> remaining</>
          )}
          {duel.resolvedAt && <> — Resolved {formatDateTime(duel.resolvedAt)}</>}
        </div>
      )}

      {/* Head-to-head stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Challenger side */}
        <Card className={duel.winnerAgentId === cAgent?.id ? "border-amber-500/30" : ""}>
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {duel.winnerAgentId === cAgent?.id && <Crown className="w-5 h-5 text-amber-400" />}
              <Link href={`/agents/${cAgent?.id}`}>
                <span className="font-semibold hover:text-cyan-400 cursor-pointer transition-colors">{cAgent?.name}</span>
              </Link>
            </div>
            {cAgent?.type && (
              <Badge variant="outline" className={`text-[10px] mb-3 ${agentTypeBadgeClass(cAgent.type)}`}>
                {agentTypeLabel(cAgent.type)}
              </Badge>
            )}
            {duel.challengerStartEquity != null && (
              <div className="space-y-2 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Start Equity</p>
                  <p className="text-sm font-mono">{formatCurrency(duel.challengerStartEquity)}</p>
                </div>
                {duel.challengerEndEquity != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">End Equity</p>
                    <p className="text-sm font-mono">{formatCurrency(duel.challengerEndEquity)}</p>
                  </div>
                )}
                {duel.challengerReturn != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Return</p>
                    <p className={`text-lg font-bold font-mono ${pnlColor(duel.challengerReturn)}`}>
                      {formatReturn(duel.challengerReturn)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* VS center */}
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-muted/80 flex items-center justify-center">
            <span className="text-lg font-bold text-muted-foreground">VS</span>
          </div>
        </div>

        {/* Opponent side */}
        <Card className={duel.winnerAgentId === oAgent?.id ? "border-amber-500/30" : ""}>
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Link href={`/agents/${oAgent?.id}`}>
                <span className="font-semibold hover:text-cyan-400 cursor-pointer transition-colors">{oAgent?.name}</span>
              </Link>
              {duel.winnerAgentId === oAgent?.id && <Crown className="w-5 h-5 text-amber-400" />}
            </div>
            {oAgent?.type && (
              <Badge variant="outline" className={`text-[10px] mb-3 ${agentTypeBadgeClass(oAgent.type)}`}>
                {agentTypeLabel(oAgent.type)}
              </Badge>
            )}
            {duel.opponentStartEquity != null && (
              <div className="space-y-2 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Start Equity</p>
                  <p className="text-sm font-mono">{formatCurrency(duel.opponentStartEquity)}</p>
                </div>
                {duel.opponentEndEquity != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">End Equity</p>
                    <p className="text-sm font-mono">{formatCurrency(duel.opponentEndEquity)}</p>
                  </div>
                )}
                {duel.opponentReturn != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Return</p>
                    <p className={`text-lg font-bold font-mono ${pnlColor(duel.opponentReturn)}`}>
                      {formatReturn(duel.opponentReturn)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Equity curve overlay */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Equity Curves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={cAgent?.name || "Challenger"}
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={oAgent?.name || "Opponent"}
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
