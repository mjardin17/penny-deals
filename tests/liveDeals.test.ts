import { test } from "node:test";
import assert from "node:assert/strict";
import { gatherHits, GatherDeps } from "../digest/gather";
import { createLiveDeals } from "../server/deals/liveDeals";
import { DigestConfig } from "../digest/config";
import { NearbyStore, RawPost } from "../digest/types";

const NOW = new Date("2026-10-06T12:00:00Z");

function post(title: string, hoursAgo: number, body = "", source = "Slickdeals", score = 5): RawPost {
  return { source, id: `${source}-${title}`, title, url: `https://slickdeals.net/f/${encodeURIComponent(title)}`, body, publishedAt: new Date(NOW.getTime() - hoursAgo * 3600_000), score };
}

const stores: NearbyStore[] = [
  { store: "homeDepot", name: "The Home Depot", address: "470 State Road, North Dartmouth", lat: 41.64, lon: -71.0, miles: 4.7 },
  { store: "walmart", name: "Walmart", address: "42 Fairhaven Commons Way", lat: 41.64, lon: -70.88, miles: 4 },
];

const config: DigestConfig = { zip: "02745", radiusMiles: 25, lookbackHours: 36, outDir: "digests", cacheDir: ".cache", redditSubs: ["r/frugal"] } as DigestConfig;

function deps(overrides: Partial<GatherDeps> = {}): GatherDeps {
  return {
    geocodeZip: async () => ({ lat: 41.6, lon: -70.9, place: "New Bedford, MA" }),
    loadNearbyStores: async () => ({ stores, fromCache: false }),
    fetchAllSlickdeals: async () => ({
      posts: [
        post("Select Stores: 5-Pc Husky Pliers & Wrench Set $6.20 (In-Store Only)", 3, "three in stock at my store, clearance at Home Depot"),
        post("Pokémon TCG 30th Celebration Elite Trainer Box $83.44 at Walmart", 5),
        post("Home Depot penny list: LED bulbs $0.01", 40, "in-store"),
      ],
      errors: [],
    }),
    fetchReddit: async () => ({ posts: [], status: { name: "Reddit", state: "skipped", detail: "Needs keys" } }),
    ...overrides,
  };
}

test("gathers real posts into hits, drops posts older than the lookback window, and reports every source", async () => {
  const out = await gatherHits(config, NOW, deps());
  const titles = out.hits.map((h) => h.post.title);
  assert.ok(titles.some((t) => t.includes("Husky Pliers")));
  assert.ok(titles.some((t) => t.includes("Pokémon TCG")));
  assert.ok(!titles.some((t) => t.includes("penny list")), "a 40-hour-old post is outside the 36-hour window");
  const names = out.sources.map((s) => s.name);
  assert.ok(names.includes("Slickdeals") && names.includes("Reddit") && names.some((n) => n.includes("OpenStreetMap")));
  assert.equal(out.place, "New Bedford, MA");
});

test("closest branch first", async () => {
  const out = await gatherHits(config, NOW, deps());
  const miles = out.hits.map((h) => h.nearest?.miles ?? Infinity);
  assert.deepEqual([...miles].sort((a, b) => a - b), miles);
});

test("if store locations fail, deals still come back and the source says it failed", async () => {
  const out = await gatherHits(config, NOW, deps({ loadNearbyStores: async () => { throw new Error("overpass timeout"); } }));
  assert.ok(out.hits.length > 0);
  const osm = out.sources.find((s) => s.name.includes("OpenStreetMap"))!;
  assert.equal(osm.state, "failed");
  assert.match(osm.detail, /timeout/);
});

test("if every deal source returns nothing, the source is marked failed, not 'ok'", async () => {
  const out = await gatherHits(config, NOW, deps({ fetchAllSlickdeals: async () => ({ posts: [], errors: ["HTTP 503"] }) }));
  assert.equal(out.hits.length, 0);
  assert.equal(out.sources.find((s) => s.name === "Slickdeals")!.state, "failed");
});

test("downvoted posts and other chains' stores are dropped", async () => {
  const out = await gatherHits(
    config,
    NOW,
    deps({ fetchAllSlickdeals: async () => ({ posts: [post("Meta $54.72 at my local Lowe's", 2, "", "Slickdeals", -4), post("Kohl's clearance jacket $9 in-store", 2)], errors: [] }) })
  );
  assert.equal(out.hits.length, 0);
});

// ---- the live feed wrapper ----

test("live deals are cached for ten minutes per ZIP and carry their fetch time", async () => {
  let t = NOW.getTime();
  let calls = 0;
  const feed = createLiveDeals({ gather: async () => { calls++; return { hits: [], sources: [], place: "X", origin: { lat: 0, lon: 0 }, stores: [] } as any; }, now: () => t, defaults: config });
  const a = await feed.get("02745");
  await feed.get("02745");
  assert.equal(calls, 1);
  assert.equal(a.fetchedAt, new Date(NOW.getTime()).toISOString());
  await feed.get("02840");
  assert.equal(calls, 2, "a different ZIP is a different request");
  t += 11 * 60_000;
  await feed.get("02745");
  assert.equal(calls, 3, "after ten minutes it fetches again");
});

test("a bad ZIP is refused before any network call", async () => {
  let calls = 0;
  const feed = createLiveDeals({ gather: async () => { calls++; return {} as any; }, now: () => 0, defaults: config });
  await assert.rejects(() => feed.get("abc"), /ZIP/i);
  await assert.rejects(() => feed.get("1234"), /ZIP/i);
  assert.equal(calls, 0);
});

test("if a refresh fails, the last good answer is returned and marked stale", async () => {
  let t = 0;
  let fail = false;
  const feed = createLiveDeals({
    gather: async () => { if (fail) throw new Error("network down"); return { hits: [], sources: [], place: "X", origin: { lat: 0, lon: 0 }, stores: [] } as any; },
    now: () => t,
    defaults: config,
  });
  await feed.get("02745");
  fail = true;
  t += 11 * 60_000;
  const stale = await feed.get("02745");
  assert.equal(stale.stale, true);
  assert.match(stale.staleReason ?? "", /network down/);
  const empty = createLiveDeals({ gather: async () => { throw new Error("down from the start"); }, now: () => 0, defaults: config });
  await assert.rejects(() => empty.get("02745"), /down from the start/);
});
