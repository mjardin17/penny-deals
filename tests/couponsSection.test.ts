import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCouponsSection } from "../digest/couponsSection";
import { Coupon } from "../server/coupons/types";

function coupon(overrides: Partial<Coupon>): Coupon {
  return {
    id: "id",
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

test("renderCouponsSection says 'No active coupons' honestly when there are none", () => {
  const out = renderCouponsSection([]);
  assert.match(out, /No active coupons/);
  assert.doesNotMatch(out, /\$/); // no stray coupon rows
});

test("renderCouponsSection shows at most 3 coupons even if more are passed in", () => {
  const coupons = [
    coupon({ id: "1", code: "A" }),
    coupon({ id: "2", code: "B" }),
    coupon({ id: "3", code: "C" }),
    coupon({ id: "4", code: "D" }),
  ];
  const out = renderCouponsSection(coupons);
  assert.match(out, /`A`/);
  assert.match(out, /`B`/);
  assert.match(out, /`C`/);
  assert.doesNotMatch(out, /`D`/);
});

test("renderCouponsSection includes merchant, code, discount text, and a Claim link", () => {
  const out = renderCouponsSection([coupon({ merchant: "Walmart", code: "SAVE10", discountText: "10% off" })]);
  assert.match(out, /Walmart/);
  assert.match(out, /`SAVE10`/);
  assert.match(out, /10% off/);
  assert.match(out, /\[Claim\]/);
});
