import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export function useNotifications() {
  const { toast } = useToast();
  const lastCheckRef = useRef<number>(Date.now());

  // Poll events for chaos alerts
  const { data: events } = useQuery<any>({
    queryKey: ["/api/events"],
    refetchInterval: 30000,
  });

  // Check for new active events
  useEffect(() => {
    const active = events?.active ?? [];
    if (active.length > 0) {
      const event = active[0];
      const startedAt = new Date(event.startsAt).getTime();
      if (startedAt > lastCheckRef.current) {
        toast({
          title: `${event.eventType === "black_swan" ? "Black Swan" : event.eventType === "flash_challenge" ? "Flash Challenge" : "Mystery Pair"}`,
          description: event.name + " — " + event.description,
        });
        lastCheckRef.current = Date.now();
      }
    }
  }, [events, toast]);
}
