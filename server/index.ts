import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { storagePromise } = await import("./storage");
  await storagePromise;

  // Setup auth (must be before routes)
  const { setupAuth } = await import("./auth");
  setupAuth(app);

  await registerRoutes(httpServer, app);

  // Setup WebSocket
  const { setupWebSocket } = await import("./websocket");
  setupWebSocket(httpServer);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Start background jobs when using database storage
  if (process.env.DATABASE_URL) {
    const { startRevaluationJob } = await import("./jobs/revaluation");
    const { startDailySnapshotJob } = await import("./jobs/dailySnapshot");
    startRevaluationJob(30000);
    startDailySnapshotJob();
    const { startDuelResolutionJob } = await import("./jobs/duelResolution");
    startDuelResolutionJob(15000);
    const { startAchievementCheckerJob } = await import("./jobs/achievementChecker");
    startAchievementCheckerJob(60000);
    const { startTrashTalkJob } = await import("./jobs/trashTalk");
    startTrashTalkJob(180000);
    const { startBetSettlementJob } = await import("./jobs/betSettlement");
    startBetSettlementJob(60000);
    const { startTournamentRunner } = await import("./jobs/tournamentRunner");
    startTournamentRunner(3600000);
    const { startChaosEngine } = await import("./jobs/chaosEngine");
    startChaosEngine(600000);
    const { startPriceHistory } = await import("./priceHistory");
    startPriceHistory(30000);
    const { startAgentTrader } = await import("./jobs/agentTrader");
    // Start after 60s to let price history build up
    setTimeout(() => startAgentTrader(30000), 60000);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
