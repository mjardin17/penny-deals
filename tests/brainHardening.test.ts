import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Brain, BrainInputError, evictOutcomes, FileBrainStore, itemKey, MemoryBrainStore, Outcome } from "../server/brain/brain";
import { findSpread, SpreadProviders } from "../server/arbitrage/spreadEngine";
import { NormalizedEbayListing } from "../server/marketplace/types";

// Findings from the council review (code, security and TypeScript reviewers).

const DAY = 86_400_000;
const HOUR = 3_600_000;

function newBrain(start = Date.parse("2026-10-05T12:00:00Z")) {
  let t = start;
  const brain = new Brain(new MemoryBrainStore(), () => t);
  return { brain, advance: (ms: number) => (t += ms) };
}

function listing(price: number, n: number): NormalizedEbayListing {
  return {
    itemId: `h-${n}`,
    title: "Pokemon Prismatic Evolutions Elite Trainer Box",
    price,
    currency: "USD",
    condition: "New",
    itemWebUrl: `https://www.ebay.com/itm/${n}`,
    shippingCost: 0,
    buyingOptions: ["FIXED_PRICE"],
    retrievalTimestamp: 0,
    provenance: "confirmed_marketplace_api",
  };
}

const comps = [100, 110, 120, 130, 140, 150].map((p, i) => listing(p, i + 1));
const providers: SpreadProviders = { searchEbay: async () => comps, searchAmazon: async () => [] };
const candidate = { title: "Pokemon Prismatic Evolutions Elite Trainer Box", buyPrice: 50 };

async function quietly<T>(fn: () => Promise<T>): Promise<{ result: T; logged: string[] }> {
  const original = console.error;
  const logged: string[] = [];
  console.error = (...a: unknown[]) => void logged.push(a.join(" "));
  try {
    return { result: await fn(), logged };
  } finally {
    console.error = original;
  }
}

test("a pre-filled price is never remembered; only a price a person typed", async () => {
  const { brain } = newBrain();
  const key = itemKey(candidate.title);
  await findSpread({ ...candidate, store: "Walmart", buyPrice: 12.34 }, providers, undefined, brain);
  assert.equal(brain.paidHistory(key).count, 0, "sample or calculator numbers must not become 'prices you saw'");
  await findSpread({ ...candidate, store: "Walmart", buyPrice: 12.34, priceIsUserTyped: true }, providers, undefined, brain);
  assert.equal(brain.paidHistory(key).count, 1);
});

test("junk numbers are rejected, never turned into zero or one", () => {
  const { brain } = newBrain();
  const key = itemKey("X item");
  const junk: unknown[] = [null, "", "5", true, [5], {}, NaN, Infinity, -Infinity, 0, -1, 1e12];
  for (const v of junk) {
    assert.throws(() => brain.recordSighting({ key, price: v as number }), BrainInputError, `price ${String(v)}`);
    assert.throws(
      () => brain.recordOutcome({ key, kind: "sold", predictedResale: 100, actualResale: v as number }),
      BrainInputError,
      `actualResale ${String(v)}`
    );
    assert.throws(
      () => brain.recordOutcome({ key, kind: "sold", predictedResale: v as number, actualResale: 50 }),
      BrainInputError,
      `predictedResale ${String(v)}`
    );
  }
  assert.equal(brain.calibration(key), null);
});

test("a sale more than 10x the prediction is treated as a typo", () => {
  const { brain } = newBrain();
  assert.throws(() => brain.recordOutcome({ key: "k", kind: "sold", predictedResale: 10, actualResale: 500 }), /typo/);
});

test("prices are rounded to the cent", () => {
  const { brain } = newBrain();
  brain.recordSighting({ key: "k", price: 49.999 });
  assert.equal(brain.paidHistory("k").last?.price, 50);
  assert.throws(() => brain.recordSighting({ key: "k2", price: 0.001 }), /cent/);
});

test("titles in any language, or with no letters at all, never share a key", () => {
  assert.notEqual(itemKey("ポケモン カード"), itemKey("日本語"));
  assert.notEqual(itemKey("!!!"), itemKey("©"));
  assert.equal(itemKey("日本語"), itemKey("日本語"));
  assert.notEqual(itemKey("Pokémon ETB"), itemKey("Pokemon ETB"));
  assert.ok(itemKey("!!!").startsWith("title:raw:"));
});

test("store names match regardless of spacing and capitals", () => {
  const { brain } = newBrain();
  const key = itemKey("Some Item");
  assert.equal(brain.recordSighting({ key, price: 5, store: "Target " }), true);
  assert.equal(brain.recordSighting({ key, price: 5, store: "  target" }), false, "same store, same price, same hour");
  brain.recordOutcome({ key, kind: "not_in_store", store: " TARGET" });
  assert.equal(brain.storeReports("target").notInStore, 1);
  assert.equal(brain.storeReports("Target").notInStore, 1);
});

test("a wrong-match report must point at a real web address", () => {
  const { brain } = newBrain();
  for (const bad of ["javascript:alert(1)", "not a url", "", undefined]) {
    assert.throws(() => brain.recordOutcome({ key: "k", kind: "wrong_match", matchUrl: bad as string }), BrainInputError);
  }
});

