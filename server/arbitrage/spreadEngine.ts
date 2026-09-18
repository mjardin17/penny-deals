/**
 * Spread engine: cheap find -> live eBay / Amazon cross-reference -> real fees -> flag.
 *
 * Rules that keep it honest:
 *  - Only marketplace API data is used for resale prices. No AI estimates.
 *  - eBay Browse returns ACTIVE listings, not sold ones, so the resale estimate is the
 *    25th percentile of new, fixed-price asks (a price you can undercut to), and the
 *    result says so.
 *  - A spread is flagged only when the comps are confirmed, the match is confident,
 *    every fee came from a verified table, and profit/ROI clear the thresholds.
 */

import { ebayMarketplaceProvider } from "../marketplace/ebayProvider";
import { amazonProvider } from "../marketplace/amazonProvider";
import { NormalizedAmazonProduct, NormalizedEbayListing } from "../marketplace/types";
import { calculateProfit, PackageSpec, ProfitResult, SalesChannel } from "../../shared/fees";

export interface SpreadCandidate {
  title: string;
  buyPrice: number;
  upc?: string;
  store?: string;
  /** Omit and an assumed 1 lb, 10x8x4 in package is used (stated in the result). */
  pkg?: PackageSpec;
}

export interface SpreadThresholds {
  minProfit: number;
  minRoiPct: number;
  minEbayComps: number;
  minTitleMatch: number;
}

export const DEFAULT_THRESHOLDS: SpreadThresholds = {
  minProfit: 10,
  minRoiPct: 50,
  minEbayComps: 5,
  minTitleMatch: 0.5,
};

export const ASSUMED_PACKAGE: PackageSpec = { lengthIn: 10, widthIn: 8, heightIn: 4, weightLb: 1 };

export type LookupStatus = "ok" | "not_configured" | "no_match" | "insufficient_comps" | "error";

export interface ChannelSpread {
  channel: SalesChannel;
  status: LookupStatus;
  statusMessage: string;
  resalePrice?: number;
  resaleBasis?: string;
  matchedTitle?: string;
  matchUrl?: string;
  matchScore?: number;
  profit?: ProfitResult;
  isRealSpread: boolean;
}

export interface SpreadReport {
  candidate: SpreadCandidate;
  packageAssumed: boolean;
  channels: ChannelSpread[];
  bestRealSpread?: ChannelSpread;
  checkedAt: string;
}

export interface SpreadProviders {
  searchEbay(query: string): Promise<NormalizedEbayListing[]>;
  searchAmazon(query: string): Promise<NormalizedAmazonProduct[]>;
}

export const liveProviders: SpreadProviders = {
  searchEbay: (q) =>
    ebayMarketplaceProvider.searchBrowseItems(q, {
      limit: 50,
      filter: "buyingOptions:{FIXED_PRICE},conditions:{NEW}",
    }),
  searchAmazon: (q) => amazonProvider.searchProducts(q, { itemCount: 5 }),
};

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "for", "with", "of", "in", "to", "by", "new", "pack", "set"]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  );
}

