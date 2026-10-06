import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CardApiError, createPokemonTcgClient, parseCardNumber } from "../server/cards/pokemonTcg";
import { readCardPhoto, VisionNotConfigured } from "../server/cards/vision";
import { valueCard } from "../server/cards/value";
import { FileGradeLog, GradeLog, MemoryGradeStore } from "../server/cards/gradeLog";
import { NormalizedEbayListing } from "../server/marketplace/types";

const SECRET = "AIza-card-secret-key-0001";

// Shaped like api.pokemontcg.io/v2 responses.
const CHARIZARD = {
  id: "base1-4",
  name: "Charizard",
  number: "4",
  rarity: "Rare Holo",
  set: { id: "base1", name: "Base", series: "Base", printedTotal: 102, releaseDate: "1999/01/09" },
  images: { small: "https://images.pokemontcg.io/base1/4.png", large: "https://images.pokemontcg.io/base1/4_hires.png" },
  tcgplayer: {
    url: "https://prices.pokemontcg.io/tcgplayer/base1-4",
    updatedAt: "2026/10/05",
    prices: { holofoil: { low: 250, mid: 400, high: 900, market: 380.5, directLow: null }, unlimitedHolofoil: { market: "bad" } },
  },
  cardmarket: { url: "https://prices.pokemontcg.io/cardmarket/base1-4", updatedAt: "2026/10/04", prices: { averageSellPrice: 300.1, lowPrice: 210, trendPrice: 320 } },
};