test("each item keeps at most 200 saved prices, dropping the oldest of that item only", () => {
  const { brain, advance } = newBrain();
  brain.recordSighting({ key: "other", price: 9 });
  for (let i = 1; i <= 205; i++) {
    advance(1000);
    brain.recordSighting({ key: "busy", price: i });
  }
  const h = brain.paidHistory("busy");
  assert.equal(h.count, 200);
  assert.equal(h.lowest?.price, 6, "the first five were dropped");
  assert.equal(brain.paidHistory("other").count, 1, "another item's history is untouched");
});

test("over the cap, 'not in store' notes are dropped before sales and wrong-match blocks", () => {
  const mk = (kind: Outcome["kind"], n: number): Outcome => ({ key: `k${n}`, kind, recordedAt: n });
  const all = [mk("sold", 1), mk("not_in_store", 2), mk("wrong_match", 3), mk("not_in_store", 4), mk("sold", 5)];
  assert.deepEqual(evictOutcomes(all, 3).map((o) => o.recordedAt), [1, 3, 5]);
  assert.deepEqual(evictOutcomes(all, 2).map((o) => o.recordedAt), [3, 5], "oldest sale goes only after every 'not in store'");
  assert.equal(evictOutcomes(all, 10), all);
});

test("looking up the same item again within an hour is remembered once", () => {
  const { brain, advance } = newBrain();
  const lookup = (price: number) => brain.recordObservation({ key: "k", channel: "ebay", resalePrice: price, sampleSize: 5, basis: "active_ask" });
  assert.equal(lookup(10), true);
  advance(10 * 60 * 1000);
  assert.equal(lookup(11), false);
  advance(2 * HOUR);
  assert.equal(lookup(11), true);
  assert.equal(brain.history("k").count, 2);
});

test("the newest saved price is the one reported as 'last', even if saved out of order", () => {
  const { brain, advance } = newBrain();
  brain.recordSighting({ key: "k", price: 5, store: "A" });
  advance(2 * DAY);
  brain.recordSighting({ key: "k", price: 7, store: "B" });
  assert.equal(brain.paidHistory("k").last?.store, "B");
});

test("a memory file with a bad record inside is refused, not half-loaded", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brain-"));
  const file = path.join(dir, "brain.json");
  try {
    for (const bad of [
      { observations: [null], outcomes: [] },
      { observations: [], outcomes: [{ key: "k", kind: "bogus", recordedAt: 1 }] },
      { observations: [], outcomes: [], sightings: [{ key: "k", price: "5", seenAt: 1 }] },
      [],
    ]) {
      fs.writeFileSync(file, JSON.stringify(bad));
      assert.throws(() => new Brain(new FileBrainStore(file)), /corrupt/i);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a failed save leaves no temp file behind and keeps the old memory", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brain-"));
  const file = path.join(dir, "brain.json");
  try {
    const brain = new Brain(new FileBrainStore(file));
    brain.recordSighting({ key: "k", price: 5 });
    const good = fs.readFileSync(file, "utf8");

    fs.rmSync(file);
    fs.mkdirSync(file); // a folder where the file should be makes the final rename fail
    assert.throws(() => brain.recordSighting({ key: "k", price: 6 }));
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp")), [], "temp file cleaned up");
    assert.equal(brain.paidHistory("k").count, 1, "memory only changes after a successful save");

    fs.rmSync(file, { recursive: true });
    fs.writeFileSync(file, good);
    assert.equal(new Brain(new FileBrainStore(file)).paidHistory("k").count, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("eBay test-environment (sandbox) listings are never remembered as real prices", async () => {
  const { brain } = newBrain();
  const before = process.env.EBAY_ENVIRONMENT;
  process.env.EBAY_ENVIRONMENT = "SANDBOX";
  try {
    await findSpread(candidate, providers, undefined, brain);
  } finally {
    if (before === undefined) delete process.env.EBAY_ENVIRONMENT;
    else process.env.EBAY_ENVIRONMENT = before;
  }
  assert.equal(brain.history(itemKey(candidate.title)).count, 0);
});

test("a memory that throws while reading never breaks a price check", async () => {
  class FlakyBrain extends Brain {
    blockedUrls(): Set<string> {
      throw new Error("boom: blockedUrls");
    }
    calibration(): never {
      throw new Error("boom: calibration");
    }
    history(): never {
      throw new Error("boom: history");
    }
    paidHistory(): never {
      throw new Error("boom: paidHistory");
    }
  }
  const flaky = new FlakyBrain(new MemoryBrainStore(), () => 0);
  const { result, logged } = await quietly(() => findSpread({ ...candidate, store: "Target", priceIsUserTyped: true }, providers, undefined, flaky));
  assert.equal(result.channels.find((c) => c.channel === "ebay")!.status, "ok");
  assert.ok(logged.some((l) => l.includes("boom: blockedUrls")), "failures are logged, not hidden");
});

test("a failed save of the price you typed still shows your earlier prices", async () => {
  const key = itemKey(candidate.title);
  const failing = new Brain(
    {
      load: () => ({ observations: [], outcomes: [], sightings: [{ key, price: 30, store: "Target", seenAt: 1 }] }),
      save: () => {
        throw new Error("ENOSPC");
      },
    },
    () => 5_000_000_000
  );
  const { result } = await quietly(() => findSpread({ ...candidate, buyPrice: 25, priceIsUserTyped: true }, providers, undefined, failing));
  assert.equal(result.yourPriceHistory?.count, 1, "the earlier price is still shown");
});
