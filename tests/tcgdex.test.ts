import { test } from "node:test";
import assert from "node:assert/strict";
import { createTcgdexClient } from "../server/cards/tcgdex";
import { createCardDatabase } from "../server/cards/database";
import { CardApiError } from "../server/cards/http";
import { CardDatabase, PokemonCard } from "../server/cards/types";

// Shaped like api.tcgdex.net/v2/en responses (checked 2026-10-06).
const SETS = [
  { id: "base1", name: "Base Set", cardCount: { total: 102, official: 102 } },
  { id: "base4", name: "Base Set 2", cardCount: { total: 130, official: 130 } },
  { id: "sv03.5", name: "151", cardCount: { total: 207, official: 165 } },
];
const BRIEFS = [
  { id: "base4-4", localId: "4", name: "Charizard", image: "https://assets.tcgdex.net/en/base/base4/4" },
  { id: "base1-4", localId: "4", name: "Charizard", image: "https://assets.tcgdex.net/en/base/base1/4" },
  { id: "base5-4", localId: "4", name: "Dark Charizard", image: "https://assets.tcgdex.net/en/base/base5/4" },
  { id: "sm9-14", localId: "14", name: "Charizard", image: "https://assets.tcgdex.net/en/sm/sm9/14" },
];
const FULL = {
  id: "base1-4",
  localId: "4",
  name: "Charizard",
  rarity: "Rare",
  image: "https://assets.tcgdex.net/en/base/base1/4",
  set: { id: "base1", name: "Base Set", cardCount: { total: 102, official: 102 } },
  pricing: {
    tcgplayer: { unit: "USD", updated: "2026-10-05T22:54:34.320Z", holofoil: { productId: 42382, lowPrice: 499.99, midPrice: 627.71, highPrice: 3499.1, marketPrice: 928.32, directLowPrice: null } },
    cardmarket: { updated: "2026-10-05T22:54:32.897Z", unit: "EUR", avg: 741.93, low: 99.99, trend: 566.86, avg1: 160, avg7: 350.7, avg30: 693.17, "avg-holo": null, "trend-holo": 123.63 },
  },
};

function fakeTcgdex(overrides: Record<string, () => Response> = {}, seen: string[] = []): typeof fetch {
  return (async (url: string) => {
    seen.push(String(url));
    for (const [needle, make] of Object.entries(overrides)) if (String(url).includes(needle)) return make();
    const u = String(url);
    if (u.endsWith("/sets")) return new Response(JSON.stringify(SETS));
    if (u.includes("/cards/base1-4")) return new Response(JSON.stringify(FULL));
    if (u.includes("/cards/zzz")) return new Response("{}", { status: 404 });
    if (u.includes("/cards?")) return new Response(JSON.stringify(BRIEFS));
    return new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
}
const noSleep = async () => {};

test("search finds the exact card: number must match, the set size must match, exact names first", async () => {
  const seen: string[] = [];
  const client = createTcgdexClient({ fetchImpl: fakeTcgdex({}, seen), sleep: noSleep });
  const cards = await client.search({ name: "Charizard", number: "004", printedTotal: "102" });
  assert.deepEqual(cards.map((c) => c.id), ["base1-4"], "Base Set 2 (130 cards) and other numbers are filtered out");
  const c = cards[0];
  assert.equal(c.name, "Charizard");
  assert.equal(c.number, "4");
  assert.equal(c.set.name, "Base Set");
  assert.equal(c.set.printedTotal, 102);
  assert.equal(c.image, "https://assets.tcgdex.net/en/base/base1/4/low.webp");
  assert.equal(c.source, "tcgdex");
  assert.ok(seen.some((u) => /name=Charizard/.test(u) && /localId=4/.test(u)));
});

test("without a set size, every printing with that name and number is offered", async () => {
  const cards = await createTcgdexClient({ fetchImpl: fakeTcgdex(), sleep: noSleep }).search({ name: "Charizard", number: "4" });
  const ids = cards.map((c) => c.id);
  assert.deepEqual(ids.slice(0, 2).sort(), ["base1-4", "base4-4"], "exact name matches first");
  assert.equal(ids[2], "base5-4", "a partial match (Dark Charizard) comes after them");
});

test("exact name matches come before partial ones", async () => {
  const cards = await createTcgdexClient({ fetchImpl: fakeTcgdex(), sleep: noSleep }).search({ name: "Charizard" });
  const names = cards.map((c) => c.name);
  assert.ok(names.indexOf("Dark Charizard") > names.lastIndexOf("Charizard"));
});

test("the set list is fetched once and reused", async () => {
  const seen: string[] = [];
  const client = createTcgdexClient({ fetchImpl: fakeTcgdex({}, seen), sleep: noSleep });
  await client.search({ name: "Charizard" });
  await client.search({ name: "Pikachu" });
  assert.equal(seen.filter((u) => u.endsWith("/sets")).length, 1);
});

test("get() maps TCGplayer and Cardmarket prices with their dates and drops empty values", async () => {
  const card = (await createTcgdexClient({ fetchImpl: fakeTcgdex(), sleep: noSleep }).get("base1-4"))!;
  assert.equal(card.tcgplayer?.currency, "USD");
  assert.equal(card.tcgplayer?.updatedAt, "2026-10-05");
  assert.equal(card.tcgplayer?.variants.holofoil.market, 928.32);
  assert.equal(card.tcgplayer?.variants.holofoil.directLow, undefined, "null price is dropped");
  assert.equal(card.cardmarket?.currency, "EUR");
  assert.equal(card.cardmarket?.variants.all.trend, 566.86);
  assert.equal(card.cardmarket?.variants.holo.trend, 123.63);
  assert.equal(card.cardmarket?.variants.holo.average, undefined);
  assert.equal(card.rarity, "Rare");
});

test("a card with no pricing simply has none", async () => {
  const f = fakeTcgdex({ "/cards/base1-4": () => new Response(JSON.stringify({ ...FULL, pricing: undefined })) });
  const card = (await createTcgdexClient({ fetchImpl: f, sleep: noSleep }).get("base1-4"))!;
  assert.equal(card.tcgplayer, undefined);
  assert.equal(card.cardmarket, undefined);
});

test("unknown ids are null, malformed ids are refused", async () => {
  const client = createTcgdexClient({ fetchImpl: fakeTcgdex(), sleep: noSleep });
  assert.equal(await client.get("zzz-9"), null);
  await assert.rejects(() => client.get("bad id; drop"), /id/i);
});

test("a failing service is retried like the other one", async () => {
  let calls = 0;
  const f = (async (url: string) => {
    calls++;
    if (calls < 3) return new Response("{}", { status: 500 });
    return String(url).endsWith("/sets") ? new Response(JSON.stringify(SETS)) : new Response(JSON.stringify(BRIEFS));
  }) as unknown as typeof fetch;
  const cards = await createTcgdexClient({ fetchImpl: f, sleep: noSleep }).search({ name: "Charizard" });
  assert.ok(cards.length > 0);
});

// ---- the two databases backing each other up ----

function fake(name: string, behavior: { search?: () => Promise<PokemonCard[]>; get?: () => Promise<PokemonCard | null> }): CardDatabase & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    search: async () => { calls.push(`${name}.search`); return behavior.search ? behavior.search() : []; },
    get: async () => { calls.push(`${name}.get`); return behavior.get ? behavior.get() : null; },
  };
}
const card = (id: string): PokemonCard => ({ id, name: "Charizard", number: "4", set: { id: "base1", name: "Base Set" } });
const down = async () => { throw new CardApiError(500, "The card database had an error (HTTP 500)."); };

