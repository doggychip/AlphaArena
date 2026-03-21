import { randomUUID } from "crypto";
import type {
  User, Agent, Competition, Portfolio, Position,
  Trade, DailySnapshot, LeaderboardEntry,
  InsertTrade, RegisterInput, Duel, TradeReaction, AgentAchievement, ChatMessage, Bet,
  Tournament, TournamentEntry, MarketEvent, Referral
} from "@shared/schema";

export type EnrichedChatMessage = ChatMessage & { agentName: string; agentType: string };

export type FeedTrade = Trade & { agentName: string; agentType: string; agentId: string; reactions: TradeReaction[] };

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  // Agents
  getAgent(id: string): Promise<Agent | undefined>;
  getAgentsByUser(userId: string): Promise<Agent[]>;
  getAllAgents(): Promise<Agent[]>;
  updateAgentStrategy(id: string, updates: Partial<Agent>): Promise<Agent>;
  // Competitions
  getCompetition(id: string): Promise<Competition | undefined>;
  getActiveCompetition(): Promise<Competition | undefined>;
  getAllCompetitions(): Promise<Competition[]>;
  // Portfolios
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  getPortfolioByAgent(agentId: string, competitionId: string): Promise<Portfolio | undefined>;
  updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio>;
  // Positions
  getPositionsByPortfolio(portfolioId: string): Promise<Position[]>;
  getPosition(portfolioId: string, pair: string): Promise<Position | undefined>;
  upsertPosition(position: Position): Promise<Position>;
  deletePosition(id: string): Promise<void>;
  // Trades
  getTradesByPortfolio(portfolioId: string, limit?: number): Promise<Trade[]>;
  createTrade(trade: Trade): Promise<Trade>;
  // Snapshots
  getSnapshotsByPortfolio(portfolioId: string): Promise<DailySnapshot[]>;
  // Leaderboard
  getLeaderboard(competitionId: string): Promise<(LeaderboardEntry & { agent: Agent })[]>;
  getLeaderboardEntry(competitionId: string, agentId: string): Promise<LeaderboardEntry | undefined>;
  // Registration
  register(input: RegisterInput): Promise<{ user: User; agent: Agent; portfolio: Portfolio; apiKey: string }>;
  // Stats
  getTradeCount(): Promise<number>;
  // Duels
  getDuel(id: string): Promise<Duel | undefined>;
  getDuelsByAgent(agentId: string): Promise<Duel[]>;
  getActiveDuels(): Promise<Duel[]>;
  getAllDuels(): Promise<Duel[]>;
  createDuel(duel: Duel): Promise<Duel>;
  updateDuel(id: string, updates: Partial<Duel>): Promise<Duel>;
  // Feed
  getRecentTrades(limit?: number): Promise<FeedTrade[]>;
  getTradeReactions(tradeId: string): Promise<TradeReaction[]>;
  reactToTrade(tradeId: string, emoji: string): Promise<TradeReaction>;
  // Achievements
  getAgentAchievements(agentId: string): Promise<AgentAchievement[]>;
  awardAchievement(agentId: string, achievementId: string): Promise<AgentAchievement>;
  hasAchievement(agentId: string, achievementId: string): Promise<boolean>;
  // Chat
  getRecentMessages(competitionId: string, limit?: number): Promise<EnrichedChatMessage[]>;
  createMessage(msg: ChatMessage): Promise<ChatMessage>;
  // Bets
  getBetsByWeek(weekStart: string): Promise<Bet[]>;
  getBetsByUser(userId: string): Promise<Bet[]>;
  createBet(bet: Bet): Promise<Bet>;
  updateBet(id: string, updates: Partial<Bet>): Promise<Bet>;
  // Tournaments
  getTournaments(): Promise<Tournament[]>;
  getTournament(id: string): Promise<Tournament | undefined>;
  getTournamentEntries(tournamentId: string): Promise<(TournamentEntry & { agentName: string; agentType: string })[]>;
  createTournament(t: Tournament): Promise<Tournament>;
  createTournamentEntry(e: TournamentEntry): Promise<TournamentEntry>;
  updateTournamentEntry(id: string, updates: Partial<TournamentEntry>): Promise<TournamentEntry>;
  // Market Events
  getActiveEvents(): Promise<MarketEvent[]>;
  getRecentEvents(limit?: number): Promise<MarketEvent[]>;
  createMarketEvent(e: MarketEvent): Promise<MarketEvent>;
  updateMarketEvent(id: string, updates: Partial<MarketEvent>): Promise<MarketEvent>;
  // Referrals
  getReferralsByUser(userId: string): Promise<Referral[]>;
  createReferral(r: Referral): Promise<Referral>;
  getUserByReferralCode(code: string): Promise<any | undefined>;
  getUserByGoogleId(googleId: string): Promise<any | undefined>;
  // Custom Competitions
  createCompetition(c: any): Promise<any>;
  getCompetitionsByUser(userId: string): Promise<any[]>;
  // Leaderboard History
  getLeaderboardHistory(competitionId: string): Promise<{ date: string; rankings: { agentId: string; agentName: string; rank: number; score: number }[] }[]>;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "aa_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private agents: Map<string, Agent> = new Map();
  private competitions: Map<string, Competition> = new Map();
  private portfolios: Map<string, Portfolio> = new Map();
  private positions: Map<string, Position> = new Map();
  private trades: Map<string, Trade> = new Map();
  private snapshots: Map<string, DailySnapshot> = new Map();
  private leaderboard: Map<string, LeaderboardEntry> = new Map();
  private duels: Map<string, Duel> = new Map();
  private tradeReactions: Map<string, TradeReaction> = new Map();
  private achievements: Map<string, AgentAchievement> = new Map();
  private chatMsgs: Map<string, ChatMessage> = new Map();
  private betsMap: Map<string, Bet> = new Map();
  private tournamentsMap: Map<string, Tournament> = new Map();
  private tournamentEntriesMap: Map<string, TournamentEntry> = new Map();
  private marketEventsMap: Map<string, MarketEvent> = new Map();
  private referralsMap: Map<string, Referral> = new Map();

  constructor() {
    this.seed();
  }

  // Users
  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  async getUserByApiKey(apiKey: string) {
    return Array.from(this.users.values()).find(u => u.apiKey === apiKey);
  }

  // Agents
  async getAgent(id: string) { return this.agents.get(id); }
  async getAgentsByUser(userId: string) {
    return Array.from(this.agents.values()).filter(a => a.userId === userId);
  }
  async getAllAgents() { return Array.from(this.agents.values()); }
  async updateAgentStrategy(id: string, updates: Partial<Agent>) {
    const agent = this.agents.get(id)!;
    const updated = { ...agent, ...updates };
    this.agents.set(id, updated);
    return updated;
  }

  // Competitions
  async getCompetition(id: string) { return this.competitions.get(id); }
  async getActiveCompetition() {
    return Array.from(this.competitions.values()).find(c => c.status === "active");
  }
  async getAllCompetitions() { return Array.from(this.competitions.values()); }

  // Portfolios
  async getPortfolio(id: string) { return this.portfolios.get(id); }
  async getPortfolioByAgent(agentId: string, competitionId: string) {
    return Array.from(this.portfolios.values()).find(
      p => p.agentId === agentId && p.competitionId === competitionId
    );
  }
  async updatePortfolio(id: string, updates: Partial<Portfolio>) {
    const portfolio = this.portfolios.get(id)!;
    const updated = { ...portfolio, ...updates };
    this.portfolios.set(id, updated);
    return updated;
  }

  // Positions
  async getPositionsByPortfolio(portfolioId: string) {
    return Array.from(this.positions.values()).filter(p => p.portfolioId === portfolioId);
  }
  async getPosition(portfolioId: string, pair: string) {
    return Array.from(this.positions.values()).find(
      p => p.portfolioId === portfolioId && p.pair === pair
    );
  }
  async upsertPosition(position: Position) {
    this.positions.set(position.id, position);
    return position;
  }
  async deletePosition(id: string) { this.positions.delete(id); }

  // Trades
  async getTradesByPortfolio(portfolioId: string, limit?: number) {
    const all = Array.from(this.trades.values())
      .filter(t => t.portfolioId === portfolioId)
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
    return limit ? all.slice(0, limit) : all;
  }
  async createTrade(trade: Trade) {
    this.trades.set(trade.id, trade);
    return trade;
  }

  // Snapshots
  async getSnapshotsByPortfolio(portfolioId: string) {
    return Array.from(this.snapshots.values())
      .filter(s => s.portfolioId === portfolioId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Leaderboard
  async getLeaderboard(competitionId: string) {
    const entries = Array.from(this.leaderboard.values())
      .filter(e => e.competitionId === competitionId)
      .sort((a, b) => a.rank - b.rank);
    return entries.map(e => ({
      ...e,
      agent: this.agents.get(e.agentId)!,
    }));
  }
  async getLeaderboardEntry(competitionId: string, agentId: string) {
    return Array.from(this.leaderboard.values()).find(
      e => e.competitionId === competitionId && e.agentId === agentId
    );
  }

  // Stats
  async getTradeCount() { return this.trades.size; }

  // Duels
  async getDuel(id: string) { return this.duels.get(id); }
  async getDuelsByAgent(agentId: string) {
    return Array.from(this.duels.values()).filter(
      d => d.challengerAgentId === agentId || d.opponentAgentId === agentId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getActiveDuels() {
    return Array.from(this.duels.values()).filter(d => d.status === "active");
  }
  async getAllDuels() {
    return Array.from(this.duels.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async createDuel(duel: Duel) {
    this.duels.set(duel.id, duel);
    return duel;
  }
  async updateDuel(id: string, updates: Partial<Duel>) {
    const duel = this.duels.get(id)!;
    const updated = { ...duel, ...updates };
    this.duels.set(id, updated);
    return updated;
  }

  // Feed
  async getRecentTrades(limit = 50): Promise<FeedTrade[]> {
    const allTrades = Array.from(this.trades.values())
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
      .slice(0, limit);

    return allTrades.map(trade => {
      const portfolio = Array.from(this.portfolios.values()).find(p => p.id === trade.portfolioId);
      const agent = portfolio ? this.agents.get(portfolio.agentId) : undefined;
      const reactions = Array.from(this.tradeReactions.values()).filter(r => r.tradeId === trade.id);
      return {
        ...trade,
        agentName: agent?.name ?? "Unknown",
        agentType: agent?.type ?? "algo_bot",
        agentId: agent?.id ?? "",
        reactions,
      };
    });
  }

  async getTradeReactions(tradeId: string): Promise<TradeReaction[]> {
    return Array.from(this.tradeReactions.values()).filter(r => r.tradeId === tradeId);
  }

  async reactToTrade(tradeId: string, emoji: string): Promise<TradeReaction> {
    const existing = Array.from(this.tradeReactions.values()).find(
      r => r.tradeId === tradeId && r.emoji === emoji
    );
    if (existing) {
      const updated = { ...existing, count: existing.count + 1 };
      this.tradeReactions.set(existing.id, updated);
      return updated;
    }
    const reaction: TradeReaction = {
      id: randomUUID(),
      tradeId,
      emoji,
      count: 1,
      createdAt: new Date(),
    };
    this.tradeReactions.set(reaction.id, reaction);
    return reaction;
  }

  // Achievements
  async getAgentAchievements(agentId: string): Promise<AgentAchievement[]> {
    return Array.from(this.achievements.values()).filter(a => a.agentId === agentId);
  }
  async awardAchievement(agentId: string, achievementId: string): Promise<AgentAchievement> {
    const achievement: AgentAchievement = {
      id: randomUUID(),
      agentId,
      achievementId,
      unlockedAt: new Date(),
    };
    this.achievements.set(achievement.id, achievement);
    return achievement;
  }
  async hasAchievement(agentId: string, achievementId: string): Promise<boolean> {
    return Array.from(this.achievements.values()).some(
      a => a.agentId === agentId && a.achievementId === achievementId
    );
  }

  // Chat
  async getRecentMessages(competitionId: string, limit = 50): Promise<EnrichedChatMessage[]> {
    const msgs = Array.from(this.chatMsgs.values())
      .filter(m => m.competitionId === competitionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    return msgs.map(m => {
      const agent = this.agents.get(m.agentId);
      return { ...m, agentName: agent?.name ?? "Unknown", agentType: agent?.type ?? "algo_bot" };
    });
  }
  async createMessage(msg: ChatMessage): Promise<ChatMessage> {
    this.chatMsgs.set(msg.id, msg);
    return msg;
  }

  // Bets
  async getBetsByWeek(weekStart: string): Promise<Bet[]> {
    return Array.from(this.betsMap.values()).filter(b => b.weekStart === weekStart);
  }
  async getBetsByUser(userId: string): Promise<Bet[]> {
    return Array.from(this.betsMap.values()).filter(b => b.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async createBet(bet: Bet): Promise<Bet> {
    this.betsMap.set(bet.id, bet);
    return bet;
  }
  async updateBet(id: string, updates: Partial<Bet>): Promise<Bet> {
    const bet = this.betsMap.get(id)!;
    const updated = { ...bet, ...updates };
    this.betsMap.set(id, updated);
    return updated;
  }

  // Tournaments
  async getTournaments() { return Array.from(this.tournamentsMap.values()); }
  async getTournament(id: string) { return this.tournamentsMap.get(id); }
  async getTournamentEntries(tournamentId: string) {
    const entries = Array.from(this.tournamentEntriesMap.values()).filter(e => e.tournamentId === tournamentId);
    return entries.map(e => {
      const agent = this.agents.get(e.agentId);
      return { ...e, agentName: agent?.name ?? "Unknown", agentType: agent?.type ?? "algo_bot" };
    });
  }
  async createTournament(t: Tournament) { this.tournamentsMap.set(t.id, t); return t; }
  async createTournamentEntry(e: TournamentEntry) { this.tournamentEntriesMap.set(e.id, e); return e; }
  async updateTournamentEntry(id: string, updates: Partial<TournamentEntry>) {
    const e = this.tournamentEntriesMap.get(id)!;
    const updated = { ...e, ...updates };
    this.tournamentEntriesMap.set(id, updated);
    return updated;
  }

  // Market Events
  async getActiveEvents() {
    return Array.from(this.marketEventsMap.values()).filter(e => e.active === 1 && new Date(e.endsAt) > new Date());
  }
  async getRecentEvents(limit = 20) {
    return Array.from(this.marketEventsMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  async createMarketEvent(e: MarketEvent) { this.marketEventsMap.set(e.id, e); return e; }
  async updateMarketEvent(id: string, updates: Partial<MarketEvent>) {
    const e = this.marketEventsMap.get(id)!;
    const updated = { ...e, ...updates };
    this.marketEventsMap.set(id, updated);
    return updated;
  }

  // Referrals
  async getReferralsByUser(userId: string) { return Array.from(this.referralsMap.values()).filter(r => r.referrerId === userId); }
  async createReferral(r: Referral) { this.referralsMap.set(r.id, r); return r; }
  async getUserByReferralCode(code: string) { return Array.from(this.users.values()).find(u => (u as any).referralCode === code); }
  async getUserByGoogleId(googleId: string) { return Array.from(this.users.values()).find(u => (u as any).googleId === googleId); }

  // Custom Competitions
  async createCompetition(c: any) { this.competitions.set(c.id, c); return c; }
  async getCompetitionsByUser(userId: string) { return Array.from(this.competitions.values()).filter(c => (c as any).createdBy === userId); }

  // Leaderboard History
  async getLeaderboardHistory(competitionId: string) {
    const portfolioMap = new Map<string, string>(); // portfolioId -> agentId
    Array.from(this.portfolios.values()).filter(p => p.competitionId === competitionId).forEach(p => portfolioMap.set(p.id, p.agentId));

    const dateMap = new Map<string, { agentId: string; score: number }[]>();
    for (const snap of Array.from(this.snapshots.values())) {
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
          agentName: this.agents.get(e.agentId)?.name ?? "Unknown",
          rank: i + 1,
          score: e.score,
        })),
      });
    }
    return history;
  }

  // Register
  async register(input: RegisterInput) {
    const activeComp = await this.getActiveCompetition();
    const userId = randomUUID();
    const agentId = randomUUID();
    const portfolioId = randomUUID();
    const apiKey = generateApiKey();

    const user: User = {
      id: userId,
      username: input.username,
      email: input.email,
      passwordHash: input.password,
      apiKey,
      createdAt: new Date(),
    };
    this.users.set(userId, user);

    const agent: Agent = {
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
      createdAt: new Date(),
    };
    this.agents.set(agentId, agent);

    const startingCapital = activeComp?.startingCapital ?? 100000;
    const portfolio: Portfolio = {
      id: portfolioId,
      agentId,
      competitionId: activeComp?.id ?? "comp-1",
      cashBalance: startingCapital,
      totalEquity: startingCapital,
      createdAt: new Date(),
    };
    this.portfolios.set(portfolioId, portfolio);

    return { user, agent, portfolio, apiKey };
  }

  // Seed data
  private seed() {
    const compId = "comp-1";
    const comp: Competition = {
      id: compId,
      name: "Season 1: Crypto Arena",
      description: "The inaugural AlphaArena competition. 18 AI agents battle across the top 10 crypto pairs for trading supremacy. $100K paper portfolio. 90 days. May the best algorithm win.",
      status: "active",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-06-01"),
      startingCapital: 100000,
      allowedPairs: ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOGE/USD", "AVAX/USD", "DOT/USD", "LINK/USD"],
      createdAt: new Date("2026-02-15"),
    };
    this.competitions.set(compId, comp);

    // Agent definitions with varied performance
    const agentDefs: Array<{
      name: string; type: Agent["type"]; desc: string;
      totalReturn: number; sharpe: number; sortino: number;
      maxDrawdown: number; calmar: number; winRate: number;
      equity: number; cash: number;
      strategyCode?: string; strategyLanguage?: "python" | "javascript" | "pseudocode";
      strategyInterval?: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
    }> = [
      { name: "DeepSeek Trader", type: "llm_agent", desc: "LLM-powered momentum strategy using DeepSeek v3 for market regime detection and sentiment analysis across crypto Twitter.", totalReturn: 0.347, sharpe: 2.85, sortino: 3.92, maxDrawdown: 0.062, calmar: 5.6, winRate: 0.72, equity: 134700, cash: 42300, strategyCode: `# DeepSeek Trader Strategy
def analyze(prices, sentiment):
    regime = detect_market_regime(prices, window=20)
    if regime == 'trending':
        signal = momentum_signal(prices, fast=8, slow=21)
    else:
        signal = mean_reversion_signal(prices, bb_window=20)

    sentiment_score = llm_analyze(
        model="deepseek-v3",
        data=crypto_twitter_feed(hours=4)
    )
    return combine_signals(signal, sentiment_score, weights=[0.6, 0.4])`, strategyLanguage: "python", strategyInterval: "15m" },
      { name: "GPT-4 Momentum", type: "llm_agent", desc: "Uses GPT-4o for multi-timeframe momentum signals, combining on-chain data with technical analysis.", totalReturn: 0.289, sharpe: 2.41, sortino: 3.18, maxDrawdown: 0.078, calmar: 3.7, winRate: 0.68, equity: 128900, cash: 35200, strategyCode: `# GPT-4 Momentum Strategy
def execute(market_data):
    # Multi-timeframe momentum analysis
    tf_1h = compute_momentum(market_data, timeframe="1h")
    tf_4h = compute_momentum(market_data, timeframe="4h")
    tf_1d = compute_momentum(market_data, timeframe="1d")

    consensus = weighted_average([tf_1h, tf_4h, tf_1d], [0.5, 0.3, 0.2])

    on_chain = fetch_on_chain_metrics(["active_addresses", "whale_txns"])
    gpt4_analysis = gpt4o_analyze(market_data, on_chain, prompt="momentum")

    if consensus > 0.7 and gpt4_analysis.confidence > 0.8:
        return Signal(side="buy", size=kelly_criterion(consensus))
    elif consensus < -0.7:
        return Signal(side="sell", size=kelly_criterion(abs(consensus)))
    return Signal(side="hold")`, strategyLanguage: "python", strategyInterval: "1h" },
      { name: "Mean Reversion Bot v3", type: "algo_bot", desc: "Classic mean reversion strategy on Bollinger Band extremes, optimized for high-volatility crypto pairs.", totalReturn: 0.215, sharpe: 2.12, sortino: 2.67, maxDrawdown: 0.085, calmar: 2.53, winRate: 0.65, equity: 121500, cash: 51200, strategyCode: `// Mean Reversion Bot v3
function strategy(candles, config) {
  const bb = bollingerBands(candles.close, { period: 20, stdDev: 2.0 });
  const rsi = computeRSI(candles.close, 14);
  const atr = averageTrueRange(candles, 14);

  // Entry: price below lower band + RSI oversold
  if (candles.close.last() < bb.lower && rsi < 30) {
    const size = positionSize(atr, config.riskPerTrade);
    return { action: "buy", quantity: size, stopLoss: bb.lower - atr * 1.5 };
  }

  // Exit: price above upper band + RSI overbought
  if (candles.close.last() > bb.upper && rsi > 70) {
    return { action: "sell", quantity: "all", takeProfit: bb.upper + atr };
  }

  return { action: "hold" };
}`, strategyLanguage: "javascript", strategyInterval: "5m" },
      { name: "Qwen Arbitrage", type: "llm_agent", desc: "Qwen-2.5 model analyzing cross-exchange price discrepancies and executing statistical arbitrage.", totalReturn: 0.198, sharpe: 2.34, sortino: 3.01, maxDrawdown: 0.041, calmar: 4.83, winRate: 0.71, equity: 119800, cash: 67100, strategyCode: `# Qwen Arbitrage Strategy
def find_arbitrage(exchanges, pairs):
    opportunities = []
    for pair in pairs:
        prices = {ex: fetch_price(ex, pair) for ex in exchanges}
        spread = max(prices.values()) - min(prices.values())
        threshold = compute_dynamic_threshold(pair, lookback=100)

        if spread > threshold:
            buy_ex = min(prices, key=prices.get)
            sell_ex = max(prices, key=prices.get)
            confidence = qwen_analyze(
                model="qwen-2.5-72b",
                context={"spread": spread, "historical": get_spread_history(pair)}
            )
            if confidence > 0.75:
                opportunities.append({
                    "pair": pair, "buy": buy_ex, "sell": sell_ex,
                    "expected_profit": spread - estimate_fees(buy_ex, sell_ex)
                })
    return sorted(opportunities, key=lambda x: x["expected_profit"], reverse=True)`, strategyLanguage: "python", strategyInterval: "1m" },
      { name: "MACD CrossBot", type: "algo_bot", desc: "Multi-pair MACD crossover strategy with adaptive signal thresholds and volatility-adjusted position sizing.", totalReturn: 0.176, sharpe: 1.89, sortino: 2.34, maxDrawdown: 0.092, calmar: 1.91, winRate: 0.62, equity: 117600, cash: 38400, strategyCode: `# MACD CrossBot Strategy
FOR each pair IN watchlist:
    macd_line = EMA(close, 12) - EMA(close, 26)
    signal_line = EMA(macd_line, 9)
    histogram = macd_line - signal_line
    volatility = ATR(14) / close

    # Adaptive threshold based on recent volatility
    threshold = volatility * 0.5

    IF macd_line CROSSES ABOVE signal_line AND histogram > threshold:
        size = base_size * (1 / volatility)  # Inverse vol sizing
        ENTER LONG at market, size=size
        SET stop_loss = entry - ATR(14) * 2.0
        SET take_profit = entry + ATR(14) * 3.0

    IF macd_line CROSSES BELOW signal_line AND histogram < -threshold:
        CLOSE all long positions for pair
        IF allow_shorts:
            ENTER SHORT at market`, strategyLanguage: "pseudocode", strategyInterval: "15m" },
      { name: "Claude Catalyst", type: "llm_agent", desc: "Anthropic Claude analyzing macro catalysts, Fed communications, and crypto regulatory developments for position timing.", totalReturn: 0.163, sharpe: 1.95, sortino: 2.52, maxDrawdown: 0.071, calmar: 2.3, winRate: 0.64, equity: 116300, cash: 44700 },
      { name: "Ichimoku Cloud Scanner", type: "algo_bot", desc: "Full Ichimoku cloud analysis with Tenkan-Kijun crosses, cloud breakouts, and Chikou confirmation signals.", totalReturn: 0.142, sharpe: 1.72, sortino: 2.13, maxDrawdown: 0.098, calmar: 1.45, winRate: 0.59, equity: 114200, cash: 33800 },
      { name: "Gemini Alpha", type: "hybrid", desc: "Hybrid approach: Google Gemini for market analysis combined with traditional RSI/MACD execution engine.", totalReturn: 0.131, sharpe: 1.81, sortino: 2.28, maxDrawdown: 0.067, calmar: 1.96, winRate: 0.63, equity: 113100, cash: 52400 },
      { name: "Volatility Harvester", type: "algo_bot", desc: "Captures volatility premium through dynamic straddle-like positions on high-vol crypto pairs.", totalReturn: 0.118, sharpe: 1.56, sortino: 1.89, maxDrawdown: 0.112, calmar: 1.05, winRate: 0.57, equity: 111800, cash: 28900 },
      { name: "Llama Scalper", type: "llm_agent", desc: "Meta Llama 3.1 model optimized for high-frequency scalping signals on 1m-5m timeframes.", totalReturn: 0.094, sharpe: 1.43, sortino: 1.72, maxDrawdown: 0.088, calmar: 1.07, winRate: 0.61, equity: 109400, cash: 41200 },
      { name: "RSI Divergence Pro", type: "algo_bot", desc: "Detects RSI divergences across multiple timeframes with volume confirmation and trailing stop management.", totalReturn: 0.076, sharpe: 1.28, sortino: 1.54, maxDrawdown: 0.103, calmar: 0.74, winRate: 0.55, equity: 107600, cash: 36700 },
      { name: "Neural Trend v2", type: "hybrid", desc: "LSTM neural network for trend prediction combined with rule-based risk management and position sizing.", totalReturn: 0.058, sharpe: 1.12, sortino: 1.38, maxDrawdown: 0.095, calmar: 0.61, winRate: 0.54, equity: 105800, cash: 45300 },
      { name: "Sentiment Pulse", type: "llm_agent", desc: "Real-time NLP sentiment scoring from crypto news feeds and social media, triggering contrarian trades.", totalReturn: 0.032, sharpe: 0.87, sortino: 1.02, maxDrawdown: 0.121, calmar: 0.26, winRate: 0.51, equity: 103200, cash: 38100 },
      { name: "Grid Trading Bot", type: "algo_bot", desc: "Adaptive grid strategy with dynamic level spacing based on recent volatility. Works best in ranging markets.", totalReturn: 0.014, sharpe: 0.52, sortino: 0.64, maxDrawdown: 0.078, calmar: 0.18, winRate: 0.53, equity: 101400, cash: 52800 },
      { name: "DCA Optimizer", type: "algo_bot", desc: "Smart dollar-cost averaging with volatility-weighted entry sizing and momentum-based timing.", totalReturn: -0.018, sharpe: -0.31, sortino: -0.28, maxDrawdown: 0.089, calmar: -0.2, winRate: 0.47, equity: 98200, cash: 61300 },
      { name: "Mistral Contrarian", type: "llm_agent", desc: "Mistral AI model taking contrarian positions based on crowd sentiment analysis and fear/greed index.", totalReturn: -0.047, sharpe: -0.68, sortino: -0.52, maxDrawdown: 0.134, calmar: -0.35, winRate: 0.43, equity: 95300, cash: 29700 },
      { name: "Fibonacci Retracement AI", type: "hybrid", desc: "AI-enhanced Fibonacci retracement levels with machine learning-optimized entry and exit points.", totalReturn: -0.082, sharpe: -1.12, sortino: -0.87, maxDrawdown: 0.156, calmar: -0.53, winRate: 0.39, equity: 91800, cash: 34200 },
      { name: "Random Walk Baseline", type: "algo_bot", desc: "Control agent making random buy/sell decisions. The benchmark every other agent must beat.", totalReturn: -0.124, sharpe: -1.45, sortino: -1.12, maxDrawdown: 0.189, calmar: -0.66, winRate: 0.35, equity: 87600, cash: 41200 },
    ];

    const pairs = comp.allowedPairs;
    const basePrices: Record<string, number> = {
      "BTC/USD": 87420, "ETH/USD": 3180, "BNB/USD": 625,
      "SOL/USD": 148, "XRP/USD": 2.45, "ADA/USD": 0.72,
      "DOGE/USD": 0.165, "AVAX/USD": 38.5, "DOT/USD": 7.82, "LINK/USD": 16.40,
    };

    agentDefs.forEach((def, idx) => {
      const userId = `user-${idx + 1}`;
      const agentId = `agent-${idx + 1}`;
      const portfolioId = `portfolio-${idx + 1}`;

      const user: User = {
        id: userId,
        username: `user_${def.name.toLowerCase().replace(/[\s\/]+/g, "_")}`,
        email: `${def.name.toLowerCase().replace(/[\s\/]+/g, ".")}@alphaarena.ai`,
        passwordHash: "hashed_password",
        apiKey: generateApiKey(),
        createdAt: new Date("2026-02-20"),
      };
      this.users.set(userId, user);

      const agent: Agent = {
        id: agentId,
        userId,
        name: def.name,
        description: def.desc,
        type: def.type,
        status: "active",
        strategyCode: def.strategyCode || null,
        strategyLanguage: def.strategyLanguage || null,
        strategyInterval: def.strategyInterval || null,
        lastExecuted: def.strategyCode ? new Date("2026-03-17T08:00:00Z") : null,
        executionCount: def.strategyCode ? Math.floor(Math.random() * 500) + 100 : 0,
        createdAt: new Date("2026-02-20"),
      };
      this.agents.set(agentId, agent);

      const portfolio: Portfolio = {
        id: portfolioId,
        agentId,
        competitionId: compId,
        cashBalance: def.cash,
        totalEquity: def.equity,
        createdAt: new Date("2026-03-01"),
      };
      this.portfolios.set(portfolioId, portfolio);

      // Generate positions (2-4 per agent)
      const numPositions = 2 + Math.floor(Math.random() * 3);
      const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5).slice(0, numPositions);
      shuffledPairs.forEach((pair, pIdx) => {
        const posId = `pos-${agentId}-${pIdx}`;
        const basePrice = basePrices[pair];
        const entryPrice = basePrice * (1 + (Math.random() - 0.5) * 0.1);
        const currentPrice = basePrice * (1 + (Math.random() - 0.5) * 0.02);
        const qty = pair.startsWith("BTC") ? 0.1 + Math.random() * 0.5
          : pair.startsWith("ETH") ? 1 + Math.random() * 5
          : pair.startsWith("BNB") ? 5 + Math.random() * 20
          : pair.startsWith("SOL") ? 10 + Math.random() * 50
          : pair.startsWith("DOGE") ? 5000 + Math.random() * 20000
          : 50 + Math.random() * 200;
        const side = Math.random() > 0.3 ? "long" : "short";
        const pnl = side === "long"
          ? (currentPrice - entryPrice) * qty
          : (entryPrice - currentPrice) * qty;

        const position: Position = {
          id: posId,
          portfolioId,
          pair,
          side,
          quantity: Math.round(qty * 1000) / 1000,
          avgEntryPrice: Math.round(entryPrice * 100) / 100,
          currentPrice: Math.round(currentPrice * 100) / 100,
          unrealizedPnl: Math.round(pnl * 100) / 100,
          createdAt: new Date("2026-03-01"),
        };
        this.positions.set(posId, position);
      });

      // Generate 30 days of snapshots
      const startEquity = 100000;
      let prevEquity = startEquity;
      let peak = startEquity;
      const dailyReturns: number[] = [];

      for (let day = 0; day < 17; day++) {
        const date = new Date("2026-03-01");
        date.setDate(date.getDate() + day);
        const dateStr = date.toISOString().split("T")[0];

        // Create realistic equity curve based on total return
        const targetFinalEquity = def.equity;
        const progress = day / 16;
        // Add some randomness to the path
        const noise = (Math.random() - 0.5) * 0.02;
        const baseReturn = def.totalReturn * progress;
        const dailyEquity = startEquity * (1 + baseReturn + noise * (1 - progress * 0.5));
        const equity = day === 16 ? targetFinalEquity : Math.round(dailyEquity * 100) / 100;

        const dailyReturn = (equity - prevEquity) / prevEquity;
        dailyReturns.push(dailyReturn);
        const cumulativeReturn = (equity - startEquity) / startEquity;
        peak = Math.max(peak, equity);
        const drawdown = (peak - equity) / peak;

        const snapId = `snap-${agentId}-${day}`;
        const snapshot: DailySnapshot = {
          id: snapId,
          portfolioId,
          date: dateStr,
          totalEquity: equity,
          cashBalance: def.cash + (Math.random() - 0.5) * 5000,
          dailyReturn: Math.round(dailyReturn * 10000) / 10000,
          cumulativeReturn: Math.round(cumulativeReturn * 10000) / 10000,
          sharpeRatio: day > 1 ? Math.round(def.sharpe * (0.8 + progress * 0.2) * 100) / 100 : null,
          maxDrawdown: Math.round(drawdown * 10000) / 10000,
          compositeScore: null,
          createdAt: date,
        };
        this.snapshots.set(snapId, snapshot);
        prevEquity = equity;
      }

      // Generate recent trades (8-15 per agent)
      const numTrades = 8 + Math.floor(Math.random() * 8);
      for (let t = 0; t < numTrades; t++) {
        const tradeId = `trade-${agentId}-${t}`;
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const side = Math.random() > 0.5 ? "buy" : "sell";
        const basePrice = basePrices[pair];
        const price = basePrice * (1 + (Math.random() - 0.5) * 0.05);
        const qty = pair.startsWith("BTC") ? 0.05 + Math.random() * 0.3
          : pair.startsWith("ETH") ? 0.5 + Math.random() * 3
          : pair.startsWith("BNB") ? 2 + Math.random() * 15
          : pair.startsWith("SOL") ? 5 + Math.random() * 30
          : pair.startsWith("DOGE") ? 2000 + Math.random() * 15000
          : 20 + Math.random() * 100;
        const totalValue = price * qty;
        const fee = totalValue * 0.001;

        const tradeDate = new Date("2026-03-01");
        tradeDate.setDate(tradeDate.getDate() + Math.floor(Math.random() * 17));
        tradeDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        const trade: Trade = {
          id: tradeId,
          portfolioId,
          pair,
          side,
          quantity: Math.round(qty * 10000) / 10000,
          price: Math.round(price * 100) / 100,
          totalValue: Math.round(totalValue * 100) / 100,
          fee: Math.round(fee * 100) / 100,
          executedAt: tradeDate,
        };
        this.trades.set(tradeId, trade);
      }

      // Leaderboard entry
      const leaderboardId = `lb-${agentId}`;
      const entry: LeaderboardEntry = {
        id: leaderboardId,
        competitionId: compId,
        agentId,
        rank: idx + 1,
        totalReturn: def.totalReturn,
        sharpeRatio: def.sharpe,
        sortinoRatio: def.sortino,
        maxDrawdown: def.maxDrawdown,
        calmarRatio: def.calmar,
        winRate: def.winRate,
        compositeScore: this.computeComposite(def, agentDefs),
        updatedAt: new Date(),
      };
      this.leaderboard.set(leaderboardId, entry);
    });

    // Re-rank by composite score
    const entries = Array.from(this.leaderboard.values())
      .filter(e => e.competitionId === compId)
      .sort((a, b) => b.compositeScore - a.compositeScore);
    entries.forEach((e, i) => {
      e.rank = i + 1;
    });

    // Seed duels
    const duelSeed: Duel[] = [
      { id: "duel-1", challengerAgentId: "agent-1", opponentAgentId: "agent-2", competitionId: compId, wager: 500, durationMinutes: 240, status: "completed", challengerStartEquity: 130000, opponentStartEquity: 125000, challengerEndEquity: 131200, opponentEndEquity: 124500, challengerReturn: 0.0092, opponentReturn: -0.004, winnerAgentId: "agent-1", startedAt: new Date("2026-03-15T10:00:00Z"), endsAt: new Date("2026-03-15T14:00:00Z"), createdAt: new Date("2026-03-15T09:30:00Z"), resolvedAt: new Date("2026-03-15T14:00:00Z") },
      { id: "duel-2", challengerAgentId: "agent-3", opponentAgentId: "agent-5", competitionId: compId, wager: 0, durationMinutes: 1440, status: "completed", challengerStartEquity: 120000, opponentStartEquity: 116000, challengerEndEquity: 121800, opponentEndEquity: 117400, challengerReturn: 0.015, opponentReturn: 0.012, winnerAgentId: "agent-3", startedAt: new Date("2026-03-16T00:00:00Z"), endsAt: new Date("2026-03-17T00:00:00Z"), createdAt: new Date("2026-03-15T22:00:00Z"), resolvedAt: new Date("2026-03-17T00:00:00Z") },
      { id: "duel-3", challengerAgentId: "agent-4", opponentAgentId: "agent-6", competitionId: compId, wager: 200, durationMinutes: 60, status: "active", challengerStartEquity: 119800, opponentStartEquity: 116300, challengerEndEquity: null, opponentEndEquity: null, challengerReturn: null, opponentReturn: null, winnerAgentId: null, startedAt: new Date(), endsAt: new Date(Date.now() + 3600000), createdAt: new Date(Date.now() - 600000), resolvedAt: null },
      { id: "duel-4", challengerAgentId: "agent-8", opponentAgentId: "agent-10", competitionId: compId, wager: 100, durationMinutes: 240, status: "active", challengerStartEquity: 113100, opponentStartEquity: 109400, challengerEndEquity: null, opponentEndEquity: null, challengerReturn: null, opponentReturn: null, winnerAgentId: null, startedAt: new Date(Date.now() - 7200000), endsAt: new Date(Date.now() + 1800000), createdAt: new Date(Date.now() - 7800000), resolvedAt: null },
      { id: "duel-5", challengerAgentId: "agent-7", opponentAgentId: "agent-9", competitionId: compId, wager: 300, durationMinutes: 480, status: "pending", challengerStartEquity: null, opponentStartEquity: null, challengerEndEquity: null, opponentEndEquity: null, challengerReturn: null, opponentReturn: null, winnerAgentId: null, startedAt: null, endsAt: null, createdAt: new Date(Date.now() - 3600000), resolvedAt: null },
      { id: "duel-6", challengerAgentId: "agent-1", opponentAgentId: "agent-4", competitionId: compId, wager: 1000, durationMinutes: 1440, status: "pending", challengerStartEquity: null, opponentStartEquity: null, challengerEndEquity: null, opponentEndEquity: null, challengerReturn: null, opponentReturn: null, winnerAgentId: null, startedAt: null, endsAt: null, createdAt: new Date(Date.now() - 1800000), resolvedAt: null },
      { id: "duel-7", challengerAgentId: "agent-11", opponentAgentId: "agent-2", competitionId: compId, wager: 250, durationMinutes: 60, status: "declined", challengerStartEquity: null, opponentStartEquity: null, challengerEndEquity: null, opponentEndEquity: null, challengerReturn: null, opponentReturn: null, winnerAgentId: null, startedAt: null, endsAt: null, createdAt: new Date("2026-03-14T12:00:00Z"), resolvedAt: null },
    ];
    for (const d of duelSeed) {
      this.duels.set(d.id, d);
    }
  }

  private computeComposite(
    def: { totalReturn: number; sharpe: number; maxDrawdown: number; calmar: number; winRate: number },
    all: Array<{ totalReturn: number; sharpe: number; maxDrawdown: number; calmar: number; winRate: number }>
  ): number {
    const normalize = (val: number, arr: number[]) => {
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      return max === min ? 0.5 : (val - min) / (max - min);
    };
    const sharpes = all.map(a => a.sharpe);
    const dds = all.map(a => 1 - a.maxDrawdown);
    const returns = all.map(a => a.totalReturn);
    const calmars = all.map(a => a.calmar);
    const winRates = all.map(a => a.winRate);

    const score =
      0.40 * normalize(def.sharpe, sharpes) +
      0.20 * normalize(1 - def.maxDrawdown, dds) +
      0.20 * normalize(def.totalReturn, returns) +
      0.10 * normalize(def.calmar, calmars) +
      0.10 * normalize(def.winRate, winRates);
    return Math.round(score * 1000) / 1000;
  }
}

let storage: IStorage = new MemStorage();

async function initStorage(): Promise<IStorage> {
  if (process.env.DATABASE_URL) {
    const { DatabaseStorage } = await import("./databaseStorage");
    return new DatabaseStorage();
  }
  return new MemStorage();
}

const storagePromise = initStorage().then((s) => {
  storage = s;
});

export { storage, storagePromise };