function api(body: unknown, status = 200, seen: string[] = []): typeof fetch {
  return (async (url: string | URL | Request) => {
    seen.push(String(url));
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

// ---- card number parsing ----

test("reads '4/102', '004/102', 'SV049/SV122' and plain numbers", () => {
  assert.deepEqual(parseCardNumber("4/102"), { number: "4", printedTotal: "102" });
  assert.deepEqual(parseCardNumber("004/102"), { number: "4", printedTotal: "102" });
  assert.deepEqual(parseCardNumber("SV049/SV122"), { number: "SV049", printedTotal: "122" });
  assert.deepEqual(parseCardNumber(" 25 "), { number: "25", printedTotal: undefined });
  assert.equal(parseCardNumber("hello world"), null);
  assert.equal(parseCardNumber(""), null);
});

// ---- Pokémon TCG database client ----

test("searches by name, number and printed total, and normalizes real prices", async () => {
  const seen: string[] = [];
  const client = createPokemonTcgClient({ fetchImpl: api({ data: [CHARIZARD] }, 200, seen), timeoutMs: 500 });
  const cards = await client.search({ name: "Charizard", number: "4", printedTotal: "102" });
  assert.equal(cards.length, 1);
  const q = decodeURIComponent(seen[0]);
  assert.match(q, /name:"Charizard"/);
  assert.match(q, /number:"4"/);
  assert.match(q, /set\.printedTotal:102/);
  const c = cards[0];
  assert.equal(c.id, "base1-4");
  assert.equal(c.set.name, "Base");
  assert.equal(c.tcgplayer?.variants.holofoil.market, 380.5);
  assert.equal(c.tcgplayer?.updatedAt, "2026/10/05");
  assert.equal(c.tcgplayer?.currency, "USD");
  assert.equal(c.cardmarket?.currency, "EUR");
  assert.equal(c.cardmarket?.variants.all.trend, 320);
});

test("bad or missing prices are dropped, never turned into numbers", async () => {
  const client = createPokemonTcgClient({ fetchImpl: api({ data: [CHARIZARD] }) });
  const c = (await client.search({ name: "Charizard" }))[0];
  assert.equal(c.tcgplayer?.variants.holofoil.directLow, undefined);
  assert.equal(c.tcgplayer?.variants.unlimitedHolofoil, undefined, "a variant with no valid number is left out");
  const bare = createPokemonTcgClient({ fetchImpl: api({ data: [{ ...CHARIZARD, tcgplayer: undefined, cardmarket: undefined }] }) });
  const b = (await bare.search({ name: "Charizard" }))[0];
  assert.equal(b.tcgplayer, undefined);
  assert.equal(b.cardmarket, undefined);
});

test("quotes and query operators in a name cannot break out of the search", async () => {
  const seen: string[] = [];
  const client = createPokemonTcgClient({ fetchImpl: api({ data: [] }, 200, seen) });
  await client.search({ name: 'Pika" OR name:"Mew' });
  const q = decodeURIComponent(seen[0]);
  assert.doesNotMatch(q, /OR name/);
  assert.equal((q.match(/"/g) ?? []).length, 2, "exactly one quoted name");
});

test("needs at least a name or a number", async () => {
  const client = createPokemonTcgClient({ fetchImpl: api({ data: [] }) });
  await assert.rejects(() => client.search({}), /name or a card number/i);
});

test("sends the API key only when one is configured, as a header and never in the URL", async () => {
  let headers: Record<string, string> = {};
  let url = "";
  const f = (async (u: string, init?: RequestInit) => {
    url = u;
    headers = (init?.headers ?? {}) as Record<string, string>;
    return new Response(JSON.stringify({ data: [] }));
  }) as unknown as typeof fetch;
  await createPokemonTcgClient({ fetchImpl: f, apiKey: SECRET }).search({ name: "Mew" });
  assert.equal(headers["X-Api-Key"], SECRET);
  assert.doesNotMatch(url, new RegExp(SECRET));
  await createPokemonTcgClient({ fetchImpl: f }).search({ name: "Mew" });
  assert.equal(headers["X-Api-Key"], undefined);
});

test("rate limits, outages and timeouts become clear errors", async () => {
  await assert.rejects(() => createPokemonTcgClient({ fetchImpl: api({}, 429) }).search({ name: "Mew" }), (e: unknown) => e instanceof CardApiError && /rate/i.test(e.message));
  await assert.rejects(() => createPokemonTcgClient({ fetchImpl: api({}, 503) }).search({ name: "Mew" }), (e: unknown) => e instanceof CardApiError && e.status === 503);
  const hang = (async (_u: string, init?: RequestInit) => new Promise((_r, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))))) as unknown as typeof fetch;
  await assert.rejects(() => createPokemonTcgClient({ fetchImpl: hang, timeoutMs: 30 }).search({ name: "Mew" }), /time/i);
});

test("an unexpected response shape is an error, not an empty answer", async () => {
  await assert.rejects(() => createPokemonTcgClient({ fetchImpl: api({ oops: true }) }).search({ name: "Mew" }), CardApiError);
});

test("get() returns one card by id, or null when the database has none", async () => {
  const one = createPokemonTcgClient({ fetchImpl: api({ data: CHARIZARD }) });
  assert.equal((await one.get("base1-4"))?.name, "Charizard");
  const none = createPokemonTcgClient({ fetchImpl: api({ error: { message: "not found" } }, 404) });
  assert.equal(await none.get("zzz-0"), null);
  await assert.rejects(() => one.get("bad id; drop"), /id/i);
});

// ---- reading a photo with Gemini ----

function gemini(json: unknown, status = 200, seen: { url?: string; headers?: Record<string, string>; body?: any } = {}): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    seen.url = url;
    seen.headers = init?.headers as Record<string, string>;
    seen.body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof json === "string" ? json : JSON.stringify(json) }] } }] }), { status });
  }) as unknown as typeof fetch;
}

const IMG = { base64: "QUJD", mimeType: "image/jpeg" as const };

test("without a Gemini key the photo reader says so and makes no call", async () => {
  let calls = 0;
  await assert.rejects(
    () => readCardPhoto(IMG, { env: {}, fetchImpl: (async () => { calls++; return new Response("{}"); }) as typeof fetch, timeoutMs: 100 }),
    VisionNotConfigured
  );
  assert.equal(calls, 0);
});

test("reads name, number and set from the photo, sending the key as a header and the image as data", async () => {
  const seen: any = {};
  const out = await readCardPhoto(IMG, {
    env: { GEMINI_API_KEY: SECRET },
    fetchImpl: gemini({ name: "Charizard", number: "4/102", setName: "Base Set", confidence: "high" }, 200, seen),
    timeoutMs: 500,
  });
  assert.deepEqual(out, { name: "Charizard", number: "4", printedTotal: "102", setName: "Base Set", confidence: "high" });
  assert.equal(seen.headers["x-goog-api-key"], SECRET);
  assert.doesNotMatch(seen.url, new RegExp(SECRET));
  assert.equal(seen.body.contents[0].parts[1].inline_data.data, "QUJD");
  assert.equal(seen.body.generationConfig.temperature, 0);
});

