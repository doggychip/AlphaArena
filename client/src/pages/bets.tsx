import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coins, TrendingUp, Users, Trophy, Wallet, ArrowUpRight, ArrowDownRight,
  Clock, Target, Swords, BarChart3, Plus, ChevronDown, ChevronUp, History,
} from "lucide-react";
import { formatCurrency, formatRelativeTime, agentTypeBadgeClass, agentTypeLabel } from "@/lib/format";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "markets" | "weekly" | "portfolio";

function MarketTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    weekly_winner: { label: "Winner", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    head_to_head: { label: "H2H", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    over_under: { label: "O/U", className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    top_three: { label: "Top 3", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  };
  const c = config[type] ?? config.weekly_winner;
  return <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${c.className}`}>{c.label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    closed: { label: "Closed", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    settled: { label: "Settled", className: "bg-muted text-muted-foreground border-border" },
  };
  const c = config[status] ?? config.open;
  return <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${c.className}`}>{c.label}</Badge>;
}

function MarketCard({ market, onBet }: { market: any; onBet: (m: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const totalPool = market.totalPool ?? 0;
  const isOpen = market.status === "open";
  const closesAt = new Date(market.closesAt);
  const timeLeft = closesAt.getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000));

  return (
    <motion.div layout>
      <Card className={`bg-card/50 border-border/50 hover:border-border transition-colors ${isOpen ? "" : "opacity-75"}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MarketTypeBadge type={market.marketType} />
                <StatusBadge status={market.status} />
                {isOpen && hoursLeft <= 24 && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> {hoursLeft}h left
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold mb-0.5">{market.title}</h3>
              {market.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{market.description}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold font-mono text-amber-400">{formatCurrency(totalPool)}</p>
              <p className="text-[10px] text-muted-foreground">pool</p>
            </div>
          </div>

          {/* Outcome bars */}
          {market.outcomes && Object.keys(market.outcomes).length > 0 && (
            <div className="space-y-1.5 mb-3">
              {Object.entries(market.outcomes as Record<string, { total: number; count: number }>).map(([outcome, data]) => {
                const pct = totalPool > 0 ? Math.round((data.total / totalPool) * 100) : 0;
                return (
                  <div key={outcome} className="flex items-center gap-2">
                    <span className="text-xs w-16 truncate font-medium">{outcome}</span>
                    <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500/60 to-amber-400/40 rounded-full flex items-center px-2"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      >
                        <span className="text-[9px] font-mono font-bold text-foreground">{pct}%</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">
                      {formatCurrency(data.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {market.status === "settled" && market.winnerOutcome && (
            <div className="flex items-center gap-2 py-1.5 px-3 rounded bg-emerald-500/10 border border-emerald-500/20 mb-3">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Settled: {market.winnerOutcome}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isOpen && (
              <Button size="sm" onClick={() => onBet(market)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs">
                <Coins className="w-3.5 h-3.5 mr-1" /> Place Bet
              </Button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {market.positionCount ?? 0} positions · closes {formatRelativeTime(market.closesAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BetModal({ market, apiKey, onClose }: { market: any; apiKey: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState("");
  const [amount, setAmount] = useState(100);

  const { data: leaderboard } = useQuery<any[]>({ queryKey: ["/api/leaderboard"] });

  const placeBet = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/markets/${market.id}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ outcome, amount }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my/positions"] });
      onClose();
    },
  });

  // Build outcome options based on market type
  const outcomeOptions: { value: string; label: string }[] = [];
  if (market.marketType === "head_to_head") {
    outcomeOptions.push({ value: "A", label: "Agent A wins" }, { value: "B", label: "Agent B wins" });
  } else if (market.marketType === "over_under") {
    outcomeOptions.push({ value: "over", label: "Over" }, { value: "under", label: "Under" });
  } else if (market.marketType === "top_three") {
    outcomeOptions.push({ value: "yes", label: "Yes — Top 3" }, { value: "no", label: "No — Outside Top 3" });
  } else if (market.marketType === "weekly_winner") {
    // Show top agents as outcomes
    const agents = leaderboard?.slice(0, 18) ?? [];
    for (const entry of agents) {
      outcomeOptions.push({ value: entry.agentId, label: `#${entry.rank} ${entry.agent?.name ?? entry.agentId}` });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-lg font-bold mb-1">Place Bet</h3>
          <p className="text-sm text-muted-foreground">{market.title}</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Choose Outcome</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Select an outcome...</option>
            {outcomeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Amount (credits)</label>
          <div className="flex gap-2">
            <input
              type="number" min={1} max={50000} value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1 text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-amber-500/50"
            />
            <div className="flex gap-1">
              {[50, 100, 500, 1000].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    amount === v ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {v >= 1000 ? `${v / 1000}k` : v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {market.outcomes && outcome && (
          <div className="text-xs bg-muted/30 rounded p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current odds</span>
              <span className="font-mono">
                {(() => {
                  const outcomeData = market.outcomes[outcome];
                  const pool = market.totalPool ?? 0;
                  if (!outcomeData || pool === 0) return "N/A";
                  const pct = Math.round((outcomeData.total / pool) * 100);
                  return `${pct}% of pool`;
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your potential payout</span>
              <span className="font-mono text-emerald-400">
                {(() => {
                  const outcomeData = market.outcomes[outcome];
                  const pool = (market.totalPool ?? 0) + amount;
                  const outcomePool = (outcomeData?.total ?? 0) + amount;
                  if (outcomePool === 0) return "N/A";
                  return formatCurrency((amount / outcomePool) * pool);
                })()}
              </span>
            </div>
          </div>
        )}

        {placeBet.error && (
          <p className="text-xs text-red-400">{(placeBet.error as Error).message}</p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => placeBet.mutate()}
            disabled={!outcome || amount <= 0 || placeBet.isPending}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
          >
            {placeBet.isPending ? "Placing..." : `Bet ${formatCurrency(amount)}`}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PortfolioTab({ apiKey }: { apiKey: string }) {
  const { data: balance, isLoading: balanceLoading } = useQuery<any>({
    queryKey: ["/api/my/balance"],
    enabled: !!apiKey,
    queryFn: async () => {
      const res = await fetch("/api/my/balance", { headers: { "X-API-Key": apiKey } });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: positions, isLoading: positionsLoading } = useQuery<any[]>({
    queryKey: ["/api/my/positions"],
    enabled: !!apiKey,
    queryFn: async () => {
      const res = await fetch("/api/my/positions", { headers: { "X-API-Key": apiKey } });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  if (!apiKey) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Enter your API key to view your portfolio</p>
      </div>
    );
  }

  const activePositions = positions?.filter(p => p.status === "active") ?? [];
  const settledPositions = positions?.filter(p => p.status !== "active") ?? [];
  const totalBet = activePositions.reduce((s, p) => s + p.amount, 0);
  const totalWon = settledPositions.filter(p => p.status === "won").reduce((s, p) => s + (p.payout ?? 0), 0);
  const totalLost = settledPositions.filter(p => p.status === "lost").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Balance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Wallet className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
            <p className="text-xl font-bold font-mono text-emerald-400">
              {balanceLoading ? "..." : formatCurrency(balance?.balance ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Target className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">At Risk</p>
            <p className="text-xl font-bold font-mono text-amber-400">{formatCurrency(totalBet)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <ArrowUpRight className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Won</p>
            <p className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(totalWon)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <ArrowDownRight className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lost</p>
            <p className="text-xl font-bold font-mono text-red-400">{formatCurrency(totalLost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Positions */}
      {activePositions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" /> Active Positions ({activePositions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activePositions.map((pos: any) => (
              <div key={pos.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{pos.marketTitle ?? "Market"}</p>
                  <p className="text-xs text-muted-foreground">
                    Outcome: <span className="font-medium text-foreground">{pos.outcome}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-amber-400">{formatCurrency(pos.amount)}</p>
                  <StatusBadge status={pos.marketStatus ?? "open"} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Settled History */}
      {settledPositions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" /> Settlement History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {settledPositions.slice(0, 20).map((pos: any) => (
              <div key={pos.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{pos.marketTitle ?? "Market"}</p>
                  <p className="text-xs text-muted-foreground">
                    {pos.outcome} · {formatRelativeTime(pos.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-mono font-bold ${pos.status === "won" ? "text-emerald-400" : "text-red-400"}`}>
                    {pos.status === "won" ? `+${formatCurrency(pos.payout ?? 0)}` : `-${formatCurrency(pos.amount)}`}
                  </p>
                  <Badge variant="outline" className={`text-[9px] ${pos.status === "won" ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20"}`}>
                    {pos.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Transaction Log */}
      {balance?.transactions?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" /> Transaction Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {balance.transactions.slice(0, 15).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-xs">{tx.description ?? tx.type}</p>
                    <p className="text-[10px] text-muted-foreground">{formatRelativeTime(tx.createdAt)}</p>
                  </div>
                  <span className={`text-xs font-mono font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BetsPage() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("aa_api_key") ?? "");
  const [tab, setTab] = useState<Tab>("markets");
  const [betMarket, setBetMarket] = useState<any>(null);

  // Legacy weekly bets
  const [betAgentId, setBetAgentId] = useState("");
  const [betAmount, setBetAmount] = useState(100);
  const [showLegacyForm, setShowLegacyForm] = useState(false);

  useEffect(() => {
    if (apiKey) localStorage.setItem("aa_api_key", apiKey);
  }, [apiKey]);

  // Markets
  const { data: markets, isLoading: marketsLoading } = useQuery<any[]>({
    queryKey: ["/api/markets"],
    refetchInterval: 15000,
    queryFn: async () => {
      // Fetch markets with enriched data
      const res = await fetch("/api/markets");
      if (!res.ok) return [];
      const list = await res.json();
      // Fetch details for each
      return Promise.all(list.map(async (m: any) => {
        const detailRes = await fetch(`/api/markets/${m.id}`);
        if (!detailRes.ok) return m;
        return detailRes.json();
      }));
    },
  });

  // Legacy pool
  const { data: pool } = useQuery<any>({
    queryKey: ["/api/bets/pool"],
    refetchInterval: 15000,
  });

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
  });

  const placeLegacyBet = useMutation({
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
      setShowLegacyForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bets/pool"] });
    },
  });

  const openMarkets = markets?.filter(m => m.status === "open") ?? [];
  const closedMarkets = markets?.filter(m => m.status !== "open") ?? [];
  const agents = leaderboard?.slice(0, 18) ?? [];

  const tabs = [
    { id: "markets" as Tab, label: "Markets", icon: BarChart3, count: openMarkets.length },
    { id: "weekly" as Tab, label: "Weekly Pool", icon: Coins },
    { id: "portfolio" as Tab, label: "My Portfolio", icon: Wallet },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Coins className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold">Prediction Markets</h1>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
          {openMarkets.length} open markets
        </Badge>
      </div>

      {/* API Key Input */}
      <div className="flex gap-2 items-center">
        <input
          type="text" placeholder="API Key (aa_...)" value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="flex-1 max-w-sm text-xs bg-muted/50 border border-border rounded px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50"
        />
        {apiKey && <span className="text-[10px] text-emerald-400">Authenticated</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-colors ${
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count !== undefined && <span className="text-[9px] ml-0.5 opacity-60">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "markets" && (
        <div className="space-y-4">
          {/* Open Markets */}
          {marketsLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
          ) : openMarkets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-1">No prediction markets yet</p>
              <p className="text-xs">Markets are created automatically or via the API</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openMarkets.map((m: any) => (
                <MarketCard key={m.id} market={m} onBet={setBetMarket} />
              ))}
            </div>
          )}

          {/* Settled/Closed Markets */}
          {closedMarkets.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground pt-4">Settled Markets</h3>
              <div className="space-y-3">
                {closedMarkets.slice(0, 10).map((m: any) => (
                  <MarketCard key={m.id} market={m} onBet={setBetMarket} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "weekly" && (
        <div className="space-y-4">
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
                <Badge variant="outline" className="ml-auto text-[9px] bg-muted/50">
                  Week of {pool?.weekStart ?? "..."}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pool?.pool?.length ? (
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

          {/* Place Weekly Bet */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" /> Place Weekly Bet
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showLegacyForm ? (
                <Button onClick={() => setShowLegacyForm(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
                  <Coins className="w-4 h-4 mr-2" /> Place a Bet
                </Button>
              ) : (
                <div className="space-y-3 max-w-md">
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
                  {placeLegacyBet.error && (
                    <p className="text-xs text-red-400">{(placeLegacyBet.error as Error).message}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => placeLegacyBet.mutate()}
                      disabled={!apiKey || !betAgentId || placeLegacyBet.isPending}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
                    >
                      {placeLegacyBet.isPending ? "Placing..." : "Place Bet"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowLegacyForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "portfolio" && <PortfolioTab apiKey={apiKey} />}

      {/* Bet Modal */}
      <AnimatePresence>
        {betMarket && (
          <BetModal market={betMarket} apiKey={apiKey} onClose={() => setBetMarket(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
