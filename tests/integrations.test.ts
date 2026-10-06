import { test } from "node:test";
import assert from "node:assert/strict";
import { createIntegrationChecker, IntegrationDeps } from "../server/integrations/liveChecks";

const SECRET = "AIza-super-secret-key-value-123";

function deps(overrides: Partial<IntegrationDeps> = {}): IntegrationDeps {
  return {
    env: { GEMINI_API_KEY: SECRET, EBAY_CLIENT_ID: "id", EBAY_CLIENT_SECRET: "secret" },
    fetchImpl: (async () => new Response(JSON.stringify({ models: [{ name: "models/gemini-x" }] }), { status: 200 })) as typeof fetch,
    ebay: { hasCredentials: () => true, probe: async () => 5 },
    amazon: { status: async () => ({ state: "not_configured", message: "no credentials" }) },
    brain: { available: true },
    now: () => 1_000_000,
    timeoutMs: 200,
    ...overrides,
  };
}

const byId = (list: Array<{ id: string }>, id: string) => list.find((x) => x.id === id) as any;

test("every service gets an honest state, and nothing the app can't do is claimed as working", async () => {
  const report = await createIntegrationChecker(deps()).run();
  assert.equal(byId(report, "ebay_browse").state, "working");
  assert.equal(byId(report, "gemini").state, "working");
  assert.equal(byId(report, "amazon_creators").state, "not_configured");
  assert.equal(byId(report, "tiktok_shop").state, "not_built");
  assert.equal(byId(report, "affiliate_coupon_feeds").state, "not_built");
  assert.equal(byId(report, "price_brain").state, "working");
  // Anything that talks to the internet is only "working" after a real call was made.
  for (const id of ["ebay_browse", "gemini"]) assert.equal(byId(report, id).checkedLive, true, `${id} must be proven by a live call`);
  for (const id of ["tiktok_shop", "affiliate_coupon_feeds", "ebay_sold_prices"]) assert.notEqual(byId(report, id).state, "working");
});

test("a missing key is 'not_configured', and no network call is made for it", async () => {
  let calls = 0;
  const report = await createIntegrationChecker(
    deps({ env: {}, fetchImpl: (async () => { calls++; return new Response("{}"); }) as typeof fetch, ebay: { hasCredentials: () => false, probe: async () => { calls++; return 0; } } })
  ).run();
  assert.equal(byId(report, "gemini").state, "not_configured");
  assert.equal(byId(report, "ebay_browse").state, "not_configured");
  assert.equal(calls, 0);
});

test("a rejected key is 'failing' with a plain reason, and the key never appears in the output", async () => {
  const report = await createIntegrationChecker(
    deps({ fetchImpl: (async () => new Response(`{"error":{"message":"API key not valid: ${SECRET}"}}`, { status: 400 })) as typeof fetch })
  ).run();
  const g = byId(report, "gemini");
  assert.equal(g.state, "failing");
  assert.match(g.detail, /rejected|not valid|HTTP 400/i);
  assert.doesNotMatch(JSON.stringify(report), new RegExp(SECRET));
});

test("a network error or timeout is 'failing', never 'working'", async () => {
  const boom = await createIntegrationChecker(deps({ fetchImpl: (async () => { throw new Error(`connect failed for ${SECRET}`); }) as typeof fetch })).run();
  assert.equal(byId(boom, "gemini").state, "failing");
  assert.doesNotMatch(JSON.stringify(boom), new RegExp(SECRET));

  const slow = await createIntegrationChecker(
    deps({ timeoutMs: 30, fetchImpl: (async (_u: unknown, init?: RequestInit) => new Promise((_res, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))))) as typeof fetch })
  ).run();
  assert.equal(byId(slow, "gemini").state, "failing");
  assert.match(byId(slow, "gemini").detail, /time/i);
});

test("a Gemini answer with zero models is not 'working'", async () => {
  const report = await createIntegrationChecker(deps({ fetchImpl: (async () => new Response('{"models":[]}', { status: 200 })) as typeof fetch })).run();
  assert.equal(byId(report, "gemini").state, "failing");
});

test("eBay: credentials that can't fetch results are failing; zero results is failing too", async () => {
  const bad = await createIntegrationChecker(deps({ ebay: { hasCredentials: () => true, probe: async () => { throw new Error("eBay OAuth Failed HTTP 400: invalid_scope"); } } })).run();
  assert.equal(byId(bad, "ebay_browse").state, "failing");
  assert.match(byId(bad, "ebay_browse").detail, /invalid_scope/);
  const empty = await createIntegrationChecker(deps({ ebay: { hasCredentials: () => true, probe: async () => 0 } })).run();
  assert.equal(byId(empty, "ebay_browse").state, "failing");
});

test("sold-price data is only reported available when eBay approved it", async () => {
  const off = await createIntegrationChecker(deps()).run();
  assert.equal(byId(off, "ebay_sold_prices").state, "not_configured");
  assert.match(byId(off, "ebay_sold_prices").detail, /Marketplace Insights/);
  const on = await createIntegrationChecker(deps({ env: { EBAY_MARKETPLACE_INSIGHTS_APPROVED: "true", EBAY_CLIENT_ID: "i", EBAY_CLIENT_SECRET: "s" } })).run();
  assert.notEqual(byId(on, "ebay_sold_prices").state, "not_configured");
});

test("one broken check never hides the others", async () => {
  const report = await createIntegrationChecker(deps({ amazon: { status: async () => { throw new Error("kaboom"); } } })).run();
  assert.equal(byId(report, "amazon_creators").state, "failing");
  assert.equal(byId(report, "ebay_browse").state, "working");
});

test("results are cached for a minute, and a fresh run can be forced", async () => {
  let t = 1_000_000;
  let calls = 0;
  const checker = createIntegrationChecker(deps({ now: () => t, ebay: { hasCredentials: () => true, probe: async () => { calls++; return 3; } } }));
  await checker.get();
  await checker.get();
  assert.equal(calls, 1, "second call within a minute used the cache");
  t += 61_000;
  await checker.get();
  assert.equal(calls, 2, "after a minute it checks again");
  await checker.get({ fresh: true });
  assert.equal(calls, 3);
});

test("the brain being off is reported", async () => {
  const report = await createIntegrationChecker(deps({ brain: { available: false, error: "memory file is corrupt" } })).run();
  assert.equal(byId(report, "price_brain").state, "failing");
});
