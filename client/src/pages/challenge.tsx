import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, Trophy, TrendingUp, TrendingDown, Clock, ArrowRight, Target, Lightbulb, CheckCircle, XCircle } from "lucide-react";
import AgentAvatar from "@/components/AgentAvatar";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function ChallengePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedPair, setSelectedPair] = useState<string>("BTC/USD");
  const [selectedSide, setSelectedSide] = useState<"buy" | "sell">("buy");
  const [challengeAgent, setChallengeAgent] = useState<string>("");
  const [activeTab, setActiveTab] = useState("challenge");

  const { data: leaderboard, isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 15000,
  });

  const { data: activeChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/active"],
    refetchInterval: 10000,
  });

  const { data: pastChallenges } = useQuery<any[]>({
    queryKey: ["/api/challenges/history"],
    refetchInterval: 30000,
  });

  const { data: prices } = useQuery<any>({
    queryKey: ["/api/prices"],
    refetchInterval: 10000,
  });

  const challengeMutation = useMutation({
    mutationFn: async (data: { agentId: string; pair: string; side: string }) => {
      const res = await apiRequest("POST", "/api/challenges", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Challenge Placed!", description: `You predicted ${selectedSide.toUpperCase()} on ${selectedPair} vs ${challengeAgent}. Results in 24 hours!` });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/history"] });
      // Reset form and switch to Active tab
      setSelectedAgent("");
      setChallengeAgent("");
      setActiveTab("active");
    },
    onError: (err: any) => {
      toast({ title: "Challenge Failed", description: err.message || "Could not place challenge", variant: "destructive" });
    },
  });

  const agents = (leaderboard ?? []).filter((e: any) => e.agent?.name !== "Random Walk Baseline");

  return (
    <div className="p-6 lg:p-10 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Target className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold">Challenge a Legend</h1>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">BETA</Badge>
      </div>
      <p className="text-muted-foreground text-sm max-w-xl">
        Think you know better than Buffett? Pick a pair, make your call, and we'll track who was right.
        Your prediction vs the legend's strategy — live results in 24 hours.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="challenge">Make a Call</TabsTrigger>
          <TabsTrigger value="active">Active ({(activeChallenges ?? []).length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* MAKE A CALL */}
        <TabsContent value="challenge" className="mt-4 space-y-4">
          {/* Step 1: Pick your opponent */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">1</span>
                Pick Your Opponent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                ) : (
                  agents.slice(0, 8).map((entry: any) => {
                    const isSelected = selectedAgent === entry.agentId;
                    return (
                      <button
                        key={entry.agentId}
                        onClick={() => { setSelectedAgent(entry.agentId); setChallengeAgent(entry.agent?.name ?? ""); }}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          isSelected
                            ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/20"
                            : "border-border/50 hover:border-border hover:bg-accent/30"
                        }`}
                      >
                        <AgentAvatar agentId={entry.agentId} agentType={entry.agent?.type} size={32} />
                        <p className="text-xs font-medium mt-2 truncate">{entry.agent?.name}</p>
                        <p className={`text-[10px] font-mono mt-1 ${entry.totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {entry.totalReturn >= 0 ? "+" : ""}{(entry.totalReturn * 100).toFixed(1)}%
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Make your call */}
          <Card className={!selectedAgent ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">2</span>
                Make Your Call
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Trading Pair</label>
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(prices?.prices ?? []).map((p: any) => (
                        <SelectItem key={p.pair} value={p.pair}>{p.pair}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Your Prediction (24h)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedSide("buy")}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        selectedSide === "buy"
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                          : "border-border/50 hover:bg-accent/30"
                      }`}
                    >
                      <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-bold">BULLISH</span>
                    </button>
                    <button
                      onClick={() => setSelectedSide("sell")}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        selectedSide === "sell"
                          ? "border-red-500/50 bg-red-500/10 text-red-400"
                          : "border-border/50 hover:bg-accent/30"
                      }`}
                    >
                      <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-bold">BEARISH</span>
                    </button>
                  </div>
                </div>
              </div>

              {selectedAgent && (
                <div className="mt-4 bg-muted/30 rounded-lg p-4 border border-border/30">
                  <p className="text-sm">
                    <strong>Your challenge:</strong> You predict {selectedPair} will go{" "}
                    <span className={selectedSide === "buy" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {selectedSide === "buy" ? "UP ▲" : "DOWN ▼"}
                    </span>{" "}
                    in the next 24 hours. We'll compare your call against{" "}
                    <span className="text-amber-400 font-bold">{challengeAgent}</span>'s actual trades.
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Current price: {formatCurrency(prices?.prices?.find((p: any) => p.pair === selectedPair)?.price ?? 0)}. Results in 24 hours.
                  </p>
                </div>
              )}

              <Button
                className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                disabled={!selectedAgent || challengeMutation.isPending}
                onClick={() => challengeMutation.mutate({ agentId: selectedAgent, pair: selectedPair, side: selectedSide })}
              >
                {challengeMutation.isPending ? "Placing Challenge..." : `Challenge ${challengeAgent || "Legend"} →`}
              </Button>
            </CardContent>
          </Card>

          {/* Why challenge? */}
          <Card className="bg-muted/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold mb-1">Why Challenge?</h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Learn by doing</strong> — making predictions forces you to think about market dynamics</li>
                    <li>• <strong>Track your accuracy</strong> — build a record of your calls over time</li>
                    <li>• <strong>Compare philosophies</strong> — was the legend's strategy better than your gut feeling?</li>
                    <li>• <strong>No real money</strong> — pure learning, zero risk</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTIVE CHALLENGES */}
        <TabsContent value="active" className="mt-4 space-y-3">
          {(activeChallenges ?? []).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active challenges. Make a call!</p>
            </div>
          ) : (
            (activeChallenges ?? []).map((ch: any) => (
              <ChallengeCard key={ch.id} challenge={ch} />
            ))
          )}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4 space-y-3">
          {(pastChallenges ?? []).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No completed challenges yet.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-4">
                <StatBadge label="Total" value={(pastChallenges ?? []).length} />
                <StatBadge label="Wins" value={(pastChallenges ?? []).filter((c: any) => c.userWon).length} color="emerald" />
                <StatBadge label="Losses" value={(pastChallenges ?? []).filter((c: any) => !c.userWon).length} color="red" />
                <StatBadge
                  label="Win Rate"
                  value={`${(((pastChallenges ?? []).filter((c: any) => c.userWon).length / Math.max((pastChallenges ?? []).length, 1)) * 100).toFixed(0)}%`}
                  color="cyan"
                />
              </div>
              {(pastChallenges ?? []).map((ch: any) => (
                <ChallengeCard key={ch.id} challenge={ch} />
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChallengeCard({ challenge: ch }: { challenge: any }) {
  const isActive = ch.status === "active";
  const isBullish = ch.side === "buy";
  return (
    <Card className={isActive ? "border-amber-500/20" : ch.userWon ? "border-emerald-500/20" : "border-red-500/20"}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={isBullish ? "bg-emerald-500/20 text-emerald-400 text-[10px]" : "bg-red-500/20 text-red-400 text-[10px]"}>
              {isBullish ? "▲ BULLISH" : "▼ BEARISH"}
            </Badge>
            <span className="font-mono text-sm font-bold">{ch.pair}</span>
            <span className="text-xs text-muted-foreground">vs</span>
            <span className="text-sm font-medium text-amber-400">{ch.agentName}</span>
          </div>
          {isActive ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
              <Clock className="w-3 h-3 mr-1" />
              {formatRelativeTime(ch.endsAt)}
            </Badge>
          ) : ch.userWon ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
              <CheckCircle className="w-3 h-3 mr-1" /> YOU WON
            </Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-400 text-[10px]">
              <XCircle className="w-3 h-3 mr-1" /> LEGEND WON
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 text-center mt-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Entry Price</p>
            <p className="text-sm font-mono">{formatCurrency(ch.entryPrice ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Current / Exit</p>
            <p className="text-sm font-mono">{formatCurrency(ch.currentPrice ?? ch.exitPrice ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">P&L</p>
            <p className={`text-sm font-mono font-bold ${(ch.pnlPct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {(ch.pnlPct ?? 0) >= 0 ? "+" : ""}{((ch.pnlPct ?? 0) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
        {!isActive && ch.lesson && (
          <div className="mt-3 bg-muted/30 rounded-lg p-3 border border-border/30">
            <p className="text-xs text-muted-foreground">
              <Lightbulb className="w-3 h-3 inline mr-1 text-amber-400" />
              {ch.lesson}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBadge({ label, value, color = "muted" }: { label: string; value: string | number; color?: string }) {
  const colorClass = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    muted: "bg-muted/50 text-foreground border-border/50",
  }[color] ?? "bg-muted/50 text-foreground border-border/50";

  return (
    <div className={`px-3 py-2 rounded-lg border ${colorClass}`}>
      <p className="text-[10px] opacity-60">{label}</p>
      <p className="text-sm font-mono font-bold">{value}</p>
    </div>
  );
}
