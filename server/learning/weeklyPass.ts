/**
 * Weekly learning pass: runs alongside the digest.
 *
 *  1. eBay recheck — predictions >= 7 days old with no outcome get a fresh Browse
 *     API read using the exact same method as the original prediction (active
 *     fixed-price listings, 25th percentile). "Sold comps" via Marketplace Insights
 *     needs eBay's commercial approval, which most sellers don't have
 *     (EBAY_MARKETPLACE_INSIGHTS_APPROVED=false by default) — reusing the prediction's
 *     own method keeps prediction and recheck apples-to-apples, and never invents a
 *     number the account isn't actually authorized to fetch.
 *  2. Accuracy — computed only from recorded outcomes (manual feedback + rechecks).
 *  3. Weights — persisted to data/weights.json, read back at prediction time.
 *
 * A bucket with fewer than MIN_SAMPLES_FOR_LABEL outcomes stays "not enough data yet."
 * Nothing here is ever backfilled or guessed.
 */

import { findSpread, SpreadCandidate, SpreadReport } from "../arbitrage/spreadEngine";
import {
  defaultLogPath,
  predictionsNeedingEbayRecheck,
  readPredictions,
  recordOutcome,
} from "./predictionsLog";
import { BucketAccuracy, computeAccuracyByCategory, computeAccuracyByStore } from "./accuracy";
import { defaultWeightsPath, saveWeights } from "./weights";

export type FindSpreadFn = (candidate: SpreadCandidate) => Promise<SpreadReport>;

export interface RecheckResult {
  rechecked: number;
  failed: number;
}

export async function runEbayRecheck(
  now: Date,
  minAgeDays = 7,
  findSpreadFn: FindSpreadFn = findSpread,
  predictionsPath = defaultLogPath()
): Promise<RecheckResult> {
  const records = await readPredictions(predictionsPath);
  const due = predictionsNeedingEbayRecheck(records, now, minAgeDays);
  let rechecked = 0;
  let failed = 0;
  for (const r of due) {
    try {
      const report = await findSpreadFn({ title: r.title, buyPrice: r.buyPrice, store: r.store });
      const best = report.bestRealSpread ?? report.channels.find((c) => c.status === "ok");
      if (best?.resalePrice === undefined) {
        failed++;
        continue;
      }
      await recordOutcome(
        r.id,
        { stage: "sold", actualPrice: best.resalePrice, recordedAt: now.toISOString(), method: "ebay-recheck" },
        predictionsPath
      );
      rechecked++;
    } catch {
      failed++;
    }
  }
  return { rechecked, failed };
}

export interface WeeklyPassResult {
  rechecked: number;
  rechecksFailed: number;
  categories: BucketAccuracy[];
  stores: BucketAccuracy[];
  totalOutcomesWithPrice: number;
}

export async function runWeeklyLearningPass(
  now: Date,
  findSpreadFn: FindSpreadFn = findSpread,
  predictionsPath = defaultLogPath(),
  weightsPath = defaultWeightsPath()
): Promise<WeeklyPassResult> {
  const recheck = await runEbayRecheck(now, 7, findSpreadFn, predictionsPath);
  const records = await readPredictions(predictionsPath);
  const categories = computeAccuracyByCategory(records);
  const stores = computeAccuracyByStore(records);
  await saveWeights(categories, stores, now, weightsPath);
  const totalOutcomesWithPrice = records.filter((r) => r.outcome?.actualPrice !== undefined).length;
  return { rechecked: recheck.rechecked, rechecksFailed: recheck.failed, categories, stores, totalOutcomesWithPrice };
}

export function renderLearningSummary(result: WeeklyPassResult): string {
  const lines = ["## What I learned this week", ""];
  if (result.totalOutcomesWithPrice === 0) {
    lines.push(
      "_Not enough data yet. No recorded outcomes (bought/sold feedback or eBay rechecks) exist yet, so nothing is learned or down/up-weighted. This is honest, not a bug — the loop only learns from real outcomes._"
    );
    return lines.join("\n") + "\n";
  }

  lines.push(
    `${result.rechecked} eBay recheck(s) completed this week (${result.rechecksFailed} could not be rechecked). ${result.totalOutcomesWithPrice} total outcome(s) recorded so far.`,
    ""
  );

  const labeled = [...result.categories, ...result.stores.map((s) => ({ ...s, key: `${s.key} (store)` }))].filter(
    (b) => b.label !== "not enough data yet"
  );

  if (labeled.length === 0) {
    lines.push("_Every category and store still has fewer than 3 recorded outcomes — not enough data yet to trust a hit rate._");
    return lines.join("\n") + "\n";
  }

  lines.push("| Bucket | Hit rate | Outcomes | Confidence |", "| --- | --- | --- | --- |");
  for (const b of labeled) {
    lines.push(`| ${b.key} | ${((b.hitRate ?? 0) * 100).toFixed(0)}% | ${b.hits}/${b.total} | ${b.label} |`);
  }
  return lines.join("\n") + "\n";
}
