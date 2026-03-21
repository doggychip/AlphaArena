import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Calendar, Shield, Swords } from "lucide-react";
import { formatDate, duelStatusBadgeClass, agentTypeBadgeClass, agentTypeLabel, formatReturn, pnlColor } from "@/lib/format";
import AgentAvatar from "@/components/AgentAvatar";
import { useState } from "react";

export default function TournamentsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: tournaments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/tournaments"],
  });

  const { data: detail } = useQuery<any>({
    queryKey: ["/api/tournaments", selectedId],
    enabled: !!selectedId,
  });

  return (
    <div className="p-6 lg:p-10 max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-purple-400" />
        <h1 className="text-2xl font-bold">Tournaments</h1>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(tournaments ?? []).map((t: any) => {
            const rules = JSON.parse(t.rules || "{}");
            return (
              <Card
                key={t.id}
                className={`cursor-pointer transition-colors ${selectedId === t.id ? "border-purple-500/50" : "hover:border-purple-500/20"}`}
                onClick={() => setSelectedId(t.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{t.name}</h3>
                    <Badge variant="outline" className={duelStatusBadgeClass(t.status)}>{t.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {rules.longOnly && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Long Only</Badge>}
                    {rules.pairsAllowed && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">{rules.pairsAllowed.join(", ")}</Badge>}
                    {rules.maxTradesPerDay && <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">Max {rules.maxTradesPerDay} trades/day</Badge>}
                    <Badge variant="outline" className="text-[10px]"><Users className="w-3 h-3 mr-1" />Max {t.maxAgents}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span><Calendar className="w-3 h-3 inline mr-1" />{formatDate(t.startDate)} — {formatDate(t.endDate)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tournament Detail */}
      {detail && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Swords className="w-4 h-4 text-purple-400" />
              {detail.tournament.name} — Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Active entries */}
              <p className="text-xs text-muted-foreground mb-2">
                {detail.entries.filter((e: any) => !e.eliminated).length} active / {detail.entries.length} total
              </p>
              {detail.entries
                .sort((a: any, b: any) => (b.weeklyReturn ?? 0) - (a.weeklyReturn ?? 0))
                .map((entry: any, idx: number) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      entry.eliminated ? "opacity-40 line-through" : "bg-card/50"
                    }`}
                  >
                    <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}</span>
                    <AgentAvatar agentId={entry.agentId} agentType={entry.agentType} size={24} />
                    <Link href={`/agents/${entry.agentId}`}>
                      <span className="text-sm font-medium hover:text-cyan-400 cursor-pointer transition-colors">{entry.agentName}</span>
                    </Link>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${agentTypeBadgeClass(entry.agentType)}`}>
                      {agentTypeLabel(entry.agentType)}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">Rd {entry.round}</span>
                    <span className={`text-xs font-mono ${pnlColor(entry.weeklyReturn ?? 0)}`}>
                      {formatReturn(entry.weeklyReturn ?? 0)}
                    </span>
                    {entry.eliminated ? (
                      <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-400 border-red-500/20">OUT</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">ALIVE</Badge>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
