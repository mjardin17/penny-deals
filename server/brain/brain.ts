/**
 * The brain: remembers every price the app looks up, learns from what actually
 * happened to the user's buys and sells, and keeps a mistakes list so the same
 * mistake is not made twice.
 *
 * Rules that keep it honest:
 *  - It never invents data. It only stores prices the marketplace APIs returned and
 *    numbers the user typed or reported.
 *  - It learns nothing from fewer than MIN_SALES_TO_LEARN real sales of the same item.
 *  - It only ever lowers a resale estimate, never raises it (see calibration use).
 *  - State is never mutated in place; every change builds a new state and saves it.
 *  - A corrupt memory file is never overwritten, so it can be recovered.
 *  - One server process per memory file. Two processes would overwrite each other.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const MIN_SALES_TO_LEARN = 3;
export const MAX_PRICE = 1_000_000;
/** A sale more than this many times the predicted price is a typo, not a sale. */
const MAX_SALE_RATIO = 10;
const MAX_OBSERVATIONS = 20_000;
const MAX_OUTCOMES = 20_000;
const MAX_SIGHTINGS = 50_000;
const MAX_SIGHTINGS_PER_KEY = 200;
const MAX_STORE_LENGTH = 60;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export type PriceBasis = "active_ask" | "sold";
export type OutcomeKind = "sold" | "wrong_match" | "not_in_store";

export interface Observation {
  key: string;
  channel: string;
  resalePrice: number;
  sampleSize: number;
  basis: PriceBasis;
  store?: string;
  observedAt: number;
}

export interface Outcome {
  key: string;
  kind: OutcomeKind;
  store?: string;
  matchUrl?: string;
  predictedResale?: number;
  actualResale?: number;
  note?: string;
  recordedAt: number;
}

/** A price the user entered for an item (what it cost them, where, when). */
export interface Sighting {
  key: string;
  price: number;
  store?: string;
  seenAt: number;
}

export interface BrainState {
  observations: readonly Observation[];
  outcomes: readonly Outcome[];
  sightings: readonly Sighting[];
}

export interface BrainStore {
  load(): BrainState;
  save(state: BrainState): void;
}

export type ObservationInput = Omit<Observation, "observedAt">;
export type OutcomeInput = Omit<Outcome, "recordedAt">;

export interface PriceHistory {
  count: number;
  latestResale?: number;
  medianResale?: number;
  spanDays: number;
}

export interface PricePoint {
  price: number;
  store?: string;
  seenAt: number;
}

export interface PaidHistory {
  count: number;
  last?: PricePoint;
  lowest?: PricePoint;
  highest?: PricePoint;
}

export interface Calibration {
  /** Median of actual sale price / price the app predicted, from the user's own sales. */
  ratio: number;
  samples: number;
}

/** Thrown for bad input from a caller. Anything else that throws is the server's problem. */
export class BrainInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrainInputError";
  }
}

const EMPTY_STATE: BrainState = Object.freeze({
  observations: Object.freeze([]) as readonly Observation[],
  outcomes: Object.freeze([]) as readonly Outcome[],
  sightings: Object.freeze([]) as readonly Sighting[],
});

/**
 * Same item, same key: UPC when known, otherwise the title's words sorted and lowercased.
 * No word is ever dropped: "Vitamin A" and "Vitamin B" must not share a key, because a
 * collision would teach the brain from sales of a different item. Splitting is the safe error.
 * Letters and numbers of any language count, so non-English titles never collapse together.
 */
export function itemKey(title: string, upc?: string): string {
  if (upc && /^\d{8,14}$/.test(upc.trim())) return `upc:${upc.trim()}`;
  const words = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return `title:raw:${crypto.createHash("sha1").update(title.trim().toLowerCase()).digest("hex")}`;
  }
  return `title:${[...new Set(words)].sort().join(" ")}`;
}

/** Trim, collapse spaces, cap length; empty means "no store". */
export function normalizeStore(store: unknown): string | undefined {
  if (typeof store !== "string") return undefined;
  const clean = store.trim().replace(/\s+/g, " ").slice(0, MAX_STORE_LENGTH);
  return clean || undefined;
}

function sameStore(a?: string, b?: string): boolean {
  return (a ?? "").toLowerCase() === (b ?? "").toLowerCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A real, positive, sane dollar amount rounded to cents. Rejects null, "", true, NaN, Infinity. */
function requireMoney(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > MAX_PRICE) {
    throw new BrainInputError(`${name} must be a positive number up to ${MAX_PRICE}`);
  }
  const cents = round2(value);
  if (cents <= 0) throw new BrainInputError(`${name} must be at least one cent`);
  return cents;
}

