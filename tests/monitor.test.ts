import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowed, parseRobots } from "../server/monitor/robots";
import { createPoliteFetcher, looksWalled, MONITOR_USER_AGENT } from "../server/monitor/politeFetch";
import { mapAvailability, readPageStock } from "../server/monitor/pageStock";
import { createMonitor } from "../server/monitor/monitor";
import { diffReadings } from "../server/monitor/alerts";
import { intervalMinutes } from "../server/monitor/cli";
import { nameMatches } from "../server/monitor/watchlist";
import type { Reading, WatchProduct, WatchStore } from "../server/monitor/types";

// Hand-written fixtures in the shapes the sites and Best Buy's docs describe, not recorded live answers.

const ROBOTS = `User-agent: Googlebot
Disallow: /

User-agent: *
Disallow: /search
Disallow: /*?q=
Allow: /search/finder
Disallow: /checkout$
`;

test("robots: the * group applies to us; longest match wins; wildcards and $ work", () => {
  const rules = parseRobots(ROBOTS, MONITOR_USER_AGENT);
  assert.equal(isAllowed(rules, "/toys/products/x/452105.html"), true);
  assert.equal(isAllowed(rules, "/search?x=1"), false);
  assert.equal(isAllowed(rules, "/search/finder"), true);
  assert.equal(isAllowed(rules, "/p/thing?q=pokemon"), false);
  assert.equal(isAllowed(rules, "/checkout"), false);
  assert.equal(isAllowed(rules, "/checkout/step"), true);
  assert.equal(isAllowed(parseRobots("User-agent: PennyDealsStockMonitor\nDisallow: /\n", MONITOR_USER_AGENT), "/x"), false, "a group naming us wins");
});

test("walls: 403, 429 and challenge pages count; an ordinary page doesn't", () => {
  assert.equal(looksWalled(403, ""), true);
  assert.equal(looksWalled(429, ""), true);
  assert.equal(looksWalled(200, '<iframe src="/_Incapsula_Resource?SWJIYLWA=1">'), true);
  assert.equal(looksWalled(200, "<html><title>Pikachu</title>recaptcha script</html>"), false);
});

function ldPage(availability: string | string[]): string {
  const offers = Array.isArray(availability) ? availability.map((a) => ({ "@type": "Offer", availability: a })) : { "@type": "Offer", availability };
  return `<html><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: "x", offers })}</script></html>`;
}

test("page stock comes only from the page's schema.org availability", () => {
  assert.equal(readPageStock(ldPage("https://schema.org/InStock")).state, "in_stock");
  assert.equal(readPageStock(ldPage("http://schema.org/OutOfStock")).state, "out_of_stock");
  assert.equal(readPageStock(ldPage("PreOrder")).state, "preorder");
  assert.equal(readPageStock(ldPage(["OutOfStock", "InStock"])).state, "in_stock");
  assert.equal(readPageStock("<html><button>Add to cart</button></html>").state, "unknown", "never guessed from the page's look");
  assert.equal(readPageStock('<script type="application/ld+json">{broken</script>').state, "unknown");
  assert.equal(mapAvailability("https://schema.org/SomethingNew"), "unknown");
});

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function fakeFetch(handler: Handler) {
  const calls: { url: string; ua: string | null }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, ua: new Headers(init?.headers).get("User-Agent") });
    return handler(url, init);
  }) as typeof fetch;
  return { impl, calls };
}

const quick = { sleep: async () => {}, gapMs: 0 };

test("polite fetch: honest User-Agent, robots read first, disallowed paths never fetched", async () => {
  const f = fakeFetch((url) => (url.endsWith("/robots.txt") ? new Response("User-agent: *\nDisallow: /private\n") : new Response(ldPage("InStock"))));
  const pf = createPoliteFetcher({ fetchImpl: f.impl, ...quick });
  assert.equal((await pf.get("https://shop.example/private/item")).kind, "disallowed");
  assert.equal((await pf.get("https://shop.example/item")).kind, "ok");
  assert.deepEqual(f.calls.map((c) => c.url), ["https://shop.example/robots.txt", "https://shop.example/item"], "robots.txt read once and cached");
  assert.ok(f.calls.every((c) => c.ua === MONITOR_USER_AGENT));
});

