import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createBrainRouter } from "../server/routes/brain";
import { Brain, itemKey, MemoryBrainStore } from "../server/brain/brain";
import type { BrainHandle } from "../server/brain/instance";

// Every test gets a fresh brain and server, so tests never depend on each other.
let servers: Server[] = [];
let brain: Brain;
let base = "";

async function serve(handle: () => BrainHandle): Promise<string> {
  const app = express();
  app.use(express.json());
  app.use("/api", createBrainRouter(handle));
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
}

beforeEach(async () => {
  brain = new Brain(new MemoryBrainStore());
  base = await serve(() => ({ brain }));
});

afterEach(async () => {
  await Promise.all(
    servers.map((s) => {
      s.closeAllConnections();
      return new Promise((resolve) => s.close(resolve));
    })
  );
  servers = [];
});

const post = (url: string, route: string, body: unknown) =>
  fetch(`${url}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

test("saves a shelf price and reads it back by UPC", async () => {
  const saved = await post(base, "/brain/price", { title: "Pokemon ETB", upc: "820650853845", price: 49.99, store: "Walmart" });
  assert.equal(saved.status, 200);
  assert.deepEqual((await saved.json()).data, { saved: true });

  const item = await (await fetch(`${base}/brain/item?upc=820650853845&title=Pokemon%20ETB`)).json();
  assert.equal(item.data.yourPrices.count, 1);
  assert.equal(item.data.yourPrices.last.price, 49.99);
  assert.equal(item.data.yourPrices.last.store, "Walmart");
});

test("the same item is found by UPC even when the title differs", async () => {
  await post(base, "/brain/price", { title: "One wording", upc: "820650853845", price: 49.99, store: "Walmart" });
  await post(base, "/brain/price", { title: "Different words entirely", upc: "820650853845", price: 44.99, store: "Target" });
  const item = await (await fetch(`${base}/brain/item?upc=820650853845`)).json();
  assert.equal(item.data.yourPrices.count, 2);
  assert.equal(item.data.yourPrices.lowest.price, 44.99);
});

test("accepts a plain numeric string, rejects everything that only looks like a number", async () => {
  assert.equal((await post(base, "/brain/price", { title: "Item A1", price: "12.50" })).status, 200);
  for (const price of [0, -5, "abc", null, "", true, [5], {}, "1e999", "Infinity", 1e12]) {
    const res = await post(base, "/brain/price", { title: "Item B2", price });
    assert.equal(res.status, 400, `price ${JSON.stringify(price)} must be rejected`);
  }
  assert.equal(brain.summary().pricesYouEntered, 1);
});

test("rejects a request with no title and no UPC", async () => {
  assert.equal((await post(base, "/brain/price", { price: 5 })).status, 400);
  assert.equal((await fetch(`${base}/brain/item`)).status, 400);
  assert.equal((await post(base, "/brain/outcome", { kind: "not_in_store", store: "Target" })).status, 400);
});

test("a wrong-match report blocks the listing; a bad address is refused", async () => {
  const ok = await post(base, "/brain/outcome", { kind: "wrong_match", title: "Pokemon ETB", matchUrl: "https://www.ebay.com/itm/1" });
  assert.equal(ok.status, 200);
  assert.equal(brain.isBlocked("https://www.ebay.com/itm/1"), true);

  for (const matchUrl of ["javascript:alert(1)", "nonsense", undefined]) {
    assert.equal((await post(base, "/brain/outcome", { kind: "wrong_match", title: "X item", matchUrl })).status, 400);
  }
});

test("a sale is compared with the price the app recorded, not a number the caller supplies", async () => {
  const key = itemKey("Pokemon ETB");
  const noLookup = await post(base, "/brain/outcome", { kind: "sold", title: "Pokemon ETB", actualResale: 90 });
  assert.equal(noLookup.status, 400, "a sale for an item the app never priced has nothing to compare to");

  brain.recordObservation({ key, channel: "ebay", resalePrice: 112.5, sampleSize: 30, basis: "active_ask" });
  for (let i = 0; i < 3; i++) {
    const res = await post(base, "/brain/outcome", { kind: "sold", title: "Pokemon ETB", actualResale: 90, predictedResale: 1 });
    assert.equal(res.status, 200);
  }
  assert.deepEqual(brain.calibration(key), { ratio: 0.8, samples: 3 }, "the caller's predictedResale of 1 was ignored");
});

test("bad sale amounts and unknown kinds are refused", async () => {
  brain.recordObservation({ key: itemKey("Pokemon ETB"), channel: "ebay", resalePrice: 100, sampleSize: 30, basis: "active_ask" });
  for (const actualResale of [null, "", true, 0, -1, "abc", 5000]) {
    const res = await post(base, "/brain/outcome", { kind: "sold", title: "Pokemon ETB", actualResale });
    assert.equal(res.status, 400, `actualResale ${JSON.stringify(actualResale)} must be rejected`);
  }
  assert.equal((await post(base, "/brain/outcome", { kind: "nonsense", title: "X item" })).status, 400);
  assert.equal((await post(base, "/brain/outcome", { kind: { x: 1 }, title: "X item" })).status, 400);
  assert.equal((await post(base, "/brain/outcome", { kind: "not_in_store", title: "X item" })).status, 400);
  assert.equal(brain.summary().sales, 0);
});

test("status reports what the brain has learned", async () => {
  await post(base, "/brain/price", { title: "A item", price: 5 });
  await post(base, "/brain/outcome", { kind: "wrong_match", title: "A item", matchUrl: "https://www.ebay.com/itm/9" });
  const status = await (await fetch(`${base}/brain/status`)).json();
  assert.equal(status.data.available, true);
  assert.equal(status.data.pricesYouEntered, 1);
  assert.equal(status.data.wrongMatchesBlocked, 1);
});

test("when the brain is off, every route says so without leaking file paths", async () => {
  const url = await serve(() => ({ brain: null, error: "Brain memory file is corrupt: C:\\Users\\secret\\brain.json" }));
  const status = await (await fetch(`${url}/brain/status`)).json();
  assert.equal(status.data.available, false);
  assert.doesNotMatch(JSON.stringify(status), /secret|brain\.json/);
  const res = await post(url, "/brain/price", { title: "X item", price: 5 });
  assert.equal(res.status, 503);
  assert.doesNotMatch(JSON.stringify(await res.json()), /secret/);
  assert.equal((await fetch(`${url}/brain/item?title=x`)).status, 503);
});

test("a disk failure is our error (500), logged, and never leaks the file path", async () => {
  const failing = new Brain(
    {
      load: () => ({ observations: [], outcomes: [], sightings: [] }),
      save: () => {
        throw new Error("EBUSY: resource busy or locked, rename 'C:\\Users\\secret\\brain.json.1.tmp'");
      },
    },
    () => 0
  );
  const url = await serve(() => ({ brain: failing }));
  await quietly(async () => {
    for (const [route, body] of [
      ["/brain/price", { title: "X item", price: 5 }],
      ["/brain/outcome", { kind: "not_in_store", title: "X item", store: "Target" }],
    ] as const) {
      const res = await post(url, route, body);
      assert.equal(res.status, 500, `${route} should be a server error`);
      const payload = await res.json();
      assert.equal(payload.success, false);
      assert.doesNotMatch(JSON.stringify(payload), /secret|EBUSY/);
    }
  });
});

test("a brain that throws while reading answers with JSON, not an HTML error page", async () => {
  class BrokenBrain extends Brain {
    history(): never {
      throw new TypeError("Cannot read properties of null");
    }
  }
  const url = await serve(() => ({ brain: new BrokenBrain(new MemoryBrainStore()) }));
  await quietly(async () => {
    const res = await fetch(`${url}/brain/item?title=anything`);
    assert.equal(res.status, 500);
    assert.equal((await res.json()).success, false);
  });
});
