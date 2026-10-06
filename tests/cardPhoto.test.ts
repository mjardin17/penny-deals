import { test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin } from "../src/app/cardPhoto";

test("big photos shrink to fit and keep their shape", () => {
  assert.deepEqual(fitWithin(4000, 3000, 1280), { width: 1280, height: 960 });
  assert.deepEqual(fitWithin(3000, 4000, 1280), { width: 960, height: 1280 });
});

test("small photos are never scaled up", () => {
  assert.deepEqual(fitWithin(600, 400, 1280), { width: 600, height: 400 });
});

test("a one-pixel-wide strip never rounds to zero", () => {
  const out = fitWithin(1, 5000, 1280);
  assert.ok(out.width >= 1 && out.height === 1280);
});