test("polite fetch: a walled robots.txt marks the site blocked and nothing more is requested while backing off", async () => {
  let t = 0;
  const f = fakeFetch(() => new Response('<html><iframe src="/_Incapsula_Resource?x=1"></iframe></html>'));
  const pf = createPoliteFetcher({ fetchImpl: f.impl, now: () => t, ...quick });
  const first = await pf.get("https://walled.example/product/1");
  assert.equal(first.kind, "blocked");
  assert.match(first.kind === "blocked" ? first.detail : "", /Backing off 30 minutes/);
  assert.equal((await pf.get("https://walled.example/product/2")).kind, "blocked");
  assert.equal((await pf.probe("walled.example")).kind, "blocked");
  assert.equal(f.calls.length, 1, "no retry around the wall");
  t = 31 * 60_000;
  await pf.get("https://walled.example/product/1");
  assert.equal(f.calls.length, 2, "tries again only after the back-off");
  const again = await pf.get("https://walled.example/product/1");
  assert.match(again.kind === "blocked" ? again.detail : "", /more minutes/);
});

test("polite fetch: a 403 product page is blocked; a network failure is unknown, not blocked; a queue redirect is reported, not followed", async () => {
  const f = fakeFetch((url) => {
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /\n");
    if (url.includes("/403")) return new Response("denied", { status: 403 });
    if (url.includes("/queue")) return new Response(null, { status: 302, headers: { Location: "https://pokemon.queue-it.net/?c=x" } });
    throw new TypeError("fetch failed");
  });
  const pf = createPoliteFetcher({ fetchImpl: f.impl, ...quick });
  assert.equal((await pf.get("https://a.example/403")).kind, "blocked");
  assert.equal((await pf.get("https://b.example/down")).kind, "error");
  assert.equal((await pf.get("https://c.example/queue")).kind, "queue");
  assert.ok(!f.calls.some((c) => c.url.includes("queue-it")));
});

test("polite fetch: an unreadable robots.txt means nothing on that site is fetched", async () => {
  const f = fakeFetch((url) => (url.endsWith("/robots.txt") ? new Response("oops", { status: 500 }) : new Response("page")));
  const pf = createPoliteFetcher({ fetchImpl: f.impl, ...quick });
  assert.equal((await pf.get("https://x.example/item")).kind, "error");
  assert.equal((await pf.get("https://x.example/other")).kind, "error");
  assert.equal(f.calls.length, 1, "one robots.txt attempt per site per pass");
});

const products: WatchProduct[] = [
  { id: "etb", name: "30th Celebration Elite Trainer Box", keywords: ["30th", "celebration", "elite trainer"], pages: { gamestop: ["https://www.gamestop.com/p/etb.html"] } },
  { id: "poster", name: "30th Celebration Poster Collection", keywords: ["30th", "celebration", "poster"], pages: {} },
];
const stores: WatchStore[] = [
  { retailer: "target", label: "Target North Dartmouth" },
  { retailer: "walmart", label: "Walmart Fairhaven" },
  { retailer: "gamestop", label: "GameStop Fall River", note: "Online stock from the product page; GameStop publishes no per-store stock." },
  { retailer: "pokemonCenter", label: "Pokémon Center online" },
  { retailer: "bestBuy", label: "Best Buy North Dartmouth", branchMatch: /dartmouth/i },
];

test("one pass: Target and Walmart are disallowed with zero requests; GameStop page read; Pokémon Center wall is blocked", async () => {
  const f = fakeFetch((url) => {
    if (url.includes("pokemoncenter.com")) return new Response('<iframe src="/_Incapsula_Resource?a=1">');
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nDisallow: /search\n");
    if (url.endsWith("etb.html")) return new Response(ldPage("https://schema.org/OutOfStock"));
    return new Response("nope", { status: 404 });
  });
  const monitor = createMonitor({ fetcher: createPoliteFetcher({ fetchImpl: f.impl, ...quick }), products, stores });
  const readings = await monitor.runOnce();
  const at = (store: string, product: string) => readings.find((r) => r.store === store && r.product === product)!;
  assert.equal(at("Target North Dartmouth", products[0].name).state, "disallowed");
  assert.equal(at("Walmart Fairhaven", products[0].name).state, "disallowed");
  assert.ok(!f.calls.some((c) => /target\.com|walmart\.com/.test(c.url)), "no request to a disallowed retailer");
  assert.equal(at("GameStop Fall River", products[0].name).state, "out_of_stock");
  assert.match(at("GameStop Fall River", products[0].name).detail, /publishes no per-store stock/);
  assert.equal(at("GameStop Fall River", products[1].name).state, "unknown");
  assert.equal(at("Pokémon Center online", products[0].name).state, "blocked");
  assert.equal(f.calls.filter((c) => c.url.includes("pokemoncenter.com")).length, 1, "one robots.txt request, then back off");
  assert.equal(at("Best Buy North Dartmouth", products[0].name).state, "unknown");
  assert.match(at("Best Buy North Dartmouth", products[0].name).detail, /BESTBUY_API_KEY/);
  assert.equal(readings.length, stores.length * products.length);
});

