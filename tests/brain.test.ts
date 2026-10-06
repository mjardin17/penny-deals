import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Brain, FileBrainStore, itemKey, MemoryBrainStore } from "../server/brain/brain";
// More tests for the council's findings are in brainHardening.test.ts.
import { findSpread, SpreadProviders } from "../server/arbitrage/spreadEngine";
import { NormalizedEbayListing } from "../server/marketplace/types";

const DAY = 86_400_000;

function newBrain(start = Date.parse("2026-10-05T12:00:00Z")) {
  let t = start;
  const brain = new Brain(new MemoryBrainStore(), () => t);
  return { brain, advance: (ms: number) => (t += ms) };
}

test("itemKey prefers UPC and ignores word order and case", () => {
  assert.equal(itemKey("Milwaukee M18 Drill", "012345678905"), "upc:012345678905");
  assert.equal(itemKey("Milwaukee M18 Drill"), itemKey("drill  m18 MILWAUKEE"));
  assert.notEqual(itemKey("Milwaukee M18 Drill"), itemKey("DeWalt 20V Drill"));
});

test("remembers every price lookup and summarises the history", () => {
  const { brain, advance } = newBrain();
  const key = itemKey("Pokemon Prismatic ETB");
  assert.equal(brain.history(key).count, 0);

  brain.recordObservation({ key, channel: "ebay", resalePrice: 120, sampleSize: 30, basis: "active_ask" });
  advance(2 * DAY);
  brain.recordObservation({ key, channel: "ebay", resalePrice: 140, sampleSize: 40, basis: "active_ask" });
  advance(3 * DAY);
  brain.recordObservation({ key, channel: "ebay", resalePrice: 130, sampleSize: 35, basis: "active_ask" });

  const h = brain.history(key);
  assert.equal(h.count, 3);
  assert.equal(h.latestResale, 130);
  assert.equal(h.medianResale, 130);
  assert.equal(h.spanDays, 5);
});

test("a wrong-match report blocks that listing and nothing else", () => {
  const { brain } = newBrain();
  const key = itemKey("Milwaukee M18 Drill");
  assert.equal(brain.isBlocked("https://www.ebay.com/itm/111"), false);
  brain.recordOutcome({ key, kind: "wrong_match", matchUrl: "https://www.ebay.com/itm/111" });
  assert.equal(brain.isBlocked("https://www.ebay.com/itm/111"), true);
  assert.equal(brain.isBlocked("https://www.ebay.com/itm/222"), false);
  assert.equal(brain.isBlocked(undefined), false);
});

test("calibration needs 3 real sales before it adjusts anything", () => {
  const { brain } = newBrain();
  const key = itemKey("Pokemon Prismatic ETB");
  const sale = (predicted: number, actual: number) =>
    brain.recordOutcome({ key, kind: "sold", predictedResale: predicted, actualResale: actual });

  assert.equal(brain.calibration(key), null);
  sale(100, 90);
  sale(100, 80);
  assert.equal(brain.calibration(key), null, "two sales is not enough to learn from");
  sale(100, 85);
  const cal = brain.calibration(key);
  assert.ok(cal);
  assert.equal(cal.samples, 3);
  assert.equal(cal.ratio, 0.85);
});

test("calibration only uses sales of the same item", () => {
  const { brain } = newBrain();
  const a = itemKey("Item A");
  const b = itemKey("Item B");
  for (const actual of [50, 50, 50]) brain.recordOutcome({ key: a, kind: "sold", predictedResale: 100, actualResale: actual });
  assert.equal(brain.calibration(a)?.ratio, 0.5);
  assert.equal(brain.calibration(b), null);
});

test("counts 'not in the store' reports per store", () => {
  const { brain } = newBrain();
  const key = itemKey("Some Clearance Item");
  brain.recordOutcome({ key, kind: "not_in_store", store: "Target" });
  brain.recordOutcome({ key, kind: "not_in_store", store: "Target" });
  brain.recordOutcome({ key, kind: "not_in_store", store: "Walmart" });
  assert.equal(brain.storeReports("Target").notInStore, 2);
  assert.equal(brain.storeReports("Walmart").notInStore, 1);
  assert.equal(brain.storeReports("Lowe's").notInStore, 0);
});

