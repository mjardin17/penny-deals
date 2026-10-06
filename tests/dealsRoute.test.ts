import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createDealsRouter } from "../server/routes/deals";

async function serve(feed: Parameters<typeof createDealsRouter>[0]) {
  const app = express();
  app.use("/api", createDealsRouter(feed, () => "02745"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/deals/today`,
    close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

const sample = { zip: "02745", place: "X", hits: [], sources: [], fetchedAt: "2026-10-06T12:00:00.000Z" };

test("uses the default ZIP when none is given and passes a valid ZIP through", async () => {
  const asked: string[] = [];
  const s = await serve({ get: async (zip) => { asked.push(zip); return { ...sample, zip }; } });
  try {
    assert.equal((await (await fetch(s.url)).json()).data.zip, "02745");
    assert.equal((await (await fetch(`${s.url}?zip=02840`)).json()).data.zip, "02840");
    assert.deepEqual(asked, ["02745", "02840"]);
  } finally {
    await s.close();
  }
});

test("rejects a bad ZIP with 400 and never calls the sources", async () => {
  let calls = 0;
  const s = await serve({ get: async () => { calls++; return sample; } });
  try {
    for (const zip of ["abc", "1234", "123456", "02745;drop"]) assert.equal((await fetch(`${s.url}?zip=${encodeURIComponent(zip)}`)).status, 400);
    assert.equal(calls, 0);
  } finally {
    await s.close();
  }
});

test("a source outage is a 502 JSON answer that leaks nothing", async () => {
  const original = console.error;
  console.error = () => {};
  const s = await serve({ get: async () => { throw new Error("getaddrinfo ENOTFOUND overpass C:\Users\jjard"); } });
  try {
    const res = await fetch(s.url);
    assert.equal(res.status, 502);
    assert.doesNotMatch(JSON.stringify(await res.json()), /jjard|ENOTFOUND/);
  } finally {
    console.error = original;
    await s.close();
  }
});
