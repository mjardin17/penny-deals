import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { activeUnexpired, couponsForMerchant, isActiveAndUnexpired, matchesMerchant, sortSoonestExpiring } from "../server/coupons/filters";
import { applyAmazonTag, isAmazonUrl } from "../server/coupons/affiliate";
import { addCoupon, deactivateCoupon, readAllCoupons, validateNewCoupon } from "../server/coupons/internal";
import { aggregateCoupons } from "../server/coupons/aggregator";
import { Coupon, CouponSource } from "../server/coupons/types";

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "penny-deals-coupons-test-"));
}

function coupon(overrides: Partial<Coupon>): Coupon {
  return {
    id: "id-1",
    code: "CODE",
    merchant: "Amazon",
    title: "Title",
    discountText: "10% off",
    expiresAt: "2099-01-01T00:00:00.000Z",
    affiliateUrl: "https://www.amazon.com/deals",
    active: true,
    source: "internal",
    ...overrides,
  };
}

// --- expiry filtering ---------------------------------------------------

test("isActiveAndUnexpired: expired coupons are excluded even if active", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const expired = coupon({ expiresAt: "2026-05-31T23:59:59Z", active: true });
  assert.equal(isActiveAndUnexpired(expired, now), false);
});

test("isActiveAndUnexpired: inactive coupons are excluded even if unexpired", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const inactive = coupon({ expiresAt: "2099-01-01T00:00:00Z", active: false });
  assert.equal(isActiveAndUnexpired(inactive, now), false);
});

test("isActiveAndUnexpired: active and not-yet-expired passes", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const good = coupon({ expiresAt: "2026-06-02T00:00:00Z", active: true });
  assert.equal(isActiveAndUnexpired(good, now), true);
});

test("activeUnexpired never lets an expired coupon through, regardless of order", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const coupons = [
    coupon({ id: "1", expiresAt: "2020-01-01T00:00:00Z" }), // long expired
    coupon({ id: "2", expiresAt: "2026-06-01T00:00:01Z" }), // just barely still valid
    coupon({ id: "3", expiresAt: "2025-12-31T23:59:59Z" }), // expired yesterday-ish
  ];
  const visible = activeUnexpired(coupons, now);
  assert.deepEqual(visible.map((c) => c.id), ["2"]);
});

test("sortSoonestExpiring orders ascending by expiresAt without mutating the input", () => {
  const coupons = [
    coupon({ id: "far", expiresAt: "2027-01-01T00:00:00Z" }),
    coupon({ id: "near", expiresAt: "2026-06-05T00:00:00Z" }),
    coupon({ id: "mid", expiresAt: "2026-09-01T00:00:00Z" }),
  ];
  const original = [...coupons];
  const sorted = sortSoonestExpiring(coupons);
  assert.deepEqual(sorted.map((c) => c.id), ["near", "mid", "far"]);
  assert.deepEqual(coupons, original); // not mutated
});

// --- merchant matching ----------------------------------------------------

test("matchesMerchant is case-insensitive and trims whitespace", () => {
  const c = coupon({ merchant: "Dollar General" });
  assert.equal(matchesMerchant(c, "dollar general"), true);
  assert.equal(matchesMerchant(c, "  DOLLAR GENERAL  "), true);
  assert.equal(matchesMerchant(c, "Dollar Tree"), false);
});

test("couponsForMerchant filters by merchant AND excludes expired/inactive, sorted soonest-first", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const coupons = [
    coupon({ id: "1", merchant: "Amazon", expiresAt: "2026-08-01T00:00:00Z" }),
    coupon({ id: "2", merchant: "Walmart", expiresAt: "2026-07-01T00:00:00Z" }),
    coupon({ id: "3", merchant: "Amazon", expiresAt: "2026-06-15T00:00:00Z" }),
    coupon({ id: "4", merchant: "Amazon", expiresAt: "2020-01-01T00:00:00Z" }), // expired
    coupon({ id: "5", merchant: "Amazon", expiresAt: "2026-09-01T00:00:00Z", active: false }), // inactive
  ];
  const result = couponsForMerchant(coupons, "amazon", now);
  assert.deepEqual(result.map((c) => c.id), ["3", "1"]);
});

// --- affiliate tag appending ------------------------------------------------

test("applyAmazonTag appends ?tag= to an Amazon URL", () => {
  const url = applyAmazonTag("https://www.amazon.com/dp/B000123", "jardinsoutpost-20");
  assert.equal(url, "https://www.amazon.com/dp/B000123?tag=jardinsoutpost-20");
});

test("applyAmazonTag overwrites an existing tag rather than duplicating it", () => {
  const url = applyAmazonTag("https://www.amazon.com/dp/B000123?tag=someone-else-20", "jardinsoutpost-20");
  const parsed = new URL(url);
  assert.deepEqual(parsed.searchParams.getAll("tag"), ["jardinsoutpost-20"]);
});

