import { test } from "node:test";
import assert from "node:assert/strict";
import { findSpread, percentile, SpreadProviders, titleMatchScore } from "../server/arbitrage/spreadEngine";
import { NormalizedAmazonProduct, NormalizedEbayListing } from "../server/marketplace/types";

function listing(title: string, price: number, shippingCost = 0): NormalizedEbayListing {
  return {
    itemId: `${title}-${price}`,
    title,
    price,
    currency: "USD",
    condition: "New",
    itemWebUrl: "https://www.ebay.com/itm/1",
    shippingCost,
    buyingOptions: ["FIXED_PRICE"],
    retrievalTimestamp: 0,
    provenance: "confirmed_marketplace_api",
  };
}

function amazonProduct(title: string, buyBoxPrice: number): NormalizedAmazonProduct {
  return {
    asin: "B000000001",
    title,
    brand: "Milwaukee",
    category: "Tools",
    offersV2: [],
    buyBoxPrice,
    marketplace: "US",
    retrievalTimestamp: 0,
    provenance: "confirmed_marketplace_api",
  };
}

const notConfigured = () => {
  const e: any = new Error("eBay credentials not configured in environment.");
  e.capability = "not_configured";
  return Promise.reject(e);
};

const title = "Milwaukee M18 Compact Drill Driver Kit";
const comps = [40, 45, 50, 55, 60, 65].map((p) => listing(`Milwaukee M18 Compact Drill Driver Kit ${p}`, p));

test("titleMatchScore and percentile", () => {
  assert.equal(titleMatchScore("Milwaukee M18 Drill", "MILWAUKEE m18 drill driver"), 1);
  assert.equal(titleMatchScore("Milwaukee M18 Drill", "DeWalt drill"), 1 / 3);
  assert.equal(percentile([10, 20, 30, 40, 50], 0.25), 20);
});

test("flags a real eBay spread on a penny item with enough confident comps", async () => {
  const providers: SpreadProviders = { searchEbay: async () => comps, searchAmazon: notConfigured };
  const r = await findSpread({ title, buyPrice: 0.01 }, providers);
  const ebay = r.channels.find((c) => c.channel === "ebay")!;
  assert.equal(ebay.status, "ok");
  assert.equal(ebay.resalePrice, 46.25);
  assert.equal(ebay.isRealSpread, true);
  assert.equal(r.bestRealSpread?.channel, "ebay");
  assert.equal(r.packageAssumed, true);
});

test("does not flag when too few comps", async () => {
  const providers: SpreadProviders = { searchEbay: async () => comps.slice(0, 3), searchAmazon: notConfigured };
  const r = await findSpread({ title, buyPrice: 0.01 }, providers);
  assert.equal(r.channels[0].status, "insufficient_comps");
  assert.equal(r.bestRealSpread, undefined);
});

test("ignores listings whose titles do not match", async () => {
  const junk = Array.from({ length: 10 }, (_, i) => listing(`Unrelated phone case ${i}`, 90));
  const providers: SpreadProviders = { searchEbay: async () => junk, searchAmazon: notConfigured };
  const r = await findSpread({ title, buyPrice: 1 }, providers);
  assert.equal(r.channels[0].status, "no_match");
});

test("does not flag when profit is below threshold", async () => {
  const providers: SpreadProviders = { searchEbay: async () => comps, searchAmazon: notConfigured };
  const r = await findSpread({ title, buyPrice: 30 }, providers);
  assert.equal(r.channels[0].isRealSpread, false);
});

test("reports missing credentials instead of guessing", async () => {
  const providers: SpreadProviders = { searchEbay: notConfigured, searchAmazon: notConfigured };
  const r = await findSpread({ title, buyPrice: 1 }, providers);
  assert.deepEqual(r.channels.map((c) => c.status), ["not_configured", "not_configured"]);
  assert.equal(r.bestRealSpread, undefined);
});

test("Amazon FBA spread uses buy box and verified fees", async () => {
  const providers: SpreadProviders = {
    searchEbay: notConfigured,
    searchAmazon: async () => [amazonProduct("Milwaukee M18 Compact Drill Driver Kit 2801", 99)],
  };
  const r = await findSpread({ title, buyPrice: 20 }, providers);
  const amz = r.channels.find((c) => c.channel === "amazonFba")!;
  assert.equal(amz.status, "ok");
  assert.equal(amz.resalePrice, 99);
  assert.equal(amz.isRealSpread, true);
});

test("validates input", async () => {
  await assert.rejects(findSpread({ title: "", buyPrice: 1 }));
  await assert.rejects(findSpread({ title: "x", buyPrice: -1 }));
});
