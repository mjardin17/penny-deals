/** The one card shape the app uses, whichever database it came from. */

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
  /** Which database answered. */
  source?: "pokemontcg.io" | "tcgdex";
  tcgplayer?: PriceBlock;
  cardmarket?: PriceBlock;
}

export interface CardDatabase {
  search(hint: CardHint, limit?: number): Promise<PokemonCard[]>;
  get(id: string): Promise<PokemonCard | null>;
}

/** "004" and "4" are the same collector number; letters ("SV049") are kept as printed, compared case-insensitively. */
export function sameCardNumber(a: string, b: string): boolean {
  const norm = (s: string) => (/^\d+$/.test(s.trim()) ? String(Number(s.trim())) : s.trim().toLowerCase());
  return norm(a) === norm(b);
}
