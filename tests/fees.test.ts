import { test } from "node:test";
import assert from "node:assert/strict";
import {
  breakEvenPrice,
  calculateAmazonReferralFee,
  calculateEbayFees,
  calculateFbaFee,
  calculateProfit,
  calculateTiktokFees,
  cheapestShipping,
  classifyFbaSizeTier,
  quoteShipping,
  ShippingRateUnavailableError,
} from "../shared/fees";

const card = { lengthIn: 6, widthIn: 4, heightIn: 0.5, weightLb: 0.25 };
const box = { lengthIn: 12, widthIn: 10, heightIn: 4, weightLb: 2 };

test("eBay most categories: 13.6% + $0.40 above $10", () => {
  const r = calculateEbayFees({ itemPrice: 100 });
  assert.equal(r.finalValueFee, 13.6);
  assert.equal(r.perOrderFee, 0.4);
  assert.equal(r.total, 14);
});

test("eBay per-order fee is $0.30 at or under $10", () => {
  assert.equal(calculateEbayFees({ itemPrice: 10 }).perOrderFee, 0.3);
  assert.equal(calculateEbayFees({ itemPrice: 10.01 }).perOrderFee, 0.4);
});

test("eBay FVF is charged on shipping and sales tax", () => {
  const r = calculateEbayFees({ itemPrice: 50, buyerShipping: 10, buyerSalesTaxRate: 0.1 });
  assert.equal(r.saleTotal, 66);
  assert.equal(r.finalValueFee, 8.98); // 66 * 0.136 = 8.976
});

test("eBay trading cards 13.25%, with 2.35% above $7,500", () => {
  assert.equal(calculateEbayFees({ itemPrice: 100, category: "tradingCards" }).finalValueFee, 13.25);
  // 7500*0.1325 + 2500*0.0235 = 993.75 + 58.75
  assert.equal(calculateEbayFees({ itemPrice: 10000, category: "tradingCards" }).finalValueFee, 1052.5);
});

test("eBay athletic shoes at $150+: 8% and no per-order fee", () => {
  const r = calculateEbayFees({ itemPrice: 200, category: "athleticShoes" });
  assert.equal(r.finalValueFee, 16);
  assert.equal(r.perOrderFee, 0);
});

test("eBay promoted rate and below-standard surcharge", () => {
  const r = calculateEbayFees({ itemPrice: 100, promotedRate: 0.05, belowStandardSeller: true });
  assert.equal(r.promotedFee, 5);
  assert.equal(r.surcharges, 6);
});

test("Amazon referral: flat, minimum, whole-price and marginal tiers", () => {
  assert.equal(calculateAmazonReferralFee(20, "toysGames"), 3);
  assert.equal(calculateAmazonReferralFee(1, "toysGames"), 0.3); // $0.30 minimum
  assert.equal(calculateAmazonReferralFee(1, "videoGames"), 0.15); // no minimum
  assert.equal(calculateAmazonReferralFee(10, "beautyHealth"), 0.8);
  assert.equal(calculateAmazonReferralFee(10.01, "beautyHealth"), 1.5);
  assert.equal(calculateAmazonReferralFee(200, "electronicsAccessories"), 23); // 15 + 8
  assert.equal(calculateAmazonReferralFee(25, "clothing"), 4.25);
});

test("FBA size tiers", () => {
  assert.equal(classifyFbaSizeTier(card), "smallStandard");
  assert.equal(classifyFbaSizeTier(box), "largeStandard");
  assert.equal(classifyFbaSizeTier({ lengthIn: 40, widthIn: 20, heightIn: 20, weightLb: 30 }), "largeBulky");
  assert.equal(classifyFbaSizeTier({ lengthIn: 70, widthIn: 30, heightIn: 30, weightLb: 30 }), "extraLarge");
});

