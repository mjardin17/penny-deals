/**
 * Best Buy's official Products API and store-availability endpoint (developer.bestbuy.com).
 * This is the only big retailer that publishes stock data, so it is the only one checked directly.
 * Runs only when BESTBUY_API_KEY is set. The key goes in the query string, so it is never put in an
 * error message, a log line or an answer.
 */

import { BestBuyItem, BestBuyResult, BestBuyStore } from "./types";

const BASE_URL = "https://api.bestbuy.com/v1";
const SOURCE = "Best Buy API";
const SHOW = "sku,name,url,salePrice,regularPrice,onlineAvailability,inStoreAvailability,orderable,releaseDate,preowned";
/** Words in a product name that mean it is the trading card game, not a video game or a plush. */
const TCG_NAME = /trading card|\btcg\b|booster|elite trainer|\betb\b|collection|tin\b|blister|build (?:&|and) battle|card game/i;
const DEFAULT_MAX_STORE_CHECKS = 8;
/** Best Buy limits queries per second; store checks run one after another with this gap. */
const STORE_CHECK_GAP_MS = 300;
const SKU = /^\d{5,9}$/;

export interface BestBuyOptions {
  apiKey?: string;
  /** Exact SKUs to watch. When empty, a keyword search finds Pokémon TCG products. */
  skus?: string[];
  maxStoreChecks?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

export class BestBuyError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "BestBuyError";
  }
}

/** Reads the BESTBUY_* settings. Bad SKUs are dropped, not guessed at. */
export function bestBuyOptionsFromEnv(env: Record<string, string | undefined>): BestBuyOptions {
  const skus = (env.BESTBUY_POKEMON_SKUS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => SKU.test(s));
  const max = Number(env.BESTBUY_MAX_STORE_CHECKS);
  return {
    apiKey: env.BESTBUY_API_KEY?.trim() || undefined,
    skus,
    maxStoreChecks: Number.isInteger(max) && max >= 0 && max <= 25 ? max : DEFAULT_MAX_STORE_CHECKS,
  };
}

/** The products query: exact SKUs when given, otherwise Best Buy's documented keyword search. */
export function productsQuery(skus: string[]): string {
  const valid = skus.filter((s) => SKU.test(s));
  if (valid.length) return `products(sku in(${valid.join(",")}))`;
  return "products(search=pokemon&search=trading&search=card)";
}

