import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupUpcTitle } from "../src/app/lookupUpc";

function respond(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
}

test("returns brand and product name when the open database knows the barcode", async () => {
  const title = await lookupUpcTitle("0123456789012", { fetchImpl: respond({ status: 1, product: { brands: "Tide", product_name: "Pods Spring Meadow" } }) });
  assert.equal(title, "Tide Pods Spring Meadow");
});

test("does not repeat the brand when the product name already starts with it", async () => {
  const title = await lookupUpcTitle("0123456789012", { fetchImpl: respond({ status: 1, product: { brands: "Tide", product_name: "Tide Pods" } }) });
  assert.equal(title, "Tide Pods");
});

test("an unknown barcode gives nothing, never a made-up title", async () => {
  assert.equal(await lookupUpcTitle("0123456789012", { fetchImpl: respond({ status: 0 }) }), null);
  assert.equal(await lookupUpcTitle("0123456789012", { fetchImpl: respond({ status: 1, product: {} }) }), null);
  assert.equal(await lookupUpcTitle("0123456789012", { fetchImpl: respond({}, 404) }), null);
});

test("network trouble and timeouts give nothing instead of failing the scan", async () => {
  assert.equal(await lookupUpcTitle("0123456789012", { fetchImpl: (async () => { throw new Error("offline"); }) as typeof fetch }), null);
  const hang = (async (_u: string, init?: RequestInit) => new Promise((_r, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))))) as unknown as typeof fetch;
  assert.equal(await lookupUpcTitle("0123456789012", { fetchImpl: hang, timeoutMs: 30 }), null);
});

test("only plausible barcodes are looked up, and none of it reaches the URL unescaped", async () => {
  let calls = 0;
  const f = (async (u: string) => { calls++; assert.doesNotMatch(String(u), /[;<> ]/); return new Response("{}"); }) as typeof fetch;
  assert.equal(await lookupUpcTitle("abc", { fetchImpl: f }), null);
  assert.equal(await lookupUpcTitle("1234", { fetchImpl: f }), null);
  assert.equal(await lookupUpcTitle("123456789012; drop", { fetchImpl: f }), null);
  assert.equal(calls, 0);
});

test("long or odd text from the database is cleaned and capped", async () => {
  const title = await lookupUpcTitle("0123456789012", { fetchImpl: respond({ status: 1, product: { brands: "A".repeat(200), product_name: "x\u0000y\n\nz" } }) });
  assert.ok(title && title.length <= 120);
  assert.doesNotMatch(title!, /[\u0000\n]/);
});
