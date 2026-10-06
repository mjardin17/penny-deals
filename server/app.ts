/**
 * Builds the Penny Deals API. Kept apart from server.ts so tests can run the real thing.
 * Order matters: the rate limiters sit BEFORE the routes they protect.
 */

import express, { Express } from "express";
import { marketplaceRouter } from "./routes/marketplace";
import { arbitrageRouter } from "./routes/arbitrage";
import { learningRouter } from "./routes/learning";
import { couponsRouter } from "./routes/coupons";
import { createBrainRouter } from "./routes/brain";
import { createIntegrationsRouter } from "./routes/integrations";
import { createDealsRouter } from "./routes/deals";
import { createCardsRouter } from "./routes/cards";
import { rateLimit } from "./middleware/rateLimit";
import { marketplaceCache } from "./marketplace/cache";
import { basicAuthMiddleware } from "./basicAuth";

const MINUTE = 60_000;

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(basicAuthMiddleware(process.env.TUNNEL_BASIC_AUTH_USER, process.env.TUNNEL_BASIC_AUTH_PASS));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasEbayCreds: Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
      hasAmazonCreds: Boolean(process.env.AMAZON_CREATORS_CREDENTIAL_ID && process.env.AMAZON_CREATORS_CREDENTIAL_SECRET),
      hasAmazonPartnerTag: Boolean(process.env.AMAZON_PARTNER_TAG),
      marketplaceCacheStats: marketplaceCache.getStats(),
    });
  });

  // Anything that spends eBay or Amazon quota, calls another service, or writes to disk is limited per client.
  const limits: Array<[string, number]> = [
    ["/api/arbitrage", 30],
    ["/api/ebay", 30],
    ["/api/amazon", 30],
    ["/api/marketplace", 30],
    ["/api/brain", 120],
    ["/api/learning", 60],
    ["/api/coupons", 60],
    ["/api/integrations", 30],
    ["/api/deals", 20],
    ["/api/cards", 30],
  ];
  for (const [prefix, max] of limits) app.use(prefix, rateLimit({ windowMs: MINUTE, max }));

  app.use("/api", marketplaceRouter);
  app.use("/api", arbitrageRouter);
  app.use("/api", learningRouter);
  app.use("/api", createBrainRouter());
  app.use("/api", createIntegrationsRouter());
  app.use("/api", createDealsRouter());
  app.use("/api", createCardsRouter());
  app.use("/api", couponsRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ success: false, error: "Unknown API route" });
  });

  return app;
}
