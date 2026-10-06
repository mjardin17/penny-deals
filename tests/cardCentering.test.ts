import { test } from "node:test";
import assert from "node:assert/strict";
import { measureCentering, Raster } from "../shared/cards/centering";
import { centeringGradeCap, CENTERING_SOURCE } from "../shared/cards/gradeCap";

type RGB = [number, number, number];
const BG: RGB = [205, 205, 205];
const BORDER: RGB = [240, 200, 40];
const ART: RGB = [30, 60, 160];

interface CardSpec {
  w?: number;
  h?: number;
  cardX?: number;
  cardY?: number;
  cardW?: number;
  cardH?: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  artColor?: RGB;
  borderColor?: RGB;
  noise?: number;
  rightBorderColor?: RGB;
}

/** Builds a photo of a bordered card on a plain table, with known border widths and tiny deterministic noise. */
function makeCard(spec: CardSpec): Raster {
  const { w = 480, h = 640, cardX = 40, cardY = 30, cardW = 400, cardH = 560, noise = 5 } = spec;
  const data = new Uint8ClampedArray(w * h * 4);
  let seed = 12345;
  const jitter = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return ((seed % (2 * noise + 1)) - noise) | 0;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c: RGB = BG;
      const inCard = x >= cardX && x < cardX + cardW && y >= cardY && y < cardY + cardH;
      if (inCard) {
        const inArt =
          x >= cardX + spec.left && x < cardX + cardW - spec.right && y >= cardY + spec.top && y < cardY + cardH - spec.bottom;
        const rightSide = x >= cardX + cardW / 2;
        c = inArt ? spec.artColor ?? ART : rightSide && spec.rightBorderColor ? spec.rightBorderColor : spec.borderColor ?? BORDER;
      }
      const i = (y * w + x) * 4;
      data[i] = c[0] + jitter();
      data[i + 1] = c[1] + jitter();
      data[i + 2] = c[2] + jitter();
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

const near = (actual: number, expected: number, tol = 1.2) => assert.ok(Math.abs(actual - expected) <= tol, `${actual} not within ${tol} of ${expected}`);

test("a perfectly centered card measures about 50/50 both ways", () => {
  const r = measureCentering(makeCard({ left: 28, right: 28, top: 28, bottom: 28 }));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  near(r.horizontal.larger, 50);
  near(r.vertical.larger, 50);
  near(r.borders.left, 28, 2);
});

test("an off-center card is measured, and which side is wider is reported", () => {
  const r = measureCentering(makeCard({ left: 20, right: 36, top: 28, bottom: 28 }));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  near(r.horizontal.larger, 64.3, 1.8); // 36 / (20 + 36)
  assert.equal(r.horizontal.widerSide, "right");
  near(r.vertical.larger, 50);
});

test("top/bottom off-center is measured too", () => {
  const r = measureCentering(makeCard({ left: 28, right: 28, top: 18, bottom: 38 }));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  near(r.vertical.larger, 67.9, 1.8); // 38 / 56
  assert.equal(r.vertical.widerSide, "bottom");
});

test("the card can sit anywhere in the photo", () => {
  const r = measureCentering(makeCard({ cardX: 15, cardY: 60, left: 24, right: 24, top: 30, bottom: 30, w: 520, h: 700 }));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  near(r.horizontal.larger, 50);
  near(r.vertical.larger, 50);
});

test("no card in the photo is refused, not guessed", () => {
  const empty = makeCard({ left: 0, right: 0, top: 0, bottom: 0, cardW: 0, cardH: 0 });
  const r = measureCentering(empty);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.reason, /card/i);
});

test("a full-art card (art runs to the edge, no border) is refused", () => {
  const r = measureCentering(makeCard({ left: 28, right: 28, top: 28, bottom: 28, artColor: BORDER }));
  assert.equal(r.ok, false);
});

test("an uneven border colour (glare, holo) is refused", () => {
  const r = measureCentering(makeCard({ left: 28, right: 28, top: 28, bottom: 28, rightBorderColor: [90, 90, 90] }));
  assert.equal(r.ok, false);
});

test("something that is not card-shaped is refused", () => {
  const r = measureCentering(makeCard({ left: 28, right: 28, top: 28, bottom: 28, cardW: 420, cardH: 300 }));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.reason, /shape|straight|aspect/i);
});

test("an absurd border width is refused (art box not found)", () => {
  const r = measureCentering(makeCard({ left: 150, right: 150, top: 28, bottom: 28 }));
  assert.equal(r.ok, false);
});

test("a tiny or malformed image is refused", () => {
  assert.equal(measureCentering({ width: 10, height: 10, data: new Uint8ClampedArray(400) }).ok, false);
  assert.equal(measureCentering({ width: 400, height: 560, data: new Uint8ClampedArray(12) }).ok, false);
});

// ---- grade cap from measured centering ----

test("centering caps the grade using PSA's published front-centering cutoffs", () => {
  assert.equal(centeringGradeCap(50, 50).maxGrade, 10);
  assert.equal(centeringGradeCap(55, 52).maxGrade, 10);
  assert.equal(centeringGradeCap(56, 50).maxGrade, 9);
  assert.equal(centeringGradeCap(60, 55).maxGrade, 9);
  assert.equal(centeringGradeCap(50, 64).maxGrade, 8);
  assert.equal(centeringGradeCap(66, 50).maxGrade, 7);
  assert.equal(centeringGradeCap(70, 70).maxGrade, 7);
});

test("beyond 70/30 the exact cutoffs are unverified, so it says '6 or lower', not a made-up grade", () => {
  const cap = centeringGradeCap(75, 50);
  assert.equal(cap.maxGrade, 6);
  assert.match(cap.label, /6 or lower/);
});

test("the cap is a ceiling on centering only, and says what it does not cover", () => {
  const cap = centeringGradeCap(52, 51);
  assert.match(cap.note, /corners|edges|surface/i);
  assert.match(CENTERING_SOURCE.caveat, /secondary|not verified|blocked/i);
  assert.ok(CENTERING_SOURCE.retrieved);
});

test("the worse of the two directions decides", () => {
  assert.equal(centeringGradeCap(52, 61).maxGrade, 8);
  assert.equal(centeringGradeCap(61, 52).maxGrade, 8);
});

test("nonsense ratios are rejected", () => {
  assert.throws(() => centeringGradeCap(40, 50));
  assert.throws(() => centeringGradeCap(Number.NaN, 50));
  assert.throws(() => centeringGradeCap(101, 50));
});
