/**
 * Joshua's watchlist (2026-11-12): five 30th Celebration products at five stores near ZIP 02745.
 * Product pages are listed only where a real page was found; nothing else is guessed. Add more page
 * URLs here as they are found.
 */

import { WatchProduct, WatchStore } from "./types";

export const WATCH_ZIP = "02745";

export const WATCH_PRODUCTS: WatchProduct[] = [
  {
    id: "etb",
    name: "30th Celebration Elite Trainer Box",
    keywords: ["30th", "celebration", "elite trainer"],
    pages: {
      // GameStop lists two ETB pages; both are watched until it's clear which is the standard box.
      gamestop: [
        "https://www.gamestop.com/toys-games/trading-cards/products/pokemon-trading-card-game-30th-celebration-elite-trainer-box/448552.html",
        "https://www.gamestop.com/toys-games/trading-cards/products/pokemon-trading-card-game-30th-celebration-elite-trainer-box/20036324.html",
      ],
    },
  },
  {
    id: "booster-bundle",
    name: "30th Celebration Booster Bundle",
    keywords: ["30th", "celebration", "booster bundle"],
    pages: {
      gamestop: ["https://www.gamestop.com/toys-games/trading-cards/products/pokemon-trading-card-game-30th-celebration-booster-bundle-box/452105.html"],
    },
  },
  {
    id: "knock-out",
    name: "30th Celebration Knock Out Collection",
    keywords: ["30th", "celebration", "knock out"],
    pages: {
      gamestop: ["https://www.gamestop.com/toys-games/trading-cards/products/pokemon-trading-card-game-30th-celebration-knock-out-collection/452277.html"],
    },
  },
  { id: "figure", name: "30th Celebration Figure Collection", keywords: ["30th", "celebration", "figure"], pages: {} },
  { id: "poster", name: "30th Celebration Poster Collection", keywords: ["30th", "celebration", "poster"], pages: {} },
];

export const WATCH_STORES: WatchStore[] = [
  { retailer: "target", label: "Target North Dartmouth" },
  { retailer: "walmart", label: "Walmart Fairhaven" },
  { retailer: "gamestop", label: "GameStop Fall River", note: "Online stock from the product page; GameStop publishes no per-store stock." },
  { retailer: "bestBuy", label: "Best Buy North Dartmouth", branchMatch: /dartmouth/i },
  { retailer: "pokemonCenter", label: "Pokémon Center online" },
];

/** True when a retailer's product name contains every keyword (case and accents ignored). */
export function nameMatches(name: string, keywords: string[]): boolean {
  const plain = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return keywords.every((k) => plain.includes(k.toLowerCase()));
}
