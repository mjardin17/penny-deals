import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPost, detectKind, extractPrice, isInStore, sortClosestFirst } from "../digest/classify";
import { haversineMiles, parseOverpassStores } from "../digest/geo";
import { parseSlickdealsRss } from "../digest/sources/slickdeals";
import { renderDigest } from "../digest/render";
import { loadConfig } from "../digest/config";
import { NearbyStore, RawPost } from "../digest/types";

// Titles and bodies below are real Slickdeals posts from 2026-09-17.
function post(title: string, body = "", score = 5): RawPost {
  return { source: "Slickdeals", id: title, title, url: "https://slickdeals.net/f/1", body, publishedAt: new Date("2026-09-17T16:00:00Z"), score };
}

const stores: NearbyStore[] = [
  { store: "walmart", name: "Walmart", address: "42 Fairhaven Commons Way, Fairhaven", lat: 41.64, lon: -70.88, miles: 4 },
  { store: "homeDepot", name: "The Home Depot", address: "470 State Road, North Dartmouth", lat: 41.64, lon: -71.0, miles: 4.7 },
  { store: "homeDepot", name: "The Home Depot", address: "County Street, Taunton", lat: 41.87, lon: -71.06, miles: 13.4 },
];

test("extractPrice takes the posted price, not order minimums", () => {
  assert.equal(
    extractPrice("YMMV: George Men's 100% Cotton Short Sleeve Slub Pocket Tee (Various, Sizes X-Small, Small) from $2.21 + Free S&H w/ Walmart+ or on $35+"),
    2.21
  );
  assert.equal(extractPrice("PACKOUT 22 in. Modular 3-Drawer Tool Box with Metal Reinforced Corners 129 YMMV $129.35"), 129.35);
  assert.equal(extractPrice("Select Stores: 5-Pc Husky Pliers & Wrench Set $6.20 (In-Store Only)"), 6.2);
  assert.equal(extractPrice("Makita Router & Jigsaw w/ Case $339 + Free Shipping"), 339);
  assert.equal(extractPrice("Save $10 on a $1,299.99 grill"), 1299.99);
  assert.equal(extractPrice("Penny item: clearance lamp $.01"), 0.01);
  assert.equal(extractPrice("No price in this title"), null);
});

test("in-store vs online", () => {
  assert.equal(isInStore(post("Hyper Tough Lawn Mower. $108 in store only")), true);
  assert.equal(isInStore(post("Major YMMV: Tape Measure $3.22", "i grabbed a couple at my HD in North NJ")), true);
  assert.equal(isInStore(post("YMMV: George Tee from $2.21 + Free S&H w/ Walmart+")), false);
  assert.equal(isInStore(post("Chair $153.65", "Home Depot [homedepot.com] has Chair on sale")), false);
});

test("Pokémon counts only for TCG products", () => {
  assert.equal(detectKind(post("Pokémon TCG 30th Celebration Elite Trainer Box $83.44"), 83.44), "pokemon");
  assert.equal(detectKind(post("YMMV- Pokemon Pokopia Digital $31"), 31), null);
});

test("penny detection", () => {
  assert.equal(detectKind(post("Home Depot penny list: LED bulbs $0.01", "in-store"), 0.01), "penny");
});

test("classifyPost attaches the nearest branch and a concrete action", () => {
  const hit = classifyPost(post("Select Stores: 5-Pc Husky Pliers & Wrench Set $6.20 (In-Store Only)", "There were three in stock at my store. Been noticing more and more that clearance items do not show up in stock on Home Depot app"), stores)!;
  assert.equal(hit.store, "homeDepot");
  assert.equal(hit.kind, "clearance");
  assert.equal(hit.nearest?.address, "470 State Road, North Dartmouth");
  assert.match(hit.action, /470 State Road/);
});

test("classifyPost drops downvoted posts and untracked stores", () => {
  assert.equal(classifyPost(post("Meta $54.72", "at my local Lowe's", -4), stores), null);
  assert.equal(classifyPost(post("Kohl's clearance jacket $9", "in-store"), stores), null);
});

