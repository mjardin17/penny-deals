/**
 * Measures how well a bordered card's art box is centered, from a straight-on photo.
 * This is geometry, not a guess: it finds the card, finds the border color, and measures how wide
 * the border is on each side. If the photo can't support a measurement it says so and measures nothing.
 */

export interface Raster {
  width: number;
  height: number;
  /** RGBA bytes, row by row (what a canvas gives you). */
  data: ArrayLike<number>;
}

export interface SideRatio {
  /** Share (50-100) of the wider side, e.g. 56 means 56/44. */
  larger: number;
  widerSide: "left" | "right" | "top" | "bottom";
}

export type CenteringResult =
  | {
      ok: true;
      card: { x: number; y: number; width: number; height: number };
      /** Border width in pixels on each side. */
      borders: { left: number; right: number; top: number; bottom: number };
      horizontal: SideRatio & { widerSide: "left" | "right" };
      vertical: SideRatio & { widerSide: "top" | "bottom" };
    }
  | { ok: false; reason: string };

type RGB = [number, number, number];

const MIN_SIDE_PX = 100;
const CARD_ASPECT = 63 / 88;
const ASPECT_TOLERANCE = 0.12;
const CARD_DISTANCE = 45;
const BORDER_SAME_DISTANCE = 45;
const BORDER_END_DISTANCE = 60;
const MIN_BORDER_FRACTION = 0.015;
const MAX_BORDER_FRACTION = 0.18;
const SCAN_LIMIT_FRACTION = 0.3;

const fail = (reason: string): CenteringResult => ({ ok: false, reason });

function distance(a: RGB, b: RGB): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function medianColor(colors: RGB[]): RGB {
  return [median(colors.map((c) => c[0])), median(colors.map((c) => c[1])), median(colors.map((c) => c[2]))];
}

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

/** Longest unbroken run of indexes whose value passes the test. */
function longestRun(values: number[], pass: (v: number) => boolean): [number, number] | null {
  let best: [number, number] | null = null;
  let start = -1;
  for (let i = 0; i <= values.length; i++) {
    const ok = i < values.length && pass(values[i]);
    if (ok && start === -1) start = i;
    if (!ok && start !== -1) {
      if (!best || i - 1 - start > best[1] - best[0]) best = [start, i - 1];
      start = -1;
    }
  }
  return best;
}