test("anything the model returns is checked: junk fields are dropped, long text is cut", async () => {
  const out = await readCardPhoto(IMG, {
    env: { GEMINI_API_KEY: SECRET },
    fetchImpl: gemini({ name: "X".repeat(300), number: "<script>", setName: 42, confidence: "super sure" }),
    timeoutMs: 500,
  });
  assert.equal(out.name?.length, 80);
  assert.equal(out.number, undefined);
  assert.equal(out.setName, undefined);
  assert.equal(out.confidence, "low", "an unknown confidence word means low");
});

test("a model answer that isn't JSON, or has nothing readable, is an error", async () => {
  await assert.rejects(() => readCardPhoto(IMG, { env: { GEMINI_API_KEY: SECRET }, fetchImpl: gemini("sorry, I can't"), timeoutMs: 500 }), /read|JSON/i);
  await assert.rejects(() => readCardPhoto(IMG, { env: { GEMINI_API_KEY: SECRET }, fetchImpl: gemini({ confidence: "low" }), timeoutMs: 500 }), /couldn't read/i);
});

test("a rejected key or an outage is reported without the key in the message", async () => {
  const f = (async () => new Response(`{"error":{"message":"API key not valid: ${SECRET}"}}`, { status: 400 })) as unknown as typeof fetch;
  await assert.rejects(
    () => readCardPhoto(IMG, { env: { GEMINI_API_KEY: SECRET }, fetchImpl: f, timeoutMs: 500 }),
    (e: unknown) => e instanceof Error && !e.message.includes(SECRET) && /rejected|HTTP 400/i.test(e.message)
  );
});

test("only real image types and sizes are accepted", async () => {
  const deps = { env: { GEMINI_API_KEY: SECRET }, fetchImpl: gemini({}), timeoutMs: 100 };
  await assert.rejects(() => readCardPhoto({ base64: "QUJD", mimeType: "application/pdf" as any }, deps), /image/i);
  await assert.rejects(() => readCardPhoto({ base64: "not base64!!", mimeType: "image/jpeg" }, deps), /image/i);
  await assert.rejects(() => readCardPhoto({ base64: "A".repeat(1_500_000), mimeType: "image/jpeg" }, deps), /large|size/i);
});

// ---- valuing a card with real prices only ----

function listing(title: string, price: number, ship = 0): NormalizedEbayListing {
  return { itemId: title + price, title, price, currency: "USD", condition: "New", itemWebUrl: `https://www.ebay.com/itm/${price}`, shippingCost: ship, buyingOptions: ["FIXED_PRICE"], retrievalTimestamp: 0, provenance: "confirmed_marketplace_api" };
}

const card = {
  id: "base1-4",
  name: "Charizard",
  number: "4",
  rarity: "Rare Holo",
  set: { id: "base1", name: "Base", series: "Base", printedTotal: 102, releaseDate: "1999/01/09" },
  image: "https://images.pokemontcg.io/base1/4.png",
  tcgplayer: { source: "tcgplayer" as const, currency: "USD" as const, updatedAt: "2026/10/05", url: "u", variants: { holofoil: { market: 380.5 } } },
};

test("valuation reports the database price with its date, plus live asking prices, and labels every basis", async () => {
  const out = await valueCard(card, {
    ebaySearch: async (q) =>
      q.includes("PSA 10")
        ? [listing("Pokemon Charizard 4/102 Base Set PSA 10 GEM MINT", 4000), listing("Charizard 4/102 Base PSA 10", 5200), listing("Charizard 4/102 PSA 9", 900)]
        : [listing("Charizard 4/102 Base Set Holo Played", 300), listing("Charizard 4/102 Base Set Holo", 350), listing("Charizard 4/102 base holo LP", 420), listing("Charizard Base Set 4/102 NM", 500), listing("Charizard 4/102 Base", 650)],
  });
  assert.equal(out.database?.tcgplayer?.variants.holofoil.market, 380.5);
  assert.equal(out.database?.tcgplayer?.updatedAt, "2026/10/05");
  assert.equal(out.ebayRaw?.count, 5);
  assert.equal(out.ebayRaw?.lowest, 300);
  assert.equal(out.ebayRaw?.median, 420);
  assert.match(out.ebayRaw?.basis ?? "", /asking/i);
  assert.equal(out.ebayPsa10?.count, 2, "the PSA 9 listing is not counted as PSA 10");
  assert.equal(out.ebayPsa10?.lowest, 4000);
  assert.ok(out.notes.some((n) => /sold/i.test(n)), "says sold prices are not available");
});

test("listings that are not this card are ignored", async () => {
  const out = await valueCard(card, { ebaySearch: async () => [listing("Charizard EX 12/108 Evolutions", 50), listing("Pikachu 4/102", 20), listing("Charizard 4/102 Base", 300)] });
  assert.equal(out.ebayRaw?.count, 1);
});

test("with no eBay results nothing is invented", async () => {
  const out = await valueCard(card, { ebaySearch: async () => [] });
  assert.equal(out.ebayRaw, null);
  assert.equal(out.ebayPsa10, null);
  assert.equal(out.database?.tcgplayer?.variants.holofoil.market, 380.5);
});

test("if eBay fails the database price still comes back, and the failure is stated", async () => {
  const out = await valueCard(card, { ebaySearch: async () => { throw new Error("eBay OAuth failed"); } });
  assert.equal(out.ebayRaw, null);
  assert.ok(out.notes.some((n) => /eBay.*(unavailable|failed)/i.test(n)));
  assert.equal(out.database?.tcgplayer?.variants.holofoil.market, 380.5);
});

// ---- real graded results ----

test("records real graded results and checks them against the centering ceiling", () => {
  const log = new GradeLog(new MemoryGradeStore(), () => 1_000);
  log.record({ cardId: "base1-4", company: "PSA", grade: 9, centering: { horizontal: 52, vertical: 54 } }); // ceiling 10, got 9: fine
  log.record({ cardId: "base1-4", company: "PSA", grade: 9, centering: { horizontal: 62, vertical: 50 } }); // ceiling 8, got 9: measurement was wrong
  log.record({ cardId: "base1-5", company: "BGS", grade: 9.5 });
  const s = log.summary();
  assert.equal(s.count, 3);
  assert.equal(s.psaWithCentering, 2);
  assert.equal(s.ceilingBroken, 1);
  assert.match(s.verdict, /not enough/i, "fewer than 5 results is not enough to say anything");
});

test("with enough results it reports how often the ceiling held", () => {
  const log = new GradeLog(new MemoryGradeStore(), () => 1);
  for (let i = 0; i < 6; i++) log.record({ cardId: `c${i}`, company: "PSA", grade: 8, centering: { horizontal: 52, vertical: 52 } });
  const s = log.summary();
  assert.equal(s.ceilingBroken, 0);
  assert.match(s.verdict, /held in 6 of 6/i);
});

test("grade results are validated", () => {
  const log = new GradeLog(new MemoryGradeStore());
  const bad: unknown[] = [
    { cardId: "", company: "PSA", grade: 9 },
    { cardId: "x", company: "ACME", grade: 9 },
    { cardId: "x", company: "PSA", grade: 11 },
    { cardId: "x", company: "PSA", grade: 0 },
    { cardId: "x", company: "PSA", grade: 9.3 },
    { cardId: "x", company: "PSA", grade: "9" },
    { cardId: "x", company: "PSA", grade: 9, centering: { horizontal: 30, vertical: 50 } },
  ];
  for (const b of bad) assert.throws(() => log.record(b as any), undefined, JSON.stringify(b));
  assert.equal(log.summary().count, 0);
});

test("the grade log survives a restart and refuses a corrupt file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grades-"));
  const file = path.join(dir, "card-grades.json");
  try {
    new GradeLog(new FileGradeLog(file)).record({ cardId: "base1-4", company: "PSA", grade: 9 });
    assert.equal(new GradeLog(new FileGradeLog(file)).summary().count, 1);
    fs.writeFileSync(file, "{ nope");
    assert.throws(() => new GradeLog(new FileGradeLog(file)), /corrupt/i);
    assert.equal(fs.readFileSync(file, "utf8"), "{ nope", "the damaged file is left alone");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
