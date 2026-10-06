/**
 * Turns raw posts into digest hits using only what the post itself says.
 * If a post doesn't state a price, price stays null; nothing is guessed.
 */

import { PENNY_STORES, POKEMON_STORES, STORES } from "./config";
import { nearestOf } from "./geo";
import { DigestHit, HitKind, NearbyStore, RawPost, StoreKey } from "./types";

const PRICE_RE = /\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?|\.\d{1,2})/g;
const POKEMON_RE = /pok[eé]mon|\bptcg\b/i;
/** Pokémon posts only count when they're about the trading card game, not video games. */
const TCG_RE = /\b(?:tcg|ptcg|cards?|booster|elite trainer|etb|tin|blister|collection box|premium collection|build (?:&|and) battle|sleeved)\b/i;
const PENNY_RE = /\bpenn(?:y|ies)\b|\$0?\.01\b|\b1¢/i;
/** Explicit "I saw it in a store" language. */
const EXPLICIT_IN_STORE_RE = /in[- ]store|\bB&M\b|select stores|(?:at|in) my (?:local )?\w+|found (?:it |these |them )?at|on the shelf|restock(?:ed)? at|store pickup only/i;
/** Signals the deal ships or is online. */
const ONLINE_RE = /free (?:shipping|s&h)|\bs&h\b|ships? free|online only|shipping (?:is )?free|\.com\]? has/i;
/** Weak in-store hints, used only when nothing says it's online. */
const WEAK_IN_STORE_RE = /\bYMMV\b|clearance/i;
const ONLINE_ONLY_STORES = /amazon|pokemon ?center|tcgplayer|ebay/i;

/** Order minimums ("on $35+", "orders over $50") and savings ("save $10", "$5 off") are not prices. */
function isThresholdOrSaving(title: string, index: number, raw: string): boolean {
  const before = title.slice(Math.max(0, index - 12), index).toLowerCase();
  const after = title.slice(index + raw.length, index + raw.length + 10).toLowerCase();
  return after.startsWith("+") || /\b(?:on|over|orders?|save|spend)\s*$/.test(before) || /^\s*(?:off|or more)\b/.test(after);
}

/**
 * Price as posted. Prefers an amount right after "from"/"for"/"at"/"@"; otherwise the last
 * dollar amount in the title (Slickdeals titles end with the price). Minimums and savings are skipped.
 */
export function extractPrice(title: string): number | null {
  const matches = [...title.matchAll(PRICE_RE)].filter((m) => !isThresholdOrSaving(title, m.index!, m[0]));
  if (matches.length === 0) return null;
  const anchored = matches.find((m) => /\b(?:from|for|at)\s*$|@\s*$/i.test(title.slice(Math.max(0, m.index! - 6), m.index!)));
  const chosen = anchored ?? matches[matches.length - 1];
  const value = Number(chosen[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

/** First tracked store the post names, checking the title before the body. */
export function detectStore(post: RawPost, candidates: StoreKey[]): StoreKey | null {
  for (const text of [post.title, post.body]) {
    for (const key of candidates) if (STORES[key].textPattern.test(text)) return key;
  }
  return null;
}

export function detectKind(post: RawPost, price: number | null): HitKind | null {
  const text = `${post.title} ${post.body}`;
  if (POKEMON_RE.test(post.title)) return TCG_RE.test(post.title) ? "pokemon" : null;
  if ((price !== null && price <= 0.05) || PENNY_RE.test(post.title)) return "penny";
  if (EXPLICIT_IN_STORE_RE.test(text) || WEAK_IN_STORE_RE.test(text) || /price drop|markdown/i.test(text)) return "clearance";
  return null;
}

export function isInStore(post: RawPost): boolean {
  const text = `${post.title} ${post.body}`;
  if (EXPLICIT_IN_STORE_RE.test(text)) return true;
  if (ONLINE_RE.test(text)) return false;
  return true;
}

function money(n: number): string {
  return n < 1 ? `${Math.round(n * 100)}¢` : `$${n.toFixed(2)}`;
}

export function buildAction(kind: HitKind, store: StoreKey | null, price: number | null, inStore: boolean, nearest: NearbyStore | null): string {
  const label = store ? STORES[store].label : "the retailer";
  const where = nearest ? `${nearest.name}, ${nearest.address} (${nearest.miles} mi)` : null;

  if (kind === "penny") {
    return [
      where ? `Check ${where}.` : `No ${label} found within your radius; the post may be regional.`,
      "Penny items are meant to be pulled from shelves, so look in clearance aisles and endcaps and scan the item in the store app before checkout.",
      "Staff may refuse to sell a penny item. Don't argue; it's store policy.",
    ].join(" ");
  }
  if (kind === "pokemon") {
    const priceNote = price !== null ? ` at ${money(price)}` : "";
    return inStore && where
      ? `Restock reported${priceNote}. Check ${where} early (vendor restock days vary). Expect per-customer limits.`
      : `Buy from the post link${priceNote} if still live. Expect per-customer limits and fast sellouts.`;
  }
  if (inStore) {
    return where
      ? `In-store and YMMV: check stock at ${where} before driving. Clearance varies by store, so scan the shelf tag.`
      : `In-store and YMMV, but no ${label} is within your radius.`;
  }
  return `Online: buy through the post link while the price lasts${price !== null ? ` (${money(price)} as posted)` : ""}.`;
}

export function classifyPost(post: RawPost, stores: NearbyStore[]): DigestHit | null {
  // Downvoted posts are usually expired or bad deals.
  if (post.score !== undefined && post.score < 0) return null;
  const price = extractPrice(post.title);
  const kind = detectKind(post, price);
  if (!kind) return null;

  const candidates = kind === "pokemon" ? POKEMON_STORES : PENNY_STORES;
  const store = detectStore(post, candidates);
  // Penny/clearance hits must be at one of the four tracked retailers.
  if (kind !== "pokemon" && !store) return null;
  // Pokémon deals from online-only sellers are still useful, but have no local store.
  const inStore = store !== null && isInStore(post) && !(kind === "pokemon" && ONLINE_ONLY_STORES.test(post.body.slice(0, 80)));
  const nearest = store && inStore ? nearestOf(stores, store) : null;

  return { post, kind, store, price, inStore, nearest, action: buildAction(kind, store, price, inStore, nearest) };
}

/** In-store hits closest first, then hits with no local store; ties broken by recency. */
export function sortClosestFirst(hits: DigestHit[]): DigestHit[] {
  const distance = (h: DigestHit) => (h.nearest ? h.nearest.miles : Infinity);
  return [...hits].sort((a, b) => distance(a) - distance(b) || b.post.publishedAt.getTime() - a.post.publishedAt.getTime());
}