test("results from the first database are used, with ids that remember where they came from", async () => {
  const primary = fake("primary", { search: async () => [card("base1-4")] });
  const backup = fake("backup", { search: async () => [card("base1-4")] });
  const db = createCardDatabase([{ prefix: "tcgdex", db: primary }, { prefix: "ptcg", db: backup }]);
  const out = await db.search({ name: "Charizard" });
  assert.equal(out[0].id, "tcgdex:base1-4");
  assert.deepEqual(backup.calls, [], "the backup is not touched when the first one works");
});

test("when the first database is down, the backup answers", async () => {
  const db = createCardDatabase([
    { prefix: "tcgdex", db: fake("a", { search: down }) },
    { prefix: "ptcg", db: fake("b", { search: async () => [card("base1-4")] }) },
  ]);
  assert.equal((await db.search({ name: "Charizard" }))[0].id, "ptcg:base1-4");
});

test("if both are down, the error says so", async () => {
  const db = createCardDatabase([{ prefix: "a", db: fake("a", { search: down }) }, { prefix: "b", db: fake("b", { search: down }) }]);
  await assert.rejects(() => db.search({ name: "x" }), (e: unknown) => e instanceof CardApiError && /both|all/i.test(e.message));
});

test("an empty answer from a working database is an answer; the backup is not asked", async () => {
  const backup = fake("b", { search: async () => [card("x")] });
  const db = createCardDatabase([{ prefix: "a", db: fake("a", { search: async () => [] }) }, { prefix: "b", db: backup }]);
  assert.deepEqual(await db.search({ name: "Nothing" }), []);
  assert.deepEqual(backup.calls, []);
});

test("bad requests are the caller's fault and never go to the backup", async () => {
  const backup = fake("b", {});
  const db = createCardDatabase([
    { prefix: "a", db: fake("a", { search: async () => { throw new CardApiError(400, "That card number doesn't look right."); } }) },
    { prefix: "b", db: backup },
  ]);
  await assert.rejects(() => db.search({ number: "!!" }), /number/);
  assert.deepEqual(backup.calls, []);
});

test("get() goes to the database named in the id", async () => {
  const a = fake("a", { get: async () => card("base1-4") });
  const b = fake("b", { get: async () => card("base1-4") });
  const db = createCardDatabase([{ prefix: "tcgdex", db: a }, { prefix: "ptcg", db: b }]);
  const got = await db.get("ptcg:base1-4");
  assert.equal(got?.id, "ptcg:base1-4");
  assert.deepEqual(a.calls, []);
  assert.deepEqual(b.calls, ["b.get"]);
  await assert.rejects(() => db.get("nope:base1-4"), /id/i);
  await assert.rejects(() => db.get("base1-4"), /id/i);
});
