import { test } from "node:test";
import assert from "node:assert/strict";
import { Brain, itemKey, MemoryBrainStore } from "../server/brain/brain";
import { teachBrainFromSale } from "../server/learning/brainBridge";
import { PredictionRecord } from "../server/learning/predictionsLog";

function record(overrides: Partial<PredictionRecord> = {}): PredictionRecord {
  return {
    id: "p1",
    timestamp: "2026-10-06T00:00:00.000Z",
    title: "Pokemon Prismatic Evolutions Elite Trainer Box",
    buyPrice: 50,
    predictedResale: 90,
    category: "pokemon",
    source: "penny-scan",
    brainKey: itemKey("Pokemon Prismatic Evolutions Elite Trainer Box"),
    ...overrides,
  };
}

function brainWithLookup(key: string, rawResale: number) {
  const brain = new Brain(new MemoryBrainStore());
  brain.recordObservation({ key, channel: "ebay", resalePrice: rawResale, sampleSize: 30, basis: "active_ask" });
  return brain;
}

test("a reported sale teaches the brain, measured against the raw eBay price it saw", () => {
  const rec = record();
  const brain = brainWithLookup(rec.brainKey!, 112.5);
  for (let i = 0; i < 3; i++) assert.equal(teachBrainFromSale(brain, rec, 90), "taught");
  assert.deepEqual(brain.calibration(rec.brainKey!), { ratio: 0.8, samples: 3 });
});

test("it uses the raw price, not the already-adjusted predicted price, so it cannot feed on itself", () => {
  const rec = record({ predictedResale: 90 }); // what was shown after an earlier adjustment
  const brain = brainWithLookup(rec.brainKey!, 112.5);
  teachBrainFromSale(brain, rec, 90);
  teachBrainFromSale(brain, rec, 90);
  teachBrainFromSale(brain, rec, 90);
  assert.equal(brain.calibration(rec.brainKey!)?.ratio, 0.8, "90 / 112.5, not 90 / 90");
});

test("skips quietly when there is nothing to compare against", () => {
  const brain = new Brain(new MemoryBrainStore());
  assert.equal(teachBrainFromSale(brain, record(), 90), "no_lookup");
  assert.equal(teachBrainFromSale(brain, record({ brainKey: undefined }), 90), "no_key");
  assert.equal(teachBrainFromSale(undefined, record(), 90), "brain_off");
});

test("a typo'd sale price is refused and logged, never learned", () => {
  const rec = record();
  const brain = brainWithLookup(rec.brainKey!, 100);
  const original = console.error;
  const logged: string[] = [];
  console.error = (...a: unknown[]) => void logged.push(a.join(" "));
  try {
    assert.equal(teachBrainFromSale(brain, rec, 5000), "refused");
  } finally {
    console.error = original;
  }
  assert.equal(brain.summary().sales, 0);
  assert.ok(logged.some((l) => l.includes("typo")));
});

test("a memory failure never breaks recording the sale", () => {
  const rec = record();
  const failing = new Brain(
    {
      load: () => ({
        observations: [{ key: rec.brainKey!, channel: "ebay", resalePrice: 100, sampleSize: 5, basis: "active_ask", observedAt: 1 }],
        outcomes: [],
        sightings: [],
      }),
      save: () => {
        throw new Error("ENOSPC");
      },
    },
    () => 1
  );
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(teachBrainFromSale(failing, rec, 90), "failed");
  } finally {
    console.error = original;
  }
});
