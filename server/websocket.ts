import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    log("Client connected", "ws");
    ws.on("close", () => log("Client disconnected", "ws"));
    ws.on("error", () => {});
    // Send welcome
    ws.send(JSON.stringify({ type: "connected", message: "Welcome to AlphaArena" }));
  });

  log("WebSocket server started on /ws", "ws");
}

export function broadcast(type: string, data: any) {
  if (!wss) return;
  const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
