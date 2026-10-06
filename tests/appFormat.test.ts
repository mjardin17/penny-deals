import { test } from "node:test";
import assert from "node:assert/strict";
import { parseShelfPrice, roiLabel, safeHttpsUrl } from "../src/app/format";

test("a null or infinite ROI does not crash and says why", () => {
  assert.equal(roiLabel(null), "ROI not defined (no cost)");
  assert.equal(roiLabel(undefined), "ROI not defined (no cost)");
  assert.equal(roiLabel(Infinity), "ROI not defined (no cost)");
  assert.equal(roiLabel(149.6), "150% ROI");
});

test("shelf price must be above zero", () => {
  for (const bad of ["", " ", "0", "0.00", "-1", "abc", "1e3", "$5"]) assert.equal(parseShelfPrice(bad), null, JSON.stringify(bad));
  assert.equal(parseShelfPrice("1.00"), 1);
  assert.equal(parseShelfPrice(" 4.99 "), 4.99);
});

test("only https links are clickable", () => {
  assert.equal(safeHttpsUrl("https://example.com/a"), "https://example.com/a");
  for (const bad of ["http://example.com", "javascript:alert(1)", "data:text/html,x", "not a url", "", null, 5]) assert.equal(safeHttpsUrl(bad), null);
});
