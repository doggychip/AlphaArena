import { eq, and, or, asc, desc, count, sql, like, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "./db";
import {
  users, agents, competitions, portfolios, positions, trades,
  dailySnapshots, leaderboardEntries, duels, tradeReactions, agentAchievements, chatMessages, bets,
  tournaments, tournamentEntries, marketEvents, referrals, competitions, agentDiagnostics, userChallenges,
  chatReactions, bettingMarkets, marketPositions, creditTransactions, oddsSnapshots,
} from "@shared/schema";
import type {
  User, Agent, Competition, Portfolio, Position,
  Trade, DailySnapshot, LeaderboardEntry, RegisterInput, Duel, TradeReaction, AgentAchievement, ChatMessage, Bet,
  Tournament, TournamentEntry, MarketEvent, Referral, AgentDiagnostic, UserChallenge,
  ChatReaction, BettingMarket, MarketPosition, CreditTransaction, OddsSnapshot,
} from "@shared/schema";
import type { IStorage, FeedTrade, EnrichedChatMessage } from "./storage";

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

  // Duels
  async getDuel(id: string): Promise<Duel | undefined> {
    const rows = await db.select().from(duels).where(eq(duels.id, id)).limit(1);
    return rows[0];
  }

  async getDuelsByAgent(agentId: string): Promise<Duel[]> {
    return db.select().from(duels).where(
      or(eq(duels.challengerAgentId, agentId), eq(duels.opponentAgentId, agentId))
    ).orderBy(desc(duels.createdAt));
  }

  async getActiveDuels(): Promise<Duel[]> {
    return db.select().from(duels).where(eq(duels.status, "active"));
  }

  async getAllDuels(): Promise<Duel[]> {
    return db.select().from(duels).orderBy(desc(duels.createdAt));
  }

  async createDuel(duel: Duel): Promise<Duel> {
    const rows = await db.insert(duels).values(duel).returning();
    return rows[0];
  }

  async updateDuel(id: string, updates: Partial<Duel>): Promise<Duel> {
    const rows = await db.update(duels).set(updates).where(eq(duels.id, id)).returning();
    return rows[0];
  }

  // Feed
  async getRecentTrades(limit = 50): Promise<FeedTrade[]> {
    const rows = await db.select({
      trade: trades,
      portfolio: portfolios,
      agent: agents,
    })
      .from(trades)
      .innerJoin(portfolios, eq(trades.portfolioId, portfolios.id))
      .innerJoin(agents, eq(portfolios.agentId, agents.id))
      .orderBy(desc(trades.executedAt))
      .limit(limit);

    const result: FeedTrade[] = [];
    for (const row of rows) {
      const reactions = await db.select().from(tradeReactions).where(eq(tradeReactions.tradeId, row.trade.id));
      result.push({
        ...row.trade,
        agentName: row.agent.name,
        agentType: row.agent.type,
        agentId: row.agent.id,
        reactions,
      });
    }
    return result;
  }

  async getTradeReactions(tradeId: string): Promise<TradeReaction[]> {
    return db.select().from(tradeReactions).where(eq(tradeReactions.tradeId, tradeId));
  }

  async reactToTrade(tradeId: string, emoji: string): Promise<TradeReaction> {
    const existing = await db.select().from(tradeReactions)
      .where(and(eq(tradeReactions.tradeId, tradeId), eq(tradeReactions.emoji, emoji)))
      .limit(1);

    if (existing.length > 0) {
      const rows = await db.update(tradeReactions)
        .set({ count: existing[0].count + 1 })
        .where(eq(tradeReactions.id, existing[0].id))
        .returning();
      return rows[0];
    }

    const rows = await db.insert(tradeReactions).values({
      id: randomUUID(),
      tradeId,
      emoji,
      count: 1,
    }).returning();
    return rows[0];
  }

  // Achievements
  async getAgentAchievements(agentId: string): Promise<AgentAchievement[]> {
    return db.select().from(agentAchievements).where(eq(agentAchievements.agentId, agentId));
  }

  async awardAchievement(agentId: string, achievementId: string): Promise<AgentAchievement> {
    const rows = await db.insert(agentAchievements).values({
      id: randomUUID(),
      agentId,
      achievementId,
    }).returning();
    return rows[0];
  }

  async hasAchievement(agentId: string, achievementId: string): Promise<boolean> {
    const rows = await db.select().from(agentAchievements)
      .where(and(eq(agentAchievements.agentId, agentId), eq(agentAchievements.achievementId, achievementId)))
      .limit(1);
    return rows.length > 0;
  }

  // Chat
  private async enrichMessages(rows: { msg: ChatMessage; agent: { name: string; type: string } }[]): Promise<EnrichedChatMessage[]> {
    const enriched: EnrichedChatMessage[] = [];
    for (const r of rows) {
      const em: EnrichedChatMessage = { ...r.msg, agentName: r.agent.name, agentType: r.agent.type };
      // Reply context
      if (r.msg.replyToId) {
        const parentRows = await db.select({ msg: chatMessages, agent: agents })
          .from(chatMessages).innerJoin(agents, eq(chatMessages.agentId, agents.id))
          .where(eq(chatMessages.id, r.msg.replyToId)).limit(1);
        if (parentRows[0]) {
          em.replyTo = { id: parentRows[0].msg.id, agentName: parentRows[0].agent.name, content: parentRows[0].msg.content.slice(0, 100) };
        }
      }
      // Aggregate reactions
      const reactionRows = await db.select().from(chatReactions).where(eq(chatReactions.messageId, r.msg.id));
      if (reactionRows.length > 0) {
        const counts = new Map<string, number>();
        for (const rx of reactionRows) counts.set(rx.emoji, (counts.get(rx.emoji) ?? 0) + 1);
        em.reactions = Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count }));
      }
      enriched.push(em);
    }
    return enriched;
  }

  async getRecentMessages(competitionId: string, limit = 50): Promise<EnrichedChatMessage[]> {
    const rows = await db.select({ msg: chatMessages, agent: agents })
      .from(chatMessages)
      .innerJoin(agents, eq(chatMessages.agentId, agents.id))
      .where(eq(chatMessages.competitionId, competitionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return this.enrichMessages(rows);
  }

  async searchMessages(competitionId: string, query: string, agentId?: string, messageType?: string): Promise<EnrichedChatMessage[]> {
    const conditions = [
      eq(chatMessages.competitionId, competitionId),
      sql`lower(${chatMessages.content}) like ${'%' + query.toLowerCase() + '%'}`,
    ];
    if (agentId) conditions.push(eq(chatMessages.agentId, agentId));
    if (messageType) conditions.push(eq(chatMessages.messageType, messageType));

    const rows = await db.select({ msg: chatMessages, agent: agents })
      .from(chatMessages)
      .innerJoin(agents, eq(chatMessages.agentId, agents.id))
      .where(and(...conditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);
    return this.enrichMessages(rows);
  }

  async getMessage(id: string): Promise<ChatMessage | undefined> {
    const rows = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);
    return rows[0];
  }

  async createMessage(msg: ChatMessage): Promise<ChatMessage> {
    const rows = await db.insert(chatMessages).values(msg).returning();
    return rows[0];
  }

  async updateMessage(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage> {
    const rows = await db.update(chatMessages).set(updates).where(eq(chatMessages.id, id)).returning();
    return rows[0];
  }

  async getPinnedMessages(competitionId: string): Promise<EnrichedChatMessage[]> {
    const rows = await db.select({ msg: chatMessages, agent: agents })
      .from(chatMessages)
      .innerJoin(agents, eq(chatMessages.agentId, agents.id))
      .where(and(eq(chatMessages.competitionId, competitionId), eq(chatMessages.pinned, 1)))
      .orderBy(desc(chatMessages.createdAt));
    return this.enrichMessages(rows);
  }

  // Odds Snapshots
  async createOddsSnapshot(snap: OddsSnapshot): Promise<OddsSnapshot> {
    const rows = await db.insert(oddsSnapshots).values(snap).returning();
    return rows[0];
  }
  async getOddsHistory(marketId: string): Promise<OddsSnapshot[]> {
    return db.select().from(oddsSnapshots).where(eq(oddsSnapshots.marketId, marketId)).orderBy(asc(oddsSnapshots.createdAt));
  }

  // Predictor Stats
  async getPredictorLeaderboard() {
    // Aggregate from market positions + legacy bets
    const allPositions = await db.select().from(marketPositions);
    const allBets = await db.select().from(bets);
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, u.username]));

    const stats = new Map<string, { totalBets: number; wins: number; losses: number; totalWon: number; totalLost: number }>();
    for (const pos of allPositions) {
      if (pos.status === "active") continue;
      const s = stats.get(pos.userId) ?? { totalBets: 0, wins: 0, losses: 0, totalWon: 0, totalLost: 0 };
      s.totalBets++;
      if (pos.status === "won") { s.wins++; s.totalWon += pos.payout ?? 0; }
      else { s.losses++; s.totalLost += pos.amount; }
      stats.set(pos.userId, s);
    }
    for (const bet of allBets) {
      if (bet.status === "active") continue;
      const s = stats.get(bet.userId) ?? { totalBets: 0, wins: 0, losses: 0, totalWon: 0, totalLost: 0 };
      s.totalBets++;
      if (bet.status === "won") { s.wins++; s.totalWon += bet.payout ?? 0; }
      else { s.losses++; s.totalLost += bet.amount; }
      stats.set(bet.userId, s);
    }

    const result = [];
    for (const [userId, s] of stats) {
      const invested = s.totalWon + s.totalLost;
      result.push({ userId, username: userMap.get(userId) ?? "Unknown", ...s, roi: invested > 0 ? ((s.totalWon - s.totalLost) / invested) * 100 : 0 });
    }
    return result.sort((a, b) => b.roi - a.roi);
  }

  // Bets
  async getBetsByWeek(weekStart: string): Promise<Bet[]> {
    return db.select().from(bets).where(eq(bets.weekStart, weekStart));
  }

  async getBetsByUser(userId: string): Promise<Bet[]> {
    return db.select().from(bets).where(eq(bets.userId, userId)).orderBy(desc(bets.createdAt));
  }

  async createBet(bet: Bet): Promise<Bet> {
    const rows = await db.insert(bets).values(bet).returning();
    return rows[0];
  }

  async updateBet(id: string, updates: Partial<Bet>): Promise<Bet> {
    const rows = await db.update(bets).set(updates).where(eq(bets.id, id)).returning();
    return rows[0];
  }

  // Tournaments
  async getTournaments(): Promise<Tournament[]> {
    return db.select().from(tournaments).orderBy(desc(tournaments.startDate));
  }
  async getTournament(id: string): Promise<Tournament | undefined> {
    const rows = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    return rows[0];
  }
  async getTournamentEntries(tournamentId: string) {
    const rows = await db.select({ entry: tournamentEntries, agent: agents })
      .from(tournamentEntries)
      .innerJoin(agents, eq(tournamentEntries.agentId, agents.id))
      .where(eq(tournamentEntries.tournamentId, tournamentId));
    return rows.map(r => ({ ...r.entry, agentName: r.agent.name, agentType: r.agent.type }));
  }
  async createTournament(t: Tournament): Promise<Tournament> {
    const rows = await db.insert(tournaments).values(t).returning();
    return rows[0];
  }
  async createTournamentEntry(e: TournamentEntry): Promise<TournamentEntry> {
    const rows = await db.insert(tournamentEntries).values(e).returning();
    return rows[0];
  }
  async updateTournamentEntry(id: string, updates: Partial<TournamentEntry>): Promise<TournamentEntry> {
    const rows = await db.update(tournamentEntries).set(updates).where(eq(tournamentEntries.id, id)).returning();
    return rows[0];
  }

  // Market Events
  async getActiveEvents(): Promise<MarketEvent[]> {
    return db.select().from(marketEvents).where(and(eq(marketEvents.active, 1)));
  }
  async getRecentEvents(limit = 20): Promise<MarketEvent[]> {
    return db.select().from(marketEvents).orderBy(desc(marketEvents.createdAt)).limit(limit);
  }
  async createMarketEvent(e: MarketEvent): Promise<MarketEvent> {
    const rows = await db.insert(marketEvents).values(e).returning();
    return rows[0];
  }
  async updateMarketEvent(id: string, updates: Partial<MarketEvent>): Promise<MarketEvent> {
    const rows = await db.update(marketEvents).set(updates).where(eq(marketEvents.id, id)).returning();
    return rows[0];
  }

  // Diagnostics
  async getDiagnosticsByAgent(agentId: string, limit = 50): Promise<AgentDiagnostic[]> {
    return db.select().from(agentDiagnostics).where(eq(agentDiagnostics.agentId, agentId)).orderBy(desc(agentDiagnostics.createdAt)).limit(limit);
  }
  async getDiagnosticsSummary(): Promise<{ category: string; count: number }[]> {
    const rows = await db.select({ category: agentDiagnostics.category, count: count() }).from(agentDiagnostics).groupBy(agentDiagnostics.category);
    return rows.map(r => ({ category: r.category, count: r.count }));
  }
  async createDiagnostic(d: AgentDiagnostic): Promise<AgentDiagnostic> {
    const rows = await db.insert(agentDiagnostics).values(d).returning();
    return rows[0];
  }

  // Challenges
  async createChallenge(c: UserChallenge): Promise<UserChallenge> {
    const rows = await db.insert(userChallenges).values(c).returning();
    return rows[0];
  }
  async getActiveChallenges(sessionId: string): Promise<UserChallenge[]> {
    return db.select().from(userChallenges).where(and(eq(userChallenges.sessionId, sessionId), eq(userChallenges.status, "active"))).orderBy(desc(userChallenges.createdAt));
  }
  async getResolvedChallenges(sessionId: string): Promise<UserChallenge[]> {
    return db.select().from(userChallenges).where(and(eq(userChallenges.sessionId, sessionId), eq(userChallenges.status, "resolved"))).orderBy(desc(userChallenges.resolvedAt));
  }
  async getAllActiveChallenges(): Promise<UserChallenge[]> {
    return db.select().from(userChallenges).where(eq(userChallenges.status, "active"));
  }
  async getAllResolvedChallenges(): Promise<UserChallenge[]> {
    return db.select().from(userChallenges).where(eq(userChallenges.status, "resolved")).orderBy(asc(userChallenges.resolvedAt));
  }
  async updateChallenge(id: string, updates: Partial<UserChallenge>): Promise<UserChallenge> {
    const rows = await db.update(userChallenges).set(updates).where(eq(userChallenges.id, id)).returning();
    return rows[0];
  }

  // Referrals
  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.referrerId, userId));
  }
  async createReferral(r: Referral): Promise<Referral> {
    const rows = await db.insert(referrals).values(r).returning();
    return rows[0];
  }
  async getUserByReferralCode(code: string) {
    const rows = await db.select().from(users).where(eq(users.referralCode, code)).limit(1);
    return rows[0];
  }
  async getUserByGoogleId(googleId: string) {
    const rows = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return rows[0];
  }

  // Custom Competitions
  async createCompetition(c: any) {
    const rows = await db.insert(competitions).values(c).returning();
    return rows[0];
  }
  async getCompetitionsByUser(userId: string) {
    return db.select().from(competitions).where(eq(competitions.createdBy, userId));
  }

  // Leaderboard History
  async getLeaderboardHistory(competitionId: string) {
    const portfolioRows = await db.select().from(portfolios).where(eq(portfolios.competitionId, competitionId));
    const portfolioMap = new Map(portfolioRows.map(p => [p.id, p.agentId]));
    const allSnapshots = await db.select().from(dailySnapshots);
    const agentRows = await db.select().from(agents);
    const agentNames = new Map(agentRows.map(a => [a.id, a.name]));

    const dateMap = new Map<string, { agentId: string; score: number }[]>();
    for (const snap of allSnapshots) {
      const agentId = portfolioMap.get(snap.portfolioId);
      if (!agentId) continue;
      if (!dateMap.has(snap.date)) dateMap.set(snap.date, []);
      dateMap.get(snap.date)!.push({ agentId, score: snap.compositeScore ?? snap.cumulativeReturn });
    }

    const history = [];
    for (const [date, entries] of Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      entries.sort((a, b) => b.score - a.score);
      history.push({
        date,
        rankings: entries.map((e, i) => ({
          agentId: e.agentId,
          agentName: agentNames.get(e.agentId) ?? "Unknown",
          rank: i + 1,
          score: e.score,
        })),
      });
    }
    return history;
  }

  // Chat Reactions
  async createChatReaction(reaction: ChatReaction): Promise<ChatReaction> {
    const rows = await db.insert(chatReactions).values(reaction).returning();
    return rows[0];
  }
  async getChatReactions(messageId: string): Promise<ChatReaction[]> {
    return db.select().from(chatReactions).where(eq(chatReactions.messageId, messageId));
  }

  // Betting Markets
  async getMarkets(): Promise<BettingMarket[]> {
    return db.select().from(bettingMarkets).orderBy(desc(bettingMarkets.createdAt));
  }
  async getMarket(id: string): Promise<BettingMarket | undefined> {
    const rows = await db.select().from(bettingMarkets).where(eq(bettingMarkets.id, id)).limit(1);
    return rows[0];
  }
  async createMarket(market: BettingMarket): Promise<BettingMarket> {
    const rows = await db.insert(bettingMarkets).values(market).returning();
    return rows[0];
  }
  async updateMarket(id: string, updates: Partial<BettingMarket>): Promise<BettingMarket> {
    const rows = await db.update(bettingMarkets).set(updates).where(eq(bettingMarkets.id, id)).returning();
    return rows[0];
  }
  async getOpenMarkets(): Promise<BettingMarket[]> {
    return db.select().from(bettingMarkets).where(eq(bettingMarkets.status, "open"));
  }

  // Market Positions
  async getMarketPositions(marketId: string): Promise<MarketPosition[]> {
    return db.select().from(marketPositions).where(eq(marketPositions.marketId, marketId));
  }
  async getPositionsByUser(userId: string): Promise<MarketPosition[]> {
    return db.select().from(marketPositions).where(eq(marketPositions.userId, userId)).orderBy(desc(marketPositions.createdAt));
  }
  async createMarketPosition(position: MarketPosition): Promise<MarketPosition> {
    const rows = await db.insert(marketPositions).values(position).returning();
    return rows[0];
  }
  async updateMarketPosition(id: string, updates: Partial<MarketPosition>): Promise<MarketPosition> {
    const rows = await db.update(marketPositions).set(updates).where(eq(marketPositions.id, id)).returning();
    return rows[0];
  }

  // Credit Transactions
  async getCreditTransactions(userId: string): Promise<CreditTransaction[]> {
    return db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)).orderBy(desc(creditTransactions.createdAt));
  }
  async createCreditTransaction(tx: CreditTransaction): Promise<CreditTransaction> {
    const rows = await db.insert(creditTransactions).values(tx).returning();
    return rows[0];
  }
  async updateUserCredits(userId: string, newBalance: number): Promise<void> {
    await db.update(users).set({ credits: newBalance }).where(eq(users.id, userId));
  }
}
