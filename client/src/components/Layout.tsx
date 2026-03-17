import { Link, useLocation } from "wouter";
import { PerplexityAttribution } from "./PerplexityAttribution";
import {
  Home, Trophy, UserPlus, FileText, Bot, ChevronLeft, ChevronRight, CreditCard,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
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
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`
        ${collapsed ? "w-16" : "w-56"} flex-shrink-0 flex flex-col
        bg-sidebar border-r border-sidebar-border transition-all duration-200
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
      <main className="flex-1 overflow-auto">
        <div className="min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
