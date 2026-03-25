import { log } from "../index";
import { storage } from "../storage";
import { getStrategy, getAllStrategyAgentIds } from "../agentEngine";
import { executeTrade } from "../tradeExecutor";

let tickIndex = 0;
const AGENTS_PER_TICK = 1;
const MAX_POSITIONS = 3;
const MAX_POSITION_VALUE_PCT = 0.05; // No single position > 5% of starting capital

export function startAgentTrader(intervalMs = 30000) {
  setInterval(runTick, intervalMs);
  log(`Agent trader started (${intervalMs / 1000}s interval, ${AGENTS_PER_TICK} agents/tick)`, "agent-trader");
}

async function runTick() {
  try {
    const agentIds = getAllStrategyAgentIds();
    const start = (tickIndex * AGENTS_PER_TICK) % agentIds.length;
    const batch = [];
    for (let i = 0; i < AGENTS_PER_TICK; i++) {
      batch.push(agentIds[(start + i) % agentIds.length]);
    }
    tickIndex++;

    for (const agentId of batch) {
      await evaluateAgent(agentId);
    }
  } catch (err: any) {
    log(`Agent trader error: ${err.message}`, "agent-trader");
  }
}

async function evaluateAgent(agentId: string) {
  try {
    const strategy = getStrategy(agentId);
    if (!strategy) return;

    const agent = await storage.getAgent(agentId);
    if (!agent || agent.status !== "active") return;

    const comp = await storage.getActiveCompetition();
    if (!comp) return;

    const portfolio = await storage.getPortfolioByAgent(agentId, comp.id);
    if (!portfolio) return;

    const positions = await storage.getPositionsByPortfolio(portfolio.id);

    // Don't open more than MAX_POSITIONS
    const signal = strategy(agentId, portfolio.cashBalance, positions);

    if (signal.action === "hold") return;

    // Skip if trying to buy with too many positions
    if (signal.action === "buy" && positions.length >= MAX_POSITIONS) {
      return;
    }

    // Ensure quantity is reasonable
    if (signal.quantity <= 0) return;

    // Cap position size: no single trade should exceed MAX_POSITION_VALUE_PCT of starting capital
    {
      const { getPriceForPair } = await import("../prices");
      const price = getPriceForPair(signal.pair);
      if (price) {
        const maxValue = comp.startingCapital * MAX_POSITION_VALUE_PCT;
        const tradeValue = signal.quantity * price;
        if (tradeValue > maxValue) {
          signal.quantity = Math.max(0.001, Math.floor((maxValue / price) * 10000) / 10000);
        }
      }
    }

    // Default confidence based on action if not set by strategy
    const confidence = signal.confidence ?? (signal.action === "hold" ? 0.3 + Math.random() * 0.2 : 0.5 + Math.random() * 0.4);
    const result = await executeTrade(agentId, signal.pair, signal.action, signal.quantity, signal.reason, signal.reasoning, signal.philosophy, Math.round(confidence * 100) / 100);
    if (result.success) {
      log(`${agent.name} ${signal.action.toUpperCase()} ${signal.quantity} ${signal.pair} — ${signal.reason}`, "agent-trader");
    }
  } catch (err: any) {
    log(`Agent ${agentId} error: ${err.message}`, "agent-trader");
  }
}
