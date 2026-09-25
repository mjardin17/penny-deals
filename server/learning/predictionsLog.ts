/**
 * Append-only predictions log: every spread check the app runs gets a row here.
 * JSONL on disk (data/predictions.jsonl), gitignored like .env — it's local runtime
 * state, not source. The digest's "what I learned this week" section is the
 * git-tracked, human-readable summary derived from this file.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PredictionSource = "penny-scan" | "ebay-arbitrage";
export type OutcomeStage = "bought" | "sold";

export interface PredictionOutcome {
  stage: OutcomeStage;
  actualPrice?: number;
  recordedAt: string;
  method: "manual" | "ebay-recheck";
}

export interface PredictionRecord {
  id: string;
  timestamp: string;
  title: string;
  store?: string;
  buyPrice: number;
  predictedResale?: number;
  predictedProfit?: number;
  category: string;
  source: PredictionSource;
  outcome?: PredictionOutcome;
}

export interface NewPrediction {
  title: string;
  store?: string;
  buyPrice: number;
  predictedResale?: number;
  predictedProfit?: number;
  category: string;
  source: PredictionSource;
}

export function defaultLogPath(): string {
  return path.join(process.cwd(), "data", "predictions.jsonl");
}

async function ensureFile(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "", "utf8");
  }
}

export async function appendPrediction(entry: NewPrediction, filePath = defaultLogPath()): Promise<PredictionRecord> {
  await ensureFile(filePath);
  const record: PredictionRecord = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  await writeFile(filePath, JSON.stringify(record) + "\n", { flag: "a" });
  return record;
}

export async function readPredictions(filePath = defaultLogPath()): Promise<PredictionRecord[]> {
  await ensureFile(filePath);
  const raw = await readFile(filePath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PredictionRecord);
}

/** JSONL can't be updated in place, so outcomes are recorded by rewriting the file. Fine at personal-app scale. */
export async function recordOutcome(
  id: string,
  outcome: PredictionOutcome,
  filePath = defaultLogPath()
): Promise<PredictionRecord | null> {
  const records = await readPredictions(filePath);
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], outcome };
  await writeFile(filePath, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  return records[idx];
}

export function predictionsNeedingEbayRecheck(records: PredictionRecord[], now: Date, minAgeDays: number): PredictionRecord[] {
  const cutoff = now.getTime() - minAgeDays * 86_400_000;
  return records.filter(
    (r) => r.source === "ebay-arbitrage" && !r.outcome && new Date(r.timestamp).getTime() <= cutoff && r.predictedResale !== undefined
  );
}

export function pendingFeedback(records: PredictionRecord[]): PredictionRecord[] {
  return records.filter((r) => r.source === "penny-scan" && !r.outcome);
}
