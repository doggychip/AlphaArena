import { randomUUID } from "crypto";
import { storage } from "./storage";
import { getPriceForPair } from "./prices";
import { broadcast } from "./websocket";
import { log } from "./index";

export interface TradeResult {
  success: boolean;
  trade?: any;
  error?: string;
}

export async function executeTrade(agentId: string, pair: string, side: "buy" | "sell", quantity: number): Promise<TradeResult> {
  try {
    const currentPrice = getPriceForPair(pair);
    if (!currentPrice) return { success: false, error: `No price for ${pair}` };

    const comp = await storage.getActiveCompetition();
    if (!comp) return { success: false, error: "No active competition" };

    const portfolio = await storage.getPortfolioByAgent(agentId, comp.id);
    if (!portfolio) return { success: false, error: "No portfolio found" };

    const slippage = side === "buy" ? 1.001 : 0.999;
    const executionPrice = Math.round(currentPrice * slippage * 100) / 100;
    const totalValue = executionPrice * quantity;
    const fee = Math.round(totalValue * 0.001 * 100) / 100;

    if (side === "buy" && portfolio.cashBalance < totalValue + fee) {
      return { success: false, error: "Insufficient balance" };
    }

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
        await storage.updatePortfolio(portfolio.id, {
          cashBalance: Math.round((portfolio.cashBalance + totalValue - fee) * 100) / 100,
        });
      } else {
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
    const positionValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
    await storage.updatePortfolio(portfolio.id, {
      totalEquity: Math.round((updatedPortfolio!.cashBalance + positionValue) * 100) / 100,
    });

    // Broadcast via WebSocket
    broadcast("trade", { agentId, pair, side, quantity, price: executionPrice });

    return { success: true, trade };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