export function measureCentering(img: Raster): CenteringResult {
  const { width: w, height: h, data } = img;
  if (!(w >= MIN_SIDE_PX && h >= MIN_SIDE_PX) || data.length < w * h * 4) return fail("The photo is too small or damaged to measure.");

  const px = (x: number, y: number): RGB => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };

  // The table: the middle color of the photo's outer ring.
  const ring: RGB[] = [];
  for (let x = 0; x < w; x += 3) ring.push(px(x, 1), px(x, h - 2));
  for (let y = 0; y < h; y += 3) ring.push(px(1, y), px(w - 2, y));
  const bg = medianColor(ring);

  // The card: rows and columns where most pixels differ from the table.
  const rowCount = new Array<number>(h).fill(0);
  const colCount = new Array<number>(w).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (distance(px(x, y), bg) > CARD_DISTANCE) {
        rowCount[y]++;
        colCount[x]++;
      }
    }
  }
  const maxRow = Math.max(...rowCount);
  const maxCol = Math.max(...colCount);
  if (maxRow < w * 0.2 || maxCol < h * 0.2) return fail("No card found in the photo. Lay it flat on a plain, contrasting surface.");
  const rows = longestRun(rowCount, (v) => v >= maxRow * 0.5);
  const cols = longestRun(colCount, (v) => v >= maxCol * 0.5);
  if (!rows || !cols) return fail("No card found in the photo.");
  const [y0, y1] = rows;
  const [x0, x1] = cols;
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const aspect = cw / ch;
  if (Math.abs(aspect - CARD_ASPECT) / CARD_ASPECT > ASPECT_TOLERANCE) {
    return fail("The shape isn't a straight-on card (aspect off). Hold the camera square above the card, with all four edges visible.");
  }

  // The border's color, sampled just inside each edge at the middle of that side.
  const inset = Math.max(2, Math.round(cw * 0.012));
  const sample = (xs: number[], ys: number[]): RGB => medianColor(xs.flatMap((x) => ys.map((y) => px(x, y))));
  const midYs = range(y0 + Math.floor(ch * 0.4), y0 + Math.floor(ch * 0.6));
  const midXs = range(x0 + Math.floor(cw * 0.4), x0 + Math.floor(cw * 0.6));
  const sides: RGB[] = [
    sample([x0 + inset], midYs),
    sample([x1 - inset], midYs),
    sample(midXs, [y0 + inset]),
    sample(midXs, [y1 - inset]),
  ];
  const border = medianColor(sides);
  if (sides.some((c) => distance(c, border) > BORDER_SAME_DISTANCE)) {
    return fail("The border color isn't even (glare, a holo border, or a damaged edge). Retake in soft, even light.");
  }

  const bandY = range(y0 + Math.floor(ch * 0.42), y0 + Math.floor(ch * 0.58));
  const bandX = range(x0 + Math.floor(cw * 0.42), x0 + Math.floor(cw * 0.58));
  const meanAt = (xs: number[], ys: number[]): RGB => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const x of xs) {
      for (const y of ys) {
        const c = px(x, y);
        r += c[0];
        g += c[1];
        b += c[2];
      }
    }
    const n = xs.length * ys.length;
    return [r / n, g / n, b / n];
  };
  const leaves = (c: RGB) => distance(c, border) > BORDER_END_DISTANCE;

  /** Steps inward from an edge until two steps in a row no longer look like border. Returns the border width. */
  function scan(from: number, step: 1 | -1, limit: number, colorAt: (p: number) => RGB): number | null {
    for (let k = 1; k < limit; k++) {
      const p = from + step * k;
      if (leaves(colorAt(p)) && leaves(colorAt(p + step))) return k;
    }
    return null;
  }

  const limitX = Math.floor(cw * SCAN_LIMIT_FRACTION);
  const limitY = Math.floor(ch * SCAN_LIMIT_FRACTION);
  const left = scan(x0 + inset, 1, limitX, (x) => meanAt([x], bandY));
  const right = scan(x1 - inset, -1, limitX, (x) => meanAt([x], bandY));
  const top = scan(y0 + inset, 1, limitY, (y) => meanAt(bandX, [y]));
  const bottom = scan(y1 - inset, -1, limitY, (y) => meanAt(bandX, [y]));
  if (left === null || right === null || top === null || bottom === null) {
    return fail("Couldn't find where the border ends and the art begins (full-art, or the border and art are too alike).");
  }

  const borders = { left: left + inset, right: right + inset, top: top + inset, bottom: bottom + inset };
  const tooThin = (v: number, total: number) => v < total * MIN_BORDER_FRACTION;
  const tooWide = (v: number, total: number) => v > total * MAX_BORDER_FRACTION;
  if (
    [borders.left, borders.right].some((v) => tooThin(v, cw) || tooWide(v, cw)) ||
    [borders.top, borders.bottom].some((v) => tooThin(v, ch) || tooWide(v, ch))
  ) {
    return fail("The border measured an unlikely width, so the result can't be trusted. Retake the photo straight-on.");
  }

  const pct = (a: number, b: number) => (100 * Math.max(a, b)) / (a + b);
  return {
    ok: true,
    card: { x: x0, y: y0, width: cw, height: ch },
    borders,
    horizontal: { larger: pct(borders.left, borders.right), widerSide: borders.left >= borders.right ? "left" : "right" },
    vertical: { larger: pct(borders.top, borders.bottom), widerSide: borders.top >= borders.bottom ? "top" : "bottom" },
  };
}
