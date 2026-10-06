import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { rateLimit } from "../server/middleware/rateLimit";

async function serve(max: number, now: () => number) {
  const app = express();
  app.use(rateLimit({ windowMs: 60_000, max, now }));
  app.get("/ping", (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/ping`;
  return { url, close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

test("allows up to the limit, then answers 429 with a Retry-After", async () => {
  let t = 1_000_000;
  const { url, close } = await serve(3, () => t);
  try {
    for (let i = 0; i < 3; i++) assert.equal((await fetch(url)).status, 200);
    const blocked = await fetch(url);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) >= 1);
    assert.equal((await blocked.json()).success, false);
  } finally {
    await close();
  }
});

test("the count starts over when the window passes", async () => {
  let t = 1_000_000;
  const { url, close } = await serve(2, () => t);
  try {
    await fetch(url);
    await fetch(url);
    assert.equal((await fetch(url)).status, 429);
    t += 60_001;
    assert.equal((await fetch(url)).status, 200);
  } finally {
    await close();
  }
});