test("Best Buy: finds the North Dartmouth branch, matches products by name, reads that store's stock", async () => {
  const urls: string[] = [];
  const bestBuyFetch = (async (url: string) => {
    urls.push(url);
    if (url.includes("/stores(area(")) return Response.json({ stores: [{ storeId: 111, name: "Fall River", city: "Fall River" }, { storeId: 1118, name: "North Dartmouth", city: "North Dartmouth" }] });
    if (url.includes("/products(search=")) return Response.json({ products: [
      { sku: 1, name: "Pokémon TCG: 30th Celebration Elite Trainer Box", inStoreAvailability: true, onlineAvailability: false, orderable: "SoldOut" },
      { sku: 2, name: "Pokémon TCG: 30th Celebration Booster Bundle", inStoreAvailability: true, onlineAvailability: true },
    ] });
    if (url.includes("/products/1/stores.json")) return Response.json({ stores: [{ storeID: "1118", name: "North Dartmouth", lowStock: true }] });
    return Response.json({}, { status: 500 });
  }) as typeof fetch;
  const monitor = createMonitor({ fetcher: createPoliteFetcher({ fetchImpl: (async () => new Response("")) as typeof fetch, ...quick }), bestBuyKey: "K", bestBuyFetch, products, stores: [stores[4]] });
  const [etb, poster] = await monitor.runOnce();
  assert.equal(etb.state, "in_stock");
  assert.match(etb.detail, /North Dartmouth \(low stock\)/);
  assert.equal(poster.state, "unknown");
  assert.match(poster.detail, /lists no product/);
  assert.ok(urls.some((u) => u.includes("products/1/stores.json?storeId=1118")));
  assert.ok(!urls.some((u) => u.includes("products/2/stores.json")), "booster bundle isn't on this test watchlist");
});

function reading(store: string, state: Reading["state"]): Reading {
  return { retailer: "gamestop", store, product: "ETB", state, detail: "", checkedAt: "" };
}

test("alerts: first pass records only; changes alert once; blocked or unknown never cause a repeat", () => {
  const first = diffReadings(null, [reading("G", "out_of_stock")]);
  assert.deepEqual(first.lines, []);
  const restock = diffReadings(first.next, [reading("G", "in_stock")]);
  assert.equal(restock.lines.length, 1);
  assert.match(restock.lines[0], /IN STOCK \(was out of stock\)/);
  const wall = diffReadings(restock.next, [reading("G", "blocked")]);
  assert.deepEqual(wall.lines, []);
  assert.equal(wall.next["gamestop|G|ETB"], "in_stock", "a wall doesn't erase what was known");
  assert.deepEqual(diffReadings(wall.next, [reading("G", "in_stock")]).lines, [], "same stock after the wall: no repeat");
  assert.equal(diffReadings(wall.next, [reading("G", "out_of_stock")]).lines.length, 1);
  assert.deepEqual(diffReadings({}, [reading("New", "out_of_stock")]).lines, [], "a new item that's out of stock isn't news");
});

test("interval defaults to 5 minutes with a 2-minute floor", () => {
  assert.equal(intervalMinutes(undefined), 5);
  assert.equal(intervalMinutes("1"), 2);
  assert.equal(intervalMinutes("3"), 3);
  assert.equal(intervalMinutes("abc"), 5);
});

test("product names match by keyword, ignoring accents and case", () => {
  assert.equal(nameMatches("Pokémon TCG: 30th Celebration Elite Trainer Box", ["30th", "celebration", "elite trainer"]), true);
  assert.equal(nameMatches("Pokémon TCG: 30th Celebration Booster Bundle", ["30th", "celebration", "elite trainer"]), false);
});
