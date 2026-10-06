/**
 * Finds real deal posts and attaches the nearest branch. Shared by the daily digest and the live
 * "Deals Today" screen so the two can never disagree. Nothing is inferred beyond what a post says.
 */

import { DigestConfig, SLICKDEALS_QUERIES } from "./config";
import { fetchAllSlickdeals } from "./sources/slickdeals";
import { fetchReddit } from "./sources/reddit";
import { geocodeZip, LatLon, loadNearbyStores } from "./geo";
import { classifyPost, sortClosestFirst } from "./classify";
import { DigestHit, NearbyStore, RawPost, SourceStatus } from "./types";

export interface GatherDeps {
  geocodeZip: (zip: string) => Promise<LatLon & { place: string }>;
  loadNearbyStores: (zip: string, origin: LatLon, radiusMiles: number, cacheDir: string) => Promise<{ stores: NearbyStore[]; fromCache: boolean }>;
  fetchAllSlickdeals: (queries: string[]) => Promise<{ posts: RawPost[]; errors: string[] }>;
  fetchReddit: (subs: string[]) => Promise<{ posts: RawPost[]; status: SourceStatus }>;
}

export const realGatherDeps: GatherDeps = { geocodeZip, loadNearbyStores, fetchAllSlickdeals, fetchReddit: (subs) => fetchReddit(subs) };

export interface Gathered {
  origin: LatLon & { place: string };
  place: string;
  stores: NearbyStore[];
  hits: DigestHit[];
  /** Every source consulted, including the ones that failed or were skipped. */
  sources: SourceStatus[];
}

export async function gatherHits(config: DigestConfig, now: Date, deps: GatherDeps = realGatherDeps): Promise<Gathered> {
  const sources: SourceStatus[] = [];

  const origin = await deps.geocodeZip(config.zip);
  let stores: NearbyStore[] = [];
  try {
    const loaded = await deps.loadNearbyStores(config.zip, origin, config.radiusMiles, config.cacheDir);
    stores = loaded.stores;
    sources.push({ name: "OpenStreetMap store locations", state: "ok", detail: `${stores.length} stores${loaded.fromCache ? " (cached)" : ""}` });
  } catch (err) {
    sources.push({ name: "OpenStreetMap store locations", state: "failed", detail: `${String(err)}. Distances unavailable.` });
  }

  const sd = await deps.fetchAllSlickdeals(SLICKDEALS_QUERIES);
  sources.push({
    name: "Slickdeals",
    state: sd.posts.length ? "ok" : "failed",
    detail: `${sd.posts.length} posts from ${SLICKDEALS_QUERIES.length} searches${sd.errors.length ? `; errors: ${sd.errors.join("; ")}` : ""}`,
  });

  const reddit = await deps.fetchReddit(config.redditSubs);
  sources.push(reddit.status);

  const cutoff = now.getTime() - config.lookbackHours * 3600_000;
  const posts: RawPost[] = [...sd.posts, ...reddit.posts].filter((p) => p.publishedAt.getTime() >= cutoff);
  const hits = sortClosestFirst(posts.flatMap((p) => classifyPost(p, stores) ?? []));

  return { origin, place: origin.place, stores, hits, sources };
}
