/**
 * One pass over the watchlist: one reading per store and product. Retailers whose terms forbid
 * automated access are reported "disallowed" without any request; walled sites are reported "blocked".
 */

import { createBestBuyApi, parseProduct, parseStores } from "../drops/bestBuy";
import { POLICIES } from "./policy";
import { readPageStock } from "./pageStock";
import { PoliteFetcher } from "./politeFetch";
import { nameMatches, WATCH_PRODUCTS, WATCH_STORES, WATCH_ZIP } from "./watchlist";
import { Reading, StockState, WatchProduct, WatchStore } from "./types";

const STORE_CACHE_MS = 24 * 3600_000;
const BEST_BUY_SEARCH = "products(search=pokemon&search=30th&search=celebration)";
const BEST_BUY_SHOW = "sku,name,url,salePrice,regularPrice,onlineAvailability,inStoreAvailability,orderable,releaseDate,preowned";

export interface MonitorDeps {
  fetcher: PoliteFetcher;
  bestBuyKey?: string;
  bestBuyFetch?: typeof fetch;
  products?: WatchProduct[];
  stores?: WatchStore[];
  zip?: string;
  now?: () => number;
}

/** Combines several readings of one product at one retailer (several pages): best real answer wins. */
function combine(states: { state: StockState; detail: string }[]): { state: StockState; detail: string } {
  const order: StockState[] = ["in_stock", "preorder", "out_of_stock", "blocked", "disallowed", "unknown"];
  const best = [...states].sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state))[0];
  return { state: best.state, detail: states.map((s) => s.detail).join(" ") };
}

export function createMonitor(deps: MonitorDeps) {
  const products = deps.products ?? WATCH_PRODUCTS;
  const stores = deps.stores ?? WATCH_STORES;
  const zip = deps.zip ?? WATCH_ZIP;
  const now = deps.now ?? Date.now;
  const bestBuyGet = deps.bestBuyKey ? createBestBuyApi({ apiKey: deps.bestBuyKey, fetchImpl: deps.bestBuyFetch }) : null;
  let bestBuyStore: { at: number; id: string; name: string } | null = null;

  async function findBestBuyStore(store: WatchStore): Promise<{ id: string; name: string }> {
    if (bestBuyStore && now() - bestBuyStore.at < STORE_CACHE_MS) return bestBuyStore;
    const body = await bestBuyGet!(`stores(area(${zip},15))?format=json&show=storeId,name,city,address&pageSize=20`);
    const list: any[] = Array.isArray(body?.stores) ? body.stores : [];
    const hit = list.find((s) => store.branchMatch && store.branchMatch.test(`${s?.name ?? ""} ${s?.city ?? ""}`));
    if (!hit || (typeof hit.storeId !== "number" && typeof hit.storeId !== "string")) throw new Error(`Best Buy lists no store matching "${store.label}" within 15 miles of ${zip}.`);
    bestBuyStore = { at: now(), id: String(hit.storeId), name: String(hit.name ?? store.label) };
    return bestBuyStore;
  }

  async function bestBuyReadings(store: WatchStore, at: string): Promise<Reading[]> {
    const row = (product: WatchProduct, state: StockState, detail: string, source?: string): Reading => ({ retailer: "bestBuy", store: store.label, product: product.name, state, detail, source, checkedAt: at });
    if (!bestBuyGet) return products.map((p) => row(p, "unknown", "Needs BESTBUY_API_KEY (free at developer.bestbuy.com)."));
    try {
      const branch = await findBestBuyStore(store);
      const body = await bestBuyGet(`${BEST_BUY_SEARCH}?format=json&pageSize=100&show=${BEST_BUY_SHOW}`);
      const items = (Array.isArray(body?.products) ? body.products : []).flatMap((p: any) => parseProduct(p, false) ?? []);
      const out: Reading[] = [];
      for (const product of products) {
        const matches = items.filter((i: { name: string }) => nameMatches(i.name, product.keywords));
        if (!matches.length) {
          out.push(row(product, "unknown", "Best Buy's API lists no product with this name yet."));
          continue;
        }
        const states: { state: StockState; detail: string }[] = [];
        for (const item of matches) {
          const online = item.orderable === "PreOrder" ? "pre-order online" : item.onlineAvailability ? "buyable online" : "not buyable online";
          if (!item.inStoreAvailability) {
            states.push({ state: item.orderable === "PreOrder" ? "preorder" : "out_of_stock", detail: `SKU ${item.sku}: not sold in stores; ${online}.` });
            continue;
          }
          const avail = parseStores(await bestBuyGet(`products/${item.sku}/stores.json?storeId=${branch.id}`));
          const here = avail.find((s) => s.storeId === branch.id);
          states.push(
            here
              ? { state: "in_stock", detail: `SKU ${item.sku}: in stock at ${branch.name}${here.lowStock ? " (low stock)" : ""}; ${online}.` }
              : { state: "out_of_stock", detail: `SKU ${item.sku}: not in stock at ${branch.name}; ${online}.` }
          );
        }
        const c = combine(states);
        out.push(row(product, c.state, c.detail, "Best Buy Developer API"));
      }
      return out;
    } catch (err) {
      return products.map((p) => row(p, "unknown", (err as Error).message));
    }
  }

  async function pageReadings(store: WatchStore, at: string): Promise<Reading[]> {
    const policy = POLICIES[store.retailer];
    const out: Reading[] = [];
    for (const product of products) {
      const row = (state: StockState, detail: string, source?: string): Reading => ({ retailer: store.retailer, store: store.label, product: product.name, state, detail, source, checkedAt: at });
      const pages = product.pages[store.retailer] ?? [];
      if (!pages.length) {
        // Still read robots.txt (cached for a day), so a walled site shows as blocked rather than "no page".
        const probe = await deps.fetcher.probe(policy.host);
        if (probe.kind === "blocked") out.push(row("blocked", probe.detail));
        else out.push(row("unknown", `No product page for this item on the watchlist yet.${probe.kind === "error" ? ` ${probe.detail}` : ""}`));
        continue;
      }
      const states: { state: StockState; detail: string }[] = [];
      for (const url of pages) {
        const got = await deps.fetcher.get(url);
        if (got.kind === "ok") states.push(readPageStock(got.body));
        else if (got.kind === "queue") states.push({ state: "unknown", detail: got.detail });
        else states.push({ state: got.kind === "error" ? "unknown" : got.kind, detail: got.detail });
      }
      const c = combine(states);
      out.push(row(c.state, `${store.note ? `${store.note} ` : ""}${c.detail}`, pages.join(" ")));
    }
    return out;
  }

  /** One full pass. Never throws. */
  async function runOnce(): Promise<Reading[]> {
    const at = new Date(now()).toISOString();
    const readings: Reading[] = [];
    for (const store of stores) {
      const policy = POLICIES[store.retailer];
      if (policy.terms === "disallowed" || policy.method === "none") {
        for (const p of products) readings.push({ retailer: store.retailer, store: store.label, product: p.name, state: "disallowed", detail: policy.termsNote, checkedAt: at });
      } else if (policy.method === "official_api") {
        readings.push(...(await bestBuyReadings(store, at)));
      } else {
        readings.push(...(await pageReadings(store, at)));
      }
    }
    return readings;
  }

  return { runOnce };
}
