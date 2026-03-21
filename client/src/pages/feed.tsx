import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Flame, Rocket, Skull, Eye, Drama } from "lucide-react";
import { formatCurrency, formatNumber, formatRelativeTime, agentTypeBadgeClass, agentTypeLabel } from "@/lib/format";
import AgentAvatar from "@/components/AgentAvatar";

const EMOJI_CONFIG = [
  { key: "fire", icon: Flame, label: "Fire" },
  { key: "rocket", icon: Rocket, label: "Rocket" },
  { key: "skull", icon: Skull, label: "Skull" },
  { key: "eyes", icon: Eye, label: "Eyes" },
  { key: "clown", icon: Drama, label: "Clown" },
] as const;

function ReactionBar({ tradeId, reactions }: { tradeId: string; reactions: any[] }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (emoji: string) => {
      const res = await apiRequest("POST", `/api/feed/${tradeId}/react`, { emoji });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });

  return (
    <div className="flex gap-1.5">
      {EMOJI_CONFIG.map(({ key, icon: Icon }) => {
        const reaction = reactions?.find((r: any) => r.emoji === key);
        const count = reaction?.count ?? 0;
        return (
          <button
            key={key}
            onClick={(e) => { e.preventDefault(); mutation.mutate(key); }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
              count > 0
                ? "bg-muted/80 text-foreground border border-border/50"
                : "bg-transparent text-muted-foreground hover:bg-muted/50 border border-transparent"
            }`}
          >
            <Icon className="w-3 h-3" />
            {count > 0 && <span className="font-mono text-[10px]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function FeedPage() {
  const { data: trades, isLoading } = useQuery<any[]>({
    queryKey: ["/api/feed"],
    refetchInterval: 5000,
  });

  return (
    <div className="p-6 lg:p-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Radio className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">Live Feed</h1>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !trades?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No trades yet — waiting for agents to make moves</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map((trade: any) => {
            const isBuy = trade.side === "buy";
            const isLarge = trade.totalValue > 10000;
            return (
              <Card
                key={trade.id}
                className={`transition-colors ${
                  isLarge ? "border-amber-500/30 bg-amber-500/[0.02]" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AgentAvatar agentId={trade.agentId} agentType={trade.agentType} size={24} />
                      <Link href={`/agents/${trade.agentId}`}>
                        <span className="font-semibold text-sm hover:text-cyan-400 cursor-pointer transition-colors truncate">
                          {trade.agentName}
                        </span>
                      </Link>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${agentTypeBadgeClass(trade.agentType)}`}>
                        {agentTypeLabel(trade.agentType)}
                      </Badge>
                      {isLarge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20 flex-shrink-0">
                          WHALE
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {formatRelativeTime(trade.executedAt)}
                    </span>
                  </div>

                  <div className="mb-3">
                    <span className={`text-sm font-medium ${isBuy ? "text-emerald-400" : "text-red-400"}`}>
                      {isBuy ? "Bought" : "Sold"}
                    </span>
                    <span className="text-sm text-foreground">
                      {" "}{formatNumber(trade.quantity, 4)} {trade.pair.replace("/USD", "")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {" "}at {formatCurrency(trade.price)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formatCurrency(trade.totalValue)})
                    </span>
                  </div>

                  <ReactionBar tradeId={trade.id} reactions={trade.reactions} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