function requireHttpUrl(name: string, value: unknown): string {
  if (typeof value !== "string" || !value) throw new BrainInputError(`${name} is required`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BrainInputError(`${name} must be a web address`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new BrainInputError(`${name} must be a web address`);
  return value.slice(0, 500);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isOptStr = (v: unknown): boolean => v === undefined || typeof v === "string";
const OUTCOME_KINDS: readonly string[] = ["sold", "wrong_match", "not_in_store"];

const validObservation = (o: unknown): o is Observation =>
  isObject(o) && typeof o.key === "string" && typeof o.channel === "string" && isNum(o.resalePrice) &&
  isNum(o.sampleSize) && (o.basis === "active_ask" || o.basis === "sold") && isOptStr(o.store) && isNum(o.observedAt);
const validOutcome = (o: unknown): o is Outcome =>
  isObject(o) && typeof o.key === "string" && OUTCOME_KINDS.includes(o.kind as string) && isOptStr(o.store) &&
  isOptStr(o.matchUrl) && (o.predictedResale === undefined || isNum(o.predictedResale)) &&
  (o.actualResale === undefined || isNum(o.actualResale)) && isOptStr(o.note) && isNum(o.recordedAt);
const validSighting = (o: unknown): o is Sighting =>
  isObject(o) && typeof o.key === "string" && isNum(o.price) && isOptStr(o.store) && isNum(o.seenAt);

export class MemoryBrainStore implements BrainStore {
  private state: BrainState = EMPTY_STATE;
  load(): BrainState {
    return this.state;
  }
  save(state: BrainState): void {
    this.state = state;
  }
}

/** JSON file on disk, written atomically so a crash or full disk cannot truncate it. */
export class FileBrainStore implements BrainStore {
  constructor(private readonly file: string) {}

  load(): BrainState {
    if (!fs.existsSync(this.file)) return EMPTY_STATE;
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch (err) {
      throw new Error(`Brain memory file is corrupt and was left untouched: ${this.file} (${(err as Error).message})`);
    }
    const s = isObject(parsed) ? parsed : null;
    const sightings = s && s.sightings !== undefined ? s.sightings : [];
    if (
      !s || !Array.isArray(s.observations) || !Array.isArray(s.outcomes) || !Array.isArray(sightings) ||
      !s.observations.every(validObservation) || !s.outcomes.every(validOutcome) || !sightings.every(validSighting)
    ) {
      throw new Error(`Brain memory file is corrupt (unexpected contents) and was left untouched: ${this.file}`);
    }
    return { observations: s.observations, outcomes: s.outcomes, sightings };
  }

  save(state: BrainState): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(state));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      fs.rmSync(tmp, { force: true });
      throw err;
    }
  }
}

export class Brain {
  private state: BrainState;

  constructor(
    private readonly store: BrainStore,
    private readonly now: () => number = Date.now
  ) {
    this.state = store.load();
  }

  /** Remember a marketplace lookup. Returns false when this item was already looked up in the last hour. */
  recordObservation(input: ObservationInput): boolean {
    if (!input.key) throw new BrainInputError("key is required");
    const resalePrice = requireMoney("resalePrice", input.resalePrice);
    const now = this.now();
    const recent = this.state.observations.some(
      (o) => o.key === input.key && o.channel === input.channel && Math.abs(now - o.observedAt) < HOUR_MS
    );
    if (recent) return false;
    const observation: Observation = { ...input, resalePrice, store: normalizeStore(input.store), observedAt: now };
    this.commit({ ...this.state, observations: [...this.state.observations, observation].slice(-MAX_OBSERVATIONS) });
    return true;
  }

  /** Remember a price the user typed. Returns false when it repeats the last hour's entry. */
  recordSighting(input: { key: string; price: number; store?: string }): boolean {
    if (!input.key) throw new BrainInputError("key is required");
    const price = requireMoney("price", input.price);
    const store = normalizeStore(input.store);
    const now = this.now();
    const repeat = this.state.sightings.some(
      (x) => x.key === input.key && x.price === price && sameStore(x.store, store) && Math.abs(now - x.seenAt) < HOUR_MS
    );
    if (repeat) return false;

    let sightings = [...this.state.sightings, { key: input.key, price, store, seenAt: now }];
    const ofKey = sightings.filter((x) => x.key === input.key);
    if (ofKey.length > MAX_SIGHTINGS_PER_KEY) {
      const oldest = ofKey[0];
      sightings = sightings.filter((x) => x !== oldest);
    }
    this.commit({ ...this.state, sightings: sightings.slice(-MAX_SIGHTINGS) });
    return true;
  }

