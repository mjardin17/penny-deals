/**
 * Predicted-vs-actual accuracy, computed only from recorded outcomes.
 * No invented history: a bucket with too few outcomes stays "not enough data"
 * instead of getting a fabricated hit rate.
 */

import { PredictionRecord } from "./predictionsLog";

export const MIN_SAMPLES_FOR_LABEL = 3;
export const LOW_CONFIDENCE_THRESHOLD = 0.5;
export const BOOSTED_CONFIDENCE_THRESHOLD = 0.8;
/** How close actual resale has to land to the prediction to count as a "hit". */
export const HIT_TOLERANCE_PCT = 0.2;

export type ConfidenceLabel = "low-confidence" | "normal" | "boosted" | "not enough data yet";

export interface BucketAccuracy {
  key: string;
  hits: number;
  total: number;
  hitRate: number | null; // null when total === 0
  label: ConfidenceLabel;
}

function isHit(record: PredictionRecord): boolean | null {
  if (!record.outcome || record.predictedResale === undefined) return null;
  const actual = record.outcome.actualPrice;
  if (actual === undefined) return null; // "bought" with no sale price yet: no accuracy signal
  const diff = Math.abs(actual - record.predictedResale);
  return diff / record.predictedResale <= HIT_TOLERANCE_PCT;
}

function labelFor(hitRate: number | null, total: number): ConfidenceLabel {
  if (total < MIN_SAMPLES_FOR_LABEL || hitRate === null) return "not enough data yet";
  if (hitRate < LOW_CONFIDENCE_THRESHOLD) return "low-confidence";
  if (hitRate > BOOSTED_CONFIDENCE_THRESHOLD) return "boosted";
  return "normal";
}

function groupBy(records: PredictionRecord[], keyFn: (r: PredictionRecord) => string | undefined): Map<string, PredictionRecord[]> {
  const groups = new Map<string, PredictionRecord[]>();
  for (const r of records) {
    const key = keyFn(r);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return groups;
}

export function computeBucketAccuracy(records: PredictionRecord[], keyFn: (r: PredictionRecord) => string | undefined): BucketAccuracy[] {
  const groups = groupBy(records, keyFn);
  const out: BucketAccuracy[] = [];
  for (const [key, group] of groups) {
    let hits = 0;
    let total = 0;
    for (const r of group) {
      const outcome = isHit(r);
      if (outcome === null) continue;
      total++;
      if (outcome) hits++;
    }
    const hitRate = total > 0 ? hits / total : null;
    out.push({ key, hits, total, hitRate, label: labelFor(hitRate, total) });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

export function computeAccuracyByCategory(records: PredictionRecord[]): BucketAccuracy[] {
  return computeBucketAccuracy(records, (r) => r.category);
}

export function computeAccuracyByStore(records: PredictionRecord[]): BucketAccuracy[] {
  return computeBucketAccuracy(records, (r) => r.store);
}

const CONFIDENCE_MULTIPLIER: Record<ConfidenceLabel, number> = {
  "low-confidence": 0.7,
  normal: 1.0,
  boosted: 1.15,
  "not enough data yet": 1.0,
};

export function confidenceMultiplier(label: ConfidenceLabel): number {
  return CONFIDENCE_MULTIPLIER[label];
}
