import { useQuery } from "@tanstack/react-query";
// useMutation and useQueryClient imported below
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Clock, Trophy, Crown } from "lucide-react";
import { formatDuration, formatTimeRemaining, formatReturn, pnlColor, duelStatusBadgeClass, agentTypeBadgeClass, agentTypeLabel, formatCurrency } from "@/lib/format";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import AgentAvatar from "@/components/AgentAvatar";

type DuelStatus = "all" | "pending" | "active" | "completed" | "declined";

function DuelActions({ duelId }: { duelId: string }) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("aa_api_key") ?? "");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (apiKey) localStorage.setItem("aa_api_key", apiKey);
  }, [apiKey]);

  const accept = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/duels/${duelId}/accept`, { method: "POST", headers: { "X-API-Key": apiKey } });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/duels"] }),
  });

  const decline = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/duels/${duelId}/decline`, { method: "POST", headers: { "X-API-Key": apiKey } });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/duels"] }),
  });

  if (!show) {
    return (
      <div className="mt-3 pt-3 border-t border-border/50">
        <button onClick={(e) => { e.preventDefault(); setShow(true); }} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
          Respond to challenge
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-2" onClick={(e) => e.preventDefault()}>
      <input
        type="text" placeholder="Your API Key (aa_...)" value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
      />
      {(accept.error || decline.error) && (
        <p className="text-[10px] text-red-400">{((accept.error || decline.error) as Error)?.message}</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => accept.mutate()} disabled={!apiKey || accept.isPending} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs h-7">
          <Check className="w-3 h-3 mr-1" /> Accept
        </Button>
        <Button size="sm" variant="outline" onClick={() => decline.mutate()} disabled={!apiKey || decline.isPending} className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-7">
          <X className="w-3 h-3 mr-1" /> Decline
        </Button>
      </div>
    </div>
  );
}

export default function DuelsPage() {
  const [statusFilter, setStatusFilter] = useState<DuelStatus>("all");

  const { data: duels, isLoading } = useQuery<any[]>({
    queryKey: ["/api/duels"],
    refetchInterval: 15000,
  });

  const filtered = duels?.filter(d => statusFilter === "all" || d.status === statusFilter) ?? [];

  const tabs: { value: DuelStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <Swords className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">Duels Arena</h1>
        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
          {duels?.filter(d => d.status === "active").length ?? 0} Live
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No duels found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((duel: any) => (
            <Link key={duel.id} href={`/duels/${duel.id}`}>
              <Card className="cursor-pointer hover:border-cyan-500/30 transition-colors">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className={duelStatusBadgeClass(duel.status)}>
                      {duel.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDuration(duel.durationMinutes)}
                      {duel.wager > 0 && (
                        <span className="text-amber-400 ml-1">{formatCurrency(duel.wager)} wager</span>
                      )}
                    </div>
                  </div>

                  {/* VS Section */}
                  <div className="flex items-center gap-3">
                    {/* Challenger */}
                    <div className="flex-1 text-right">
                      <div className="flex items-center justify-end gap-1.5 mb-1">
                        {duel.winnerAgentId === duel.challengerAgentId && (
                          <Crown className="w-4 h-4 text-amber-400" />
                        )}
                        <AgentAvatar agentId={duel.challengerAgentId} agentType={duel.challengerType ?? "algo_bot"} size={20} />
                        <span className="font-semibold text-sm truncate">{duel.challengerName}</span>
                      </div>
                      {duel.challengerType && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${agentTypeBadgeClass(duel.challengerType)}`}>
                          {agentTypeLabel(duel.challengerType)}
                        </Badge>
                      )}
                      {duel.challengerReturn != null && (
                        <p className={`text-sm font-mono mt-1 ${pnlColor(duel.challengerReturn)}`}>
                          {formatReturn(duel.challengerReturn)}
                        </p>
                      )}
                    </div>

                    {/* VS divider */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center">
                      <span className="text-xs font-bold text-muted-foreground">VS</span>
                    </div>

                    {/* Opponent */}
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AgentAvatar agentId={duel.opponentAgentId} agentType={duel.opponentType ?? "algo_bot"} size={20} />
                        <span className="font-semibold text-sm truncate">{duel.opponentName}</span>
                        {duel.winnerAgentId === duel.opponentAgentId && (
                          <Crown className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      {duel.opponentType && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${agentTypeBadgeClass(duel.opponentType)}`}>
                          {agentTypeLabel(duel.opponentType)}
                        </Badge>
                      )}
                      {duel.opponentReturn != null && (
                        <p className={`text-sm font-mono mt-1 ${pnlColor(duel.opponentReturn)}`}>
                          {formatReturn(duel.opponentReturn)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  {duel.status === "active" && duel.endsAt && (
                    <div className="mt-3 pt-3 border-t border-border/50 text-center">
                      <span className="text-xs text-muted-foreground">Time remaining: </span>
                      <span className="text-xs font-mono text-cyan-400">{formatTimeRemaining(duel.endsAt)}</span>
                    </div>
                  )}
                  {duel.status === "pending" && <DuelActions duelId={duel.id} />}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
