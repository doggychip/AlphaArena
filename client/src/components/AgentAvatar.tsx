function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

const TYPE_GRADIENTS: Record<string, [string, string]> = {
  llm_agent: ["#a855f7", "#7c3aed"],   // purple
  algo_bot: ["#06b6d4", "#0891b2"],     // cyan
  hybrid: ["#f59e0b", "#d97706"],       // amber
};

const TYPE_SYMBOLS: Record<string, string> = {
  llm_agent: "M10,8 C10,5 13,3 16,3 C19,3 22,5 22,8 C22,11 19,14 16,16 C13,14 10,11 10,8Z", // brain-like
  algo_bot: "M8,8 L16,4 L24,8 L24,16 L16,20 L8,16Z",  // hexagon
  hybrid: "M16,4 L20,12 L28,12 L22,18 L24,26 L16,22 L8,26 L10,18 L4,12 L12,12Z", // star
};

interface Props {
  agentId: string;
  agentType: string;
  size?: number;
  rank?: number;
}

export default function AgentAvatar({ agentId, agentType, size = 32, rank }: Props) {
  const hash = hashCode(agentId);
  const [g1, g2] = TYPE_GRADIENTS[agentType] ?? TYPE_GRADIENTS.algo_bot;
  const symbol = TYPE_SYMBOLS[agentType] ?? TYPE_SYMBOLS.algo_bot;
  const gradientId = `av-${hash}`;

  // Deterministic pattern elements from hash
  const rotation = (hash % 360);
  const numDots = 3 + (hash % 4);
  const isTopThree = rank != null && rank <= 3;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={`rounded-lg flex-shrink-0 ${isTopThree ? "ring-1 ring-amber-400/50" : ""}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={g1} stopOpacity="0.3" />
          <stop offset="100%" stopColor={g2} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="32" height="32" rx="6" fill={`url(#${gradientId})`} />
      <rect width="32" height="32" rx="6" stroke={g1} strokeWidth="0.75" strokeOpacity="0.4" fill="none" />

      {/* Pattern dots */}
      <g opacity="0.25" transform={`rotate(${rotation} 16 16)`}>
        {Array.from({ length: numDots }).map((_, i) => {
          const angle = (i / numDots) * Math.PI * 2;
          const r = 8 + (hash >> (i + 4)) % 4;
          const cx = 16 + Math.cos(angle) * r;
          const cy = 16 + Math.sin(angle) * r;
          const dotR = 1 + (hash >> (i + 8)) % 2;
          return <circle key={i} cx={cx} cy={cy} r={dotR} fill={g1} />;
        })}
      </g>

      {/* Type symbol */}
      <g transform="scale(0.7) translate(7 7)" opacity="0.6">
        <path d={symbol} fill={g1} />
      </g>

      {/* Top-3 crown indicator */}
      {isTopThree && (
        <circle cx="27" cy="5" r="4" fill="#f59e0b" stroke="#1a1a2e" strokeWidth="1" />
      )}
    </svg>
  );
}
