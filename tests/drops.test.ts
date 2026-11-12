import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { bestBuyOptionsFromEnv, createBestBuy, parseProduct, parseStores, productsQuery } from "../server/drops/bestBuy";
import { normalizeDate, parseSets } from "../server/drops/releases";
import { createSightingsStore, nearbySightings, validateSighting } from "../server/drops/sightings";
import { createDropFeed, DropFeedDeps } from "../server/drops/dropFeed";
import type { LiveDealsResult } from "../server/deals/liveDeals";
import type { DigestHit } from "../digest/types";

// Response shapes follow Best Buy's published field names (developer.bestbuy.com). These are
// hand-written test fixtures, not recorded live answers.
const KEY = "SECRETKEY123456";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const etb = { sku: 6578000, name: "Pokémon - Trading Card Game: Prismatic Evolutions Elite Trainer Box", url: "https://www.bestbuy.com/site/x/6578000.p", salePrice: 59.99, regularPrice: 59.99, onlineAvailability: false, inStoreAvailability: true, orderable: "Available", releaseDate: "2025-01-17", preowned: false };
const game = { sku: 6500001, name: "Pokémon Scarlet - Nintendo Switch", url: "https://www.bestbuy.com/site/y/6500001.p", salePrice: 59.99, onlineAvailability: true, inStoreAvailability: true, preowned: false };
const used = { ...etb, sku: 6578001, preowned: true };

test("productsQuery uses exact SKUs when given, keyword search otherwise, and ignores bad SKUs", () => {
  assert.equal(productsQuery(["6578000", "12"]), "products(sku in(6578000))");
  assert.equal(productsQuery([]), "products(search=pokemon&search=trading&search=card)");
  assert.equal(productsQuery(["abc); drop"]), "products(search=pokemon&search=trading&search=card)");
});

test("Best Buy settings drop junk SKUs and clamp the store-check limit", () => {
  const o = bestBuyOptionsFromEnv({ BESTBUY_API_KEY: " k ", BESTBUY_POKEMON_SKUS: "6578000, x, 1234567", BESTBUY_MAX_STORE_CHECKS: "999" });
  assert.equal(o.apiKey, "k");
  assert.deepEqual(o.skus, ["6578000", "1234567"]);
  assert.equal(o.maxStoreChecks, 8);
});

test("parseProduct keeps TCG products, drops video games in keyword mode, used items and junk", () => {
  assert.equal(parseProduct(etb, true)?.sku, 6578000);
  assert.equal(parseProduct(game, true), null);
  assert.equal(parseProduct(game, false)?.sku, 6500001, "an exact SKU the user chose is kept");
  assert.equal(parseProduct(used, true), null);
  assert.equal(parseProduct({ name: "no sku" }, true), null);
  assert.equal(parseProduct({ ...etb, url: "https://evil.example/" }, true)?.url, null);
});

test("parseStores reads Best Buy's store list and skips malformed stores", () => {
  const stores = parseStores({ ispuEligible: true, stores: [{ storeID: "1118", name: "Dartmouth", address: "200 N Dartmouth Mall", city: "North Dartmouth", state: "MA", distance: 3.2, lowStock: true }, { name: "no id" }] });
  assert.deepEqual(stores, [{ storeId: "1118", name: "Dartmouth", address: "200 N Dartmouth Mall", city: "North Dartmouth", state: "MA", distanceMiles: 3.2, lowStock: true }]);
  assert.deepEqual(parseStores(null), []);
});

test("without a key Best Buy is skipped and never called", async () => {
  let calls = 0;
  const bb = createBestBuy({ fetchImpl: (async () => { calls++; return jsonResponse({}); }) as typeof fetch });
  const out = await bb.check("02745");
  assert.equal(out.status.state, "skipped");
  assert.equal(calls, 0);
});

