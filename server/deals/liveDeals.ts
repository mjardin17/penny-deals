import { DigestConfig, loadConfig } from "../../digest/config";
import { gatherHits, Gathered } from "../../digest/gather";

const CACHE_MS = 10 * 60_000;
const ZIP = /^\d{5}$/;

export interface LiveDealsResult {
  zip: string;
  place: string;
  hits: Gathered["hits"];
  checked: Gathered["checked"];
  others: Gathered["others"];
  sources: Gathered["sources"];
  /** When the deals were actually fetched from the sources. */
  fetchedAt: string;
  stale?: boolean;
  staleReason?: string;
}

export interface LiveDealsDeps {
  gather: (config: DigestConfig, now: Date) => Promise<Gathered>;
  now: () => number;
  defaults: DigestConfig;
}

export function createLiveDeals(deps: LiveDealsDeps) {
  const cache = new Map<string, { at: number; result: LiveDealsResult }>();

  // Requests that arrive while a lookup for the same ZIP is running share it instead of starting their own.
  const inFlight = new Map<string, Promise<LiveDealsResult>>();

  function get(zip: string): Promise<LiveDealsResult> {
    if (!ZIP.test(zip)) return Promise.reject(new Error("ZIP must be 5 digits."));
    const running = inFlight.get(zip);
    if (running) return running;
    const started = fetchFresh(zip).finally(() => inFlight.delete(zip));
    inFlight.set(zip, started);
    return started;
  }

  async function fetchFresh(zip: string): Promise<LiveDealsResult> {
    const t = deps.now();
    const cached = cache.get(zip);
    if (cached && t - cached.at < CACHE_MS) return cached.result;
    try {
      const out = await deps.gather({ ...deps.defaults, zip }, new Date(t));
      // Store locations are not deals. If no deal source answered, "no deals" would be a lie, so fail instead of caching it.
      const dealSources = out.sources.filter((s) => !s.name.includes("OpenStreetMap"));
      if (dealSources.length > 0 && !dealSources.some((s) => s.state === "ok")) {
        throw new Error("Every deal source failed or was unavailable, so there is no real answer to show.");
      }
      const result: LiveDealsResult = { zip, place: out.place, hits: out.hits, checked: out.checked, others: out.others, sources: out.sources, fetchedAt: new Date(t).toISOString() };
      cache.set(zip, { at: t, result });
      return result;
    } catch (err) {
      // Never invent deals. If a refresh fails, show the last real answer and say it is old.
      if (cached) return { ...cached.result, stale: true, staleReason: (err as Error).message };
      throw err;
    }
  }

  return { get };
}

/** The running server's feed, using the digest's own settings (radius, hours, subreddits). */
export function realLiveDeals() {
  const defaults = loadConfig({ ...process.env, DIGEST_ZIP: process.env.DIGEST_ZIP || "02745" }, []);
  return createLiveDeals({ gather: gatherHits, now: Date.now, defaults });
}

let shared: ReturnType<typeof realLiveDeals> | null = null;

/** One feed for the whole server, so the Deals screen, the Drops screen and drop alerts share a cache. */
export function sharedLiveDeals() {
  return (shared ??= realLiveDeals());
}
