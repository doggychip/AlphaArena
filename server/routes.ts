import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerSchema, insertTradeSchema, updateStrategySchema, insertDuelSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import type { Position } from "@shared/schema";
import { getCurrentPrices, startPriceEngine, getPriceForPair } from "./prices";
import { broadcast, getOnlineAgents } from "./websocket";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Start the price engine and wait for initial prices before serving routes
  await startPriceEngine();

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

  // === ACHIEVEMENTS ===
  app.get("/api/achievements/levels", async (_req, res) => {
    try {
      const { computeTotalXP, getLevel } = await import("./achievements");
      const allAgents = await storage.getAllAgents();
      const levels: Record<string, number> = {};
      for (const agent of allAgents) {
        const achievements = await storage.getAgentAchievements(agent.id);
        const xp = computeTotalXP(achievements.map(a => a.achievementId));
        levels[agent.id] = getLevel(xp);
      }
      res.json(levels);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agents/:id/achievements", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      const { ACHIEVEMENTS, computeTotalXP, getLevel, getXPProgress } = await import("./achievements");
      const unlocked = await storage.getAgentAchievements(agent.id);
      const unlockedIds = new Set(unlocked.map(a => a.achievementId));
      const totalXP = computeTotalXP(unlocked.map(a => a.achievementId));
      const level = getLevel(totalXP);
      const progress = getXPProgress(totalXP);

      const achievements = ACHIEVEMENTS.map(def => ({
        ...def,
        unlocked: unlockedIds.has(def.id),
        unlockedAt: unlocked.find(a => a.achievementId === def.id)?.unlockedAt ?? null,
      }));

      res.json({ achievements, totalXP, level, progress });
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
      const totalTrades = await storage.getTradeCount();
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

  // === DUELS ===
  app.get("/api/duels", async (req, res) => {
    try {
      const { status, agentId } = req.query;
      let allDuels = agentId
        ? await storage.getDuelsByAgent(agentId as string)
        : await storage.getAllDuels();
      if (status) {
        allDuels = allDuels.filter(d => d.status === status);
      }
      // Enrich with agent names
      const enriched = await Promise.all(allDuels.map(async (d) => {
        const challenger = await storage.getAgent(d.challengerAgentId);
        const opponent = await storage.getAgent(d.opponentAgentId);
        return { ...d, challengerName: challenger?.name, opponentName: opponent?.name, challengerType: challenger?.type, opponentType: opponent?.type };
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/duels/:id", async (req, res) => {
    try {
      const duel = await storage.getDuel(req.params.id);
      if (!duel) return res.status(404).json({ error: "Duel not found" });

      const challenger = await storage.getAgent(duel.challengerAgentId);
      const opponent = await storage.getAgent(duel.opponentAgentId);
      const comp = await storage.getCompetition(duel.competitionId);

      // Get snapshots for equity curve overlay if duel has started
      let challengerSnapshots: any[] = [];
      let opponentSnapshots: any[] = [];
      if (duel.startedAt && comp) {
        const cPortfolio = await storage.getPortfolioByAgent(duel.challengerAgentId, comp.id);
        const oPortfolio = await storage.getPortfolioByAgent(duel.opponentAgentId, comp.id);
        if (cPortfolio) challengerSnapshots = await storage.getSnapshotsByPortfolio(cPortfolio.id);
        if (oPortfolio) opponentSnapshots = await storage.getSnapshotsByPortfolio(oPortfolio.id);
      }

      res.json({
        duel,
        challenger: { agent: challenger, snapshots: challengerSnapshots },
        opponent: { agent: opponent, snapshots: opponentSnapshots },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/duels/challenge", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });

      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const parsed = insertDuelSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

      const { agentId, opponentAgentId, durationMinutes, wager } = parsed.data;

      const challengerAgent = await storage.getAgent(agentId);
      if (!challengerAgent || challengerAgent.userId !== user.id) {
        return res.status(403).json({ error: "Agent not found or not owned by you" });
      }

      if (agentId === opponentAgentId) {
        return res.status(400).json({ error: "Cannot duel yourself" });
      }

      const opponentAgent = await storage.getAgent(opponentAgentId);
      if (!opponentAgent || opponentAgent.status !== "active") {
        return res.status(400).json({ error: "Opponent agent not found or inactive" });
      }

      const comp = await storage.getActiveCompetition();
      if (!comp) return res.status(400).json({ error: "No active competition" });

      const duel = await storage.createDuel({
        id: randomUUID(),
        challengerAgentId: agentId,
        opponentAgentId,
        competitionId: comp.id,
        wager: wager ?? 0,
        durationMinutes,
        status: "pending",
        challengerStartEquity: null,
        opponentStartEquity: null,
        challengerEndEquity: null,
        opponentEndEquity: null,
        challengerReturn: null,
        opponentReturn: null,
        winnerAgentId: null,
        startedAt: null,
        endsAt: null,
        createdAt: new Date(),
        resolvedAt: null,
      });

      res.status(201).json(duel);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/duels/:id/accept", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });

      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const duel = await storage.getDuel(req.params.id);
      if (!duel) return res.status(404).json({ error: "Duel not found" });
      if (duel.status !== "pending") return res.status(400).json({ error: "Duel is not pending" });

      const opponentAgent = await storage.getAgent(duel.opponentAgentId);
      if (!opponentAgent || opponentAgent.userId !== user.id) {
        return res.status(403).json({ error: "Only the opponent can accept" });
      }

      const comp = await storage.getCompetition(duel.competitionId);
      if (!comp) return res.status(400).json({ error: "Competition not found" });

      const challengerPortfolio = await storage.getPortfolioByAgent(duel.challengerAgentId, comp.id);
      const opponentPortfolio = await storage.getPortfolioByAgent(duel.opponentAgentId, comp.id);

      const now = new Date();
      const endsAt = new Date(now.getTime() + duel.durationMinutes * 60 * 1000);

      const updated = await storage.updateDuel(duel.id, {
        status: "active",
        challengerStartEquity: challengerPortfolio?.totalEquity ?? 100000,
        opponentStartEquity: opponentPortfolio?.totalEquity ?? 100000,
        startedAt: now,
        endsAt,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/duels/:id/decline", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });

      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const duel = await storage.getDuel(req.params.id);
      if (!duel) return res.status(404).json({ error: "Duel not found" });
      if (duel.status !== "pending") return res.status(400).json({ error: "Duel is not pending" });

      const opponentAgent = await storage.getAgent(duel.opponentAgentId);
      if (!opponentAgent || opponentAgent.userId !== user.id) {
        return res.status(403).json({ error: "Only the opponent can decline" });
      }

      const updated = await storage.updateDuel(duel.id, { status: "declined" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === CHAT ===
  app.get("/api/chat", async (_req, res) => {
    try {
      const comp = await storage.getActiveCompetition();
      if (!comp) return res.json([]);
      const limit = Math.min(parseInt(_req.query.limit as string) || 50, 100);
      const messages = await storage.getRecentMessages(comp.id, limit);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });

      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const { agentId, content } = req.body;
      if (!agentId || !content || typeof content !== "string" || content.length > 280) {
        return res.status(400).json({ error: "agentId and content (max 280 chars) required" });
      }

      const agent = await storage.getAgent(agentId);
      if (!agent || agent.userId !== user.id) {
        return res.status(403).json({ error: "Agent not found or not owned by you" });
      }

      const comp = await storage.getActiveCompetition();
      if (!comp) return res.status(400).json({ error: "No active competition" });

      const msg = await storage.createMessage({
        id: randomUUID(),
        agentId,
        competitionId: comp.id,
        content: content.trim(),
        messageType: "user",
        createdAt: new Date(),
      });

      // Broadcast chat message via WebSocket for real-time delivery
      broadcast("chat", { ...msg, agentName: agent.name, agentType: agent.type });

      res.status(201).json(msg);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Chat online presence
  app.get("/api/chat/online", async (_req, res) => {
    res.json(getOnlineAgents());
  });

  // Chat message reactions
  app.post("/api/chat/:messageId/react", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const { emoji, agentId } = req.body;
      if (!emoji || !agentId) return res.status(400).json({ error: "emoji and agentId required" });

      const CHAT_EMOJIS = ["fire", "rocket", "skull", "eyes", "laugh", "heart", "clown", "100"];
      if (!CHAT_EMOJIS.includes(emoji)) return res.status(400).json({ error: "Invalid emoji" });

      const agent = await storage.getAgent(agentId);
      if (!agent || agent.userId !== user.id) return res.status(403).json({ error: "Not your agent" });

      const reaction = await storage.createChatReaction({
        id: randomUUID(),
        messageId: req.params.messageId,
        emoji,
        agentId,
        createdAt: new Date(),
      });

      broadcast("chat_reaction", { messageId: req.params.messageId, emoji, agentId, agentName: agent.name });
      res.status(201).json(reaction);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chat/:messageId/reactions", async (req, res) => {
    try {
      const reactions = await storage.getChatReactions(req.params.messageId);
      res.json(reactions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === AGENT TWEETS (formatted for Twitter bots) ===
  app.get("/api/agents/:id/tweet", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      const comp = await storage.getActiveCompetition();
      if (!comp) return res.json({ tweet: null });
      const portfolio = await storage.getPortfolioByAgent(agent.id, comp.id);
      const trades = await storage.getTradesByPortfolio(portfolio?.id ?? "", 1);
      const leaderboard = await storage.getLeaderboard(comp.id);
      const entry = leaderboard.find((e: any) => e.agentId === agent.id);

      if (!trades.length) return res.json({ tweet: null });

      const t = trades[0];
      const rank = entry?.rank ?? "?";
      const ret = ((entry?.totalReturn ?? 0) * 100).toFixed(1);
      const emoji = t.side === "buy" ? "🟢" : "🔴";
      const reason = (t as any).reason ?? "";

      const tweet = [
        `${emoji} ${agent.name} ${t.side.toUpperCase()} ${t.pair}`,
        reason ? `\n"${reason.slice(0, 120)}"` : "",
        `\n📊 Return: ${Number(ret) >= 0 ? "+" : ""}${ret}% | Rank: #${rank}`,
        `\n🏟 alphaarena.zeabur.app/#/agents/${agent.id}`,
        `\n#AlphaArena #AITrading #${t.pair.replace("/USD", "")}`,
      ].filter(Boolean).join("");

      res.json({
        tweet,
        agentName: agent.name,
        pair: t.pair,
        side: t.side,
        reason,
        rank,
        totalReturn: entry?.totalReturn ?? 0,
        url: `https://alphaarena.zeabur.app/#/agents/${agent.id}`,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Latest tweets for all agents (for a Twitter bot that posts for multiple agents)
  app.get("/api/tweets/latest", async (_req, res) => {
    try {
      const comp = await storage.getActiveCompetition();
      if (!comp) return res.json({ tweets: [] });
      const leaderboard = await storage.getLeaderboard(comp.id);
      const tweets = [];
      for (const entry of leaderboard.slice(0, 10)) {
        const portfolio = await storage.getPortfolioByAgent(entry.agentId, comp.id);
        if (!portfolio) continue;
        const trades = await storage.getTradesByPortfolio(portfolio.id, 1);
        if (!trades.length) continue;
        const t = trades[0];
        const emoji = t.side === "buy" ? "🟢" : "🔴";
        const ret = ((entry.totalReturn ?? 0) * 100).toFixed(1);
        tweets.push({
          agentId: entry.agentId,
          agentName: entry.agent?.name,
          tweet: `${emoji} ${entry.agent?.name} ${t.side.toUpperCase()} ${t.pair} | ${Number(ret) >= 0 ? "+" : ""}${ret}% | #AlphaArena`,
          pair: t.pair,
          side: t.side,
          reason: (t as any).reason,
          executedAt: t.executedAt,
        });
      }
      res.json({ tweets });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === EMAIL DIGEST ===
  app.get("/api/digest", async (_req, res) => {
    try {
      const comp = await storage.getActiveCompetition();
      if (!comp) return res.json({ digest: null });
      const leaderboard = await storage.getLeaderboard(comp.id);
      const trades = await storage.getRecentTrades(50);
      const diagnostics = await storage.getDiagnosticsSummary();

      const top3 = leaderboard.slice(0, 3);
      const totalBuys = trades.filter(t => t.side === "buy").length;
      const totalSells = trades.filter(t => t.side === "sell").length;
      const sentiment = totalBuys > totalSells ? "Bullish" : totalBuys < totalSells ? "Bearish" : "Mixed";

      // Most traded pair
      const pairCounts: Record<string, number> = {};
      for (const t of trades) pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1;
      const hotPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0];

      const topFailure = diagnostics.sort((a, b) => b.count - a.count)[0];

      const digest = {
        date: new Date().toISOString().split("T")[0],
        leader: { name: top3[0]?.agent?.name, return: top3[0]?.totalReturn },
        top3: top3.map(e => ({ name: e.agent?.name, return: e.totalReturn, sharpe: e.sharpeRatio })),
        sentiment,
        buys: totalBuys,
        sells: totalSells,
        totalTrades: trades.length,
        hotPair: hotPair ? { pair: hotPair[0], trades: hotPair[1] } : null,
        topFailure: topFailure ? { category: topFailure.category, count: topFailure.count } : null,
        subject: `AlphaArena Daily: ${top3[0]?.agent?.name} leads with ${((top3[0]?.totalReturn ?? 0) * 100).toFixed(1)}% | Market ${sentiment}`,
        previewText: `${totalBuys} buys, ${totalSells} sells. ${hotPair?.[0] ?? "BTC/USD"} is the hottest pair. ${top3[0]?.agent?.name} leads.`,
      };
      res.json({ digest });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/digest/subscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email required" });
      // Store email for future SendGrid/Resend integration
      // For now, just acknowledge
      res.json({ success: true, message: "Subscribed! You'll receive daily digests once email service is configured." });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === USER LEADERBOARD ===
  app.get("/api/user-leaderboard", async (_req, res) => {
    try {
      const resolved = await storage.getResolvedChallenges("");
      // Aggregate by sessionId across all challenges
      const stats: Record<string, { wins: number; losses: number; total: number; streak: number; bestStreak: number }> = {};
      // Get ALL resolved challenges (not just one session)
      const allResolved = (await (storage as any).getAllResolvedChallenges?.()) ?? resolved;
      for (const ch of allResolved) {
        if (!stats[ch.sessionId]) stats[ch.sessionId] = { wins: 0, losses: 0, total: 0, streak: 0, bestStreak: 0 };
        const s = stats[ch.sessionId];
        s.total++;
        if (ch.userWon) {
          s.wins++;
          s.streak++;
          if (s.streak > s.bestStreak) s.bestStreak = s.streak;
        } else {
          s.losses++;
          s.streak = 0;
        }
      }
      const leaderboard = Object.entries(stats)
        .filter(([, s]) => s.total >= 1)
        .map(([sessionId, s]) => ({
          sessionId,
          displayName: `Predictor ${sessionId.slice(-6).toUpperCase()}`,
          wins: s.wins,
          losses: s.losses,
          totalChallenges: s.total,
          winRate: Math.round((s.wins / s.total) * 100),
          bestStreak: s.bestStreak,
        }))
        .sort((a, b) => b.winRate - a.winRate || b.totalChallenges - a.totalChallenges)
        .slice(0, 50);
      res.json(leaderboard);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === SHARE CARDS ===
  app.get("/api/share/challenge/:id", async (req, res) => {
    try {
      const challenges = await storage.getResolvedChallenges("");
      // Search all resolved challenges for this ID
      const ch = challenges.find((c: any) => c.id === req.params.id);
      if (!ch) return res.status(404).json({ error: "Challenge not found" });
      const won = ch.userWon;
      const emoji = won ? "🏆" : "📉";
      const text = won
        ? `${emoji} I beat ${ch.agentName} on ${ch.pair}! My prediction was right — ${((ch.pnlPct ?? 0) * 100).toFixed(1)}% in 24h. Can you do better?`
        : `${emoji} ${ch.agentName} beat me on ${ch.pair}. The legend's strategy won this round. Challenge them yourself!`;
      const url = `https://alphaarena.zeabur.app/#/challenge`;
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + "\n\n" + url)}`;
      res.json({ text, shareUrl, url });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/share/profile", async (req, res) => {
    try {
      const profile = req.query.type as string;
      const profiles: Record<string, string> = {
        value: "Value Investor (like Warren Buffett)",
        momentum: "Momentum Trader (like Stanley Druckenmiller)",
        contrarian: "Contrarian (like George Soros)",
        quant: "Quantitative Analyst (like Jim Simons)",
        activist: "Activist Investor (like Bill Ackman)",
      };
      const name = profiles[profile] ?? "Investor";
      const text = `🧠 I took the AlphaArena Investor Profile Quiz and I'm a ${name}! What's your trading personality?`;
      const url = `https://alphaarena.zeabur.app/#/quiz`;
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + "\n\n" + url)}`;
      res.json({ text, shareUrl, url });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === CHALLENGES (Challenge a Legend) ===
  app.post("/api/challenges", async (req, res) => {
    try {
      const { agentId, pair, side } = req.body;
      if (!agentId || !pair || !side) return res.status(400).json({ error: "agentId, pair, side required" });
      const agent = await storage.getAgent(agentId);
      if (!agent) return res.status(404).json({ error: "Agent not found" });
      const { getPriceForPair } = await import("./prices");
      const entryPrice = getPriceForPair(pair);
      if (!entryPrice) return res.status(400).json({ error: `No price for ${pair}` });
      const sessionId = req.headers["x-session-id"] as string || `anon-${Date.now()}`;
      const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const challenge = {
        id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId, agentId, agentName: agent.name, pair, side, entryPrice,
        currentPrice: entryPrice, exitPrice: null, pnlPct: 0, userWon: null,
        status: "active" as const, lesson: null, endsAt, createdAt: new Date(), resolvedAt: null,
      };
      await storage.createChallenge(challenge);
      res.json(challenge);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/challenges/active", async (req, res) => {
    try {
      const sessionId = req.headers["x-session-id"] as string || "";
      const all = await storage.getActiveChallenges(sessionId);
      res.json(all);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/challenges/history", async (req, res) => {
    try {
      const sessionId = req.headers["x-session-id"] as string || "";
      const all = await storage.getResolvedChallenges(sessionId);
      res.json(all);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === REASONING TRACES ===
  app.get("/api/agents/:id/reasoning", async (req, res) => {
    try {
      const comp = await storage.getActiveCompetition();
      if (!comp) return res.json({ trades: [] });
      const portfolio = await storage.getPortfolioByAgent(req.params.id, comp.id);
      if (!portfolio) return res.json({ trades: [] });
      const trades = await storage.getTradesByPortfolio(portfolio.id, 20);
      const withReasoning = trades.map((t: any) => ({
        ...t,
        reasoning: t.reasoning ? JSON.parse(t.reasoning) : [],
        philosophy: t.philosophy ?? null,
        confidence: t.confidence ?? null,
      }));
      res.json({ trades: withReasoning });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === DIAGNOSTICS ===
  app.get("/api/agents/:id/diagnostics", async (req, res) => {
    try {
      const diagnostics = await storage.getDiagnosticsByAgent(req.params.id, 50);
      res.json(diagnostics);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/diagnostics/summary", async (_req, res) => {
    try {
      const summary = await storage.getDiagnosticsSummary();
      const total = summary.reduce((s, r) => s + r.count, 0);
      res.json({ summary, total });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === LEADERBOARD HISTORY ===
  app.get("/api/leaderboard/history", async (_req, res) => {
    try {
      const comp = await storage.getActiveCompetition();
      if (!comp) return res.json([]);
      const history = await storage.getLeaderboardHistory(comp.id);
      res.json(history);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === REFERRALS ===
  app.get("/api/referral/code", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });
      res.json({ code: (user as any).referralCode || user.id.slice(0, 8), userId: user.id });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/referral/stats", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });
      const refs = await storage.getReferralsByUser(user.id);
      res.json({ referrals: refs.length, totalCredits: refs.reduce((s, r) => s + r.credits, 0) });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === CUSTOM COMPETITIONS ===
  app.post("/api/competitions", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });
      const { name, description, startDate, endDate, startingCapital, allowedPairs } = req.body;
      if (!name || !startDate || !endDate) return res.status(400).json({ error: "name, startDate, endDate required" });
      const comp = await storage.createCompetition({
        id: randomUUID(), name, description: description || null,
        status: "upcoming", startDate: new Date(startDate), endDate: new Date(endDate),
        startingCapital: startingCapital || 100000,
        allowedPairs: allowedPairs || ["BTC/USD", "ETH/USD", "SOL/USD"],
        createdBy: user.id, isPrivate: 1, createdAt: new Date(),
      });
      res.status(201).json(comp);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/competitions/my", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });
      const comps = await storage.getCompetitionsByUser(user.id);
      res.json(comps);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === TOURNAMENTS ===
  app.get("/api/tournaments", async (_req, res) => {
    try {
      const all = await storage.getTournaments();
      res.json(all);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const t = await storage.getTournament(req.params.id);
      if (!t) return res.status(404).json({ error: "Tournament not found" });
      const entries = await storage.getTournamentEntries(t.id);
      res.json({ tournament: t, entries, rules: JSON.parse(t.rules || "{}") });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/tournaments/:id/join", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });
      const { agentId } = req.body;
      const agent = await storage.getAgent(agentId);
      if (!agent || agent.userId !== user.id) return res.status(403).json({ error: "Agent not found or not owned by you" });
      const t = await storage.getTournament(req.params.id);
      if (!t) return res.status(404).json({ error: "Tournament not found" });
      if (t.status !== "upcoming" && t.status !== "active") return res.status(400).json({ error: "Tournament not accepting entries" });
      const entries = await storage.getTournamentEntries(t.id);
      if (entries.length >= t.maxAgents) return res.status(400).json({ error: "Tournament is full" });
      if (entries.some(e => e.agentId === agentId)) return res.status(400).json({ error: "Agent already entered" });
      const entry = await storage.createTournamentEntry({ id: randomUUID(), tournamentId: t.id, agentId, weeklyReturn: 0, eliminated: 0, round: 1, createdAt: new Date() });
      res.status(201).json(entry);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === MARKET EVENTS ===
  app.get("/api/events", async (_req, res) => {
    try {
      const active = await storage.getActiveEvents();
      const recent = await storage.getRecentEvents(10);
      res.json({ active, recent });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // === BETS ===
  function getCurrentWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split("T")[0];
  }

  app.get("/api/bets/pool", async (_req, res) => {
    try {
      const weekStart = (_req.query.week as string) || getCurrentWeekStart();
      const allBets = await storage.getBetsByWeek(weekStart);
      const totalPool = allBets.reduce((s, b) => s + b.amount, 0);

      // Group by agent
      const agentPools: Record<string, { agentId: string; total: number; count: number; agentName?: string; agentType?: string }> = {};
      for (const bet of allBets) {
        if (!agentPools[bet.agentId]) {
          const agent = await storage.getAgent(bet.agentId);
          agentPools[bet.agentId] = { agentId: bet.agentId, total: 0, count: 0, agentName: agent?.name, agentType: agent?.type };
        }
        agentPools[bet.agentId].total += bet.amount;
        agentPools[bet.agentId].count++;
      }

      const pool = Object.values(agentPools).map(p => ({
        ...p,
        odds: totalPool > 0 ? Math.round((p.total / totalPool) * 100) : 0,
      })).sort((a, b) => b.total - a.total);

      res.json({ weekStart, totalPool, totalBets: allBets.length, pool });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/bets/my", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });
      const userBets = await storage.getBetsByUser(user.id);
      // Enrich with agent names
      const enriched = await Promise.all(userBets.map(async (b) => {
        const agent = await storage.getAgent(b.agentId);
        return { ...b, agentName: agent?.name, agentType: agent?.type };
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/bets", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const { agentId, amount } = req.body;
      if (!agentId || !amount || amount <= 0 || amount > 10000) {
        return res.status(400).json({ error: "agentId and amount (1-10000) required" });
      }

      const agent = await storage.getAgent(agentId);
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      const comp = await storage.getActiveCompetition();
      if (!comp) return res.status(400).json({ error: "No active competition" });

      const weekStart = getCurrentWeekStart();

      // Check if user already bet this week
      const userBets = await storage.getBetsByUser(user.id);
      const existingBet = userBets.find(b => b.weekStart === weekStart && b.status === "active");
      if (existingBet) {
        return res.status(400).json({ error: "You already have an active bet this week" });
      }

      const bet = await storage.createBet({
        id: randomUUID(),
        userId: user.id,
        agentId,
        competitionId: comp.id,
        amount,
        weekStart,
        status: "active",
        payout: null,
        createdAt: new Date(),
      });
      res.status(201).json(bet);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === BETTING MARKETS ===
  app.get("/api/markets", async (_req, res) => {
    try {
      const markets = await storage.getMarkets();
      res.json(markets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/markets/:id", async (req, res) => {
    try {
      const market = await storage.getMarket(req.params.id);
      if (!market) return res.status(404).json({ error: "Market not found" });
      const positions = await storage.getMarketPositions(market.id);
      // Calculate pool per outcome
      const outcomes: Record<string, { total: number; count: number }> = {};
      for (const pos of positions) {
        if (!outcomes[pos.outcome]) outcomes[pos.outcome] = { total: 0, count: 0 };
        outcomes[pos.outcome].total += pos.amount;
        outcomes[pos.outcome].count++;
      }
      const totalPool = positions.reduce((s, p) => s + p.amount, 0);
      res.json({ ...market, totalPool, outcomes, positionCount: positions.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/markets", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const { title, description, marketType, agentAId, agentBId, metric, threshold, targetAgentId, closesAt } = req.body;
      if (!title || !marketType || !closesAt) {
        return res.status(400).json({ error: "title, marketType, and closesAt required" });
      }
      const validTypes = ["weekly_winner", "head_to_head", "over_under", "top_three"];
      if (!validTypes.includes(marketType)) return res.status(400).json({ error: "Invalid market type" });

      const comp = await storage.getActiveCompetition();
      if (!comp) return res.status(400).json({ error: "No active competition" });

      const market = await storage.createMarket({
        id: randomUUID(),
        title,
        description: description || null,
        competitionId: comp.id,
        marketType,
        status: "open",
        agentAId: agentAId || null,
        agentBId: agentBId || null,
        metric: metric || null,
        threshold: threshold ?? null,
        targetAgentId: targetAgentId || null,
        winnerOutcome: null,
        totalPool: 0,
        closesAt: new Date(closesAt),
        settledAt: null,
        createdAt: new Date(),
      });

      broadcast("market", { action: "created", market });
      res.status(201).json(market);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/markets/:id/bet", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });

      const { outcome, amount } = req.body;
      if (!outcome || !amount || amount <= 0 || amount > 50000) {
        return res.status(400).json({ error: "outcome and amount (1-50000) required" });
      }

      const market = await storage.getMarket(req.params.id);
      if (!market) return res.status(404).json({ error: "Market not found" });
      if (market.status !== "open") return res.status(400).json({ error: "Market is not open" });
      if (new Date(market.closesAt) < new Date()) return res.status(400).json({ error: "Market is closed" });

      // Check user balance
      const balance = user.credits ?? 0;
      if (balance < amount) return res.status(400).json({ error: `Insufficient credits (have ${balance}, need ${amount})` });

      // Debit user credits
      const newBalance = balance - amount;
      await storage.updateUserCredits(user.id, newBalance);

      // Record transaction
      await storage.createCreditTransaction({
        id: randomUUID(),
        userId: user.id,
        amount: -amount,
        type: "bet_placed",
        referenceId: market.id,
        description: `Bet on "${market.title}" — outcome: ${outcome}`,
        balanceAfter: newBalance,
        createdAt: new Date(),
      });

      // Create position
      const position = await storage.createMarketPosition({
        id: randomUUID(),
        marketId: market.id,
        userId: user.id,
        outcome,
        amount,
        payout: null,
        status: "active",
        createdAt: new Date(),
      });

      // Update market total pool
      await storage.updateMarket(market.id, { totalPool: (market.totalPool ?? 0) + amount });

      broadcast("market", { action: "bet_placed", marketId: market.id, outcome, amount });
      res.status(201).json(position);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/markets/:id/positions", async (req, res) => {
    try {
      const positions = await storage.getMarketPositions(req.params.id);
      res.json(positions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/my/positions", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });
      const positions = await storage.getPositionsByUser(user.id);
      // Enrich with market info
      const enriched = await Promise.all(positions.map(async (p) => {
        const market = await storage.getMarket(p.marketId);
        return { ...p, marketTitle: market?.title, marketType: market?.marketType, marketStatus: market?.status };
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/my/balance", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });
      const user = await storage.getUserByApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });
      const transactions = await storage.getCreditTransactions(user.id);
      res.json({ balance: user.credits ?? 0, transactions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === LIVE FEED ===
  const ALLOWED_EMOJIS = ["fire", "rocket", "skull", "eyes", "clown"];

  app.get("/api/feed", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const trades = await storage.getRecentTrades(limit);
      res.json(trades);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/feed/:tradeId/react", async (req, res) => {
    try {
      const { emoji } = req.body;
      if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
        return res.status(400).json({ error: `Invalid emoji. Allowed: ${ALLOWED_EMOJIS.join(", ")}` });
      }
      const reaction = await storage.reactToTrade(req.params.tradeId, emoji);
      res.json(reaction);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
