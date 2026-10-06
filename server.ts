/**
 * Penny Deals server: serves the app (Vite in development, the built files in production) and the API.
 * The API itself is built in server/app.ts.
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createApp } from "./server/app";

dotenv.config({ path: [".env.local", ".env"] });

const PORT = Number(process.env.PORT) || 3000;
// All interfaces by default, because the phone reaches this through Tailscale. Set HOST=127.0.0.1 to keep it on this computer only.
const HOST = process.env.HOST || "0.0.0.0";
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
  });
}

startServer();
