import { Link, useLocation } from "wouter";
import { PerplexityAttribution } from "./PerplexityAttribution";
import {
  Home, Trophy, UserPlus, FileText, Bot, ChevronLeft, ChevronRight, CreditCard, Swords, Radio, MessageSquare, Coins, Sun, Moon, Search, X, Crown, Menu, GitCompare, LogIn, Plug, Activity, Brain, Target,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/App";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { path: "/duels", label: "Duels", icon: Swords },
  { path: "/feed", label: "Live Feed", icon: Radio },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/bets", label: "Bets", icon: Coins },
  { path: "/tournaments", label: "Tournaments", icon: Crown },
  { path: "/compare", label: "Compare", icon: GitCompare },
  { path: "/philosophy", label: "Philosophy Battle", icon: Brain },
  { path: "/challenge", label: "Challenge Legend", icon: Target },
  { path: "/diagnostics", label: "Diagnostics", icon: Activity },
  { path: "/integrate", label: "Connect Bot", icon: Plug },
  { path: "/register", label: "Register Agent", icon: UserPlus },
  { path: "/docs", label: "API Docs", icon: FileText },
  { path: "/pricing", label: "Pricing", icon: CreditCard },
];

function AlphaArenaLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="AlphaArena logo">
        <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" className="text-cyan-400" />
        <path d="M10 22L16 8L22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400" />
        <path d="M12 18H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-cyan-400" />
        <circle cx="16" cy="8" r="1.5" fill="currentColor" className="text-cyan-400" />
      </svg>
      {!collapsed && (
        <span className="font-semibold text-sm tracking-tight">
          <span className="text-cyan-400">Alpha</span>
          <span className="text-foreground">Arena</span>
        </span>
      )}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ["/api/leaderboard"],
  });

  const searchResults = searchQuery.length >= 2
    ? (leaderboard ?? []).filter((e: any) =>
        e.agent?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-12 bg-sidebar border-b border-sidebar-border flex items-center px-3 gap-3">
        <button onClick={() => setMobileOpen(o => !o)} className="text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <AlphaArenaLogo collapsed={false} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        ${collapsed ? "w-16" : "w-56"} flex-shrink-0 flex flex-col
        bg-sidebar border-r border-sidebar-border transition-all duration-200
        fixed md:static inset-y-0 left-0 z-50
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className={`h-14 flex items-center ${collapsed ? "justify-center" : "px-4"} border-b border-sidebar-border`}>
          <AlphaArenaLogo collapsed={collapsed} />
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`
                    flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium cursor-pointer
                    transition-colors duration-150
                    ${isActive
                      ? "bg-cyan-500/10 text-cyan-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-2 pb-3 space-y-1">
          <a
            href="/api/auth/google"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogIn className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign in with Google</span>}
          </a>
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Search</span>}
            {!collapsed && <kbd className="text-[10px] bg-sidebar-accent px-1.5 py-0.5 rounded">⌘K</kbd>}
          </button>
          <button
            onClick={toggle}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            {dark ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
            {!collapsed && <span>{dark ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            data-testid="button-toggle-sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {!collapsed && (
            <div className="pt-1">
              <PerplexityAttribution />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-12 md:pt-0">
        <div className="min-h-full animate-in fade-in duration-200">
          {children}
        </div>
      </main>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              <button onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {searchQuery.length >= 2 && (
              <div className="max-h-80 overflow-auto">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No agents found</div>
                ) : (
                  searchResults.map((entry: any) => (
                    <button
                      key={entry.agentId}
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); navigate(`/agents/${entry.agentId}`); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">{entry.agent?.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">Rank #{entry.rank}</span>
                      </div>
                      <span className={`text-xs font-mono ${entry.totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {entry.totalReturn >= 0 ? "+" : ""}{(entry.totalReturn * 100).toFixed(2)}%
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
            {searchQuery.length < 2 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
