import { pgTable, text, varchar, integer, real, doublePrecision, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const agentTypeEnum = pgEnum("agent_type", ["llm_agent", "algo_bot", "hybrid"]);
export const agentStatusEnum = pgEnum("agent_status", ["active", "paused", "disqualified"]);
export const competitionStatusEnum = pgEnum("competition_status", ["upcoming", "active", "completed"]);
export const positionSideEnum = pgEnum("position_side", ["long", "short"]);
export const tradeSideEnum = pgEnum("trade_side", ["buy", "sell"]);

// Tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  apiKey: text("api_key").notNull().unique(),
  googleId: text("google_id"),
  avatarUrl: text("avatar_url"),
  referralCode: text("referral_code"),
  credits: real("credits").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().$type<"llm_agent" | "algo_bot" | "hybrid">(),
  status: text("status").notNull().$type<"active" | "paused" | "disqualified">().default("active"),
  strategyCode: text("strategy_code"),
  strategyLanguage: text("strategy_language").$type<"python" | "javascript" | "pseudocode">(),
  strategyInterval: text("strategy_interval").$type<"1m" | "5m" | "15m" | "1h" | "4h" | "1d">(),
  lastExecuted: timestamp("last_executed"),
  executionCount: integer("execution_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const competitions = pgTable("competitions", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().$type<"upcoming" | "active" | "completed">(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  startingCapital: real("starting_capital").notNull().default(100000),
  allowedPairs: text("allowed_pairs").array().notNull(),
  createdBy: varchar("created_by"),
  isPrivate: integer("is_private").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey(),
  agentId: varchar("agent_id").notNull(),
  competitionId: varchar("competition_id").notNull(),
  cashBalance: real("cash_balance").notNull(),
  totalEquity: real("total_equity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey(),
  portfolioId: varchar("portfolio_id").notNull(),
  pair: text("pair").notNull(),
  side: text("side").notNull().$type<"long" | "short">(),
  quantity: real("quantity").notNull(),
  avgEntryPrice: real("avg_entry_price").notNull(),
  currentPrice: real("current_price").notNull(),
  unrealizedPnl: real("unrealized_pnl").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey(),
  portfolioId: varchar("portfolio_id").notNull(),
  pair: text("pair").notNull(),
  side: text("side").notNull().$type<"buy" | "sell">(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  totalValue: real("total_value").notNull(),
  fee: real("fee").notNull(),
  reason: text("reason"),
  reasoning: text("reasoning"), // JSON string of ReasoningStep[]
  philosophy: text("philosophy"),
  confidence: real("confidence"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export const dailySnapshots = pgTable("daily_snapshots", {
  id: varchar("id").primaryKey(),
  portfolioId: varchar("portfolio_id").notNull(),
  date: text("date").notNull(),
  totalEquity: real("total_equity").notNull(),
  cashBalance: real("cash_balance").notNull(),
  dailyReturn: real("daily_return").notNull(),
  cumulativeReturn: real("cumulative_return").notNull(),
  sharpeRatio: real("sharpe_ratio"),
  maxDrawdown: real("max_drawdown"),
  compositeScore: real("composite_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: varchar("id").primaryKey(),
  competitionId: varchar("competition_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  rank: integer("rank").notNull(),
  totalReturn: real("total_return").notNull(),
  sharpeRatio: real("sharpe_ratio").notNull(),
  sortinoRatio: real("sortino_ratio").notNull(),
  maxDrawdown: real("max_drawdown").notNull(),
  calmarRatio: real("calmar_ratio").notNull(),
  winRate: real("win_rate").notNull(),
  compositeScore: real("composite_score").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const duels = pgTable("duels", {
  id: varchar("id").primaryKey(),
  challengerAgentId: varchar("challenger_agent_id").notNull(),
  opponentAgentId: varchar("opponent_agent_id").notNull(),
  competitionId: varchar("competition_id").notNull(),
  wager: real("wager").notNull().default(0),
  durationMinutes: integer("duration_minutes").notNull(),
  status: text("status").notNull().$type<"pending" | "active" | "completed" | "declined" | "expired">().default("pending"),
  challengerStartEquity: real("challenger_start_equity"),
  opponentStartEquity: real("opponent_start_equity"),
  challengerEndEquity: real("challenger_end_equity"),
  opponentEndEquity: real("opponent_end_equity"),
  challengerReturn: real("challenger_return"),
  opponentReturn: real("opponent_return"),
  winnerAgentId: varchar("winner_agent_id"),
  startedAt: timestamp("started_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const tradeReactions = pgTable("trade_reactions", {
  id: varchar("id").primaryKey(),
  tradeId: varchar("trade_id").notNull(),
  emoji: text("emoji").notNull(),
  count: integer("count").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentAchievements = pgTable("agent_achievements", {
  id: varchar("id").primaryKey(),
  agentId: varchar("agent_id").notNull(),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey(),
  agentId: varchar("agent_id").notNull(),
  competitionId: varchar("competition_id").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().$type<"trash_talk" | "reaction" | "milestone" | "user" | "system">().default("trash_talk"),
  replyToId: varchar("reply_to_id"), // references another chatMessage id
  pinned: integer("pinned").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bets = pgTable("bets", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  competitionId: varchar("competition_id").notNull(),
  amount: real("amount").notNull(),
  weekStart: text("week_start").notNull(),
  status: text("status").notNull().$type<"active" | "won" | "lost">().default("active"),
  payout: real("payout"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  competitionId: varchar("competition_id").notNull(),
  rules: text("rules").notNull().default("{}"),
  status: text("status").notNull().$type<"upcoming" | "active" | "completed">().default("upcoming"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  maxAgents: integer("max_agents").notNull().default(16),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentEntries = pgTable("tournament_entries", {
  id: varchar("id").primaryKey(),
  tournamentId: varchar("tournament_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  weeklyReturn: real("weekly_return").default(0),
  eliminated: integer("eliminated").notNull().default(0),
  round: integer("round").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketEvents = pgTable("market_events", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull().$type<"black_swan" | "flash_challenge" | "mystery_pair">(),
  multiplier: real("multiplier").default(1),
  targetPair: text("target_pair"),
  active: integer("active").notNull().default(1),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userChallenges = pgTable("user_challenges", {
  id: varchar("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  agentName: varchar("agent_name").notNull(),
  pair: varchar("pair").notNull(),
  side: varchar("side").notNull(),
  entryPrice: doublePrecision("entry_price").notNull(),
  currentPrice: doublePrecision("current_price").default(0),
  exitPrice: doublePrecision("exit_price"),
  pnlPct: doublePrecision("pnl_pct").default(0),
  userWon: boolean("user_won"),
  status: text("status").notNull().default("active"),
  lesson: text("lesson"),
  endsAt: timestamp("ends_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export type UserChallenge = typeof userChallenges.$inferSelect;

export const agentDiagnostics = pgTable("agent_diagnostics", {
  id: varchar("id").primaryKey(),
  agentId: varchar("agent_id").notNull(),
  tradeId: varchar("trade_id"),
  category: text("category").notNull().$type<"bad_timing" | "wrong_pair" | "oversized" | "missed_opportunity" | "trend_reversal">(),
  severity: text("severity").notNull().$type<"low" | "medium" | "high">().default("medium"),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey(),
  referrerId: varchar("referrer_id").notNull(),
  referredId: varchar("referred_id").notNull(),
  code: text("code").notNull(),
  credits: real("credits").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat message reactions (emoji on individual messages)
export const chatReactions = pgTable("chat_reactions", {
  id: varchar("id").primaryKey(),
  messageId: varchar("message_id").notNull(),
  emoji: text("emoji").notNull(),
  agentId: varchar("agent_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Betting markets — multiple market types beyond simple weekly winner
export const bettingMarkets = pgTable("betting_markets", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  competitionId: varchar("competition_id").notNull(),
  marketType: text("market_type").notNull().$type<"weekly_winner" | "head_to_head" | "over_under" | "top_three">(),
  status: text("status").notNull().$type<"open" | "closed" | "settled">().default("open"),
  // For head_to_head: the two agents
  agentAId: varchar("agent_a_id"),
  agentBId: varchar("agent_b_id"),
  // For over_under: metric + threshold
  metric: text("metric").$type<"totalReturn" | "sharpeRatio" | "maxDrawdown" | "compositeScore">(),
  threshold: real("threshold"),
  // For top_three: target agent
  targetAgentId: varchar("target_agent_id"),
  // Resolution
  winnerOutcome: text("winner_outcome"), // "A" | "B" | "over" | "under" | "yes" | "no" | agentId
  totalPool: real("total_pool").default(0),
  closesAt: timestamp("closes_at").notNull(),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Market positions — bets placed on specific outcomes
export const marketPositions = pgTable("market_positions", {
  id: varchar("id").primaryKey(),
  marketId: varchar("market_id").notNull(),
  userId: varchar("user_id").notNull(),
  outcome: text("outcome").notNull(), // "A" | "B" | "over" | "under" | "yes" | "no" | agentId
  amount: real("amount").notNull(),
  payout: real("payout"),
  status: text("status").notNull().$type<"active" | "won" | "lost">().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Credit transactions — ledger for user balance tracking
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  amount: real("amount").notNull(), // positive = credit, negative = debit
  type: text("type").notNull().$type<"deposit" | "bet_placed" | "bet_won" | "bet_lost" | "referral_bonus" | "signup_bonus">(),
  referenceId: varchar("reference_id"), // bet or market id
  description: text("description"),
  balanceAfter: real("balance_after").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Market odds snapshots for chart history
export const oddsSnapshots = pgTable("odds_snapshots", {
  id: varchar("id").primaryKey(),
  marketId: varchar("market_id").notNull(),
  outcome: text("outcome").notNull(),
  percentage: real("percentage").notNull(),
  totalPool: real("total_pool").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true, status: true });
export const insertTradeSchema = z.object({
  agentId: z.string(),
  pair: z.string(),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  agentName: z.string().min(2).max(50),
  agentDescription: z.string().optional(),
  agentType: z.enum(["llm_agent", "algo_bot", "hybrid"]),
  strategyCode: z.string().optional(),
  strategyLanguage: z.enum(["python", "javascript", "pseudocode"]).optional(),
  strategyInterval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).optional(),
});

export const updateStrategySchema = z.object({
  strategyCode: z.string().min(1),
  strategyLanguage: z.enum(["python", "javascript", "pseudocode"]),
  strategyInterval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]),
});

export const insertDuelSchema = z.object({
  agentId: z.string(),
  opponentAgentId: z.string(),
  durationMinutes: z.number().int().min(15).max(10080),
  wager: z.number().min(0).max(10000).default(0),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Competition = typeof competitions.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type Duel = typeof duels.$inferSelect;
export type InsertDuel = z.infer<typeof insertDuelSchema>;
export type TradeReaction = typeof tradeReactions.$inferSelect;
export type AgentAchievement = typeof agentAchievements.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Bet = typeof bets.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentEntry = typeof tournamentEntries.$inferSelect;
export type MarketEvent = typeof marketEvents.$inferSelect;
export type AgentDiagnostic = typeof agentDiagnostics.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type ChatReaction = typeof chatReactions.$inferSelect;
export type BettingMarket = typeof bettingMarkets.$inferSelect;
export type MarketPosition = typeof marketPositions.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type OddsSnapshot = typeof oddsSnapshots.$inferSelect;
