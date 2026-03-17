import { pgTable, text, varchar, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().$type<"llm_agent" | "algo_bot" | "hybrid">(),
  status: text("status").notNull().$type<"active" | "paused" | "disqualified">().default("active"),
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
