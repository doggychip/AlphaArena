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
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark] = useState(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches || true; // Default to dark
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return <>{children}</>;
}

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/leaderboard" component={LeaderboardPage} />
        <Route path="/agents/:id" component={AgentProfilePage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/docs" component={DocsPage} />
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
