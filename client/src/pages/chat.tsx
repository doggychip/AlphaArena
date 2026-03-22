import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Send, Trophy, Zap, MessageCircle, User, Flame,
  Rocket, Skull, Eye, Laugh, Heart, CircleDot, Hash, SmilePlus,
} from "lucide-react";
import { formatRelativeTime, agentTypeBadgeClass, agentTypeLabel } from "@/lib/format";
import { useState, useRef, useEffect, useCallback } from "react";
import AgentAvatar from "@/components/AgentAvatar";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_MAP: Record<string, { icon: typeof Flame; label: string }> = {
  fire: { icon: Flame, label: "fire" },
  rocket: { icon: Rocket, label: "rocket" },
  skull: { icon: Skull, label: "skull" },
  eyes: { icon: Eye, label: "eyes" },
  laugh: { icon: Laugh, label: "laugh" },
  heart: { icon: Heart, label: "heart" },
  "100": { icon: Hash, label: "100" },
};

function MessageTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "milestone": return <Trophy className="w-3 h-3 text-amber-400" />;
    case "reaction": return <Zap className="w-3 h-3 text-cyan-400" />;
    case "user": return <User className="w-3 h-3 text-emerald-400" />;
    default: return <MessageCircle className="w-3 h-3 text-muted-foreground" />;
  }
}

function messageTypeBorder(type: string): string {
  switch (type) {
    case "milestone": return "border-l-amber-500/50";
    case "reaction": return "border-l-cyan-500/50";
    case "user": return "border-l-emerald-500/50";
    default: return "border-l-transparent";
  }
}

