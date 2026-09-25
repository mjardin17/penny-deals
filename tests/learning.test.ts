import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { appendPrediction, PredictionRecord, predictionsNeedingEbayRecheck, readPredictions, recordOutcome } from "../server/learning/predictionsLog";
import { computeAccuracyByCategory, computeAccuracyByStore, MIN_SAMPLES_FOR_LABEL } from "../server/learning/accuracy";
import { loadWeights, lookupConfidence, saveWeights } from "../server/learning/weights";
import { renderLearningSummary, runEbayRecheck, runWeeklyLearningPass } from "../server/learning/weeklyPass";
import { SpreadReport } from "../server/arbitrage/spreadEngine";

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "penny-deals-learning-test-"));
}

function fakeReport(resalePrice: number): SpreadReport {
  return {
    candidate: { title: "x", buyPrice: 1 },
    packageAssumed: true,
    channels: [
      { channel: "ebay", status: "ok", statusMessage: "ok", resalePrice, resaleBasis: "test", isRealSpread: false },
    ],
    bestRealSpread: null,
    checkedAt: new Date().toISOString(),
  } as unknown as SpreadReport;
}

function noMatchReport(): SpreadReport {
  return {
    candidate: { title: "x", buyPrice: 1 },
    packageAssumed: true,
    channels: [{ channel: "ebay", status: "no_match", statusMessage: "no match", isRealSpread: false }],
    bestRealSpread: null,
    checkedAt: new Date().toISOString(),
  } as unknown as SpreadReport;
}

