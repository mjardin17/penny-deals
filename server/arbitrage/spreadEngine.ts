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
import { Brain, Calibration, itemKey, PaidHistory, PriceHistory } from "../brain/brain";

export interface SpreadCandidate {
  title: string;
  buyPrice: number;
  upc?: string;
  store?: string;
  /** Omit and an assumed 1 lb, 10x8x4 in package is used (stated in the result). */
  pkg?: PackageSpec;
  /**
   * True only when a person typed this buy price. Pre-filled numbers (sample deals, calculators)
   * are never remembered as "a price you saw".
   */
  priceIsUserTyped?: boolean;
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

/** What the brain contributed to this result, so nothing it does is hidden. */
export interface BrainNotes {
  history: PriceHistory;
  calibration?: Calibration;
  /** True only when the learned ratio actually lowered the resale price. */
  calibrationApplied: boolean;
  blockedListingsSkipped: number;
  storeNotInStoreReports?: number;
}

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
  brain?: BrainNotes;
}

export interface SpreadReport {
  candidate: SpreadCandidate;
  packageAssumed: boolean;
  channels: ChannelSpread[];
  bestRealSpread?: ChannelSpread;
  checkedAt: string;
  /** Prices you entered for this item BEFORE this check (this one is saved after). */
  yourPriceHistory?: PaidHistory;
}

export interface SpreadProviders {
  searchEbay(query: string, opts?: { gtin?: string }): Promise<NormalizedEbayListing[]>;
  searchAmazon(query: string): Promise<NormalizedAmazonProduct[]>;
}

