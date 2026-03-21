import { eq, and, asc, desc, count, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "./db";
import {
  users, agents, competitions, portfolios, positions, trades,
  dailySnapshots, leaderboardEntries,
} from "@shared/schema";
import type {
  User, Agent, Competition, Portfolio, Position,
  Trade, DailySnapshot, LeaderboardEntry, RegisterInput,
} from "@shared/schema";
import type { IStorage } from "./storage";

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "aa_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.apiKey, apiKey)).limit(1);
    return rows[0];
  }

  // Agents
  async getAgent(id: string): Promise<Agent | undefined> {
    const rows = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    return rows[0];
  }

  async getAgentsByUser(userId: string): Promise<Agent[]> {
    return db.select().from(agents).where(eq(agents.userId, userId));
  }

  async getAllAgents(): Promise<Agent[]> {
    return db.select().from(agents);
  }

  async updateAgentStrategy(id: string, updates: Partial<Agent>): Promise<Agent> {
    const rows = await db.update(agents).set(updates).where(eq(agents.id, id)).returning();
    return rows[0];
  }

  // Competitions
  async getCompetition(id: string): Promise<Competition | undefined> {
    const rows = await db.select().from(competitions).where(eq(competitions.id, id)).limit(1);
    return rows[0];
  }

  async getActiveCompetition(): Promise<Competition | undefined> {
    const rows = await db.select().from(competitions).where(eq(competitions.status, "active")).limit(1);
    return rows[0];
  }

  async getAllCompetitions(): Promise<Competition[]> {
    return db.select().from(competitions);
  }

  // Portfolios
  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    const rows = await db.select().from(portfolios).where(eq(portfolios.id, id)).limit(1);
    return rows[0];
  }

  async getPortfolioByAgent(agentId: string, competitionId: string): Promise<Portfolio | undefined> {
    const rows = await db.select().from(portfolios).where(
      and(eq(portfolios.agentId, agentId), eq(portfolios.competitionId, competitionId))
    ).limit(1);
    return rows[0];
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio> {
    const rows = await db.update(portfolios).set(updates).where(eq(portfolios.id, id)).returning();
    return rows[0];
  }

  // Positions
  async getPositionsByPortfolio(portfolioId: string): Promise<Position[]> {
    return db.select().from(positions).where(eq(positions.portfolioId, portfolioId));
  }

  async getPosition(portfolioId: string, pair: string): Promise<Position | undefined> {
    const rows = await db.select().from(positions).where(
      and(eq(positions.portfolioId, portfolioId), eq(positions.pair, pair))
    ).limit(1);
    return rows[0];
  }

  async upsertPosition(position: Position): Promise<Position> {
    const existing = await db.select().from(positions).where(eq(positions.id, position.id)).limit(1);
    if (existing.length > 0) {
      const rows = await db.update(positions).set(position).where(eq(positions.id, position.id)).returning();
      return rows[0];
    } else {
      const rows = await db.insert(positions).values(position).returning();
      return rows[0];
    }
  }

  async deletePosition(id: string): Promise<void> {
    await db.delete(positions).where(eq(positions.id, id));
  }

  // Trades
  async getTradesByPortfolio(portfolioId: string, limit?: number): Promise<Trade[]> {
    let query = db.select().from(trades)
      .where(eq(trades.portfolioId, portfolioId))
      .orderBy(desc(trades.executedAt));
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async createTrade(trade: Trade): Promise<Trade> {
    const rows = await db.insert(trades).values(trade).returning();
    return rows[0];
  }

  // Snapshots
  async getSnapshotsByPortfolio(portfolioId: string): Promise<DailySnapshot[]> {
    return db.select().from(dailySnapshots)
      .where(eq(dailySnapshots.portfolioId, portfolioId))
      .orderBy(asc(dailySnapshots.date));
  }

  // Leaderboard
  async getLeaderboard(competitionId: string): Promise<(LeaderboardEntry & { agent: Agent })[]> {
    const rows = await db.select({
      entry: leaderboardEntries,
      agent: agents,
    })
      .from(leaderboardEntries)
      .innerJoin(agents, eq(leaderboardEntries.agentId, agents.id))
      .where(eq(leaderboardEntries.competitionId, competitionId))
      .orderBy(asc(leaderboardEntries.rank));

    return rows.map(row => ({
      ...row.entry,
      agent: row.agent,
    }));
  }

  async getLeaderboardEntry(competitionId: string, agentId: string): Promise<LeaderboardEntry | undefined> {
    const rows = await db.select().from(leaderboardEntries).where(
      and(eq(leaderboardEntries.competitionId, competitionId), eq(leaderboardEntries.agentId, agentId))
    ).limit(1);
    return rows[0];
  }

  // Registration
  async register(input: RegisterInput): Promise<{ user: User; agent: Agent; portfolio: Portfolio; apiKey: string }> {
    return db.transaction(async (tx) => {
      const activeComp = await tx.select().from(competitions)
        .where(eq(competitions.status, "active")).limit(1);

      const userId = randomUUID();
      const agentId = randomUUID();
      const portfolioId = randomUUID();
      const apiKey = generateApiKey();

      const [user] = await tx.insert(users).values({
        id: userId,
        username: input.username,
        email: input.email,
        passwordHash: input.password,
        apiKey,
      }).returning();

      const [agent] = await tx.insert(agents).values({
        id: agentId,
        userId,
        name: input.agentName,
        description: input.agentDescription || null,
        type: input.agentType,
        status: "active",
        strategyCode: input.strategyCode || null,
        strategyLanguage: input.strategyLanguage || null,
        strategyInterval: input.strategyInterval || null,
        lastExecuted: null,
        executionCount: 0,
      }).returning();

      const startingCapital = activeComp[0]?.startingCapital ?? 100000;
      const [portfolio] = await tx.insert(portfolios).values({
        id: portfolioId,
        agentId,
        competitionId: activeComp[0]?.id ?? "comp-1",
        cashBalance: startingCapital,
        totalEquity: startingCapital,
      }).returning();

      return { user, agent, portfolio, apiKey };
    });
  }

  // Trade count
  async getTradeCount(): Promise<number> {
    const rows = await db.select({ value: count() }).from(trades);
    return rows[0].value;
  }
}
