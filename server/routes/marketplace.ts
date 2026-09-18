/** Official marketplace API routes, ported from Ebay-amazon-app/server.ts (1b-1g). */

import { Request, Response, Router } from "express";
import { amazonProvider } from "../marketplace/amazonProvider";
import { ebayMarketplaceProvider } from "../marketplace/ebayProvider";
import { soldHistoryProvider } from "../marketplace/soldHistoryProvider";
import { marketplaceCapabilityManager } from "../marketplace/capabilityManager";
import { marketplaceCache } from "../marketplace/cache";

export const marketplaceRouter = Router();

function sendError(res: Response, err: any, fallback: string) {
  res.status(err?.status || 500).json({
    success: false,
    capability: err?.capability || "error",
    error: err?.message || fallback,
  });
}

function requireString(req: Request, res: Response, field: string): string | null {
  const value = req.body?.[field];
  if (typeof value !== "string" || !value.trim()) {
    res.status(400).json({ success: false, error: `${field} is required` });
    return null;
  }
  return value.trim();
}

marketplaceRouter.get("/marketplace/capabilities", async (_req, res) => {
  try {
    const report = await marketplaceCapabilityManager.getFullReport();
    res.json({ success: true, data: report, cacheStats: marketplaceCache.getStats() });
  } catch (err) {
    sendError(res, err, "Failed to retrieve marketplace capabilities");
  }
});

marketplaceRouter.post("/amazon/search", async (req, res) => {
  const query = requireString(req, res, "query");
  if (!query) return;
  try {
    const data = await amazonProvider.searchProducts(query, req.body.options || {});
    res.json({ success: true, source: "amazon_creators_api", provenance: "confirmed_marketplace_api", data });
  } catch (err) {
    sendError(res, err, "Failed to search Amazon Creators API");
  }
});

marketplaceRouter.post("/amazon/get-products", async (req, res) => {
  const { asins } = req.body ?? {};
  if (!Array.isArray(asins) || asins.length === 0 || !asins.every((a) => typeof a === "string")) {
    return res.status(400).json({ success: false, error: "Array of ASINs is required" });
  }
  try {
    const data = await amazonProvider.getProducts(asins, req.body.options || {});
    res.json({ success: true, source: "amazon_creators_api", provenance: "confirmed_marketplace_api", data });
  } catch (err) {
    sendError(res, err, "Failed to retrieve Amazon products");
  }
});

marketplaceRouter.post("/ebay/catalog-match", async (req, res) => {
  const query = requireString(req, res, "query");
  if (!query) return;
  try {
    const data = await ebayMarketplaceProvider.matchCatalogProduct(query);
    res.json({ success: true, source: "ebay_catalog_api", provenance: "confirmed_marketplace_api", data });
  } catch (err) {
    sendError(res, err, "Failed to match product in eBay Catalog");
  }
});

marketplaceRouter.post("/ebay/browse-search", async (req, res) => {
  const query = requireString(req, res, "query");
  if (!query) return;
  try {
    const data = await ebayMarketplaceProvider.searchBrowseItems(query, req.body.options || {});
    res.json({ success: true, source: "ebay_browse_api", provenance: "confirmed_marketplace_api", data });
  } catch (err) {
    sendError(res, err, "Failed to search eBay Browse API");
  }
});

marketplaceRouter.post("/marketplace/sold-history", async (req, res) => {
  const { query = "", asin = "", epid = "", lookbackDays = 90 } = req.body ?? {};
  if (!query && !asin && !epid) {
    return res.status(400).json({ success: false, error: "Query, ASIN, or ePID is required" });
  }
  try {
    const data = await soldHistoryProvider.getSalesHistory({ query: query || asin || epid, asin, epid, lookbackDays });
    res.json({ success: true, data });
  } catch (err) {
    sendError(res, err, "Failed to fetch sales history");
  }
});
