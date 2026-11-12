/**
 * The Pokémon drop feed for one ZIP: Best Buy stock from Best Buy's own API, Pokémon TCG posts from
 * Reddit and Slickdeals (shared with the Deals screen), sightings from people using this app, and the
 * newest sets. Each source succeeds or fails on its own and says which; nothing is filled in.
 */

import type { LiveDealsResult } from "../deals/liveDeals";
import { createBestBuy, bestBuyOptionsFromEnv, BestBuyClient } from "./bestBuy";
import { createReleases } from "./releases";
import { createSightingsStore } from "./sightings";
import { sharedLiveDeals } from "../deals/liveDeals";
import { BestBuyResult, DropFeedResult, ReleasesResult, Sighting, SourceStatus } from "./types";

const CACHE_MS = 5 * 60_000;
const ZIP = /^\d{5}$/;

export interface DropFeedDeps {
  bestBuy: Pick<BestBuyClient, "check">;
  community: (zip: string) => Promise<LiveDealsResult>;
  sightings: { near(zip: string): Promise<Sighting[]> };
  releases: { latest(): Promise<ReleasesResult> };
  now: () => number;
}

async function communityPart(deps: DropFeedDeps, zip: string): Promise<{ hits: DropFeedResult["community"]; sources: SourceStatus[] }> {
  try {
    const feed = await deps.community(zip);
    const sources = feed.stale
      ? [...feed.sources, { name: "Community posts", state: "failed" as const, detail: `Showing posts from ${feed.fetchedAt}; the refresh failed: ${feed.staleReason}` }]
      : feed.sources;
    return { hits: feed.hits.filter((h) => h.kind === "pokemon"), sources };
  } catch (err) {
    return { hits: [], sources: [{ name: "Community posts (Reddit, Slickdeals)", state: "failed", detail: (err as Error).message }] };
  }
}

async function sightingsPart(deps: DropFeedDeps, zip: string): Promise<{ sightings: Sighting[]; source: SourceStatus }> {
  try {
    const sightings = await deps.sightings.near(zip);
    return { sightings, source: { name: "Penny Deals user sightings", state: "ok", detail: `${sightings.length} report(s) in the last 48 hours from ZIPs starting ${zip.slice(0, 3)}. Unverified.` } };
  } catch (err) {
    return { sightings: [], source: { name: "Penny Deals user sightings", state: "failed", detail: (err as Error).message } };
  }
}

export function createDropFeed(deps: DropFeedDeps) {
  const cache = new Map<string, { at: number; result: DropFeedResult }>();
  const inFlight = new Map<string, Promise<DropFeedResult>>();

  async function fetchFresh(zip: string): Promise<DropFeedResult> {
    const t = deps.now();
    const cached = cache.get(zip);
    if (cached && t - cached.at < CACHE_MS) return cached.result;

    const [bb, community, sightings, releases] = await Promise.all([
      deps.bestBuy.check(zip).catch((err): BestBuyResult => ({ items: [], status: { name: "Best Buy API", state: "failed", detail: (err as Error).message } })),
      communityPart(deps, zip),
      sightingsPart(deps, zip),
      deps.releases.latest().catch((err): ReleasesResult => ({ sets: [], status: { name: "pokemontcg.io set list", state: "failed", detail: (err as Error).message } })),
    ]);

    const result: DropFeedResult = {
      zip,
      fetchedAt: new Date(t).toISOString(),
      bestBuy: bb.items,
      community: community.hits,
      sightings: sightings.sightings,
      releases: releases.sets,
      sources: [bb.status, ...community.sources, sightings.source, releases.status],
    };
    // Don't keep an answer where every outside source failed; the next request should try again.
    const outside = result.sources.filter((s) => !s.name.startsWith("Penny Deals") && !s.name.includes("OpenStreetMap"));
    if (outside.some((s) => s.state === "ok")) cache.set(zip, { at: t, result });
    return result;
  }

  function get(zip: string): Promise<DropFeedResult> {
    if (!ZIP.test(zip)) return Promise.reject(new Error("ZIP must be 5 digits."));
    const running = inFlight.get(zip);
    if (running) return running;
    const started = fetchFresh(zip).finally(() => inFlight.delete(zip));
    inFlight.set(zip, started);
    return started;
  }

  /** Drops the cached answer for a ZIP, so a new sighting shows up at once. */
  function forget(zip: string) {
    cache.delete(zip);
  }

  return { get, forget };
}

export type DropFeed = ReturnType<typeof createDropFeed>;

let shared: { feed: DropFeed; sightings: ReturnType<typeof createSightingsStore>; bestBuy: BestBuyClient } | null = null;

/** The running server's drop feed and its parts, built once from the environment. */
export function sharedDrops() {
  if (!shared) {
    const bestBuy = createBestBuy(bestBuyOptionsFromEnv(process.env));
    const sightings = createSightingsStore();
    const releases = createReleases({ apiKey: process.env.POKEMONTCG_API_KEY?.trim() || undefined });
    const feed = createDropFeed({ bestBuy, community: (zip) => sharedLiveDeals().get(zip), sightings, releases, now: Date.now });
    shared = { feed, sightings, bestBuy };
  }
  return shared;
}