/** Share of the candidate's words found in the listing title (0-1). */
export function titleMatchScore(candidateTitle: string, listingTitle: string): number {
  const want = tokens(candidateTitle);
  if (want.size === 0) return 0;
  const have = tokens(listingTitle);
  let hits = 0;
  for (const t of want) if (have.has(t)) hits++;
  return hits / want.size;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function errorStatus(err: unknown): { status: LookupStatus; message: string } {
  const e = err as { capability?: string; message?: string };
  if (e?.capability === "not_configured") return { status: "not_configured", message: e.message ?? "Credentials not configured." };
  return { status: "error", message: e?.message ?? String(err) };
}

function judge(profit: ProfitResult, t: SpreadThresholds): boolean {
  return profit.feesVerified && profit.netProfit >= t.minProfit && profit.roiPct >= t.minRoiPct;
}

async function ebaySpread(c: SpreadCandidate, pkg: PackageSpec, p: SpreadProviders, t: SpreadThresholds): Promise<ChannelSpread> {
  const base = { channel: "ebay" as const, isRealSpread: false };
  let listings: NormalizedEbayListing[];
  try {
    listings = await p.searchEbay(c.upc || c.title);
  } catch (err) {
    const { status, message } = errorStatus(err);
    return { ...base, status, statusMessage: message };
  }

  const matched = c.upc ? listings : listings.filter((l) => titleMatchScore(c.title, l.title) >= t.minTitleMatch);
  if (matched.length < t.minEbayComps) {
    return {
      ...base,
      status: matched.length === 0 ? "no_match" : "insufficient_comps",
      statusMessage: `${matched.length} matching active listings (need ${t.minEbayComps}).`,
    };
  }

  const delivered = matched.map((l) => l.price + (l.shippingCost ?? 0)).sort((a, b) => a - b);
  const resalePrice = Math.round(percentile(delivered, 0.25) * 100) / 100;
  const cheapest = matched.reduce((a, b) => (a.price + (a.shippingCost ?? 0) <= b.price + (b.shippingCost ?? 0) ? a : b));
  // Price as free-shipping listing at the delivered comp price; we pay postage.
  const profit = calculateProfit({ channel: "ebay", salePrice: resalePrice, cogs: c.buyPrice, pkg });

  return {
    ...base,
    status: "ok",
    statusMessage: `${matched.length} new fixed-price active listings via eBay Browse API.`,
    resalePrice,
    resaleBasis: "25th percentile of delivered price, active new listings (not sold comps)",
    matchedTitle: cheapest.title,
    matchUrl: cheapest.itemWebUrl,
    matchScore: c.upc ? 1 : titleMatchScore(c.title, cheapest.title),
    profit,
    isRealSpread: judge(profit, t),
  };
}

async function amazonSpread(c: SpreadCandidate, pkg: PackageSpec, p: SpreadProviders, t: SpreadThresholds): Promise<ChannelSpread> {
  const base = { channel: "amazonFba" as const, isRealSpread: false };
  let products: NormalizedAmazonProduct[];
  try {
    products = await p.searchAmazon(c.upc || c.title);
  } catch (err) {
    const { status, message } = errorStatus(err);
    return { ...base, status, statusMessage: message };
  }

  const scored = products
    .map((prod) => ({ prod, score: c.upc ? 1 : titleMatchScore(c.title, prod.title) }))
    .filter((x) => x.score >= t.minTitleMatch && (x.prod.buyBoxPrice ?? x.prod.offersV2[0]?.price))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { ...base, status: "no_match", statusMessage: "No confident Amazon match with a live price." };
  }

  const { prod, score } = scored[0];
  const resalePrice = (prod.buyBoxPrice ?? prod.offersV2[0].price) as number;
  const profit = calculateProfit({ channel: "amazonFba", salePrice: resalePrice, cogs: c.buyPrice, pkg });

  return {
    ...base,
    status: "ok",
    statusMessage: `Matched ASIN ${prod.asin} via Amazon Creators API.`,
    resalePrice,
    resaleBasis: prod.buyBoxPrice ? "Buy Box price" : "Lowest listed offer",
    matchedTitle: prod.title,
    matchUrl: prod.detailPageUrl,
    matchScore: score,
    profit,
    // Gating is not checked here; the UI links to the Boxem ungating tool.
    isRealSpread: judge(profit, t),
  };
}

export async function findSpread(
  candidate: SpreadCandidate,
  providers: SpreadProviders = liveProviders,
  thresholds: SpreadThresholds = DEFAULT_THRESHOLDS
): Promise<SpreadReport> {
  if (!candidate.title?.trim()) throw new Error("title is required");
  if (!(candidate.buyPrice >= 0)) throw new Error("buyPrice must be a non-negative number");

  const pkg = candidate.pkg ?? ASSUMED_PACKAGE;
  const channels = await Promise.all([
    ebaySpread(candidate, pkg, providers, thresholds),
    amazonSpread(candidate, pkg, providers, thresholds),
  ]);
  const real = channels.filter((ch) => ch.isRealSpread);
  const bestRealSpread = real.sort((a, b) => b.profit!.netProfit - a.profit!.netProfit)[0];

  return {
    candidate,
    packageAssumed: !candidate.pkg,
    channels,
    bestRealSpread,
    checkedAt: new Date().toISOString(),
  };
}
