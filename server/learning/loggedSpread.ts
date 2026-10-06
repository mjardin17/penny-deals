/**
 * Every spread check the app runs — desktop calculator, phone scan, or the digest's
 * own resale checks — goes through this wrapper so the predictions log has no gaps.
 */

import { findSpread, SpreadCandidate, SpreadReport } from "../arbitrage/spreadEngine";
import { appendPrediction, PredictionSource } from "./predictionsLog";
import { loadWeights, lookupConfidence } from "./weights";
import { Brain, itemKey } from "../brain/brain";

export interface SpreadLogMeta {
  category: string;
  source: PredictionSource;
}

export interface LoggedSpreadReport extends SpreadReport {
  predictionId: string;
  confidenceLabel: string | null;
}

/**
 * `brain` is passed only by the running server. The digest is a separate process and must not
 * open the same memory file, or the two would overwrite each other.
 */
export async function findSpreadAndLog(candidate: SpreadCandidate, meta: SpreadLogMeta, brain?: Brain): Promise<LoggedSpreadReport> {
  const report = await findSpread(candidate, undefined, undefined, brain);
  const best = report.bestRealSpread ?? report.channels.find((c) => c.status === "ok");

  const record = await appendPrediction({
    title: candidate.title,
    store: candidate.store,
    buyPrice: candidate.buyPrice,
    predictedResale: best?.resalePrice,
    predictedProfit: best?.profit?.netProfit,
    brainKey: itemKey(candidate.title, candidate.upc),
    category: meta.category,
    source: meta.source,
  });

  const weights = await loadWeights();
  const confidence = lookupConfidence(weights, meta.category, candidate.store);

  return { ...report, predictionId: record.id, confidenceLabel: confidence?.label ?? null };
}
