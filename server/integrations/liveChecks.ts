/**
 * Live proof that each integration works, not just that a key is saved.
 * One small real call per service. Failures say why in plain words; secrets never appear in the output.
 */

import { Brain } from "../brain/brain";

export type IntegrationState = "working" | "failing" | "not_configured" | "not_built";

export interface IntegrationStatus {
  id: string;
  name: string;
  state: IntegrationState;
  detail: string;
  /** True when this result came from a real call made just now (or within the cache window). */
  checkedLive: boolean;
  checkedAt: string;
}

export interface IntegrationDeps {
  env: Record<string, string | undefined>;
  fetchImpl: typeof fetch;
  ebay: { hasCredentials(): boolean; probe(): Promise<number> };
  amazon: { status(): Promise<{ state: string; message?: string }> };
  brain: { available: boolean; error?: string } | { available: boolean; error?: string; instance?: Brain };
  now: () => number;
  timeoutMs: number;
}

const CACHE_MS = 60_000;
const GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1";

/** Remove anything that looks like one of our own secrets from text that will be shown. */
function scrub(text: string, env: Record<string, string | undefined>): string {
  let out = text;
  for (const [key, value] of Object.entries(env)) {
    if (value && value.length >= 6 && /KEY|SECRET|TOKEN|PASS|CREDENTIAL/i.test(key)) out = out.split(value).join("[hidden]");
  }
  return out.replace(/AIza[0-9A-Za-z_-]{10,}/g, "[hidden]").slice(0, 240);
}

type Outcome = { state: IntegrationState; detail: string; live: boolean };

async function checkEbayBrowse(d: IntegrationDeps): Promise<Outcome> {
  if (!d.ebay.hasCredentials()) {
    return { state: "not_configured", detail: "Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to .env.", live: false };
  }
  const count = await d.ebay.probe();
  if (count > 0) return { state: "working", detail: `Live eBay search returned ${count} listing(s).`, live: true };
  return { state: "failing", detail: "eBay accepted the keys but the test search returned no listings.", live: true };
}

function checkEbaySold(d: IntegrationDeps): Outcome {
  if (d.env.EBAY_MARKETPLACE_INSIGHTS_APPROVED === "true") {
    return { state: "failing", detail: "Marked approved, but sold-price lookups are not live-tested yet.", live: false };
  }
  return {
    state: "not_configured",
    detail: "Real sold prices need eBay Marketplace Insights approval. Until then the app shows live asking prices and says so.",
    live: false,
  };
}

async function checkGemini(d: IntegrationDeps): Promise<Outcome> {
  const key = d.env.GEMINI_API_KEY?.trim();
  if (!key) return { state: "not_configured", detail: "Add GEMINI_API_KEY (free at aistudio.google.com) to turn on the AI tools.", live: false };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), d.timeoutMs);
  try {
    const res = await d.fetchImpl(GEMINI_MODELS_URL, { headers: { "x-goog-api-key": key }, signal: controller.signal });
    if (!res.ok) {
      const why = res.status === 400 || res.status === 403 ? "Google rejected this key" : "Google returned an error";
      return { state: "failing", detail: `${why} (HTTP ${res.status}).`, live: true };
    }
    const body = (await res.json()) as { models?: unknown[] };
    if (!Array.isArray(body.models) || body.models.length === 0) {
      return { state: "failing", detail: "Google accepted the key but listed no models.", live: true };
    }
    return { state: "working", detail: "Google accepted the key.", live: true };
  } catch (err) {
    if (controller.signal.aborted) return { state: "failing", detail: `Google did not answer within ${Math.round(d.timeoutMs / 1000)}s (timed out).`, live: true };
    return { state: "failing", detail: `Could not reach Google: ${scrub((err as Error).message, d.env)}`, live: true };
  } finally {
    clearTimeout(timer);
  }
}

async function checkAmazon(d: IntegrationDeps): Promise<Outcome> {
  const s = await d.amazon.status();
  if (s.state === "not_configured") {
    return { state: "not_configured", detail: "Needs Amazon Creators API credentials (and your Associates tag for earning links).", live: false };
  }
  if (s.state === "available") return { state: "working", detail: s.message ?? "Amazon accepted the credentials.", live: true };
  return { state: "failing", detail: scrub(s.message ?? `Amazon reported: ${s.state}`, d.env), live: true };
}

function checkBrain(d: IntegrationDeps): Outcome {
  if (d.brain.available) return { state: "working", detail: "Remembering prices, wrong matches and sales.", live: false };
  return { state: "failing", detail: scrub(d.brain.error ?? "The price memory is off.", d.env), live: false };
}

const CHECKS: Array<{ id: string; name: string; run: (d: IntegrationDeps) => Promise<Outcome> | Outcome }> = [
  { id: "ebay_browse", name: "eBay live prices", run: checkEbayBrowse },
  { id: "ebay_sold_prices", name: "eBay sold prices", run: checkEbaySold },
  { id: "amazon_creators", name: "Amazon prices", run: checkAmazon },
  { id: "gemini", name: "AI tools (Gemini)", run: checkGemini },
  { id: "price_brain", name: "Price memory", run: checkBrain },
  {
    id: "tiktok_shop",
    name: "TikTok Shop",
    run: () => ({ state: "not_built", detail: "Seller login code exists but is not turned on: TikTok's web addresses are unverified.", live: false }),
  },
  {
    id: "affiliate_coupon_feeds",
    name: "Rakuten / Impact / CJ / Sovrn coupons",
    run: () => ({ state: "not_built", detail: "Waiting on approved-publisher signups; your own coupon store works.", live: false }),
  },
];

export function createIntegrationChecker(deps: IntegrationDeps) {
  let cache: { at: number; report: IntegrationStatus[] } | null = null;

  async function run(): Promise<IntegrationStatus[]> {
    const checkedAt = new Date(deps.now()).toISOString();
    return Promise.all(
      CHECKS.map(async ({ id, name, run: check }): Promise<IntegrationStatus> => {
        try {
          const out = await check(deps);
          return { id, name, state: out.state, detail: out.detail, checkedLive: out.live, checkedAt };
        } catch (err) {
          return { id, name, state: "failing", detail: scrub((err as Error).message || "Check crashed", deps.env), checkedLive: true, checkedAt };
        }
      })
    );
  }

  async function get(options: { fresh?: boolean } = {}): Promise<IntegrationStatus[]> {
    const t = deps.now();
    if (!options.fresh && cache && t - cache.at < CACHE_MS) return cache.report;
    const report = await run();
    cache = { at: t, report };
    return report;
  }

  return { run, get };
}
