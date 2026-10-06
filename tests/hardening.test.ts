import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createApp } from "../server/app";
import { parseCandidate } from "../server/routes/arbitrage";
import { GradeLog, MemoryGradeStore } from "../server/cards/gradeLog";
import { createLiveDeals } from "../server/deals/liveDeals";
import { dailyCap } from "../server/middleware/dailyCap";
import { DigestConfig } from "../digest/config";
import { Gathered } from "../digest/gather";

async function serve() {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}
const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// 2. identify limits
test("card photo reads are limited to 5 a minute", async () => {
  const s = await serve();
  try {
    const statuses: number[] = [];
    // No image = cheap 400 from the handler, never a Gemini call.
    for (let i = 0; i < 7; i++) statuses.push((await post(`${s.base}/api/cards/identify`, {})).status);
    assert.deepEqual(statuses, [400, 400, 400, 400, 400, 429, 429]);
  } finally {
    await s.close();
  }
});

test("the daily cap blocks after N calls and resets the next day", () => {
  let t = Date.UTC(2026, 9, 6, 12);
  const mw = dailyCap({ max: 2, now: () => t });
  const run = () => {
    let status = 200;
    let nexted = false;
    const res: any = { status(c: number) { status = c; return res; }, json() { return res; }, setHeader() {} };
    mw({} as any, res, () => { nexted = true; });
    return { status, nexted };
  };
  assert.equal(run().nexted, true);
  assert.equal(run().nexted, true);
  assert.deepEqual(run(), { status: 429, nexted: false });
  t += 24 * 3600_000;
  assert.equal(run().nexted, true);
});

// 3. zero price
test("a $0, empty or missing shelf price is refused", () => {
  for (const buyPrice of [0, "0", "", null, undefined, -1, "abc"]) {
    assert.equal(typeof parseCandidate({ title: "Thing", buyPrice }), "string", `buyPrice ${JSON.stringify(buyPrice)}`);
  }
  assert.equal(typeof parseCandidate({ title: "Thing", buyPrice: 4.99 }), "object");
});

// 7. tcgdex ids
test("grades can be saved for a tcgdex: card id", () => {
  const log = new GradeLog(new MemoryGradeStore());
  log.record({ cardId: "tcgdex:base1-4", company: "PSA", grade: 9 });
  assert.equal(log.summary().count, 1);
  assert.throws(() => log.record({ cardId: "bad id!", company: "PSA", grade: 9 }), /cardId/);
});

// 5. every source failing
const CONFIG = { zip: "02745" } as DigestConfig;
function gathered(states: Array<"ok" | "failed" | "skipped">): Gathered {
  return {
    origin: { lat: 0, lon: 0, place: "X" },
    place: "X",
    stores: [],
    hits: [],
    sources: [
      { name: "OpenStreetMap store locations", state: "ok", detail: "" },
      ...states.map((state, i) => ({ name: `src${i}`, state, detail: "" })),
    ],
  };
}

test("when every deal source fails it throws and caches nothing", async () => {
  let calls = 0;
  const feed = createLiveDeals({ gather: async () => { calls++; return gathered(["failed", "skipped"]); }, now: () => 1, defaults: CONFIG });
  await assert.rejects(() => feed.get("02745"), /every deal source/i);
  await assert.rejects(() => feed.get("02745"));
  assert.equal(calls, 2, "the failure was not cached");
});

test("one working source is a normal answer", async () => {
  const feed = createLiveDeals({ gather: async () => gathered(["ok", "failed"]), now: () => 1, defaults: CONFIG });
  assert.equal((await feed.get("02745")).hits.length, 0);
});

// 9. sold price
test("reporting a sale with a null, empty or zero price is refused", async () => {
  const s = await serve();
  try {
    for (const actualPrice of [null, "", 0, "0", -5, "abc", true, [5]]) {
      const res = await post(`${s.base}/api/learning/outcome`, { id: "nope", stage: "sold", actualPrice });
      assert.equal(res.status, 400, `actualPrice ${JSON.stringify(actualPrice)}`);
    }
  } finally {
    await s.close();
  }
});

// 10. coupon links
import { validateNewCoupon } from "../server/coupons/internal";
test("a coupon link must be https", () => {
  const base = { code: "X", merchant: "Amazon", title: "T", discountText: "10%", expiresAt: "2099-01-01" };
  for (const affiliateUrl of ["http://example.com/x", "javascript:alert(1)", "data:text/html,x", "ftp://example.com/x"]) {
    assert.equal(validateNewCoupon({ ...base, affiliateUrl }), "affiliateUrl must be an https link", affiliateUrl);
  }
  assert.equal(typeof validateNewCoupon({ ...base, affiliateUrl: "https://example.com/x" }), "object");
});

test("two simultaneous requests for one ZIP share a single lookup", async () => {
  let calls = 0;
  const feed = createLiveDeals({
    gather: async () => { calls++; await new Promise((r) => setTimeout(r, 20)); return gathered(["ok"]); },
    now: () => 1,
    defaults: CONFIG,
  });
  await Promise.all([feed.get("02745"), feed.get("02745")]);
  assert.equal(calls, 1);
  await feed.get("02745");
  assert.equal(calls, 1, "and the answer is cached afterwards");
});

import { isExposed, resolveHost } from "../server/bindHost";
test("the server listens on this computer only unless HOST is set", () => {
  assert.equal(resolveHost({}), "127.0.0.1");
  assert.equal(resolveHost({ HOST: "  " }), "127.0.0.1");
  assert.equal(resolveHost({ HOST: "0.0.0.0" }), "0.0.0.0");
  assert.equal(isExposed("127.0.0.1"), false);
  assert.equal(isExposed("0.0.0.0"), true);
});