test("FBA small standard 4 oz in the $10-$50 band, plus 3.5% fuel", () => {
  const r = calculateFbaFee(card, 20);
  assert.equal(r.baseFee, 3.42);
  assert.equal(r.total, 3.54); // 3.42 * 1.035 = 3.5397
  assert.equal(r.verified, true);
});

test("FBA large standard uses dim weight when heavier", () => {
  // 12*10*4/139 = 3.45 lb > 2 lb actual -> over-3-lb formula, 2 extra quarter-pounds
  const r = calculateFbaFee(box, 30);
  assert.equal(r.baseFee, 7.13); // 6.97 + 2 * 0.08
});

test("FBA price bands: under $10 vs over $50", () => {
  assert.equal(calculateFbaFee(card, 9.99).baseFee, 2.49);
  assert.equal(calculateFbaFee(card, 50.01).baseFee, 3.68);
});

test("FBA bulky results are flagged unverified", () => {
  const r = calculateFbaFee({ lengthIn: 40, widthIn: 20, heightIn: 20, weightLb: 30 }, 80);
  assert.equal(r.verified, false);
});

test("TikTok 8% on item + buyer shipping, plus affiliate on item", () => {
  const r = calculateTiktokFees({ itemPrice: 50, buyerShipping: 5, affiliateRate: 0.1 });
  assert.equal(r.referralFee, 4.4);
  assert.equal(r.affiliateFee, 5);
});

test("USPS Ground Advantage rounds weight and zone up", () => {
  assert.equal(quoteShipping("groundAdvantage", 0.5, 1, 0).postage, 6.93);
  assert.equal(quoteShipping("groundAdvantage", 1.5, 4, 0).postage, 8.51);
  assert.equal(quoteShipping("groundAdvantage", 1.5, 5, 0).postage, 11.58); // zone 5 -> 6
  assert.equal(quoteShipping("priorityMail", 1, 8, 0).postage, 15.22);
  assert.equal(quoteShipping("flatRateMediumBox", 12, 8, 0).postage, 21.17);
  assert.equal(quoteShipping("localPickup", 3).total, 0);
});

test("USPS refuses to invent rates outside the table", () => {
  assert.throws(() => quoteShipping("groundAdvantage", 25), ShippingRateUnavailableError);
  assert.throws(() => quoteShipping("mediaMail", 4), ShippingRateUnavailableError);
  assert.throws(() => quoteShipping("groundAdvantage", 1, 9), ShippingRateUnavailableError);
});

test("cheapest shipping picks Ground Advantage for light items", () => {
  assert.equal(cheapestShipping(0.5, 4).method, "groundAdvantage");
});

test("calculateProfit eBay waterfall adds up", () => {
  const r = calculateProfit({
    channel: "ebay",
    salePrice: 40,
    cogs: 5,
    pkg: card,
    zone: 4,
    handling: 0.5,
    ebayBuyerSalesTaxRate: 0,
  });
  // FVF 5.44 + 0.40 + postage 7.46 + 0.50 + cogs 5 = 18.80
  assert.equal(r.totalCosts, 18.8);
  assert.equal(r.netProfit, 21.2);
  assert.equal(r.roiPct, 424);
  assert.equal(r.feesVerified, true);
});

test("calculateProfit FBA ignores buyer shipping", () => {
  const r = calculateProfit({ channel: "amazonFba", salePrice: 20, buyerShipping: 5, cogs: 2, pkg: card });
  assert.equal(r.grossRevenue, 20);
  // referral 3.00 + fba 3.54 + cogs 2
  assert.equal(r.netProfit, 11.46);
});

test("breakEvenPrice returns the lowest price that clears the target", () => {
  const base = { channel: "ebay" as const, cogs: 5, pkg: card, zone: 4 as const, ebayBuyerSalesTaxRate: 0 };
  const p = breakEvenPrice(base, 0);
  assert.ok(calculateProfit({ ...base, salePrice: p }).netProfit >= 0);
  assert.ok(calculateProfit({ ...base, salePrice: p - 0.02 }).netProfit < 0);
});
