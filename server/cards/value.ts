/**
 * What a card is worth, from real sources only, each labeled with what it is and when it is from.
 * The database prices come with their own date. eBay prices are what sellers are ASKING right now,
 * not what cards sold for. Anything that can't be found stays empty.
 */

import { NormalizedEbayListing } from "../marketplace/types";
import { PokemonCard } from "./pokemonTcg";

export interface AskStats {
  count: number;
  lowest: number;
  median: number;
  basis: string;
}

export interface CardValue {
  database: { tcgplayer?: PokemonCard["tcgplayer"]; cardmarket?: PokemonCard["cardmarket"] } | null;
  ebayRaw: AskStats | null;
  ebayPsa10: AskStats | null;
  notes: string[];
}

export interface ValueDeps {
  ebaySearch(query: string): Promise<NormalizedEbayListing[]>;
}

const GRADED = /\b(PSA|BGS|CGC|SGC|TAG)\s*\d/i;
const PSA10 = /\bPSA\s*10\b/i;
const ASKING_BASIS = "Active asking prices on eBay, shipping included. Not sold prices.";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isThisCard(title: string, card: PokemonCard): boolean {
  if (!title.toLowerCase().includes(card.name.toLowerCase())) return false;
  const number = /^\d+$/.test(card.number) ? `0*${Number(card.number)}` : escapeRegex(card.number);
  const total = card.set.printedTotal ? `\\s*\\/\\s*0*${card.set.printedTotal}\\b` : "\\b";
  return new RegExp(`(^|[^\\d])${number}${total}`, "i").test(title);
}

function delivered(l: NormalizedEbayListing): number {
  return l.price + (l.shippingCost ?? 0);
}

function stats(listings: NormalizedEbayListing[]): AskStats | null {
  if (listings.length === 0) return null;
  const prices = listings.map(delivered).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  return { count: prices.length, lowest: Math.round(prices[0] * 100) / 100, median: Math.round(median * 100) / 100, basis: ASKING_BASIS };
}

export async function valueCard(card: PokemonCard, deps: ValueDeps): Promise<CardValue> {
  const notes: string[] = [];
  const total = card.set.printedTotal ? `/${card.set.printedTotal}` : "";
  const base = `${card.name} ${card.number}${total}`;

  const [rawResult, psaResult] = await Promise.allSettled([deps.ebaySearch(`${base} ${card.set.name}`), deps.ebaySearch(`${base} PSA 10`)]);

  let ebayRaw: AskStats | null = null;
  let ebayPsa10: AskStats | null = null;
  if (rawResult.status === "fulfilled") {
    ebayRaw = stats(rawResult.value.filter((l) => isThisCard(l.title, card) && !GRADED.test(l.title)));
  }
  if (psaResult.status === "fulfilled") {
    ebayPsa10 = stats(psaResult.value.filter((l) => isThisCard(l.title, card) && PSA10.test(l.title)));
  }
  if (rawResult.status === "rejected" && psaResult.status === "rejected") {
    notes.push("eBay prices unavailable right now (lookup failed).");
  }

  if (card.tcgplayer?.updatedAt) notes.push(`Database prices are TCGplayer's, last updated ${card.tcgplayer.updatedAt}.`);
  notes.push("Sold prices need eBay Marketplace Insights approval, so eBay figures here are asking prices, not what cards actually sold for.");
  if (ebayRaw || ebayPsa10) {
    notes.push("The lowest asking price is often a damaged, mislabeled or fake listing. The middle price is the steadier guide.");
  }

  const database = card.tcgplayer || card.cardmarket ? { tcgplayer: card.tcgplayer, cardmarket: card.cardmarket } : null;
  return { database, ebayRaw, ebayPsa10, notes };
}
