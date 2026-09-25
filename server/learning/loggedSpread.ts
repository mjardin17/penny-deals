/**
 * Every spread check the app runs — desktop calculator, phone scan, or the digest's
 * own resale checks — goes through this wrapper so the predictions log has no gaps.
 */

import { findSpread, SpreadCandidate, SpreadReport } from "../arbitrage/spreadEngine";
import { appendPrediction, PredictionSource } from "./predictionsLog";
import { loadWeights, lookupConfidence } from "./weights";

export interface SpreadLogMeta {
  category: string;
  source: PredictionSource;
}

export interface LoggedSpreadReport extends SpreadReport {
  predictionId: string;
  confidenceLabel: string | null;
}

export async function findSpreadAndLog(candidate: SpreadCandidate, meta: SpreadLogMeta): Promise<LoggedSpreadReport> {
  const report = await findSpread(candidate);
  const best = report.bestRealSpread ?? report.channels.find((c) => c.status === "ok");

  const record = await appendPrediction({
    title: candidate.title,
    store: candidate.store,
    buyPrice: candidate.buyPrice,
    predictedResale: best?.resalePrice,
    predictedProfit: best?.profit?.netProfit,
    category: meta.category,
    source: meta.source,
  });

  const weights = await loadWeights();
  const confidence = lookupConfidence(weights, meta.category, candidate.store);

  return { ...report, predictionId: record.id, confidenceLabel: confidence?.label ?? null };
}
