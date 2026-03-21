import { randomUUID } from "crypto";
import { log } from "../index";
import { storage } from "../storage";

const EVENT_TEMPLATES = [
  { name: "BTC Flash Crash", description: "Bitcoin plunges 15% in minutes. Extreme volatility ahead.", eventType: "black_swan" as const, targetPair: "BTC/USD", multiplier: 3.0 },
  { name: "ETH Surge", description: "Ethereum moons on surprise ETF approval rumors.", eventType: "black_swan" as const, targetPair: "ETH/USD", multiplier: 2.5 },
  { name: "SOL Liquidation Cascade", description: "Massive SOL positions liquidated. Prepare for volatility.", eventType: "black_swan" as const, targetPair: "SOL/USD", multiplier: 4.0 },
  { name: "30-Minute Sprint", description: "Most profit in 30 minutes wins 500 bonus credits!", eventType: "flash_challenge" as const, targetPair: null, multiplier: 1.0 },
  { name: "Scalp Challenge", description: "Execute 5 profitable trades in 1 hour. Speed is everything.", eventType: "flash_challenge" as const, targetPair: null, multiplier: 1.0 },
  { name: "PEPE Mania", description: "Mystery pair PEPE/USD is now tradeable for 1 hour!", eventType: "mystery_pair" as const, targetPair: "PEPE/USD", multiplier: 5.0 },
  { name: "DOGE Frenzy", description: "DOGE volatility spike detected. 2x multiplier active.", eventType: "black_swan" as const, targetPair: "DOGE/USD", multiplier: 2.0 },
  { name: "AVAX Breakout", description: "AVAX breaking resistance. Momentum traders, this is your moment.", eventType: "black_swan" as const, targetPair: "AVAX/USD", multiplier: 2.0 },
];

export function startChaosEngine(intervalMs = 600000) {
  setInterval(maybeCreateEvent, intervalMs);
  log("Chaos engine started (10min interval, ~10% trigger chance)", "chaos");
}

async function maybeCreateEvent() {
  try {
    // Only 10% chance of triggering per check
    if (Math.random() > 0.10) return;

    // Don't create if there's already an active event
    const active = await storage.getActiveEvents();
    if (active.length > 0) return;

    const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    const durationMs = template.eventType === "mystery_pair" ? 3600000 : 1800000; // 1h or 30m
    const now = new Date();

    const event = await storage.createMarketEvent({
      id: randomUUID(),
      name: template.name,
      description: template.description,
      eventType: template.eventType,
      multiplier: template.multiplier,
      targetPair: template.targetPair,
      active: 1,
      startsAt: now,
      endsAt: new Date(now.getTime() + durationMs),
      createdAt: now,
    });

    log(`CHAOS EVENT: ${template.name} — ${template.description}`, "chaos");

    // Auto-deactivate after duration
    setTimeout(async () => {
      try {
        await storage.updateMarketEvent(event.id, { active: 0 });
        log(`Chaos event "${template.name}" ended`, "chaos");
      } catch (e) {}
    }, durationMs);
  } catch (err: any) {
    log(`Chaos engine error: ${err.message}`, "chaos");
  }
}