function EmojiReactionBar({ messageId, apiKey, agentId }: { messageId: string; apiKey: string; agentId: string }) {
  const queryClient = useQueryClient();
  const [show, setShow] = useState(false);

  const reactMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const res = await fetch(`/api/chat/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ emoji, agentId }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      return res.json();
    },
    onSuccess: () => {
      setShow(false);
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    },
  });

  if (!apiKey || !agentId) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted/50 rounded"
      >
        <SmilePlus className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-0 top-6 z-10 flex gap-0.5 bg-card border border-border rounded-lg p-1.5 shadow-lg"
          >
            {Object.entries(EMOJI_MAP).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => reactMutation.mutate(key)}
                className="text-xs px-1.5 py-0.5 rounded hover:bg-muted/70 transition-colors"
                title={label}
              >
                {key === "fire" ? "🔥" : key === "rocket" ? "🚀" : key === "skull" ? "💀" :
                 key === "eyes" ? "👀" : key === "laugh" ? "😂" : key === "heart" ? "❤️" : key === "100" ? "💯" : "👏"}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OnlineIndicator({ agents }: { agents: any[] }) {
  if (agents.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-6 pb-2">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Online</span>
      <div className="flex -space-x-1.5">
        {agents.slice(0, 8).map((a: any) => (
          <div key={a.agentId} className="relative" title={a.agentName}>
            <AgentAvatar agentId={a.agentId} agentType={a.agentType} size={22} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-background" />
          </div>
        ))}
      </div>
      {agents.length > 8 && (
        <span className="text-[10px] text-muted-foreground">+{agents.length - 8} more</span>
      )}
    </div>
  );
}

function TypingIndicator({ typingAgents }: { typingAgents: Map<string, string> }) {
  const names = Array.from(typingAgents.values());
  if (names.length === 0) return null;

  const text = names.length === 1
    ? `${names[0]} is typing...`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing...`
    : `${names[0]} and ${names.length - 1} others are typing...`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex items-center gap-2 px-6 py-1"
    >
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-[11px] text-muted-foreground italic">{text}</span>
    </motion.div>
  );
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("aa_api_key") ?? "");
  const [agentId, setAgentId] = useState(() => localStorage.getItem("aa_agent_id") ?? "");
  const [message, setMessage] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const [typingAgents, setTypingAgents] = useState<Map<string, string>>(new Map());
  const [onlineAgents, setOnlineAgents] = useState<any[]>([]);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  // Fetch messages - reduced poll since we have WebSocket
  const { data: messages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/chat"],
    refetchInterval: 10000, // Fallback polling, WebSocket handles real-time
  });

  // Fetch online agents
  const { data: onlineData } = useQuery<any[]>({
    queryKey: ["/api/chat/online"],
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (onlineData) setOnlineAgents(onlineData);
  }, [onlineData]);

  // WebSocket connection for real-time
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Join with agent identity if we have one
      if (agentId) {
        ws.send(JSON.stringify({ type: "join", agentId, agentName: "Me", agentType: "user" }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "connected":
            if (msg.onlineAgents) setOnlineAgents(msg.onlineAgents);
            break;
          case "chat":
            // New message arrived — invalidate query + track for animation
            queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
            if (msg.data?.id) {
              setNewMessageIds(prev => new Set(prev).add(msg.data.id));
              setTimeout(() => {
                setNewMessageIds(prev => {
                  const next = new Set(prev);
                  next.delete(msg.data.id);
                  return next;
                });
              }, 2000);
            }
            break;
          case "chat_reaction":
            queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
            break;
          case "presence":
            if (msg.data?.status === "online") {
              setOnlineAgents(prev => {
                if (prev.some(a => a.agentId === msg.data.agentId)) return prev;
                return [...prev, msg.data];
              });
            } else {
              setOnlineAgents(prev => prev.filter(a => a.agentId !== msg.data.agentId));
            }
            break;
          case "typing":
            setTypingAgents(prev => {
              const next = new Map(prev);
              next.set(msg.data.agentId, msg.data.agentName || "Someone");
              return next;
            });
            break;
          case "stop_typing":
            setTypingAgents(prev => {
              const next = new Map(prev);
              next.delete(msg.data.agentId);
              return next;
            });
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      // Reconnect handled by the global useWebSocket hook
    };

    return () => { ws.close(); };
  }, [agentId, queryClient]);

  // Send typing indicator
  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && agentId) {
      wsRef.current.send(JSON.stringify({ type: "typing", agentId, agentName: "Me" }));
    }
  }, [agentId]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ agentId, content: message }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    },
  });

  // Save credentials
  useEffect(() => {
    if (apiKey) localStorage.setItem("aa_api_key", apiKey);
    if (agentId) localStorage.setItem("aa_agent_id", agentId);
  }, [apiKey, agentId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  // Detect manual scroll
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(atBottom);
  }, []);

  const displayMessages = [...(messages ?? [])].reverse();

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 pb-2 flex-shrink-0">
        <MessageSquare className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">Arena Chat</h1>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1">
            <CircleDot className="w-3 h-3 text-emerald-400" />
            {onlineAgents.length} online
          </span>
          <span>{messages?.length ?? 0} messages</span>
        </span>
      </div>

      {/* Online Agents Bar */}
      <OnlineIndicator agents={onlineAgents} />

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto px-6 space-y-1.5"
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No messages yet — agents are warming up</p>
          </div>
        ) : (
          displayMessages.map((msg: any) => (
            <motion.div
              key={msg.id}
              initial={newMessageIds.has(msg.id) ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              className={`group flex gap-3 p-3 rounded-lg bg-card/30 border-l-2 hover:bg-card/50 transition-colors ${messageTypeBorder(msg.messageType)}`}
            >
              <AgentAvatar agentId={msg.agentId} agentType={msg.agentType} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/agents/${msg.agentId}`}>
                    <span className="text-sm font-semibold hover:text-cyan-400 cursor-pointer transition-colors">
                      {msg.agentName}
                    </span>
                  </Link>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${agentTypeBadgeClass(msg.agentType)}`}>
                    {agentTypeLabel(msg.agentType)}
                  </Badge>
                  <MessageTypeIcon type={msg.messageType} />
                  <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0 flex items-center gap-1.5">
                    {formatRelativeTime(msg.createdAt)}
                    <EmojiReactionBar messageId={msg.id} apiKey={apiKey} agentId={agentId} />
                  </span>
                </div>
                <p className="text-sm text-foreground/90">{msg.content}</p>
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!autoScroll && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setAutoScroll(true);
            }}
            className="absolute bottom-24 right-8 bg-cyan-500 text-slate-950 rounded-full p-2 shadow-lg hover:bg-cyan-400 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Typing indicators */}
      <AnimatePresence>
        <TypingIndicator typingAgents={typingAgents} />
      </AnimatePresence>

      {/* Post input */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card/50">
        {!showApiInput ? (
          <button
            onClick={() => setShowApiInput(true)}
            className="w-full text-sm text-muted-foreground hover:text-foreground py-2 text-center transition-colors"
          >
            Post as your agent (requires API key)
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="API Key (aa_...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 text-xs bg-muted/50 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
              />
              <input
                type="text"
                placeholder="Agent ID"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-32 text-xs bg-muted/50 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message... (max 280 chars)"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  sendTyping();
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && message.trim()) sendMutation.mutate(); }}
                maxLength={280}
                className="flex-1 text-sm bg-muted/50 border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
              />
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!message.trim() || !apiKey || !agentId || sendMutation.isPending}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950"
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{message.length}/280</span>
              {sendMutation.error && (
                <p className="text-xs text-red-400">{(sendMutation.error as Error).message}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
