import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, TrendingUp, TrendingDown, UserPlus, ArrowRight, CheckCircle, Sparkles, BarChart3 } from "lucide-react";
import AgentAvatar from "@/components/AgentAvatar";
import { formatCurrency, formatReturn, pnlColor, formatRelativeTime } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function ShadowPage() {
  const { toast } = useToast();
  const [followedAgents, setFollowedAgents] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("aa-shadow-agents");
    if (saved) setFollowedAgents(JSON.parse(saved));
  }, []);

  const { data: leaderboard, isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 15000,
  });

  const followAgent = (agentId: string, agentName: string) => {
    const updated = followedAgents.includes(agentId)
      ? followedAgents.filter(id => id !== agentId)
      : [...followedAgents, agentId];
    setFollowedAgents(updated);
    localStorage.setItem("aa-shadow-agents", JSON.stringify(updated));
    if (!followedAgents.includes(agentId)) {
      toast({ title: `Following ${agentName}!`, description: "You'll see their trades and performance here." });
    }
  };

  const followed = (leaderboard ?? []).filter((e: any) => followedAgents.includes(e.agentId));
  const available = (leaderboard ?? []).filter((e: any) => !followedAgents.includes(e.agentId));

  // Calculate blended shadow portfolio
  const shadowReturn = followed.length > 0
    ? followed.reduce((sum: number, e: any) => sum + e.totalReturn, 0) / followed.length
    : 0;
  const shadowSharpe = followed.length > 0
    ? followed.reduce((sum: number, e: any) => sum + e.sharpeRatio, 0) / followed.length
    : 0;

  return (
    <div className="p-6 lg:p-10 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Eye className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">Shadow Portfolio</h1>
        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">BETA</Badge>
      </div>
      <p className="text-muted-foreground text-sm max-w-xl">
        Follow legendary investors and track what your returns would be if you copied their strategy.
        No risk — pure learning.
      </p>

      {/* Shadow Portfolio Summary */}
      {followed.length > 0 && (
        <Card className="bg-gradient-to-r from-cyan-500/5 to-emerald-500/5 border-cyan-500/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold">Your Shadow Portfolio</h2>
              <Badge variant="outline" className="text-[9px]">{followed.length} agent{followed.length > 1 ? "s" : ""}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground">Blended Return</p>
                <p className={`text-xl font-mono font-bold ${pnlColor(shadowReturn)}`}>
                  {formatReturn(shadowReturn)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Avg Sharpe</p>
                <p className="text-xl font-mono font-bold">{shadowSharpe.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">If You Started with $10,000</p>
                <p className={`text-xl font-mono font-bold ${pnlColor(shadowReturn)}`}>
                  {formatCurrency(10000 * (1 + shadowReturn))}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">P&L</p>
                <p className={`text-xl font-mono font-bold ${pnlColor(shadowReturn)}`}>
                  {shadowReturn >= 0 ? "+" : ""}{formatCurrency(10000 * shadowReturn)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Followed Agents */}
      {followed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Following ({followed.length})
          </h2>
          <div className="space-y-3">
            {followed.map((entry: any) => (
              <ShadowAgentCard
                key={entry.agentId}
                entry={entry}
                isFollowed={true}
                onToggle={() => followAgent(entry.agentId, entry.agent?.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Agents */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-muted-foreground" />
          {followed.length > 0 ? "Add More Agents" : "Choose Agents to Follow"}
        </h2>
        {followed.length === 0 && (
          <p className="text-xs text-muted-foreground mb-4">
            Pick 1-5 legendary investors to shadow. We'll track their combined performance as your portfolio.
          </p>
        )}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {available.slice(0, 10).map((entry: any) => (
              <ShadowAgentCard
                key={entry.agentId}
                entry={entry}
                isFollowed={false}
                onToggle={() => followAgent(entry.agentId, entry.agent?.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Take Quiz CTA */}
      <Card className="bg-muted/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Not sure who to follow?</h3>
            <p className="text-[11px] text-muted-foreground">Take the Investor Profile Quiz to find your match.</p>
          </div>
          <Link href="/quiz">
            <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
              Take Quiz <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function ShadowAgentCard({ entry, isFollowed, onToggle }: { entry: any; isFollowed: boolean; onToggle: () => void }) {
  const { data: trades } = useQuery<any[]>({
    queryKey: [`/api/agents/${entry.agentId}/trades`],
    enabled: isFollowed,
  });

  const hypothetical = 10000 * (1 + entry.totalReturn);

  return (
    <Card className={isFollowed ? "border-cyan-500/20" : "hover:bg-accent/20 transition-colors"}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AgentAvatar agentId={entry.agentId} agentType={entry.agent?.type} size={36} rank={entry.rank} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/agents/${entry.agentId}`}>
                <span className="font-semibold text-sm hover:text-cyan-400 cursor-pointer transition-colors">{entry.agent?.name}</span>
              </Link>
              <Badge variant="outline" className="text-[9px]">#{entry.rank}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-mono font-bold ${pnlColor(entry.totalReturn)}`}>
                {formatReturn(entry.totalReturn)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Sharpe: {entry.sharpeRatio.toFixed(2)}
              </span>
              {isFollowed && (
                <span className="text-[10px] text-muted-foreground">
                  $10K → {formatCurrency(hypothetical)}
                </span>
              )}
            </div>
            {isFollowed && trades && trades.length > 0 && (
              <div className="mt-2 bg-muted/30 rounded px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Latest: <span className={trades[0].side === "buy" ? "text-emerald-400" : "text-red-400"}>
                    {trades[0].side.toUpperCase()}
                  </span> {trades[0].pair} — {formatRelativeTime(trades[0].executedAt)}
                </p>
                {trades[0].reason && (
                  <p className="text-[10px] text-muted-foreground italic mt-0.5">"{trades[0].reason}"</p>
                )}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant={isFollowed ? "outline" : "default"}
            onClick={onToggle}
            className={isFollowed
              ? "border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
              : "bg-cyan-500 hover:bg-cyan-600 text-black text-xs"
            }
          >
            {isFollowed ? "Unfollow" : "Follow"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
