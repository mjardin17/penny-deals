/**
 * Two free card databases backing each other up. Card ids carry the name of the database they came from
 * ("tcgdex:base1-4"), because the two use different ids for newer sets and an id only works where it was made.
 */

import { CardApiError } from "./http";
import { CardDatabase, CardHint, PokemonCard } from "./types";

export interface DatabaseEntry {
  prefix: string;
  db: CardDatabase;
}

const PREFIXED_ID = /^([a-z0-9]{2,12}):(.{1,40})$/;

/** Errors that mean "this database is struggling", so asking the backup makes sense. Anything else is the caller's problem. */
function isOutage(err: unknown): boolean {
  return err instanceof CardApiError && (err.status === 0 || err.status === 429 || err.status >= 500);
}

export function createCardDatabase(entries: DatabaseEntry[]): CardDatabase {
  const tag = (prefix: string, card: PokemonCard): PokemonCard => ({ ...card, id: `${prefix}:${card.id}` });

  async function search(hint: CardHint, limit?: number): Promise<PokemonCard[]> {
    for (const { prefix, db } of entries) {
      try {
        return (await db.search(hint, limit)).map((c) => tag(prefix, c));
      } catch (err) {
        if (!isOutage(err)) throw err;
        console.error(`[cards] ${prefix} did not answer, trying the next database:`, (err as Error).message);
      }
    }
    throw new CardApiError(502, "Both card databases are busy or down right now. Try again in a minute.");
  }

  async function get(id: string): Promise<PokemonCard | null> {
    const m = PREFIXED_ID.exec(id);
    const entry = m ? entries.find((e) => e.prefix === m[1]) : undefined;
    if (!m || !entry) throw new CardApiError(400, "That card id doesn't look right.");
    const card = await entry.db.get(m[2]);
    return card ? tag(entry.prefix, card) : null;
  }

  return { search, get };
}
