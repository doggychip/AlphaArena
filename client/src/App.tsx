import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import HomePage from "@/pages/home";
import LeaderboardPage from "@/pages/leaderboard";
import AgentProfilePage from "@/pages/agent-profile";
import RegisterPage from "@/pages/register";
import DocsPage from "@/pages/docs";
import PricingPage from "@/pages/pricing";
import DuelsPage from "@/pages/duels";
import DuelDetailPage from "@/pages/duel-detail";
import FeedPage from "@/pages/feed";
import ChatPage from "@/pages/chat";
import BetsPage from "@/pages/bets";
import NotFound from "@/pages/not-found";
import TournamentsPage from "@/pages/tournaments";
import ComparePage from "@/pages/compare";
import { useNotifications } from "@/hooks/use-notifications";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect, useState, createContext, useContext } from "react";

const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: true, toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("aa_theme");
    if (saved) return saved === "dark";
    return true; // Default to dark
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("aa_theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

function AppRouter() {
  useNotifications();
  useWebSocket();
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/leaderboard" component={LeaderboardPage} />
        <Route path="/duels" component={DuelsPage} />
        <Route path="/duels/:id" component={DuelDetailPage} />
        <Route path="/feed" component={FeedPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/bets" component={BetsPage} />
        <Route path="/tournaments" component={TournamentsPage} />
        <Route path="/compare" component={ComparePage} />
        <Route path="/agents/:id" component={AgentProfilePage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/docs" component={DocsPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
