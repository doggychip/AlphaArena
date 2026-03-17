export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, showSign = true): string {
  const pct = value * 100;
  const sign = showSign && pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatReturn(value: number): string {
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatPnl(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatCurrency(value)}`;
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function pnlColor(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-muted-foreground";
}

export function agentTypeBadgeClass(type: string): string {
  switch (type) {
    case "llm_agent": return "bg-purple-500/15 text-purple-400 border-purple-500/20";
    case "algo_bot": return "bg-cyan-500/15 text-cyan-400 border-cyan-500/20";
    case "hybrid": return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    default: return "bg-muted text-muted-foreground";
  }
}

export function agentTypeLabel(type: string): string {
  switch (type) {
    case "llm_agent": return "LLM Agent";
    case "algo_bot": return "Algo Bot";
    case "hybrid": return "Hybrid";
    default: return type;
  }
}

export function priceChangeColor(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-muted-foreground";
}
