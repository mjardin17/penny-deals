/**
 * Reads stock from a product page's schema.org data (the JSON-LD block search engines read), which
 * states availability as InStock, OutOfStock, PreOrder and so on. If a page has no such block, the
 * answer is "unknown": the page's look is never guessed at.
 */

import { StockState } from "./types";

const LD_JSON = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function availabilityOf(node: any, out: string[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) availabilityOf(n, out);
    return;
  }
  const offers = node.offers;
  if (offers) {
    for (const o of Array.isArray(offers) ? offers : [offers]) {
      if (typeof o?.availability === "string") out.push(o.availability);
      if (o?.offers) availabilityOf(o, out);
    }
  }
  if (node["@graph"]) availabilityOf(node["@graph"], out);
}

export function mapAvailability(value: string): StockState {
  const v = value.replace(/^https?:\/\/schema\.org\//i, "").toLowerCase();
  if (v === "instock" || v === "limitedavailability" || v === "instoreonly" || v === "onlineonly") return "in_stock";
  if (v === "preorder" || v === "presale") return "preorder";
  if (v === "outofstock" || v === "soldout" || v === "discontinued" || v === "backorder") return "out_of_stock";
  return "unknown";
}

/** The page's own stock statement, or unknown with the reason. */
export function readPageStock(html: string): { state: StockState; detail: string } {
  const found: string[] = [];
  for (const m of html.matchAll(LD_JSON)) {
    try {
      availabilityOf(JSON.parse(m[1].trim()), found);
    } catch {
      // A malformed block says nothing; keep looking at the others.
    }
  }
  if (!found.length) return { state: "unknown", detail: "The page has no schema.org availability, so its stock can't be read without guessing." };
  const states = found.map(mapAvailability);
  // Any offer in stock means it can be bought; otherwise pre-order; otherwise out of stock only if every offer says so.
  const state: StockState = states.includes("in_stock") ? "in_stock" : states.includes("preorder") ? "preorder" : states.every((s) => s === "out_of_stock") ? "out_of_stock" : "unknown";
  return { state, detail: `Page says: ${[...new Set(found.map((f) => f.replace(/^https?:\/\/schema\.org\//i, "")))].join(", ")}.` };
}