test("appendPrediction writes a row every call, no exceptions", async () => {
  const dir = await tempDir();
  const file = path.join(dir, "predictions.jsonl");
  try {
    await appendPrediction({ title: "Hot Wheels", buyPrice: 1, predictedResale: 9, category: "toys", source: "penny-scan" }, file);
    await appendPrediction({ title: "Planer", buyPrice: 400, predictedResale: 500, category: "tools", source: "ebay-arbitrage" }, file);
    const rows = await readPredictions(file);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].title, "Hot Wheels");
    assert.ok(rows[0].id);
    assert.ok(rows[0].timestamp);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("recordOutcome merges an outcome onto the matching row without disturbing others", async () => {
  const dir = await tempDir();
  const file = path.join(dir, "predictions.jsonl");
  try {
    const a = await appendPrediction({ title: "A", buyPrice: 1, predictedResale: 10, category: "toys", source: "penny-scan" }, file);
    await appendPrediction({ title: "B", buyPrice: 2, predictedResale: 20, category: "toys", source: "penny-scan" }, file);

    const updated = await recordOutcome(a.id, { stage: "sold", actualPrice: 9.5, recordedAt: new Date().toISOString(), method: "manual" }, file);
    assert.ok(updated);
    assert.equal(updated!.outcome?.actualPrice, 9.5);

    const rows = await readPredictions(file);
    assert.equal(rows.length, 2);
    assert.equal(rows.find((r) => r.title === "B")!.outcome, undefined);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("recordOutcome on an unknown id returns null and changes nothing", async () => {
  const dir = await tempDir();
  const file = path.join(dir, "predictions.jsonl");
  try {
    await appendPrediction({ title: "A", buyPrice: 1, predictedResale: 10, category: "toys", source: "penny-scan" }, file);
    const result = await recordOutcome("does-not-exist", { stage: "bought", recordedAt: new Date().toISOString(), method: "manual" }, file);
    assert.equal(result, null);
    assert.equal((await readPredictions(file)).length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("predictionsNeedingEbayRecheck only picks eBay-sourced, outcome-less, 7+ day old rows", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  const old: PredictionRecord = {
    id: "1",
    timestamp: "2026-01-01T00:00:00Z",
    title: "old ebay",
    buyPrice: 1,
    predictedResale: 10,
    category: "toys",
    source: "ebay-arbitrage",
  };
  const fresh: PredictionRecord = { ...old, id: "2", timestamp: "2026-01-14T00:00:00Z", title: "fresh ebay" };
  const scan: PredictionRecord = { ...old, id: "3", title: "penny scan", source: "penny-scan" };
  const alreadyDone: PredictionRecord = {
    ...old,
    id: "4",
    title: "done",
    outcome: { stage: "sold", actualPrice: 9, recordedAt: now.toISOString(), method: "ebay-recheck" },
  };

  const due = predictionsNeedingEbayRecheck([old, fresh, scan, alreadyDone], now, 7);
  assert.deepEqual(due.map((r) => r.id), ["1"]);
});

test("computeAccuracyByCategory: hits within 20% tolerance count, misses don't", () => {
  const base = { id: "", timestamp: "", buyPrice: 1, category: "toys", source: "ebay-arbitrage" as const };
  const records: PredictionRecord[] = [
    { ...base, id: "1", title: "a", predictedResale: 10, outcome: { stage: "sold", actualPrice: 10.5, recordedAt: "", method: "manual" } }, // hit
    { ...base, id: "2", title: "b", predictedResale: 10, outcome: { stage: "sold", actualPrice: 9, recordedAt: "", method: "manual" } }, // hit (10% off)
    { ...base, id: "3", title: "c", predictedResale: 10, outcome: { stage: "sold", actualPrice: 5, recordedAt: "", method: "manual" } }, // miss (50% off)
  ];
  const [toys] = computeAccuracyByCategory(records);
  assert.equal(toys.key, "toys");
  assert.equal(toys.total, 3);
  assert.equal(toys.hits, 2);
  assert.ok(Math.abs(toys.hitRate! - 2 / 3) < 1e-9);
});

test("a category below MIN_SAMPLES_FOR_LABEL stays 'not enough data yet' even with a perfect hit rate", () => {
  assert.ok(MIN_SAMPLES_FOR_LABEL >= 2, "sanity check on the constant");
  const base = { id: "", timestamp: "", buyPrice: 1, category: "rare", source: "ebay-arbitrage" as const };
  const records: PredictionRecord[] = [
    { ...base, id: "1", title: "a", predictedResale: 10, outcome: { stage: "sold", actualPrice: 10, recordedAt: "", method: "manual" } },
  ];
  const [rare] = computeAccuracyByCategory(records);
  assert.equal(rare.label, "not enough data yet");
});

test("a category with >=3 outcomes and <50% hit rate is flagged low-confidence; >80% is boosted", () => {
  const base = { id: "", timestamp: "", buyPrice: 1, category: "flaky", source: "ebay-arbitrage" as const };
  const miss = (id: string): PredictionRecord => ({ ...base, id, title: id, predictedResale: 10, outcome: { stage: "sold", actualPrice: 1, recordedAt: "", method: "manual" } });
  const hit = (id: string): PredictionRecord => ({ ...base, id, title: id, predictedResale: 10, outcome: { stage: "sold", actualPrice: 10, recordedAt: "", method: "manual" } });

  const [flaky] = computeAccuracyByCategory([miss("1"), miss("2"), miss("3"), hit("4")]);
  assert.equal(flaky.label, "low-confidence");

  const good = { ...base, category: "reliable" };
  const [reliable] = computeAccuracyByCategory([
    { ...good, id: "1", title: "a", predictedResale: 10, outcome: { stage: "sold", actualPrice: 10, recordedAt: "", method: "manual" } },
    { ...good, id: "2", title: "b", predictedResale: 10, outcome: { stage: "sold", actualPrice: 10, recordedAt: "", method: "manual" } },
    { ...good, id: "3", title: "c", predictedResale: 10, outcome: { stage: "sold", actualPrice: 10, recordedAt: "", method: "manual" } },
    { ...good, id: "4", title: "d", predictedResale: 10, outcome: { stage: "sold", actualPrice: 10, recordedAt: "", method: "manual" } },
  ]);
  assert.equal(reliable.label, "boosted"); // 4/4 = 100% > 80% threshold
});

test("computeAccuracyByStore ignores 'bought' outcomes with no sale price (no signal yet)", () => {
  const base = { id: "1", timestamp: "", title: "a", buyPrice: 1, category: "c", store: "Dollar General", predictedResale: 10, source: "penny-scan" as const };
  const records: PredictionRecord[] = [{ ...base, outcome: { stage: "bought", recordedAt: "", method: "manual" } }];
  const [store] = computeAccuracyByStore(records);
  assert.equal(store.total, 0);
  assert.equal(store.label, "not enough data yet");
});

test("weights: never fabricated when there are no outcomes at all", async () => {
  const dir = await tempDir();
  const file = path.join(dir, "weights.json");
  try {
    const empty = await loadWeights(file);
    assert.deepEqual(empty, { updatedAt: null, categories: {}, stores: {} });
    assert.equal(lookupConfidence(empty, "toys", "Walmart"), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("saveWeights persists buckets and lookupConfidence resolves category over store", async () => {
  const dir = await tempDir();
  const file = path.join(dir, "weights.json");
  try {
    const categories = computeAccuracyByCategory([
      { id: "1", timestamp: "", title: "a", buyPrice: 1, category: "toys", predictedResale: 10, source: "penny-scan", outcome: { stage: "sold", actualPrice: 10, recordedAt: "", method: "manual" } },
      { id: "2", timestamp: "", title: "b", buyPrice: 1, category: "toys", predictedResale: 10, source: "penny-scan", outcome: { stage: "sold", actualPrice: 10, recordedAt: "", method: "manual" } },
      { id: "3", timestamp: "", title: "c", buyPrice: 1, category: "toys", predictedResale: 10, source: "penny-scan", outcome: { stage: "sold", actualPrice: 10, recordedAt: "", method: "manual" } },
    ]);
    await saveWeights(categories, [], new Date("2026-01-01T00:00:00Z"), file);
    const loaded = await loadWeights(file);
    assert.equal(loaded.categories.toys.label, "boosted");
    assert.equal(lookupConfidence(loaded, "toys", "SomeStore")?.label, "boosted");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("runEbayRecheck rechecks only due predictions and records the live resale price, skipping no-match ones honestly", async () => {
  const dir = await tempDir();
  const file = path.join(dir, "predictions.jsonl");
  try {
    await appendPrediction({ title: "Old planer", buyPrice: 5, predictedResale: 50, category: "tools", source: "ebay-arbitrage" }, file);
    await appendPrediction({ title: "Unmatched item", buyPrice: 2, predictedResale: 20, category: "tools", source: "ebay-arbitrage" }, file);
    await appendPrediction({ title: "Fresh scan", buyPrice: 1, predictedResale: 9, category: "toys", source: "penny-scan" }, file);

    const rows = await readPredictions(file);
    for (const r of rows) if (r.source === "ebay-arbitrage") r.timestamp = "2020-01-01T00:00:00Z";
    const { writeFile } = await import("node:fs/promises");
    await writeFile(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

    const now = new Date("2026-01-15T00:00:00Z");
    let calls = 0;
    const fakeFindSpread = async (c: { title: string }): Promise<SpreadReport> => {
      calls++;
      return c.title === "Old planer" ? fakeReport(48) : noMatchReport();
    };

    const result = await runEbayRecheck(now, 7, fakeFindSpread, file);
    assert.equal(calls, 2); // only the two eBay-sourced rows, not the penny-scan one
    assert.equal(result.rechecked, 1);
    assert.equal(result.failed, 1);

    const after = await readPredictions(file);
    assert.equal(after.find((r) => r.title === "Old planer")!.outcome?.actualPrice, 48);
    assert.equal(after.find((r) => r.title === "Old planer")!.outcome?.method, "ebay-recheck");
    assert.equal(after.find((r) => r.title === "Unmatched item")!.outcome, undefined); // no_match never invents a price
    assert.equal(after.find((r) => r.title === "Fresh scan")!.outcome, undefined); // untouched, wrong source + too fresh
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("runWeeklyLearningPass end to end: rechecks, computes accuracy, and persists weights honestly", async () => {
  const dir = await tempDir();
  const predictionsPath = path.join(dir, "predictions.jsonl");
  const weightsPath = path.join(dir, "weights.json");
  try {
    // Three old, resolved-by-recheck "tools" predictions, all landing within tolerance -> should end up "boosted".
    for (let i = 0; i < 3; i++) {
      await appendPrediction({ title: `Tool ${i}`, buyPrice: 5, predictedResale: 50, category: "tools", source: "ebay-arbitrage" }, predictionsPath);
    }
    const rows = await readPredictions(predictionsPath);
    for (const r of rows) r.timestamp = "2020-01-01T00:00:00Z";
    const { writeFile } = await import("node:fs/promises");
    await writeFile(predictionsPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

    const now = new Date("2026-01-15T00:00:00Z");
    const result = await runWeeklyLearningPass(now, async () => fakeReport(50), predictionsPath, weightsPath);

    assert.equal(result.rechecked, 3);
    assert.equal(result.totalOutcomesWithPrice, 3);
    assert.equal(result.categories.find((c) => c.key === "tools")?.label, "boosted");

    const weights = await loadWeights(weightsPath);
    assert.equal(weights.categories.tools.label, "boosted");
    assert.ok(weights.updatedAt);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("renderLearningSummary is honest when there is no outcome data yet", () => {
  const summary = renderLearningSummary({ rechecked: 0, rechecksFailed: 0, categories: [], stores: [], totalOutcomesWithPrice: 0 });
  assert.match(summary, /not enough data yet/i);
  assert.doesNotMatch(summary, /boosted|low-confidence/);
});

test("renderLearningSummary lists labeled buckets once there is real data", () => {
  const summary = renderLearningSummary({
    rechecked: 2,
    rechecksFailed: 0,
    categories: [{ key: "toys", hits: 3, total: 3, hitRate: 1, label: "boosted" }],
    stores: [{ key: "Walmart", hits: 0, total: 3, hitRate: 0, label: "low-confidence" }],
    totalOutcomesWithPrice: 6,
  });
  assert.match(summary, /toys/);
  assert.match(summary, /boosted/);
  assert.match(summary, /Walmart \(store\)/);
  assert.match(summary, /low-confidence/);
});
