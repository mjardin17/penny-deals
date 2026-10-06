/**
 * Client for the free pokemontcg.io card database: exact card identity (name, set, number, rarity)
 * and the prices it publishes from TCGplayer and Cardmarket, each with its own date.
 * Prices that are missing or malformed are dropped, never replaced with a number.
 */

const BASE_URL = "https://api.pokemontcg.io/v2";
const FIELDS = "id,name,number,rarity,set,images,tcgplayer,cardmarket";
const ID_PATTERN = /^[A-Za-z0-9.-]{1,24}$/;
const MAX_NAME = 40;

export class CardApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "CardApiError";
  }
}

export interface CardHint {
  name?: string;
  number?: string;
  printedTotal?: string;
}

export interface PriceBlock {
  source: "tcgplayer" | "cardmarket";
  currency: "USD" | "EUR";
  updatedAt?: string;
  url?: string;
  variants: Record<string, Record<string, number>>;
}

export interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set: { id: string; name: string; series?: string; printedTotal?: number; releaseDate?: string };
  image?: string;
  tcgplayer?: PriceBlock;
  cardmarket?: PriceBlock;
}

/** "4/102", "004/102" and "SV049/SV122" all work; a bare number works too. */
export function parseCardNumber(text: string): { number: string; printedTotal: string | undefined } | null {
  const m = /^\s*([A-Za-z]{0,4}\d{1,4})(?:\s*\/\s*([A-Za-z]{0,4}(\d{1,4})))?\s*$/.exec(text ?? "");
  if (!m) return null;
  const raw = m[1];
  const number = /^\d+$/.test(raw) ? String(Number(raw)) : raw;
  return { number, printedTotal: m[3] ? String(Number(m[3])) : undefined };
}

function cleanName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} '.\-♀♂]/gu, " ")
    .replace(/\b(OR|AND|NOT)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
}

function finite(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function pick(source: Record<string, unknown>, map: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [from, to] of Object.entries(map)) {
    const v = finite(source[from]);
    if (v !== undefined) out[to] = v;
  }
  return out;
}

function normalizePrices(raw: any, source: "tcgplayer" | "cardmarket"): PriceBlock | undefined {
  if (!raw || typeof raw !== "object" || !raw.prices || typeof raw.prices !== "object") return undefined;
  const variants: Record<string, Record<string, number>> = {};
  if (source === "tcgplayer") {
    for (const [variant, prices] of Object.entries(raw.prices as Record<string, any>)) {
      if (!prices || typeof prices !== "object") continue;
      const kept = pick(prices, { low: "low", mid: "mid", high: "high", market: "market", directLow: "directLow" });
      if (Object.keys(kept).length > 0) variants[variant] = kept;
    }
  } else {
    const kept = pick(raw.prices, { averageSellPrice: "average", lowPrice: "low", trendPrice: "trend", avg1: "avg1", avg7: "avg7", avg30: "avg30" });
    if (Object.keys(kept).length > 0) variants.all = kept;
  }
  if (Object.keys(variants).length === 0) return undefined;
  return {
    source,
    currency: source === "tcgplayer" ? "USD" : "EUR",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    url: typeof raw.url === "string" ? raw.url : undefined,
    variants,
  };
}

function normalizeCard(raw: any): PokemonCard {
  if (!raw || typeof raw.id !== "string" || typeof raw.name !== "string" || !raw.set || typeof raw.set.name !== "string") {
    throw new CardApiError(502, "Unexpected card data from the card database.");
  }
  return {
    id: raw.id,
    name: raw.name,
    number: String(raw.number ?? ""),
    rarity: typeof raw.rarity === "string" ? raw.rarity : undefined,
    set: {
      id: String(raw.set.id ?? ""),
      name: raw.set.name,
      series: typeof raw.set.series === "string" ? raw.set.series : undefined,
      printedTotal: finite(raw.set.printedTotal),
      releaseDate: typeof raw.set.releaseDate === "string" ? raw.set.releaseDate : undefined,
    },
    image: typeof raw.images?.small === "string" ? raw.images.small : undefined,
    tcgplayer: normalizePrices(raw.tcgplayer, "tcgplayer"),
    cardmarket: normalizePrices(raw.cardmarket, "cardmarket"),
  };
}

export interface PokemonTcgOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export function createPokemonTcgClient(options: PokemonTcgOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? BASE_URL;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const headers: Record<string, string> = { Accept: "application/json", ...(options.apiKey ? { "X-Api-Key": options.apiKey } : {}) };

  async function request(url: string): Promise<{ status: number; body: any }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers, signal: controller.signal });
      if (res.status === 404) return { status: 404, body: null };
      if (res.status === 429) throw new CardApiError(429, "The card database is rate limiting requests (rate limit). Try again in a minute.");
      if (!res.ok) throw new CardApiError(res.status, `The card database had an error (HTTP ${res.status}).`);
      return { status: res.status, body: await res.json() };
    } catch (err) {
      if (err instanceof CardApiError) throw err;
      if (controller.signal.aborted) throw new CardApiError(0, "The card database did not answer in time (timed out).");
      throw new CardApiError(0, "Could not reach the card database.");
    } finally {
      clearTimeout(timer);
    }
  }

  async function search(hint: CardHint, limit = 8): Promise<PokemonCard[]> {
    const parts: string[] = [];
    const name = hint.name ? cleanName(hint.name) : "";
    if (name) parts.push(`name:"${name}"`);
    if (hint.number) {
      if (!/^[A-Za-z0-9-]{1,8}$/.test(hint.number)) throw new CardApiError(400, "That card number doesn't look right.");
      parts.push(`number:"${hint.number}"`);
    }
    if (hint.printedTotal) {
      if (!/^\d{1,4}$/.test(hint.printedTotal)) throw new CardApiError(400, "That set size doesn't look right.");
      parts.push(`set.printedTotal:${hint.printedTotal}`);
    }
    if (!name && !hint.number) throw new CardApiError(400, "Give a card name or a card number to search.");
    const url = `${baseUrl}/cards?q=${encodeURIComponent(parts.join(" "))}&pageSize=${Math.min(Math.max(limit, 1), 20)}&select=${FIELDS}`;
    const { body } = await request(url);
    if (!body || !Array.isArray(body.data)) throw new CardApiError(502, "Unexpected response from the card database.");
    return body.data.map(normalizeCard);
  }

  async function get(id: string): Promise<PokemonCard | null> {
    if (!ID_PATTERN.test(id)) throw new CardApiError(400, "That card id doesn't look right.");
    const { status, body } = await request(`${baseUrl}/cards/${id}?select=${FIELDS}`);
    if (status === 404) return null;
    if (!body || typeof body.data !== "object" || body.data === null || Array.isArray(body.data)) {
      throw new CardApiError(502, "Unexpected response from the card database.");
    }
    return normalizeCard(body.data);
  }

  return { search, get };
}
