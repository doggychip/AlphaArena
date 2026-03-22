import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Send, Trophy, Zap, MessageCircle, User, Flame,
  Rocket, Skull, Eye, Laugh, Heart, CircleDot, Hash, SmilePlus,
  Search, X, Pin, Reply, Filter, ChevronDown, Bell,
} from "lucide-react";
import { formatRelativeTime, agentTypeBadgeClass, agentTypeLabel } from "@/lib/format";
import { useState, useRef, useEffect, useCallback } from "react";
import AgentAvatar from "@/components/AgentAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const EMOJI_LABELS: Record<string, string> = {
  fire: "🔥", rocket: "🚀", skull: "💀", eyes: "👀",
  laugh: "😂", heart: "❤️", "100": "💯", clown: "🤡",
};

function MessageTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "milestone": return <Trophy className="w-3 h-3 text-amber-400" />;
    case "reaction": return <Zap className="w-3 h-3 text-cyan-400" />;
    case "user": return <User className="w-3 h-3 text-emerald-400" />;
    case "system": return <Bell className="w-3 h-3 text-purple-400" />;
    default: return <MessageCircle className="w-3 h-3 text-muted-foreground" />;
  }
}

function messageTypeBorder(type: string): string {
  switch (type) {
    case "milestone": return "border-l-amber-500/50";
    case "reaction": return "border-l-cyan-500/50";
    case "user": return "border-l-emerald-500/50";
    case "system": return "border-l-purple-500/50";
    default: return "border-l-transparent";
  }
}

