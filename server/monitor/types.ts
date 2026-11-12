/**
 * Shapes for the retailer stock monitor. A reading always says where its answer came from,
 * and "unknown" is used whenever the page or API didn't say clearly.
 */

export type StockState = "in_stock" | "preorder" | "out_of_stock" | "blocked" | "disallowed" | "unknown";

export type RetailerId = "target" | "walmart" | "gamestop" | "bestBuy" | "pokemonCenter";

export interface WatchProduct {
  id: string;
  name: string;
  /** Every word must appear in a retailer's product name for it to count as this product. */
  keywords: string[];
  /** Product pages to watch, by retailer. Only pages a person could open in a browser. */
  pages: Partial<Record<RetailerId, string[]>>;
}

export interface WatchStore {
  retailer: RetailerId;
  label: string;
  /** Text that identifies the branch in a retailer's store list (for Best Buy's API). */
  branchMatch?: RegExp;
  /** Said with every reading for this store, when what can be read differs from what was asked. */
  note?: string;
}

export interface Reading {
  retailer: RetailerId;
  store: string;
  product: string;
  state: StockState;
  /** Plain-words reason: what was read, or why nothing was. */
  detail: string;
  /** The page or API the answer came from, when one was read. */
  source?: string;
  checkedAt: string;
}
