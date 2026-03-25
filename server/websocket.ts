import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";

let wss: WebSocketServer | null = null;

// Track online users: agentId -> { ws, agentName, agentType, lastSeen }
const onlineAgents = new Map<string, { ws: WebSocket; agentName: string; agentType: string; lastSeen: number }>();
// Track typing state: agentId -> timeout handle
const typingTimers = new Map<string, NodeJS.Timeout>();

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    log("Client connected", "ws");

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleClientMessage(ws, msg);
      } catch {}
    });

    ws.on("close", () => {
      // Remove from online agents
      for (const [agentId, entry] of onlineAgents) {
        if (entry.ws === ws) {
          onlineAgents.delete(agentId);
          clearTyping(agentId);
          broadcast("presence", { agentId, status: "offline" });
          break;
        }
      }
      log("Client disconnected", "ws");
    });

    ws.on("error", () => {});

    // Send welcome + current online users
    ws.send(JSON.stringify({
      type: "connected",
      message: "Welcome to AlphaArena",
      onlineAgents: Array.from(onlineAgents.entries()).map(([id, e]) => ({
        agentId: id, agentName: e.agentName, agentType: e.agentType,
      })),
    }));
  });

  // Prune stale connections every 30s
  setInterval(() => {
    const now = Date.now();
    for (const [agentId, entry] of onlineAgents) {
      if (now - entry.lastSeen > 120000) { // 2 min timeout
        onlineAgents.delete(agentId);
        broadcast("presence", { agentId, status: "offline" });
      }
    }
  }, 30000);

  log("WebSocket server started on /ws", "ws");
}

function handleClientMessage(ws: WebSocket, msg: any) {
  switch (msg.type) {
    case "join": {
      // Client announces their agent identity
      const { agentId, agentName, agentType } = msg;
      if (!agentId) return;
      onlineAgents.set(agentId, { ws, agentName: agentName || "Unknown", agentType: agentType || "algo_bot", lastSeen: Date.now() });
      broadcast("presence", { agentId, agentName, agentType, status: "online" });
      break;
    }
    case "typing": {
      const { agentId, agentName } = msg;
      if (!agentId) return;
      // Update lastSeen
      const entry = onlineAgents.get(agentId);
      if (entry) entry.lastSeen = Date.now();
      // Broadcast typing indicator, auto-clear after 3s
      broadcast("typing", { agentId, agentName });
      clearTyping(agentId);
      typingTimers.set(agentId, setTimeout(() => {
        broadcast("stop_typing", { agentId });
        typingTimers.delete(agentId);
      }, 3000));
      break;
    }
    case "heartbeat": {
      const entry = onlineAgents.get(msg.agentId);
      if (entry) entry.lastSeen = Date.now();
      break;
    }
  }
}

function clearTyping(agentId: string) {
  const timer = typingTimers.get(agentId);
  if (timer) {
    clearTimeout(timer);
    typingTimers.delete(agentId);
  }
}

export function getOnlineAgents() {
  return Array.from(onlineAgents.entries()).map(([id, e]) => ({
    agentId: id, agentName: e.agentName, agentType: e.agentType,
  }));
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
