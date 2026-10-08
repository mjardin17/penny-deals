import { test } from "node:test";
import assert from "node:assert/strict";
import { canCalculateProfit, defaultedAssumptions, PROFIT_DEFAULTS, type ProfitSettings } from "../src/components/arbitrage/profitReadiness";

test("no profit until both sale price and cost are above zero", () => {
  assert.equal(canCalculateProfit(null, null), false);
  assert.equal(canCalculateProfit(10, null), false);
  assert.equal(canCalculateProfit(null, 5), false);
  assert.equal(canCalculateProfit(0, 5), false);
  assert.equal(canCalculateProfit(10, 0), false);
  assert.equal(canCalculateProfit(-1, 5), false);
  assert.equal(canCalculateProfit(NaN, 5), false);
  assert.equal(canCalculateProfit(Infinity, 5), false);
  assert.equal(canCalculateProfit(10, 5), true);
});

test("settings left at their defaults are listed as assumptions; edited ones are not", () => {
  const untouched: ProfitSettings = { ...PROFIT_DEFAULTS };
  const all = defaultedAssumptions(untouched).map((a) => a.key);
  for (const k of ["weightLb", "boxSize", "shippingMethod", "zone", "handling", "ebayPromotedPct", "ebayTaxPct", "fbaInbound"]) assert.ok(all.includes(k as never), k);

  const edited = defaultedAssumptions({ ...untouched, weightLb: 2.5, ebayTaxPct: 8 }).map((a) => a.key);
  assert.ok(!edited.includes("weightLb" as never));
  assert.ok(!edited.includes("ebayTaxPct" as never));
  assert.ok(edited.includes("zone" as never));
});

test("box size counts as edited if any one side changes", () => {
  const keys = defaultedAssumptions({ ...PROFIT_DEFAULTS, dims: { ...PROFIT_DEFAULTS.dims, heightIn: 6 } }).map((a) => a.key);
  assert.ok(!keys.includes("boxSize" as never));
});
