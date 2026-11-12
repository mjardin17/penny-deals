/**
 * Newest Pokémon TCG sets and their release dates, from the free pokemontcg.io database
 * (the same service the Cards screen already uses). pokemontcg.io usually lists a set close to its
 * release, so a set announced months ahead may not appear yet; the screen says so.
 */

import { createFetcher, FetcherOptions } from "../cards/http";
import { PokemonSet, ReleasesResult } from "./types";

const SOURCE = "pokemontcg.io set list";
const URL_SETS = "https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=12&select=id,name,series,releaseDate,images";

/** "2026/11/07" or "2026-11-07" to "2026-11-07"; anything else is dropped. */
export function normalizeDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  return Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime()) ? null : iso;
}

/** Exported for tests. `today` is YYYY-MM-DD. */
export function parseSets(body: any, today: string): PokemonSet[] {
  const list: any[] = Array.isArray(body?.data) ? body.data : [];
  return list
    .flatMap((s) => {
      const releaseDate = normalizeDate(s?.releaseDate);
      if (typeof s?.id !== "string" || typeof s?.name !== "string" || !releaseDate) return [];
      const logo = typeof s.images?.logo === "string" && s.images.logo.startsWith("https://") ? s.images.logo : null;
      return [{ id: s.id, name: s.name, series: typeof s.series === "string" ? s.series : "", releaseDate, upcoming: releaseDate > today, logo }];
    })
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
}

export function createReleases(options: FetcherOptions & { apiKey?: string; today?: () => string } = {}) {
  const { getJson } = createFetcher({
    ...options,
    headers: { "User-Agent": "PennyDeals/1.0 (personal reselling tool)", ...(options.apiKey ? { "X-Api-Key": options.apiKey } : {}) },
  });
  const today = options.today ?? (() => new Date().toISOString().slice(0, 10));

  async function latest(): Promise<ReleasesResult> {
    try {
      const { status, body } = await getJson(URL_SETS);
      if (status !== 200) return { sets: [], status: { name: SOURCE, state: "failed", detail: `pokemontcg.io answered HTTP ${status}.` } };
      const sets = parseSets(body, today());
      const upcoming = sets.filter((s) => s.upcoming).length;
      return { sets, status: { name: SOURCE, state: "ok", detail: `${sets.length} newest sets, ${upcoming} not released yet.` } };
    } catch (err) {
      return { sets: [], status: { name: SOURCE, state: "failed", detail: (err as Error).message } };
    }
  }

  return { latest };
}