test("applyAmazonTag leaves non-Amazon URLs completely unchanged", () => {
  const url = applyAmazonTag("https://www.walmart.com/ip/12345", "jardinsoutpost-20");
  assert.equal(url, "https://www.walmart.com/ip/12345");
});

test("applyAmazonTag with no tag configured returns the URL unchanged (never invents a tag)", () => {
  const url = applyAmazonTag("https://www.amazon.com/dp/B000123", undefined);
  assert.equal(url, "https://www.amazon.com/dp/B000123");
});

test("applyAmazonTag works across Amazon international domains", () => {
  assert.ok(isAmazonUrl("https://www.amazon.co.uk/dp/B000123"));
  assert.ok(isAmazonUrl("https://smile.amazon.com/dp/B000123"));
  assert.ok(!isAmazonUrl("https://www.notamazon.com/dp/B000123"));
  assert.ok(!isAmazonUrl("not a url"));
});

// --- internal store CRUD ----------------------------------------------------

test("validateNewCoupon rejects missing fields and a bad URL, accepts a good one", () => {
  assert.equal(validateNewCoupon({}), "code is required");
  assert.equal(
    validateNewCoupon({ code: "X", merchant: "Amazon", title: "T", discountText: "10%", expiresAt: "2099-01-01", affiliateUrl: "not-a-url" }),
    "affiliateUrl must be a valid URL"
  );
  const ok = validateNewCoupon({
    code: "X",
    merchant: "Amazon",
    title: "T",
    discountText: "10%",
    expiresAt: "2099-01-01T00:00:00Z",
    affiliateUrl: "https://www.amazon.com/x",
  });
  assert.notEqual(typeof ok, "string");
});

test("addCoupon then deactivateCoupon round-trips through the JSON file", async () => {
  const dir = await tempDir();
  const file = path.join(dir, "coupons.json");
  try {
    const input = validateNewCoupon({
      code: "SAVE5",
      merchant: "Target",
      title: "5 off",
      discountText: "$5 off",
      expiresAt: "2099-01-01T00:00:00Z",
      affiliateUrl: "https://www.target.com/",
    });
    assert.notEqual(typeof input, "string");
    const created = await addCoupon(input as any, file);
    assert.equal(created.active, true);
    assert.equal(created.source, "internal");

    const deactivated = await deactivateCoupon(created.id, file);
    assert.equal(deactivated?.active, false);

    const all = await readAllCoupons(file);
    assert.equal(all.length, 1);
    assert.equal(all[0].active, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("deactivateCoupon on an unknown id returns null and changes nothing", async () => {
  const dir = await tempDir();
  const file = path.join(dir, "coupons.json");
  try {
    const result = await deactivateCoupon("nope", file);
    assert.equal(result, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- aggregator: skips unconfigured/unimplemented sources, never fabricates ---

function fakeSource(name: CouponSource["name"], state: "ok" | "not_configured" | "not_implemented" | "error", coupons: Coupon[] = []): CouponSource {
  return {
    name,
    status: () => state,
    fetchCoupons: async () => {
      if (state === "error") throw new Error(`${name} boom`);
      return coupons;
    },
  };
}

test("aggregateCoupons unions coupons only from sources reporting status 'ok'", async () => {
  const sources = [
    fakeSource("internal", "ok", [coupon({ id: "a" })]),
    fakeSource("rakuten", "not_configured"),
    fakeSource("impact", "not_implemented"),
    fakeSource("cj", "ok", [coupon({ id: "b", source: "cj" as any })]),
  ];
  const { coupons: result, sources: statuses } = await aggregateCoupons(sources);
  assert.deepEqual(result.map((c) => c.id).sort(), ["a", "b"]);
  assert.equal(statuses.find((s) => s.source === "rakuten")?.state, "not_configured");
  assert.equal(statuses.find((s) => s.source === "impact")?.state, "not_implemented");
});

test("aggregateCoupons reports a source's fetch error without breaking the others", async () => {
  const sources = [fakeSource("internal", "ok", [coupon({ id: "a" })]), fakeSource("sovrn", "ok")];
  // Make sovrn actually throw by overriding fetchCoupons after construction.
  sources[1] = { ...sources[1], fetchCoupons: async () => { throw new Error("sovrn boom"); } };
  const { coupons: result, sources: statuses } = await aggregateCoupons(sources);
  assert.deepEqual(result.map((c) => c.id), ["a"]);
  const sovrnStatus = statuses.find((s) => s.source === "sovrn");
  assert.equal(sovrnStatus?.state, "error");
  assert.match(sovrnStatus!.detail, /sovrn boom/);
});
