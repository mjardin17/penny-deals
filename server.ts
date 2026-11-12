/**
 * Penny Deals server: serves the app (Vite in development, the built files in production) and the API.
 * The API itself is built in server/app.ts.
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createApp } from "./server/app";
import { isExposed, resolveHost } from "./server/bindHost";
import { startDropAlerts } from "./server/drops/watcher";
import { sharedDrops } from "./server/drops/dropFeed";
import { sharedLiveDeals } from "./server/deals/liveDeals";

dotenv.config({ path: [".env.local", ".env"] });

const PORT = Number(process.env.PORT) || 3000;
// This computer only by default. The phone reaches it through Tailscale Serve, which forwards to localhost.
// Set HOST=0.0.0.0 only if you want other devices to connect directly (and then set the TUNNEL_BASIC_AUTH_* password).
const HOST = resolveHost(process.env);
const app = createApp();

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--prod");
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "mpa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, HOST, () => {
    console.log(`Penny Deals server running on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    if (isExposed(HOST) && !(process.env.TUNNEL_BASIC_AUTH_USER && process.env.TUNNEL_BASIC_AUTH_PASS)) {
      console.warn(`WARNING: listening on ${HOST} with no password. Anyone who can reach this PC can use the app. Set TUNNEL_BASIC_AUTH_USER and TUNNEL_BASIC_AUTH_PASS, or remove HOST.`);
    }
    // Pokémon drop alerts to your own Discord channel. Off unless DISCORD_DROPS_WEBHOOK_URL is set.
    startDropAlerts(process.env, async (zip) => {
      const bestBuy = await sharedDrops().bestBuy.check(zip);
      try {
        const feed = await sharedLiveDeals().get(zip);
        return { bestBuy, community: { ok: !feed.stale, hits: feed.hits.filter((h) => h.kind === "pokemon") } };
      } catch {
        return { bestBuy, community: { ok: false, hits: [] } };
      }
    });
  });
}

startServer();
