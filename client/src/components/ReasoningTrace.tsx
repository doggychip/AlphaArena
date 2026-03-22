import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ChevronDown, ChevronUp, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";
import { pnlColor, formatReturn } from "@/lib/format";

interface ReasoningStep {
  indicator: string;
  value: string;
  interpretation: string;
  signal: "bullish" | "bearish" | "neutral";
}

interface TradeWithReasoning {
  id: string;
  pair: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  totalValue: number;
  reason: string;
  reasoning: ReasoningStep[];
  philosophy: string | null;
  confidence: number | null;
  executedAt: string;
}

const SIGNAL_CONFIG = {
  bullish: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: TrendingUp, label: "Bullish" },
  bearish: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: TrendingDown, label: "Bearish" },
  neutral: { color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20", icon: Minus, label: "Neutral" },
};

export function ReasoningTraceCard({ trade }: { trade: TradeWithReasoning }) {
  const [expanded, setExpanded] = useState(false);
  const hasReasoning = trade.reasoning && trade.reasoning.length > 0;

  return (
    <Card className="bg-card/50 border-border/50 hover:border-border transition-colors">
      <CardContent className="p-4">
        {/* Trade summary header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={trade.side === "buy" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-red-500/15 text-red-400 border-red-500/20"}>
              {trade.side.toUpperCase()}
            </Badge>
            <span className="font-mono font-semibold text-sm">{trade.pair}</span>
            <span className="text-xs text-muted-foreground">@ ${trade.price.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            {trade.confidence != null && (
              <span className="text-[10px] text-muted-foreground">
                {(trade.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
            {trade.philosophy && (
              <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                {trade.philosophy}
              </Badge>
            )}
          </div>
        </div>

        {/* Reason summary */}
        <p className="text-xs text-muted-foreground italic mb-2">"{trade.reason}"</p>

        {/* Expand/collapse reasoning */}
        {hasReasoning && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            <Brain className="w-3 h-3" />
            {expanded ? "Hide" : "Show"} Reasoning Trace ({trade.reasoning.length} steps)
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {/* Reasoning steps */}
        {expanded && hasReasoning && (
          <div className="mt-3 space-y-2 pl-2 border-l-2 border-cyan-500/20">
            {trade.reasoning.map((step, i) => {
              const cfg = SIGNAL_CONFIG[step.signal];
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex items-start gap-2 group">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-muted-foreground w-4 flex-shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{step.indicator}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs font-mono font-semibold">{step.value}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{step.interpretation}</p>
                    </div>
                    <Badge className={`text-[9px] ${cfg.bg} ${cfg.color} flex-shrink-0 gap-0.5`}>
                      <Icon className="w-2.5 h-2.5" />
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
              );
            })}

            {/* Decision summary */}
            <div className="pt-2 mt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">→</span>
                <span className="text-xs font-semibold">
                  Decision: {trade.side.toUpperCase()} {trade.quantity} {trade.pair}
                </span>
                {trade.confidence != null && (
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${trade.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{(trade.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex justify-end mt-2">
          <span className="text-[10px] text-muted-foreground">
            {new Date(trade.executedAt).toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReasoningTraceList({ agentId }: { agentId: string }) {
  const { useQuery } = require("@tanstack/react-query");
  const { data, isLoading } = useQuery<{ trades: TradeWithReasoning[] }>({
    queryKey: ["/api/agents", agentId, "reasoning"],
    refetchInterval: 30000,
  });

  const trades = data?.trades ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4" /> Reasoning Traces</CardTitle></CardHeader>
        <CardContent><div className="text-sm text-muted-foreground">Loading traces...</div></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            Reasoning Traces
          </CardTitle>
          <Badge variant="outline" className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
            {trades.length} traces
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Full decision chain for every trade. See exactly how this agent thinks.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {trades.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">No trades with reasoning yet. New trades will show reasoning traces.</div>
        ) : (
          trades.map((trade) => <ReasoningTraceCard key={trade.id} trade={trade} />)
        )}
      </CardContent>
    </Card>
  );
}