function errorFor(status: number): BestBuyError {
  if (status === 403) return new BestBuyError(403, "Best Buy refused the request (HTTP 403): the key is wrong or today's call limit is used up.");
  if (status === 429) return new BestBuyError(429, "Best Buy is rate limiting requests (HTTP 429). It will be tried again on the next refresh.");
  return new BestBuyError(status, `Best Buy returned an error (HTTP ${status}).`);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Turns one product from the API into an item. Used, pre-owned and non-TCG products are dropped. Exported for tests. */
export function parseProduct(p: any, keywordSearch: boolean): BestBuyItem | null {
  const sku = num(p?.sku);
  const name = str(p?.name);
  if (sku === null || !name) return null;
  if (p.preowned === true) return null;
  if (keywordSearch && !TCG_NAME.test(name)) return null;
  const url = str(p.url);
  return {
    sku,
    name,
    url: /^https:\/\/(?:www\.)?bestbuy\.com\//.test(url) ? url : null,
    salePrice: num(p.salePrice),
    regularPrice: num(p.regularPrice),
    onlineAvailability: p.onlineAvailability === true,
    inStoreAvailability: p.inStoreAvailability === true,
    orderable: str(p.orderable) || null,
    releaseDate: str(p.releaseDate) || null,
    nearbyStores: null,
  };
}

/** Turns the store-availability answer into stores. Exported for tests. */
export function parseStores(body: any): BestBuyStore[] {
  const list: any[] = Array.isArray(body?.stores) ? body.stores : [];
  return list.flatMap((s) => {
    const storeId = s?.storeID ?? s?.storeId;
    const name = str(s?.name);
    if ((typeof storeId !== "string" && typeof storeId !== "number") || !name) return [];
    return [
      {
        storeId: String(storeId),
        name,
        address: str(s.address),
        city: str(s.city),
        state: str(s.state),
        distanceMiles: num(s.distance),
        lowStock: s.lowStock === true,
      },
    ];
  });
}

export function createBestBuy(options: BestBuyOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const timeoutMs = options.timeoutMs ?? 10_000;
  const skus = options.skus ?? [];
  const maxStoreChecks = options.maxStoreChecks ?? DEFAULT_MAX_STORE_CHECKS;

  async function getJson(pathAndQuery: string): Promise<any> {
    const sep = pathAndQuery.includes("?") ? "&" : "?";
    const url = `${BASE_URL}/${pathAndQuery}${sep}apiKey=${encodeURIComponent(options.apiKey ?? "")}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: controller.signal });
      if (!res.ok) throw errorFor(res.status);
      return await res.json();
    } catch (err) {
      if (err instanceof BestBuyError) throw err;
      if (controller.signal.aborted) throw new BestBuyError(0, "Best Buy did not answer in time.");
      // Never pass the original error on: it can contain the URL, and the URL contains the key.
      throw new BestBuyError(0, "Could not reach Best Buy.");
    } finally {
      clearTimeout(timer);
    }
  }

  async function check(zip: string): Promise<BestBuyResult> {
    if (!options.apiKey) {
      return {
        items: [],
        status: { name: SOURCE, state: "skipped", detail: "Needs BESTBUY_API_KEY (free with an email signup at developer.bestbuy.com)." },
      };
    }
    if (!/^\d{5}$/.test(zip)) throw new Error("ZIP must be 5 digits.");

    const keywordSearch = skus.filter((s) => SKU.test(s)).length === 0;
    let items: BestBuyItem[];
    try {
      const body = await getJson(`${productsQuery(skus)}?format=json&pageSize=100&show=${SHOW}`);
      const products: any[] = Array.isArray(body?.products) ? body.products : [];
      items = products.flatMap((p) => parseProduct(p, keywordSearch) ?? []);
    } catch (err) {
      return { items: [], status: { name: SOURCE, state: "failed", detail: (err as Error).message } };
    }

    // Store checks cost one call each, so only items Best Buy says are sold in stores, up to the limit.
    const toCheck = items.filter((i) => i.inStoreAvailability).slice(0, maxStoreChecks);
    let storeFailures = 0;
    for (const [n, item] of toCheck.entries()) {
      if (n > 0) await sleep(STORE_CHECK_GAP_MS);
      try {
        item.nearbyStores = parseStores(await getJson(`products/${item.sku}/stores.json?postalCode=${zip}`));
      } catch (err) {
        storeFailures++;
        item.storeCheckError = (err as Error).message;
      }
    }

    const inStock = items.filter((i) => i.nearbyStores && i.nearbyStores.length > 0).length;
    const online = items.filter((i) => i.onlineAvailability).length;
    const how = keywordSearch ? "keyword search" : `${skus.length} watched SKU(s)`;
    const skippedChecks = items.filter((i) => i.inStoreAvailability).length - toCheck.length;
    const parts = [
      `${items.length} Pokémon TCG product(s) from ${how}`,
      `${online} buyable online`,
      `${inStock} in stock at a store near ${zip}`,
      skippedChecks > 0 ? `${skippedChecks} not store-checked (limit ${maxStoreChecks} per refresh)` : "",
      storeFailures > 0 ? `${storeFailures} store check(s) failed` : "",
    ].filter(Boolean);
    const allStoreChecksFailed = toCheck.length > 0 && storeFailures === toCheck.length;
    return { items, status: { name: SOURCE, state: allStoreChecksFailed ? "failed" : "ok", detail: parts.join("; ") } };
  }

  return { check, configured: Boolean(options.apiKey) };
}

export type BestBuyClient = ReturnType<typeof createBestBuy>;
