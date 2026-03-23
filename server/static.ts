import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets with long cache (they have content hashes)
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Serve other static files (favicon, manifest, etc.)
  app.use(express.static(distPath, {
    index: false, // Don't auto-serve index.html for directory requests
  }));

  // SPA fallback: serve index.html with no-cache for all other routes
  app.use("/{*path}", (_req, res) => {
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
