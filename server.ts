/**
 * Penny Deals server: serves the Vite app and the arbitrage API
 * (merged from Ebay-amazon-app).
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { marketplaceRouter } from "./server/routes/marketplace";
import { aiResearchRouter } from "./server/routes/aiResearch";
import { arbitrageRouter } from "./server/routes/arbitrage";
import { learningRouter } from "./server/routes/learning";
import { couponsRouter } from "./server/routes/coupons";
import { marketplaceCache } from "./server/marketplace/cache";
import { cacheSize } from "./server/gemini";
import { basicAuthMiddleware } from "./server/basicAuth";
import { configuredProviders } from "./server/ai/orchestrator";

dotenv.config({ path: [".env.local", ".env"] });

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(basicAuthMiddleware(process.env.TUNNEL_BASIC_AUTH_USER, process.env.TUNNEL_BASIC_AUTH_PASS));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    aiProvidersConfigured: configuredProviders(),
    hasEbayCreds: Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
    hasAmazonCreds: Boolean(process.env.AMAZON_CREATORS_CREDENTIAL_ID && process.env.AMAZON_CREATORS_CREDENTIAL_SECRET),
    hasAmazonPartnerTag: Boolean(process.env.AMAZON_PARTNER_TAG),
    aiCacheSize: cacheSize(),
    marketplaceCacheStats: marketplaceCache.getStats(),
  });
});

app.use("/api", marketplaceRouter);
app.use("/api", aiResearchRouter);
app.use("/api", arbitrageRouter);
app.use("/api", learningRouter);
app.use("/api", couponsRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "Unknown API route" });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--prod");
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Penny Deals server running on http://localhost:${PORT}`);
  });
}

startServer();
