import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { CardsDeps, createCardsRouter } from "../server/routes/cards";
import { CardApiError, PokemonCard } from "../server/cards/pokemonTcg";
import { VisionNotConfigured } from "../server/cards/vision";
import { GradeLog, MemoryGradeStore } from "../server/cards/gradeLog";

const CARD: PokemonCard = { id: "base1-4", name: "Charizard", number: "4", set: { id: "base1", name: "Base", printedTotal: 102 } };

function deps(overrides: Partial<CardsDeps> = {}): CardsDeps {
  const log = new GradeLog(new MemoryGradeStore());
  return {
    tcg: { search: async () => [CARD], get: async (id) => (id === "base1-4" ? CARD : null) },
    readPhoto: async () => ({ name: "Charizard", number: "4", printedTotal: "102", confidence: "high" }),
    value: async () => ({ database: null, ebayRaw: null, ebayPsa10: null, notes: [] }),
    gradeLog: () => log,
    ...overrides,
  };
}

async function serve(d: CardsDeps) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", createCardsRouter(d));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/cards`;
  return {
    base,
    post: (p: string, body: unknown) => fetch(`${base}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

test("search turns '4/102' into a number and a set size", async () => {
  const seen: any[] = [];
  const s = await serve(deps({ tcg: { search: async (h) => { seen.push(h); return [CARD]; }, get: async () => null } }));
  try {
    const body = await (await fetch(`${s.base}/search?name=Charizard&number=004%2F102`)).json();
    assert.equal(body.data[0].id, "base1-4");
    assert.deepEqual(seen[0], { name: "Charizard", number: "4", printedTotal: "102" });
    assert.equal((await fetch(`${s.base}/search?number=hello`)).status, 400);
  } finally {
    await s.close();
  }
});

test("identify reads the photo, then looks the card up in the real database", async () => {
  const s = await serve(deps());
  try {
    const res = await s.post("/identify", { image: { base64: "QUJD", mimeType: "image/jpeg" } });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.data.read.name, "Charizard");
    assert.equal(body.data.candidates[0].id, "base1-4");
  } finally {
    await s.close();
  }
});

test("if the exact set size finds nothing, it widens to name and number", async () => {
  const calls: any[] = [];
  const s = await serve(deps({ tcg: { search: async (h) => { calls.push(h); return h.printedTotal ? [] : [CARD]; }, get: async () => null } }));
  try {
    const body = await (await s.post("/identify", { image: { base64: "QUJD", mimeType: "image/jpeg" } })).json();
    assert.equal(calls.length, 2);
    assert.equal(body.data.candidates.length, 1);
  } finally {
    await s.close();
  }
});

test("no Gemini key is a clear 503 with a code the screen can act on", async () => {
  const s = await serve(deps({ readPhoto: async () => { throw new VisionNotConfigured(); } }));
  try {
    const res = await s.post("/identify", { image: { base64: "QUJD", mimeType: "image/jpeg" } });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, "vision_not_configured");
  } finally {
    await s.close();
  }
});

test("a missing image is a 400", async () => {
  const s = await serve(deps());
  try {
    assert.equal((await s.post("/identify", {})).status, 400);
    assert.equal((await s.post("/identify", { image: "nope" })).status, 400);
  } finally {
    await s.close();
  }
});

test("a database outage is a 502 with a plain message", async () => {
  const s = await serve(deps({ tcg: { search: async () => { throw new CardApiError(503, "The card database had an error (HTTP 503)."); }, get: async () => null } }));
  try {
    const res = await fetch(`${s.base}/search?name=Mew`);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /card database/);
  } finally {
    await s.close();
  }
});

test("an unexpected crash is a 500 that leaks nothing", async () => {
  const s = await serve(deps({ tcg: { search: async () => { throw new Error("EACCES C:\\Users\\jjard\\.env AIza-secret"); }, get: async () => null } }));
  try {
    await quietly(async () => {
      const res = await fetch(`${s.base}/search?name=Mew`);
      assert.equal(res.status, 500);
      assert.doesNotMatch(JSON.stringify(await res.json()), /jjard|AIza|EACCES/);
    });
  } finally {
    await s.close();
  }
});

test("a card's page returns its details and real values, or 404", async () => {
  const s = await serve(deps());
  try {
    const ok = await (await fetch(`${s.base}/card/base1-4`)).json();
    assert.equal(ok.data.card.name, "Charizard");
    assert.ok(ok.data.value);
    assert.equal((await fetch(`${s.base}/card/zzz-9`)).status, 404);
    assert.equal((await fetch(`${s.base}/card/bad%20id%3Bdrop`)).status, 400);
  } finally {
    await s.close();
  }
});

test("real grade results are recorded, summarized and validated", async () => {
  const s = await serve(deps());
  try {
    const ok = await s.post("/grade-result", { cardId: "base1-4", company: "PSA", grade: 9, centering: { horizontal: 52, vertical: 53 } });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).data.count, 1);
    assert.equal((await s.post("/grade-result", { cardId: "base1-4", company: "PSA", grade: 12 })).status, 400);
    assert.equal((await (await fetch(`${s.base}/grade-summary`)).json()).data.count, 1);
  } finally {
    await s.close();
  }
});
