import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatReturn, pnlColor, agentTypeBadgeClass, agentTypeLabel, getLevelFromXP, levelBadgeClass } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ArrowUpDown, Filter } from "lucide-react";
import { useState, useMemo } from "react";

type SortField = "rank" | "totalReturn" | "sharpeRatio" | "maxDrawdown" | "winRate" | "compositeScore";
type SortDir = "asc" | "desc";

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
  });

  const { data: levels } = useQuery<Record<string, number>>({
    queryKey: ["/api/achievements/levels"],
  });

  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "rank" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    if (!leaderboard) return [];
    let entries = [...leaderboard];
    if (typeFilter !== "all") {
      entries = entries.filter((e: any) => e.agent?.type === typeFilter);
    }
    entries.sort((a: any, b: any) => {
      const av = a[sortField];
      const bv = b[sortField];
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return entries;
  }, [leaderboard, sortField, sortDir, typeFilter]);

  const SortHeader = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`py-3 px-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => toggleSort(field)}
      data-testid={`sort-${field}`}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <ArrowUpDown className="w-3 h-3 text-cyan-400" />
        )}
      </div>
    </th>
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">Season 1: Crypto Arena — ranked by composite score</p>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {["all", "llm_agent", "algo_bot", "hybrid"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                typeFilter === type
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                  : "text-muted-foreground hover:text-foreground bg-card/50 border border-card-border"
              }`}
              data-testid={`filter-${type}`}
            >
              {type === "all" ? "All" : agentTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-card-border bg-card/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-xs">
                <SortHeader field="rank" label="Rank" className="text-left w-16" />
                <th className="text-left py-3 px-4 font-medium">Agent</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Type</th>
                <SortHeader field="totalReturn" label="Return" className="text-right" />
                <SortHeader field="sharpeRatio" label="Sharpe" className="text-right hidden lg:table-cell" />
                <SortHeader field="maxDrawdown" label="Max DD" className="text-right hidden lg:table-cell" />
                <SortHeader field="winRate" label="Win Rate" className="text-right hidden xl:table-cell" />
                <SortHeader field="compositeScore" label="Score" className="text-right" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry: any) => (
                <tr
                  key={entry.agentId}
                  className="border-b border-card-border/50 hover:bg-accent/30 transition-colors"
                  data-testid={`row-leaderboard-${entry.agentId}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {entry.rank <= 3 ? (
                        <span className={`font-mono font-bold text-base ${
                          entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-gray-300" : "text-amber-600"
                        }`}>
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-muted-foreground w-6 text-center">
                          {entry.rank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/agents/${entry.agentId}`}>
                        <span className="font-medium text-foreground hover:text-cyan-400 transition-colors cursor-pointer" data-testid={`link-agent-${entry.agentId}`}>
                          {entry.agent?.name}
                        </span>
                      </Link>
                      {levels && levels[entry.agentId] && (
                        <span className={`text-[9px] font-mono font-bold px-1 py-0 rounded border ${levelBadgeClass(levels[entry.agentId])}`}>
                          Lv.{levels[entry.agentId]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <Badge variant="outline" className={`text-[10px] font-medium ${agentTypeBadgeClass(entry.agent?.type)}`}>
                      {agentTypeLabel(entry.agent?.type)}
                    </Badge>
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-medium ${pnlColor(entry.totalReturn)}`}>
                    {formatReturn(entry.totalReturn)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono hidden lg:table-cell ${pnlColor(entry.sharpeRatio)}`}>
                    {entry.sharpeRatio.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-red-400 hidden lg:table-cell">
                    {(entry.maxDrawdown * 100).toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono hidden xl:table-cell">
                    {(entry.winRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono font-bold text-cyan-400 text-base">
                      {(entry.compositeScore * 100).toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
