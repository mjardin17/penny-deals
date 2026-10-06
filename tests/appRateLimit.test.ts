import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createApp } from "../server/app";

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

test("a flood of spread checks is stopped before it can spend eBay quota", async () => {
  const s = await serve();
  try {
    const statuses: number[] = [];
    // An invalid body is rejected cheaply by the handler (400), so this never touches eBay.
    for (let i = 0; i < 32; i++) statuses.push((await post(`${s.base}/api/arbitrage/spread`, {})).status);
    assert.equal(statuses.filter((x) => x === 400).length, 30, "the first 30 reach the handler and are refused for a bad body");
    assert.deepEqual(statuses.slice(30), [429, 429], "after that the limiter answers before the handler runs");
  } finally {
    await s.close();
  }
});

test("a flood of brain writes is stopped too", async () => {
  const s = await serve();
  try {
    let blocked = 0;
    for (let i = 0; i < 125; i++) if ((await post(`${s.base}/api/brain/price`, {})).status === 429) blocked++;
    assert.equal(blocked, 5, "120 per minute are allowed, the rest are blocked");
  } finally {
    await s.close();
  }
});

test("unknown API routes are a clean JSON 404", async () => {
  const s = await serve();
  try {
    const res = await fetch(`${s.base}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).success, false);
  } finally {
    await s.close();
  }
});

test("health reports what is configured without revealing any value", async () => {
  const s = await serve();
  try {
    const body = await (await fetch(`${s.base}/api/health`)).json();
    assert.equal(body.status, "ok");
    for (const key of ["hasEbayCreds", "hasGeminiKey", "hasAmazonCreds"]) assert.equal(typeof body[key], "boolean", key);
    assert.doesNotMatch(JSON.stringify(body), /AIza|secret/i);
  } finally {
    await s.close();
  }
});
