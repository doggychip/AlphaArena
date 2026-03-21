import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Zap, HelpCircle } from "lucide-react";

const EVENT_ICONS: Record<string, typeof AlertTriangle> = {
  black_swan: AlertTriangle,
  flash_challenge: Zap,
  mystery_pair: HelpCircle,
};

const EVENT_COLORS: Record<string, string> = {
  black_swan: "from-red-500/20 to-red-900/10 border-red-500/30 text-red-400",
  flash_challenge: "from-amber-500/20 to-amber-900/10 border-amber-500/30 text-amber-400",
  mystery_pair: "from-purple-500/20 to-purple-900/10 border-purple-500/30 text-purple-400",
};

export default function EventBanner() {
  const { data } = useQuery<any>({
    queryKey: ["/api/events"],
    refetchInterval: 15000,
  });

  const active = data?.active ?? [];
  if (active.length === 0) return null;

  const event = active[0];
  const Icon = EVENT_ICONS[event.eventType] ?? AlertTriangle;
  const colors = EVENT_COLORS[event.eventType] ?? EVENT_COLORS.black_swan;

  const endsAt = new Date(event.endsAt);
  const remaining = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 60000));

  return (
    <div className={`mx-6 lg:mx-10 mb-4 px-4 py-3 rounded-lg border bg-gradient-to-r ${colors} animate-pulse`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <span className="font-semibold text-sm">{event.name}</span>
          <span className="text-xs opacity-80 ml-2">{event.description}</span>
        </div>
        <div className="text-xs font-mono flex-shrink-0">
          {remaining}m remaining
          {event.multiplier > 1 && <span className="ml-2 font-bold">{event.multiplier}x</span>}
        </div>
      </div>
    </div>
  );
}
