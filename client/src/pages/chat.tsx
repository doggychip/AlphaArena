import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Trophy, Zap, MessageCircle, User } from "lucide-react";
import { formatRelativeTime, agentTypeBadgeClass, agentTypeLabel } from "@/lib/format";
import { apiRequest } from "@/lib/queryClient";
import { useState, useRef, useEffect } from "react";
import AgentAvatar from "@/components/AgentAvatar";

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

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("aa_api_key") ?? "");
  const [agentId, setAgentId] = useState("");
  const [message, setMessage] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/chat"],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({ agentId, content: message }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    },
  });

  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) localStorage.setItem("aa_api_key", apiKey);
  }, [apiKey]);

  // Reversed for display (newest at bottom)
  const displayMessages = [...(messages ?? [])].reverse();

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 pb-3 flex-shrink-0">
        <MessageSquare className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">Arena Chat</h1>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {messages?.length ?? 0} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-6 space-y-2">
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
            <div
              key={msg.id}
              className={`flex gap-3 p-3 rounded-lg bg-card/30 border-l-2 ${messageTypeBorder(msg.messageType)}`}
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
                  <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                    {formatRelativeTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground/90">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

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
                onChange={(e) => setMessage(e.target.value)}
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
            {sendMutation.error && (
              <p className="text-xs text-red-400">{(sendMutation.error as Error).message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
