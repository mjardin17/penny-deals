/**
 * Penny Deals server: serves the app (Vite in development, the built files in production) and the API.
 * The API itself is built in server/app.ts.
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createApp } from "./server/app";
import { isExposed, resolveHost } from "./server/bindHost";

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
  });
}

startServer();
