/**
 * Connects the learning loop's "Sold for $X" button to the brain's sale calibration.
 * A reported sale is compared with the RAW marketplace price the brain recorded at lookup
 * time, never with the price that was shown (which may already have been adjusted), so the
 * estimate cannot learn from its own correction.
 */

import { Brain, BrainInputError } from "../brain/brain";
import { PredictionRecord } from "./predictionsLog";

export type TeachResult = "taught" | "brain_off" | "no_key" | "no_lookup" | "refused" | "failed";

export function teachBrainFromSale(brain: Brain | undefined | null, record: PredictionRecord, actualPrice: number): TeachResult {
  if (!brain) return "brain_off";
  if (!record.brainKey) return "no_key";
  try {
    const predictedResale = brain.latestRawResale(record.brainKey);
    if (predictedResale === undefined) return "no_lookup";
    brain.recordOutcome({ key: record.brainKey, kind: "sold", predictedResale, actualResale: actualPrice });
    return "taught";
  } catch (err) {
    if (err instanceof BrainInputError) {
      console.error(`[brain] ignored a reported sale for "${record.title}": ${err.message}`);
      return "refused";
    }
    console.error("[brain] could not learn from a reported sale:", err);
    return "failed";
  }
}
