/**
 * Persisted learned weights (data/weights.json), refreshed by the weekly learning pass.
 * Read at prediction time so new spread checks can be flagged low-confidence/boosted.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BucketAccuracy } from "./accuracy";

export interface WeightsFile {
  updatedAt: string | null;
  categories: Record<string, BucketAccuracy>;
  stores: Record<string, BucketAccuracy>;
}

export const EMPTY_WEIGHTS: WeightsFile = { updatedAt: null, categories: {}, stores: {} };

export function defaultWeightsPath(): string {
  return path.join(process.cwd(), "data", "weights.json");
}

export async function loadWeights(filePath = defaultWeightsPath()): Promise<WeightsFile> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as WeightsFile;
  } catch {
    return EMPTY_WEIGHTS;
  }
}

export async function saveWeights(
  categories: BucketAccuracy[],
  stores: BucketAccuracy[],
  now: Date,
  filePath = defaultWeightsPath()
): Promise<WeightsFile> {
  const file: WeightsFile = {
    updatedAt: now.toISOString(),
    categories: Object.fromEntries(categories.map((c) => [c.key, c])),
    stores: Object.fromEntries(stores.map((s) => [s.key, s])),
  };
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(file, null, 2), "utf8");
  return file;
}

export function lookupConfidence(weights: WeightsFile, category?: string, store?: string) {
  const categoryEntry = category ? weights.categories[category] : undefined;
  const storeEntry = store ? weights.stores[store] : undefined;
  // Category speaks first (it's the more stable signal); store only overrides when it disagrees with real data.
  return categoryEntry ?? storeEntry ?? null;
}
