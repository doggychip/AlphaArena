import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerSchema, insertTradeSchema, updateStrategySchema } from "@shared/schema";
import { randomUUID } from "crypto";
import type { Position } from "@shared/schema";
import { getCurrentPrices, startPriceEngine, getPriceForPair } from "./prices";

// Start the price engine
startPriceEngine();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === AUTH ===
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(409).json({ error: "Username already taken" });
      }
      const result = await storage.register(parsed.data);
      res.json({
        user: { id: result.user.id, username: result.user.username, email: result.user.email },
        agent: result.agent,
        portfolio: result.portfolio,
        apiKey: result.apiKey,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === PRICES ===
  app.get("/api/prices", (_req, res) => {
    const { prices, isLive } = getCurrentPrices();
    res.json({ prices, isLive });
  });

  // === TRADING ===
  app.post("/api/trades", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });

      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const parsed = insertTradeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { agentId, pair, side, quantity } = parsed.data;
      const agent = await storage.getAgent(agentId);
      if (!agent || agent.userId !== user.id) {
        return res.status(403).json({ error: "Agent not found or not owned by you" });
      }

      const currentPrice = getPriceForPair(pair);
      if (!currentPrice) {
        const { prices } = getCurrentPrices();
        const validPairs = prices.map(p => p.pair).join(", ");
        return res.status(400).json({ error: `Invalid pair: ${pair}. Allowed: ${validPairs}` });
      }

      const comp = await storage.getActiveCompetition();
      if (!comp) return res.status(400).json({ error: "No active competition" });

      const portfolio = await storage.getPortfolioByAgent(agentId, comp.id);
      if (!portfolio) return res.status(400).json({ error: "No portfolio found" });

      // Simulate slippage and fee
      const slippage = side === "buy" ? 1.001 : 0.999;
      const executionPrice = Math.round(currentPrice * slippage * 100) / 100;
      const totalValue = executionPrice * quantity;
      const fee = Math.round(totalValue * 0.001 * 100) / 100;

      if (side === "buy" && portfolio.cashBalance < totalValue + fee) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Create trade
      const trade = await storage.createTrade({
        id: randomUUID(),
        portfolioId: portfolio.id,
        pair,
        side,
        quantity,
        price: executionPrice,
        totalValue: Math.round(totalValue * 100) / 100,
        fee,
        executedAt: new Date(),
      });

      // Update position
      const existingPos = await storage.getPosition(portfolio.id, pair);
      if (side === "buy") {
        if (existingPos && existingPos.side === "long") {
          const newQty = existingPos.quantity + quantity;
          const newAvg = (existingPos.avgEntryPrice * existingPos.quantity + executionPrice * quantity) / newQty;
          await storage.upsertPosition({
            ...existingPos,
            quantity: newQty,
            avgEntryPrice: Math.round(newAvg * 100) / 100,
            currentPrice: executionPrice,
            unrealizedPnl: Math.round((executionPrice - newAvg) * newQty * 100) / 100,
          });
        } else {
          await storage.upsertPosition({
            id: existingPos?.id || randomUUID(),
            portfolioId: portfolio.id,
            pair,
            side: "long",
            quantity,
            avgEntryPrice: executionPrice,
            currentPrice: executionPrice,
            unrealizedPnl: 0,
            createdAt: new Date(),
          });
        }
        await storage.updatePortfolio(portfolio.id, {
          cashBalance: Math.round((portfolio.cashBalance - totalValue - fee) * 100) / 100,
        });
      } else {
        // Sell
        if (existingPos && existingPos.side === "long") {
          const newQty = existingPos.quantity - quantity;
          if (newQty <= 0.0001) {
            await storage.deletePosition(existingPos.id);
          } else {
            await storage.upsertPosition({
              ...existingPos,
              quantity: Math.round(newQty * 10000) / 10000,
              currentPrice: executionPrice,
              unrealizedPnl: Math.round((executionPrice - existingPos.avgEntryPrice) * newQty * 100) / 100,
            });
          }
          const pnl = (executionPrice - existingPos.avgEntryPrice) * Math.min(quantity, existingPos.quantity);
          await storage.updatePortfolio(portfolio.id, {
            cashBalance: Math.round((portfolio.cashBalance + totalValue - fee) * 100) / 100,
          });
        } else {
          // Short
          await storage.upsertPosition({
            id: existingPos?.id || randomUUID(),
            portfolioId: portfolio.id,
            pair,
            side: "short",
            quantity,
            avgEntryPrice: executionPrice,
            currentPrice: executionPrice,
            unrealizedPnl: 0,
            createdAt: new Date(),
          });
          await storage.updatePortfolio(portfolio.id, {
            cashBalance: Math.round((portfolio.cashBalance + totalValue - fee) * 100) / 100,
          });
        }
      }

      // Update total equity
      const updatedPortfolio = await storage.getPortfolio(portfolio.id);
      const positions = await storage.getPositionsByPortfolio(portfolio.id);
      const positionValue = positions.reduce((sum, p) => {
        return sum + p.currentPrice * p.quantity;
      }, 0);
      await storage.updatePortfolio(portfolio.id, {
        totalEquity: Math.round((updatedPortfolio!.cashBalance + positionValue) * 100) / 100,
      });

      res.json({ trade, message: "Trade executed successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === PORTFOLIO ===
  app.get("/api/portfolio/:agentId", async (req, res) => {
    try {
      const comp = await storage.getActiveCompetition();
      if (!comp) return res.status(404).json({ error: "No active competition" });

      const portfolio = await storage.getPortfolioByAgent(req.params.agentId, comp.id);
      if (!portfolio) return res.status(404).json({ error: "Portfolio not found" });

      const positions = await storage.getPositionsByPortfolio(portfolio.id);
      res.json({ ...portfolio, positions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === LEADERBOARD ===
  app.get("/api/leaderboard", async (_req, res) => {
    try {
      const comp = await storage.getActiveCompetition();
      if (!comp) return res.status(404).json({ error: "No active competition" });
      const entries = await storage.getLeaderboard(comp.id);
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/leaderboard/:competitionId", async (req, res) => {
    try {
      const entries = await storage.getLeaderboard(req.params.competitionId);
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === AGENTS ===
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      const comp = await storage.getActiveCompetition();
      if (!comp) return res.json({ agent });

      const portfolio = await storage.getPortfolioByAgent(agent.id, comp.id);
      const positions = portfolio ? await storage.getPositionsByPortfolio(portfolio.id) : [];
      const leaderboardEntry = await storage.getLeaderboardEntry(comp.id, agent.id);
      const user = await storage.getUser(agent.userId);

      res.json({
        agent,
        portfolio,
        positions,
        leaderboardEntry,
        owner: user ? user.username : "unknown",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/trades", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      const comp = await storage.getActiveCompetition();
      if (!comp) return res.json([]);

      const portfolio = await storage.getPortfolioByAgent(agent.id, comp.id);
      if (!portfolio) return res.json([]);

      const limit = parseInt(req.query.limit as string) || 20;
      const trades = await storage.getTradesByPortfolio(portfolio.id, limit);
      res.json(trades);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/snapshots", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      const comp = await storage.getActiveCompetition();
      if (!comp) return res.json([]);

      const portfolio = await storage.getPortfolioByAgent(agent.id, comp.id);
      if (!portfolio) return res.json([]);

      const snapshots = await storage.getSnapshotsByPortfolio(portfolio.id);
      res.json(snapshots);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === AGENT STRATEGY ===
  app.put("/api/agents/:id/strategy", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });

      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      if (agent.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to update this agent" });
      }

      const parsed = updateStrategySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const updated = await storage.updateAgentStrategy(agent.id, {
        strategyCode: parsed.data.strategyCode,
        strategyLanguage: parsed.data.strategyLanguage,
        strategyInterval: parsed.data.strategyInterval,
        lastExecuted: new Date(),
        executionCount: (agent.executionCount ?? 0) + 1,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === COMPETITION ===
  app.get("/api/competition/active", async (_req, res) => {
    try {
      const comp = await storage.getActiveCompetition();
      if (!comp) return res.status(404).json({ error: "No active competition" });

      const allAgents = await storage.getAllAgents();
      const totalTrades = Array.from((storage as any).trades?.values?.() || []).length;
      res.json({
        competition: comp,
        stats: {
          totalAgents: allAgents.length,
          totalTrades,
          totalVolume: 14238450, // Simulated
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