test("rejects outcomes with impossible numbers", () => {
  const { brain } = newBrain();
  const key = itemKey("X");
  assert.throws(() => brain.recordOutcome({ key, kind: "sold", predictedResale: 0, actualResale: 10 }), /predictedResale/);
  assert.throws(() => brain.recordOutcome({ key, kind: "sold", predictedResale: 10, actualResale: -1 }), /actualResale/);
  assert.throws(() => brain.recordOutcome({ key, kind: "wrong_match" }), /matchUrl/);
});

test("file store round-trips, starts empty, and refuses to wipe a corrupt file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brain-"));
  const file = path.join(dir, "brain.json");
  try {
    const first = new Brain(new FileBrainStore(file));
    assert.equal(first.history("k").count, 0);
    first.recordObservation({ key: "k", channel: "ebay", resalePrice: 10, sampleSize: 5, basis: "active_ask" });

    const second = new Brain(new FileBrainStore(file));
    assert.equal(second.history("k").count, 1, "a restart keeps what it learned");

    fs.writeFileSync(file, "{ not json");
    assert.throws(() => new Brain(new FileBrainStore(file)), /corrupt/i);
    assert.equal(fs.readFileSync(file, "utf8"), "{ not json", "corrupt file is left alone for recovery");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- wired into the spread engine ----

function listing(price: number, url: string): NormalizedEbayListing {
  return {
    itemId: `${price}-${url}`,
    title: "Pokemon Prismatic Evolutions Elite Trainer Box",
    price,
    currency: "USD",
    condition: "New",
    itemWebUrl: url,
    shippingCost: 0,
    buyingOptions: ["FIXED_PRICE"],
    retrievalTimestamp: 0,
    provenance: "confirmed_marketplace_api",
  };
}

const comps = [100, 110, 120, 130, 140, 150].map((p, i) => listing(p, `https://www.ebay.com/itm/${i + 1}`));
const providers: SpreadProviders = {
  searchEbay: async () => comps,
  searchAmazon: async () => [],
};
const candidate = { title: "Pokemon Prismatic Evolutions Elite Trainer Box", buyPrice: 50 };

test("every spread check is remembered by the brain", async () => {
  const { brain } = newBrain();
  await findSpread(candidate, providers, undefined, brain);
  const h = brain.history(itemKey(candidate.title));
  assert.equal(h.count, 1);
  assert.equal(h.latestResale, 112.5);
});

test("a listing marked 'wrong match' is never used as the match again", async () => {
  const { brain } = newBrain();
  const key = itemKey(candidate.title);
  const before = await findSpread(candidate, providers, undefined, brain);
  const ebayBefore = before.channels.find((c) => c.channel === "ebay")!;
  assert.equal(ebayBefore.status, "ok");
  assert.equal(ebayBefore.brain?.blockedListingsSkipped, 0);

  brain.recordOutcome({ key, kind: "wrong_match", matchUrl: ebayBefore.matchUrl });
  const after = await findSpread(candidate, providers, undefined, brain);
  const ebayAfter = after.channels.find((c) => c.channel === "ebay")!;
  assert.equal(ebayAfter.status, "ok", "still enough other comps to answer");
  assert.equal(ebayAfter.brain?.blockedListingsSkipped, 1);
  assert.notEqual(ebayAfter.matchUrl, ebayBefore.matchUrl);
});

test("learned sale ratio lowers the resale price and says so", async () => {
  const { brain } = newBrain();
  const key = itemKey(candidate.title);
  const plain = (await findSpread(candidate, providers, undefined, brain)).channels.find((c) => c.channel === "ebay")!;

  for (const actual of [90, 90, 90]) brain.recordOutcome({ key, kind: "sold", predictedResale: 112.5, actualResale: actual });
  const learned = (await findSpread(candidate, providers, undefined, brain)).channels.find((c) => c.channel === "ebay")!;

  assert.ok(learned.resalePrice! < plain.resalePrice!);
  assert.equal(learned.resalePrice, 90);
  assert.match(learned.resaleBasis!, /3 of your past sales/);
  assert.equal(learned.brain?.calibration?.samples, 3);
});

test("a learned ratio above 1 never raises the price (stays conservative)", async () => {
  const { brain } = newBrain();
  const key = itemKey(candidate.title);
  for (const actual of [150, 150, 150]) brain.recordOutcome({ key, kind: "sold", predictedResale: 100, actualResale: actual });
  const ebay = (await findSpread(candidate, providers, undefined, brain)).channels.find((c) => c.channel === "ebay")!;
  assert.equal(ebay.resalePrice, 112.5);
  assert.equal(ebay.brain?.calibrationApplied, false);
});

test("a brain write failure never breaks the lookup", async () => {
  const failing = new Brain(
    {
      load: () => ({ observations: [], outcomes: [], sightings: [] }),
      save: () => {
        throw new Error("ENOSPC: no space left on device");
      },
    },
    () => 0
  );
  const originalError = console.error;
  const logged: string[] = [];
  console.error = (...a: unknown[]) => void logged.push(a.join(" "));
  try {
    const report = await findSpread(candidate, providers, undefined, failing);
    assert.equal(report.channels.find((c) => c.channel === "ebay")!.status, "ok");
    assert.ok(logged.some((l) => l.includes("ENOSPC")), "the failure is logged, not swallowed");
  } finally {
    console.error = originalError;
  }
});

// ---- remembers the prices you type in ----

test("remembers every price you enter, with the store and when", () => {
  const { brain, advance } = newBrain();
  const key = itemKey("Pokemon Prismatic ETB");
  assert.deepEqual(brain.paidHistory(key), { count: 0 });

  assert.equal(brain.recordSighting({ key, price: 49.99, store: "Target" }), true);
  advance(2 * DAY);
  brain.recordSighting({ key, price: 39.99, store: "Walmart" });
  advance(2 * DAY);
  brain.recordSighting({ key, price: 54.99, store: "Target" });

  const h = brain.paidHistory(key);
  assert.equal(h.count, 3);
  assert.equal(h.last?.price, 54.99);
  assert.equal(h.last?.store, "Target");
  assert.equal(h.lowest?.price, 39.99);
  assert.equal(h.lowest?.store, "Walmart");
  assert.equal(h.highest?.price, 54.99);
});

test("scanning the same item at the same price and store twice in an hour counts once", () => {
  const { brain, advance } = newBrain();
  const key = itemKey("Some Item");
  assert.equal(brain.recordSighting({ key, price: 5, store: "Target" }), true);
  advance(10 * 60 * 1000);
  assert.equal(brain.recordSighting({ key, price: 5, store: "Target" }), false);
  assert.equal(brain.recordSighting({ key, price: 6, store: "Target" }), true, "a different price is a new fact");
  assert.equal(brain.recordSighting({ key, price: 5, store: "Walmart" }), true, "a different store is a new fact");
  advance(2 * 60 * 60 * 1000);
  assert.equal(brain.recordSighting({ key, price: 5, store: "Target" }), true, "later the same price is worth keeping");
  assert.equal(brain.paidHistory(key).count, 4);
});

test("rejects a price that is not a positive number", () => {
  const { brain } = newBrain();
  assert.throws(() => brain.recordSighting({ key: "k", price: 0 }), /price/);
  assert.throws(() => brain.recordSighting({ key: "k", price: NaN }), /price/);
  assert.throws(() => brain.recordSighting({ key: "k", price: -3 }), /price/);
});

test("items that differ by one letter are never confused", () => {
  assert.notEqual(itemKey("Vitamin A"), itemKey("Vitamin B"));
  assert.notEqual(itemKey("2 pack towels"), itemKey("pack towels"));
});

test("the price you type in a check is remembered, and shown back next time", async () => {
  const { brain, advance } = newBrain();
  const first = await findSpread({ ...candidate, store: "Target", buyPrice: 49.99, priceIsUserTyped: true }, providers, undefined, brain);
  assert.equal(first.yourPriceHistory?.count, 0, "nothing before the first check");

  advance(3 * DAY);
  const second = await findSpread({ ...candidate, store: "Walmart", buyPrice: 44.99, priceIsUserTyped: true }, providers, undefined, brain);
  assert.equal(second.yourPriceHistory?.count, 1);
  assert.equal(second.yourPriceHistory?.last?.price, 49.99);
  assert.equal(second.yourPriceHistory?.last?.store, "Target");

  assert.equal(brain.paidHistory(itemKey(candidate.title)).count, 2);
});

test("old memory files without prices you entered still load", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brain-"));
  const file = path.join(dir, "brain.json");
  try {
    fs.writeFileSync(file, JSON.stringify({ observations: [], outcomes: [] }));
    const brain = new Brain(new FileBrainStore(file));
    brain.recordSighting({ key: "k", price: 3 });
    assert.equal(new Brain(new FileBrainStore(file)).paidHistory("k").count, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