test("with a key: products, then one store check per in-store item, up to the limit", async () => {
  const urls: string[] = [];
  const fetchImpl = (async (url: string) => {
    urls.push(url);
    if (url.includes("/stores.json")) return jsonResponse({ stores: [{ storeID: 1118, name: "Dartmouth", city: "North Dartmouth", state: "MA", distance: 3.2, lowStock: false }] });
    return jsonResponse({ products: [etb, { ...etb, sku: 6578002 }, game, used] });
  }) as typeof fetch;
  const bb = createBestBuy({ apiKey: KEY, fetchImpl, maxStoreChecks: 1, sleep: async () => {} });
  const out = await bb.check("02745");
  assert.equal(out.status.state, "ok");
  assert.deepEqual(out.items.map((i) => i.sku), [6578000, 6578002]);
  assert.equal(out.items[0].nearbyStores?.[0].storeId, "1118");
  assert.equal(out.items[1].nearbyStores, null, "over the limit: not checked, not invented");
  assert.equal(urls.length, 2);
  assert.match(urls[1], /products\/6578000\/stores\.json\?postalCode=02745&apiKey=/);
  assert.match(out.status.detail, /1 not store-checked/);
});

test("Best Buy errors say what happened and never contain the key or the URL", async () => {
  for (const fetchImpl of [
    (async () => jsonResponse({ error: "nope" }, 403)) as typeof fetch,
    (async (url: string) => { throw new Error(`connect ECONNREFUSED ${url}`); }) as typeof fetch,
  ]) {
    const out = await createBestBuy({ apiKey: KEY, fetchImpl }).check("02745");
    assert.equal(out.status.state, "failed");
    assert.doesNotMatch(JSON.stringify(out), new RegExp(KEY));
    assert.doesNotMatch(out.status.detail, /api\.bestbuy\.com/);
  }
});

test("a failed store check is reported on the item and doesn't drop the product", async () => {
  const fetchImpl = (async (url: string) => (url.includes("/stores.json") ? jsonResponse({}, 500) : jsonResponse({ products: [etb] }))) as typeof fetch;
  const out = await createBestBuy({ apiKey: KEY, fetchImpl, sleep: async () => {} }).check("02745");
  assert.equal(out.items.length, 1);
  assert.match(out.items[0].storeCheckError ?? "", /HTTP 500/);
  assert.equal(out.status.state, "failed", "every store check failed, so the in-store answer is not real");
});

test("set dates are normalized, marked upcoming against today, sorted newest first, junk dropped", () => {
  assert.equal(normalizeDate("2026/11/07"), "2026-11-07");
  assert.equal(normalizeDate("soon"), null);
  const sets = parseSets(
    {
      data: [
        { id: "a", name: "Old", series: "S", releaseDate: "2025/01/17", images: { logo: "https://images.pokemontcg.io/a/logo.png" } },
        { id: "b", name: "Next", series: "S", releaseDate: "2026/12/05", images: { logo: "http://insecure/logo.png" } },
        { id: "c", name: "No date", series: "S" },
      ],
    },
    "2026-11-12"
  );
  assert.deepEqual(sets.map((s) => [s.id, s.upcoming]), [["b", true], ["a", false]]);
  assert.equal(sets[0].logo, null);
});

test("sighting reports are validated and cleaned", () => {
  assert.equal(typeof validateSighting({ zip: "1234" }), "string");
  assert.equal(typeof validateSighting({ zip: "02745", store: "amazon", status: "on_shelf", product: "ETB", location: "Dartmouth" }), "string");
  const ok = validateSighting({ zip: "02745", store: "target", status: "low", product: "  Prismatic\u0000 ETB ", location: "Dartmouth", note: "x".repeat(500) });
  assert.notEqual(typeof ok, "string");
  if (typeof ok !== "string") {
    assert.equal(ok.product, "Prismatic ETB");
    assert.equal(ok.note.length, 200);
  }
});