export const liveProviders: SpreadProviders = {
  searchEbay: (q, opts) =>
    ebayMarketplaceProvider.searchBrowseItems(q, {
      limit: 50,
      filter: "buyingOptions:{FIXED_PRICE},conditions:{NEW}",
      gtin: opts?.gtin,
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

/** Memory must never break a lookup: a failed read or write is logged and the lookup carries on without it. */
function safeBrain<T>(label: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    console.error(`[brain] ${label} failed:`, err);
    return fallback;
  }
}

/** eBay's test environment returns made-up listings; they must never become remembered prices. */
function isEbaySandbox(): boolean {
  return (process.env.EBAY_ENVIRONMENT || "").toUpperCase() === "SANDBOX";
}

function rememberLookup(brain: Brain | undefined, obs: Parameters<Brain["recordObservation"]>[0]): void {
  if (!brain || isEbaySandbox()) return;
  safeBrain("saving the price lookup", () => brain.recordObservation(obs), false);
}

/** Returns what the user entered before. Saves the price only when a person typed it. */
function rememberEnteredPrice(brain: Brain, c: SpreadCandidate): PaidHistory | undefined {
  const key = itemKey(c.title, c.upc);
  const before = safeBrain<PaidHistory | undefined>("reading your saved prices", () => brain.paidHistory(key), undefined);
  if (c.priceIsUserTyped === true && c.buyPrice > 0) {
    safeBrain("saving the price you entered", () => brain.recordSighting({ key, price: c.buyPrice, store: c.store }), false);
  }
  return before;
}

async function ebaySpread(
  c: SpreadCandidate,
  pkg: PackageSpec,
  p: SpreadProviders,
  t: SpreadThresholds,
  brain?: Brain
): Promise<ChannelSpread> {
  const base = { channel: "ebay" as const, isRealSpread: false };
  let listings: NormalizedEbayListing[];
  // A barcode match needs no title overlap; a title fallback is scored like any keyword search.
  let viaBarcode = Boolean(c.upc);
  let barcodeMissed = false;
  try {
    listings = c.upc ? await p.searchEbay(c.title, { gtin: c.upc }) : await p.searchEbay(c.title);
    if (c.upc && listings.length === 0) {
      barcodeMissed = true;
      viaBarcode = false;
      listings = await p.searchEbay(c.title);
    }
  } catch (err) {
    const { status, message } = errorStatus(err);
    return { ...base, status, statusMessage: message };
  }

  const key = itemKey(c.title, c.upc);
  const blocked = brain ? safeBrain("reading wrong-match blocks", () => brain.blockedUrls(key), new Set<string>()) : new Set<string>();
  const usable = listings.filter((l) => !blocked.has(l.itemWebUrl));
  const blockedListingsSkipped = listings.length - usable.length;
  const matched = viaBarcode ? usable : usable.filter((l) => titleMatchScore(c.title, l.title) >= t.minTitleMatch);
  if (matched.length < t.minEbayComps) {
    return {
      ...base,
      status: matched.length === 0 ? "no_match" : "insufficient_comps",
      statusMessage: `${matched.length} matching active listings (need ${t.minEbayComps}).${barcodeMissed ? " The barcode found nothing, so this used the title." : ""}`,
    };
  }

  const delivered = matched.map((l) => l.price + (l.shippingCost ?? 0)).sort((a, b) => a - b);
  const rawResale = Math.round(percentile(delivered, 0.25) * 100) / 100;
  rememberLookup(brain, { key, channel: "ebay", resalePrice: rawResale, sampleSize: matched.length, basis: "active_ask", store: c.store });

  // Learned from the user's own past sales of this item: only ever lowers the estimate.
  const calibration = (brain ? safeBrain("reading learned sales", () => brain.calibration(key), null) : null) ?? undefined;
  const calibrationApplied = Boolean(calibration && calibration.ratio < 1);
  const resalePrice = calibrationApplied ? Math.round(rawResale * (calibration as Calibration).ratio * 100) / 100 : rawResale;
  const cheapest = matched.reduce((a, b) => (a.price + (a.shippingCost ?? 0) <= b.price + (b.shippingCost ?? 0) ? a : b));
  // Price as free-shipping listing at the delivered comp price; we pay postage.
  const profit = calculateProfit({ channel: "ebay", salePrice: resalePrice, cogs: c.buyPrice, pkg });

  return {
    ...base,
    status: "ok",
    statusMessage: `${matched.length} new fixed-price active listings via eBay Browse API.${barcodeMissed ? " The barcode found nothing on eBay, so this matched by title." : ""}`,
    resalePrice,
    resaleBasis:
      "25th percentile of delivered price, active new listings (not sold comps)" +
      (calibrationApplied
        ? `; lowered x${(calibration as Calibration).ratio} based on ${(calibration as Calibration).samples} of your past sales of this item`
        : ""),
    matchedTitle: cheapest.title,
    matchUrl: cheapest.itemWebUrl,
    matchScore: viaBarcode ? 1 : titleMatchScore(c.title, cheapest.title),
    profit,
    isRealSpread: judge(profit, t),
    brain: brain
      ? {
          history: safeBrain("reading price history", () => brain.history(key), { count: 0, spanDays: 0 }),
          calibration,
          calibrationApplied,
          blockedListingsSkipped,
          storeNotInStoreReports: c.store ? safeBrain("reading store reports", () => brain.storeReports(c.store as string).notInStore, undefined) : undefined,
        }
      : undefined,
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
    // Amazon category gating is not checked here.
    isRealSpread: judge(profit, t),
  };
}

export async function findSpread(
  candidate: SpreadCandidate,
  providers: SpreadProviders = liveProviders,
  thresholds: SpreadThresholds = DEFAULT_THRESHOLDS,
  brain?: Brain
): Promise<SpreadReport> {
  if (!candidate.title?.trim()) throw new Error("title is required");
  if (!(candidate.buyPrice >= 0)) throw new Error("buyPrice must be a non-negative number");

  const pkg = candidate.pkg ?? ASSUMED_PACKAGE;
  const yourPriceHistory = brain ? rememberEnteredPrice(brain, candidate) : undefined;
  const channels = await Promise.all([
    ebaySpread(candidate, pkg, providers, thresholds, brain),
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
    yourPriceHistory,
  };
}
