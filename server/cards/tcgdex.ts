/**
 * Client for TCGdex (api.tcgdex.net), a free card database that is far steadier than pokemontcg.io.
 * It publishes TCGplayer and Cardmarket prices with their own dates. Missing prices are dropped, never filled in.
 * Its card search only matches loosely, so results are checked here: the number must match exactly and, when
 * given, so must the set size.
 */

import { CardApiError, createFetcher, FetcherOptions } from "./http";
import { CardHint, PokemonCard, PriceBlock, sameCardNumber } from "./types";

const BASE_URL = "https://api.tcgdex.net/v2/en";
const ID_PATTERN = /^[A-Za-z0-9.-]{1,24}$/;
const SETS_CACHE_MS = 24 * 60 * 60_000;
const MAX_NAME = 40;

interface SetInfo {
  id: string;
  name: string;
  printedTotal?: number;
}

function cleanName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} '.\-♀♂]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
}

function finite(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function pickNumbers(source: Record<string, unknown>, map: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [from, to] of Object.entries(map)) {
    const v = finite(source[from]);
    if (v !== undefined) out[to] = v;
  }
  return out;
}

function dateOnly(iso: unknown): string | undefined {
  return typeof iso === "string" && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : undefined;
}

function tcgplayerBlock(raw: any): PriceBlock | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const variants: Record<string, Record<string, number>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key === "unit" || key === "updated" || !value || typeof value !== "object") continue;
    const kept = pickNumbers(value as Record<string, unknown>, { lowPrice: "low", midPrice: "mid", highPrice: "high", marketPrice: "market", directLowPrice: "directLow" });
    if (Object.keys(kept).length > 0) variants[key] = kept;
  }
  if (Object.keys(variants).length === 0) return undefined;
  return { source: "tcgplayer", currency: "USD", updatedAt: dateOnly(raw.updated), variants };
}

function cardmarketBlock(raw: any): PriceBlock | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const variants: Record<string, Record<string, number>> = {};
  const all = pickNumbers(raw, { avg: "average", low: "low", trend: "trend", avg1: "avg1", avg7: "avg7", avg30: "avg30" });
  if (Object.keys(all).length > 0) variants.all = all;
  const holo = pickNumbers(raw, { "avg-holo": "average", "low-holo": "low", "trend-holo": "trend", "avg1-holo": "avg1", "avg7-holo": "avg7", "avg30-holo": "avg30" });
  if (Object.keys(holo).length > 0) variants.holo = holo;
  if (Object.keys(variants).length === 0) return undefined;
  return { source: "cardmarket", currency: "EUR", updatedAt: dateOnly(raw.updated), variants };
}

export function createTcgdexClient(options: FetcherOptions & { baseUrl?: string } = {}) {
  const baseUrl = options.baseUrl ?? BASE_URL;
  const now = options.now ?? Date.now;
  const { getJson } = createFetcher({ ...options, headers: { "User-Agent": "PennyDeals/1.0 (personal reselling tool)" } });
  let sets: { at: number; byId: Map<string, SetInfo> } | null = null;

  async function loadSets(): Promise<Map<string, SetInfo>> {
    if (sets && now() - sets.at < SETS_CACHE_MS) return sets.byId;
    const { body } = await getJson(`${baseUrl}/sets`);
    if (!Array.isArray(body)) throw new CardApiError(502, "Unexpected response from the card database.");
    const byId = new Map<string, SetInfo>();
    for (const s of body) {
      if (s && typeof s.id === "string" && typeof s.name === "string") {
        byId.set(s.id, { id: s.id, name: s.name, printedTotal: finite(s.cardCount?.official) ?? finite(s.cardCount?.total) });
      }
    }
    sets = { at: now(), byId };
    return byId;
  }

  const setIdOf = (cardId: string) => cardId.slice(0, Math.max(0, cardId.lastIndexOf("-")));

  async function search(hint: CardHint, limit = 8): Promise<PokemonCard[]> {
    const name = hint.name ? cleanName(hint.name) : "";
    if (hint.number && !/^[A-Za-z0-9-]{1,8}$/.test(hint.number)) throw new CardApiError(400, "That card number doesn't look right.");
    if (hint.printedTotal && !/^\d{1,4}$/.test(hint.printedTotal)) throw new CardApiError(400, "That set size doesn't look right.");
    if (!name && !(hint.number && hint.printedTotal)) {
      throw new CardApiError(400, "Give a card name, or a card number with its set size (like 4/102), to search.");
    }

    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (hint.number) params.set("localId", /^\d+$/.test(hint.number) ? String(Number(hint.number)) : hint.number);
    const [{ body }, setMap] = await Promise.all([getJson(`${baseUrl}/cards?${params}`), loadSets()]);
    if (!Array.isArray(body)) throw new CardApiError(502, "Unexpected response from the card database.");

    const wanted = hint.printedTotal ? Number(hint.printedTotal) : undefined;
    const lowerName = name.toLowerCase();
    const matches = body
      .filter((b: any) => b && typeof b.id === "string" && typeof b.name === "string" && typeof b.localId === "string")
      .filter((b: any) => !hint.number || sameCardNumber(b.localId, hint.number))
      .filter((b: any) => wanted === undefined || setMap.get(setIdOf(b.id))?.printedTotal === wanted)
      .sort((a: any, b: any) => {
        const exactA = a.name.toLowerCase() === lowerName ? 0 : 1;
        const exactB = b.name.toLowerCase() === lowerName ? 0 : 1;
        return exactA - exactB || a.name.length - b.name.length;
      })
      .slice(0, Math.min(Math.max(limit, 1), 20));

    return matches.map((b: any): PokemonCard => {
      const set = setMap.get(setIdOf(b.id));
      const setId = setIdOf(b.id);
      return {
        id: b.id,
        name: b.name,
        number: b.localId.replace(/^0+(?=\d)/, ""),
        set: { id: setId, name: set?.name ?? setId, printedTotal: set?.printedTotal },
        image: typeof b.image === "string" ? `${b.image}/low.webp` : undefined,
        source: "tcgdex",
      };
    });
  }

  async function get(id: string): Promise<PokemonCard | null> {
    if (!ID_PATTERN.test(id)) throw new CardApiError(400, "That card id doesn't look right.");
    const { status, body } = await getJson(`${baseUrl}/cards/${encodeURIComponent(id)}`);
    if (status === 404) return null;
    if (!body || typeof body.id !== "string" || typeof body.name !== "string" || !body.set || typeof body.set.name !== "string") {
      throw new CardApiError(502, "Unexpected card data from the card database.");
    }
    return {
      id: body.id,
      name: body.name,
      number: String(body.localId ?? "").replace(/^0+(?=\d)/, ""),
      rarity: typeof body.rarity === "string" ? body.rarity : undefined,
      set: {
        id: String(body.set.id ?? ""),
        name: body.set.name,
        printedTotal: finite(body.set.cardCount?.official) ?? finite(body.set.cardCount?.total),
      },
      image: typeof body.image === "string" ? `${body.image}/low.webp` : undefined,
      source: "tcgdex",
      tcgplayer: tcgplayerBlock(body.pricing?.tcgplayer),
      cardmarket: cardmarketBlock(body.pricing?.cardmarket),
    };
  }

  return { search, get };
}
