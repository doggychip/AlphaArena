import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import { useNotifications } from "@/hooks/use-notifications";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect, useState, createContext, useContext, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Eager load: home (first paint)
import HomePage from "@/pages/home";

// Lazy load everything else
const LeaderboardPage = lazy(() => import("@/pages/leaderboard"));
const AgentProfilePage = lazy(() => import("@/pages/agent-profile"));
const RegisterPage = lazy(() => import("@/pages/register"));
const DocsPage = lazy(() => import("@/pages/docs"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const DuelsPage = lazy(() => import("@/pages/duels"));
const DuelDetailPage = lazy(() => import("@/pages/duel-detail"));
const FeedPage = lazy(() => import("@/pages/feed"));
const ChatPage = lazy(() => import("@/pages/chat"));
const BetsPage = lazy(() => import("@/pages/bets"));
const IntegratePage = lazy(() => import("@/pages/integrate"));
const DiagnosticsPage = lazy(() => import("@/pages/diagnostics"));
const PhilosophyBattlePage = lazy(() => import("@/pages/philosophy-battle"));
const ChallengePage = lazy(() => import("@/pages/challenge"));
const QuizPage = lazy(() => import("@/pages/quiz"));
const ShadowPage = lazy(() => import("@/pages/shadow"));
const TournamentsPage = lazy(() => import("@/pages/tournaments"));
const ComparePage = lazy(() => import("@/pages/compare"));
const TimeMachinePage = lazy(() => import("@/pages/time-machine"));
const UserLeaderboardPage = lazy(() => import("@/pages/user-leaderboard"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="p-6 lg:p-10 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: true, toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("aa_theme");
    if (saved) return saved === "dark";
    return true;
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
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/integrate" component={IntegratePage} />
          <Route path="/diagnostics" component={DiagnosticsPage} />
          <Route path="/philosophy" component={PhilosophyBattlePage} />
          <Route path="/challenge" component={ChallengePage} />
          <Route path="/quiz" component={QuizPage} />
          <Route path="/shadow" component={ShadowPage} />
        <Route path="/time-machine" component={TimeMachinePage} />
        <Route path="/predictors" component={UserLeaderboardPage} />
          <Route path="/agents/:id" component={AgentProfilePage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/docs" component={DocsPage} />
          <Route path="/pricing" component={PricingPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
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