  /** Every price the user has entered for this item. */
  paidHistory(key: string): PaidHistory {
    const seen = this.state.sightings.filter((x) => x.key === key);
    if (seen.length === 0) return { count: 0 };
    const pick = ({ price, store, seenAt }: Sighting): PricePoint => ({ price, store, seenAt });
    const last = seen.reduce((a, b) => (b.seenAt >= a.seenAt ? b : a));
    const lowest = seen.reduce((a, b) => (b.price < a.price ? b : a));
    const highest = seen.reduce((a, b) => (b.price > a.price ? b : a));
    return { count: seen.length, last: pick(last), lowest: pick(lowest), highest: pick(highest) };
  }

  recordOutcome(input: OutcomeInput): void {
    if (!input.key) throw new BrainInputError("key is required");
    const outcome: Omit<Outcome, "recordedAt"> = { key: input.key, kind: input.kind, store: normalizeStore(input.store), note: input.note };

    if (input.kind === "sold") {
      const predictedResale = requireMoney("predictedResale", input.predictedResale);
      const actualResale = requireMoney("actualResale", input.actualResale);
      if (actualResale > predictedResale * MAX_SALE_RATIO) {
        throw new BrainInputError(`actualResale is more than ${MAX_SALE_RATIO}x predictedResale; check for a typo`);
      }
      Object.assign(outcome, { predictedResale, actualResale });
    } else if (input.kind === "wrong_match") {
      Object.assign(outcome, { matchUrl: requireHttpUrl("matchUrl", input.matchUrl) });
    } else if (input.kind === "not_in_store") {
      if (!outcome.store) throw new BrainInputError("store is required for a not_in_store report");
    } else {
      throw new BrainInputError("unknown outcome kind");
    }

    const all = [...this.state.outcomes, { ...outcome, recordedAt: this.now() } as Outcome];
    this.commit({ ...this.state, outcomes: evictOutcomes(all, MAX_OUTCOMES) });
  }

  history(key: string): PriceHistory {
    const seen = this.state.observations.filter((o) => o.key === key);
    if (seen.length === 0) return { count: 0, spanDays: 0 };
    const times = seen.map((o) => o.observedAt);
    return {
      count: seen.length,
      latestResale: seen[seen.length - 1].resalePrice,
      medianResale: round2(median(seen.map((o) => o.resalePrice))),
      spanDays: Math.round((Math.max(...times) - Math.min(...times)) / DAY_MS),
    };
  }

  /** The most recent marketplace price the app saw for this item (before any adjustment). */
  latestRawResale(key: string): number | undefined {
    for (let i = this.state.observations.length - 1; i >= 0; i--) {
      if (this.state.observations[i].key === key) return this.state.observations[i].resalePrice;
    }
    return undefined;
  }

  isBlocked(matchUrl: string | undefined): boolean {
    if (!matchUrl) return false;
    return this.state.outcomes.some((o) => o.kind === "wrong_match" && o.matchUrl === matchUrl);
  }

  blockedUrls(key: string): Set<string> {
    return new Set(
      this.state.outcomes.filter((o) => o.kind === "wrong_match" && o.key === key && o.matchUrl).map((o) => o.matchUrl as string)
    );
  }

  calibration(key: string): Calibration | null {
    const ratios = this.state.outcomes
      .filter((o) => o.kind === "sold" && o.key === key && isNum(o.predictedResale) && isNum(o.actualResale) && o.predictedResale > 0)
      .map((o) => (o.actualResale as number) / (o.predictedResale as number))
      .filter((r) => Number.isFinite(r) && r > 0);
    if (ratios.length < MIN_SALES_TO_LEARN) return null;
    return { ratio: round2(median(ratios)), samples: ratios.length };
  }

  storeReports(store: string): { notInStore: number } {
    return {
      notInStore: this.state.outcomes.filter((o) => o.kind === "not_in_store" && sameStore(o.store, normalizeStore(store))).length,
    };
  }

  summary() {
    return {
      observations: this.state.observations.length,
      outcomes: this.state.outcomes.length,
      pricesYouEntered: this.state.sightings.length,
      itemsRemembered: new Set(this.state.observations.map((o) => o.key)).size,
      sales: this.state.outcomes.filter((o) => o.kind === "sold").length,
      wrongMatchesBlocked: this.state.outcomes.filter((o) => o.kind === "wrong_match").length,
    };
  }

  private commit(next: BrainState): void {
    this.store.save(next);
    this.state = next;
  }
}

/** Over the cap, drop the least valuable memories first: "not in store" notes before sales and wrong-match blocks. */
export function evictOutcomes(all: Outcome[], max: number): Outcome[] {
  let excess = all.length - max;
  if (excess <= 0) return all;
  const dropped = new Set<Outcome>();
  for (const kind of ["not_in_store", "sold", "wrong_match"] as const) {
    for (const o of all) {
      if (excess <= 0) break;
      if (o.kind === kind) {
        dropped.add(o);
        excess--;
      }
    }
  }
  return all.filter((o) => !dropped.has(o));
}