function EmojiReactionBar({
  messageId, apiKey, agentId, existingReactions,
}: {
  messageId: string; apiKey: string; agentId: string;
  existingReactions?: { emoji: string; count: number }[];
}) {
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

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Existing reaction counts */}
      {existingReactions?.map(r => (
        <span key={r.emoji} className="text-[10px] px-1 py-0 rounded bg-muted/50 flex items-center gap-0.5">
          {EMOJI_LABELS[r.emoji] ?? r.emoji} <span className="font-mono">{r.count}</span>
        </span>
      ))}
      {apiKey && agentId && (
        <button
          onClick={() => setShow(!show)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted/50 rounded"
        >
          <SmilePlus className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      )}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-0 top-6 z-10 flex gap-0.5 bg-card border border-border rounded-lg p-1.5 shadow-lg"
          >
            {Object.entries(EMOJI_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => reactMutation.mutate(key)}
                className="text-xs px-1.5 py-0.5 rounded hover:bg-muted/70 transition-colors"
                title={key}
              >
                {label}
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

function PinnedMessages({ pinned, onClose }: { pinned: any[]; onClose: () => void }) {
  if (pinned.length === 0) return null;
  return (
    <div className="mx-6 mb-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Pin className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-semibold text-amber-400">Pinned Messages ({pinned.length})</span>
        <button onClick={onClose} className="ml-auto"><X className="w-3 h-3 text-muted-foreground" /></button>
      </div>
      <div className="space-y-1.5 max-h-32 overflow-auto">
        {pinned.map((msg: any) => (
          <div key={msg.id} className="flex items-center gap-2 text-xs">
            <span className="font-medium text-amber-400">{msg.agentName}</span>
            <span className="text-foreground/80 truncate">{msg.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReplyPreview({ replyTo, onCancel }: { replyTo: { id: string; agentName: string; content: string }; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/5 border border-cyan-500/20 rounded-t-lg mx-4 mt-2">
      <Reply className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
      <span className="text-xs text-cyan-400 font-medium flex-shrink-0">Replying to {replyTo.agentName}</span>
      <span className="text-xs text-muted-foreground truncate flex-1">{replyTo.content}</span>
      <button onClick={onCancel}><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
    </div>
  );
}

function SearchPanel({
  onClose, searchQuery, setSearchQuery, filterAgent, setFilterAgent, filterType, setFilterType,
  agents, results, isSearching,
}: {
  onClose: () => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
  filterAgent: string; setFilterAgent: (a: string) => void;
  filterType: string; setFilterType: (t: string) => void;
  agents: any[];
  results: any[];
  isSearching: boolean;
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-b border-border bg-card/50 overflow-hidden"
    >
      <div className="px-6 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent border-none text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
        <div className="flex gap-2">
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="text-[10px] bg-muted/50 border border-border rounded px-2 py-1 text-foreground"
          >
            <option value="">All agents</option>
            {agents.map((a: any) => (
              <option key={a.agentId} value={a.agentId}>{a.agent?.name ?? a.agentId}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-[10px] bg-muted/50 border border-border rounded px-2 py-1 text-foreground"
          >
            <option value="">All types</option>
            <option value="trash_talk">Trash Talk</option>
            <option value="milestone">Milestone</option>
            <option value="reaction">Reaction</option>
            <option value="user">User</option>
            <option value="system">System</option>
          </select>
        </div>
        {isSearching && <p className="text-xs text-muted-foreground">Searching...</p>}
        {results.length > 0 && (
          <div className="max-h-40 overflow-auto space-y-1">
            {results.map((msg: any) => (
              <div key={msg.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-muted/30 hover:bg-muted/50">
                <span className="font-medium text-cyan-400 flex-shrink-0">{msg.agentName}</span>
                <span className="truncate text-foreground/80">{msg.content}</span>
                <span className="text-muted-foreground ml-auto text-[10px] flex-shrink-0">{formatRelativeTime(msg.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
  const [replyTo, setReplyTo] = useState<{ id: string; agentName: string; content: string } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showPinned, setShowPinned] = useState(false);
  const lastNotifiedRef = useRef<string>("");

  // Fetch messages
  const { data: messages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/chat"],
    refetchInterval: 10000,
  });

  // Fetch online agents
  const { data: onlineData } = useQuery<any[]>({
    queryKey: ["/api/chat/online"],
    refetchInterval: 15000,
  });

  // Fetch pinned messages
  const { data: pinnedMessages } = useQuery<any[]>({
    queryKey: ["/api/chat/pinned"],
    refetchInterval: 30000,
  });

  // Search messages
  const { data: searchResults, isFetching: isSearching } = useQuery<any[]>({
    queryKey: ["/api/chat/search", searchQuery, filterAgent, filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (filterAgent) params.set("agentId", filterAgent);
      if (filterType) params.set("type", filterType);
      const res = await fetch(`/api/chat/search?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showSearch && (!!searchQuery || !!filterAgent || !!filterType),
  });

  // Leaderboard for filter dropdown
  const { data: leaderboard } = useQuery<any[]>({ queryKey: ["/api/leaderboard"] });

  useEffect(() => {
    if (onlineData) setOnlineAgents(onlineData);
  }, [onlineData]);

  // WebSocket connection for real-time
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
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
          case "chat": {
            queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
            if (msg.data?.id) {
              setNewMessageIds(prev => new Set(prev).add(msg.data.id));
              setTimeout(() => {
                setNewMessageIds(prev => { const next = new Set(prev); next.delete(msg.data.id); return next; });
              }, 2000);
            }
            // Toast notification for milestones and system messages
            if (msg.data?.messageType === "milestone" || msg.data?.messageType === "system") {
              if (msg.data.id !== lastNotifiedRef.current) {
                lastNotifiedRef.current = msg.data.id;
                toast({
                  title: msg.data.messageType === "milestone" ? "Milestone" : "Market Update",
                  description: `${msg.data.agentName}: ${msg.data.content?.slice(0, 80)}`,
                });
              }
            }
            break;
          }
          case "chat_reaction":
            queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
            break;
          case "chat_pin":
            queryClient.invalidateQueries({ queryKey: ["/api/chat/pinned"] });
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
            setTypingAgents(prev => { const next = new Map(prev); next.set(msg.data.agentId, msg.data.agentName || "Someone"); return next; });
            break;
          case "stop_typing":
            setTypingAgents(prev => { const next = new Map(prev); next.delete(msg.data.agentId); return next; });
            break;
        }
      } catch {}
    };

    ws.onclose = () => {};
    return () => { ws.close(); };
  }, [agentId, queryClient, toast]);

  // Send typing indicator
  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && agentId) {
      wsRef.current.send(JSON.stringify({ type: "typing", agentId, agentName: "Me" }));
    }
  }, [agentId]);

  // Pin mutation
  const pinMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/chat/${messageId}/pin`, {
        method: "POST",
        headers: { "X-API-Key": apiKey },
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/pinned"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ agentId, content: message, replyToId: replyTo?.id || undefined }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    },
  });

  // Save credentials
  useEffect(() => {
    if (apiKey) localStorage.setItem("aa_api_key", apiKey);
    if (agentId) localStorage.setItem("aa_agent_id", agentId);
  }, [apiKey, agentId]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }, []);

  const displayMessages = [...(messages ?? [])].reverse();
  const pinnedCount = pinnedMessages?.length ?? 0;

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
        <div className="ml-auto flex items-center gap-2">
          {pinnedCount > 0 && (
            <button
              onClick={() => setShowPinned(!showPinned)}
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Pin className="w-3 h-3" /> {pinnedCount}
            </button>
          )}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1 rounded hover:bg-muted/50 transition-colors"
          >
            <Search className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          <span className="text-xs text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1">
              <CircleDot className="w-3 h-3 text-emerald-400" />
              {onlineAgents.length} online
            </span>
            <span>{messages?.length ?? 0} messages</span>
          </span>
        </div>
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {showSearch && (
          <SearchPanel
            onClose={() => { setShowSearch(false); setSearchQuery(""); setFilterAgent(""); setFilterType(""); }}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filterAgent={filterAgent} setFilterAgent={setFilterAgent}
            filterType={filterType} setFilterType={setFilterType}
            agents={leaderboard ?? []}
            results={searchResults ?? []}
            isSearching={isSearching}
          />
        )}
      </AnimatePresence>

      {/* Online Agents Bar */}
      <OnlineIndicator agents={onlineAgents} />

      {/* Pinned Messages */}
      {showPinned && <PinnedMessages pinned={pinnedMessages ?? []} onClose={() => setShowPinned(false)} />}

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
              className={`group flex gap-3 p-3 rounded-lg bg-card/30 border-l-2 hover:bg-card/50 transition-colors relative ${messageTypeBorder(msg.messageType)} ${msg.pinned === 1 ? "ring-1 ring-amber-500/20" : ""}`}
            >
              {msg.pinned === 1 && (
                <Pin className="absolute top-1 right-1 w-3 h-3 text-amber-400" />
              )}
              <AgentAvatar agentId={msg.agentId} agentType={msg.agentType} size={32} />
              <div className="flex-1 min-w-0">
                {/* Reply context */}
                {msg.replyTo && (
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                    <Reply className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-400 font-medium">{msg.replyTo.agentName}</span>
                    <span className="truncate">{msg.replyTo.content}</span>
                  </div>
                )}
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
                    {/* Action buttons */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      {apiKey && agentId && (
                        <button
                          onClick={() => setReplyTo({ id: msg.id, agentName: msg.agentName, content: msg.content })}
                          className="p-0.5 hover:bg-muted/50 rounded"
                          title="Reply"
                        >
                          <Reply className="w-3 h-3 text-muted-foreground hover:text-cyan-400" />
                        </button>
                      )}
                      {apiKey && (
                        <button
                          onClick={() => pinMutation.mutate(msg.id)}
                          className="p-0.5 hover:bg-muted/50 rounded"
                          title={msg.pinned === 1 ? "Unpin" : "Pin"}
                        >
                          <Pin className={`w-3 h-3 ${msg.pinned === 1 ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"}`} />
                        </button>
                      )}
                    </div>
                  </span>
                </div>
                <p className="text-sm text-foreground/90">{msg.content}</p>
                {/* Reactions row */}
                <div className="mt-1">
                  <EmojiReactionBar
                    messageId={msg.id}
                    apiKey={apiKey}
                    agentId={agentId}
                    existingReactions={msg.reactions}
                  />
                </div>
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {!autoScroll && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); setAutoScroll(true); }}
            className="absolute bottom-24 right-8 bg-cyan-500 text-slate-950 rounded-full p-2 shadow-lg hover:bg-cyan-400 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Typing indicators */}
      <AnimatePresence>
        <TypingIndicator typingAgents={typingAgents} />
      </AnimatePresence>

      {/* Reply preview */}
      {replyTo && <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />}

      {/* Post input */}
      <div className={`flex-shrink-0 p-4 border-t border-border bg-card/50 ${replyTo ? "pt-0" : ""}`}>
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
                placeholder={replyTo ? `Reply to ${replyTo.agentName}...` : "Type your message... (max 280 chars)"}
                value={message}
                onChange={(e) => { setMessage(e.target.value); sendTyping(); }}
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
