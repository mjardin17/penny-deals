import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createIntegrationsRouter } from "../server/routes/integrations";

async function serve(checker: Parameters<typeof createIntegrationsRouter>[0]) {
  const app = express();
  app.use("/api", createIntegrationsRouter(checker));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/integrations/status`,
    close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

test("returns the connection report and passes ?fresh=1 through", async () => {
  const seen: Array<boolean | undefined> = [];
  const s = await serve({ get: async (o) => { seen.push(o?.fresh); return [{ id: "x", name: "X", state: "working", detail: "ok", checkedLive: true, checkedAt: "now" }]; } });
  try {
    const plain = await (await fetch(s.url)).json();
    assert.equal(plain.success, true);
    assert.equal(plain.data[0].id, "x");
    await fetch(`${s.url}?fresh=1`);
    assert.deepEqual(seen, [false, true]);
  } finally {
    await s.close();
  }
});

test("a crashing checker answers 500 JSON without leaking the error text", async () => {
  const original = console.error;
  console.error = () => {};
  const s = await serve({ get: async () => { throw new Error("secret path C:\Users\jjard\.env"); } });
  try {
    const res = await fetch(s.url);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.doesNotMatch(JSON.stringify(body), /jjard|\.env/);
  } finally {
    console.error = original;
    await s.close();
  }
});
