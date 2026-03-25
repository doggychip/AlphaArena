import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Invalidate relevant queries based on event type
          switch (msg.type) {
            case "trade":
              queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
              break;
            case "chat":
              queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
              break;
            case "chat_reaction":
              queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
              break;
            case "duel":
              queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
              break;
            case "event":
              queryClient.invalidateQueries({ queryKey: ["/api/events"] });
              break;
            case "price":
              queryClient.invalidateQueries({ queryKey: ["/api/prices"] });
              break;
            case "achievement":
              queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes("achievements") });
              break;
            case "market":
              queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
              queryClient.invalidateQueries({ queryKey: ["/api/bets/pool"] });
              queryClient.invalidateQueries({ predicate: (q) =>
                typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/markets/")
              });
              break;
          }
        } catch {}
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [queryClient]);
}