test("sortClosestFirst puts local hits first, online last", () => {
  const online = classifyPost(post("Pokémon TCG Elite Trainer Box $49.99 + Free Shipping", "Amazon.com has it"), stores)!;
  const hd = classifyPost(post("Husky Pliers $6.20 (In-Store Only)", "Home Depot"), stores)!;
  const wm = classifyPost(post("Walmart lawn mower $108 in store only"), stores)!;
  assert.deepEqual(sortClosestFirst([online, hd, wm]).map((h) => h.store), ["walmart", "homeDepot", null]);
});

test("haversine: New Bedford to the North Dartmouth Home Depot is about 4.7 mi", () => {
  const d = haversineMiles({ lat: 41.6913, lon: -70.9355 }, { lat: 41.6438655, lon: -71.0013373 });
  assert.ok(d > 4.6 && d < 4.8, String(d));
});

test("parseOverpassStores keeps branches, drops pharmacies, sorts by distance", () => {
  const parsed = parseOverpassStores(
    [
      { type: "node", lat: 41.6419, lon: -71.0079, tags: { brand: "Walmart", name: "Walmart Supercenter", "addr:street": "State Road", "addr:city": "North Dartmouth" } },
      { type: "node", lat: 41.6422, lon: -71.0077, tags: { brand: "Walmart", name: "Walmart Pharmacy" } },
      { type: "way", center: { lat: 41.6443, lon: -70.9849 }, tags: { brand: "Lowe's", name: "Lowe's" } },
      { type: "node", lat: 41.6, lon: -71.0, tags: { brand: "Kohl's" } },
    ],
    { lat: 41.6913, lon: -70.9355 }
  );
  assert.deepEqual(parsed.map((s) => s.store), ["lowes", "walmart"]);
  assert.equal(parsed[1].address, "State Road, North Dartmouth");
});

test("parseSlickdealsRss reads CDATA titles, links and thumb score", () => {
  const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
    <item><title><![CDATA[Select Stores: 5-Pc Husky Pliers & Wrench Set $6.20 (In-Store Only)]]></title>
    <link>https://slickdeals.net/f/20028630-select-stores?utm_source=rss&amp;utm_medium=RSS2</link>
    <description><![CDATA[There were three in stock at my store.]]></description>
    <content:encoded><![CDATA[<div>Thumb Score: +55 </div>]]></content:encoded>
    <pubDate>Thu, 17 Sep 2026 16:07:16 +0000</pubDate></item>
    <item><title>Broken item</title><pubDate>not a date</pubDate></item>
  </channel></rss>`;
  const posts = parseSlickdealsRss(xml);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].title, "Select Stores: 5-Pc Husky Pliers & Wrench Set $6.20 (In-Store Only)");
  assert.equal(posts[0].url, "https://slickdeals.net/f/20028630-select-stores");
  assert.equal(posts[0].score, 55);
  assert.equal(posts[0].id, "sd-20028630");
});

test("renderDigest lists every section, even empty ones, plus source status", () => {
  const hit = classifyPost(post("Husky Pliers $6.20 (In-Store Only)", "Home Depot"), stores)!;
  const md = renderDigest(
    { date: "2026-09-18", generatedAt: new Date("2026-09-18T10:00:00Z"), zip: "02745", place: "New Bedford, MA", radiusMiles: 40, lookbackHours: 36, nearbyStoreCount: 3 },
    [hit],
    [{ name: "Reddit", state: "skipped", detail: "Needs REDDIT_CLIENT_ID" }]
  );
  assert.match(md, /^# Deal digest: 2026-09-18/);
  assert.match(md, /## Penny drops \(0\)/);
  assert.match(md, /## Clearance and price drops \(1\)/);
  assert.match(md, /\*\*Distance:\*\* 4\.7 mi/);
  assert.match(md, /\| Reddit \| skipped \|/);
});

test("loadConfig requires a real ZIP and sane bounds", () => {
  assert.throws(() => loadConfig({}, []));
  assert.throws(() => loadConfig({ DIGEST_ZIP: "[FILL IN]" }, []));
  assert.equal(loadConfig({}, ["--zip", "02745"]).zip, "02745");
  assert.throws(() => loadConfig({ DIGEST_ZIP: "02745", DIGEST_RADIUS_MILES: "0" }, []));
});