test("sightings are saved to the file, shared within the 3-digit ZIP area, and expire after 48 hours", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pd-sightings-"));
  const file = path.join(dir, "s.json");
  let now = Date.parse("2026-11-12T12:00:00Z");
  const store = createSightingsStore(file, () => now);
  await Promise.all([
    store.add({ zip: "02745", store: "target", status: "on_shelf", product: "ETB", location: "Dartmouth", note: "" }),
    store.add({ zip: "02840", store: "walmart", status: "low", product: "Tin", location: "Newport", note: "" }),
    store.add({ zip: "90210", store: "walmart", status: "low", product: "Tin", location: "LA", note: "" }),
  ]);
  assert.equal(JSON.parse(await readFile(file, "utf8")).length, 3, "simultaneous reports don't overwrite each other");
  assert.deepEqual((await store.near("02790")).map((s) => s.zip), ["02745"]);
  now += 49 * 3600_000;
  assert.equal((await store.near("02745")).length, 0);
  assert.deepEqual(nearbySightings([], "02745", now), []);
});

function hit(kind: DigestHit["kind"], id: string): DigestHit {
  return { post: { source: "r/PokemonRestocks", id, title: `post ${id}`, url: `https://www.reddit.com/${id}`, body: "", publishedAt: new Date() }, kind, store: "target", price: null, inStore: true, nearest: null, action: "" };
}

function feedDeps(over: Partial<DropFeedDeps> = {}): DropFeedDeps {
  const live: LiveDealsResult = { zip: "02745", place: "X", hits: [hit("pokemon", "1"), hit("penny", "2")], checked: 2, others: [], sources: [{ name: "Slickdeals", state: "ok", detail: "" }], fetchedAt: "2026-11-12T12:00:00.000Z" };
  return {
    bestBuy: { check: async () => ({ items: [], status: { name: "Best Buy API", state: "skipped", detail: "no key" } }) },
    community: async () => live,
    sightings: { near: async () => [] },
    releases: { latest: async () => ({ sets: [], status: { name: "pokemontcg.io set list", state: "ok", detail: "" } }) },
    now: () => Date.parse("2026-11-12T12:00:00Z"),
    ...over,
  };
}

test("the drop feed keeps only Pokémon posts and reports every source", async () => {
  const out = await createDropFeed(feedDeps()).get("02745");
  assert.deepEqual(out.community.map((h) => h.post.id), ["1"]);
  assert.deepEqual(out.sources.map((s) => s.name), ["Best Buy API", "Slickdeals", "Penny Deals user sightings", "pokemontcg.io set list"]);
});

test("one source failing doesn't take down the others, and its failure is shown", async () => {
  const out = await createDropFeed(
    feedDeps({
      community: async () => { throw new Error("Every deal source failed"); },
      bestBuy: { check: async () => { throw new Error("boom"); } },
    })
  ).get("02745");
  assert.deepEqual(out.community, []);
  assert.equal(out.sources.find((s) => s.name === "Best Buy API")?.state, "failed");
  assert.equal(out.sources.find((s) => s.name.startsWith("Community"))?.state, "failed");
  assert.equal(out.sources.find((s) => s.name === "pokemontcg.io set list")?.state, "ok");
});

test("answers are cached per ZIP, simultaneous requests share one fetch, and forget() clears it", async () => {
  let calls = 0;
  const feed = createDropFeed(feedDeps({ community: async () => { calls++; return { zip: "02745", place: "X", hits: [], checked: 0, others: [], sources: [{ name: "Slickdeals", state: "ok", detail: "" }], fetchedAt: "" }; } }));
  await Promise.all([feed.get("02745"), feed.get("02745")]);
  await feed.get("02745");
  assert.equal(calls, 1);
  feed.forget("02745");
  await feed.get("02745");
  assert.equal(calls, 2);
  await assert.rejects(feed.get("abc"), /5 digits/);
});

test("nothing is cached when every outside source failed", async () => {
  let calls = 0;
  const feed = createDropFeed(
    feedDeps({
      community: async () => { calls++; throw new Error("down"); },
      releases: { latest: async () => ({ sets: [], status: { name: "pokemontcg.io set list", state: "failed", detail: "down" } }) },
    })
  );
  await feed.get("02745");
  await feed.get("02745");
  assert.equal(calls, 2);
});
