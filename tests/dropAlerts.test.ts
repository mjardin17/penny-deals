import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import type { AddressInfo } from "node:net";
import { carriedKeys, createWatcher, signalsOf, WatchInput, watcherSettings } from "../server/drops/watcher";
import { createDiscordNotifier, isDiscordWebhookUrl, packMessages } from "../server/drops/discord";
import { createDropsRouter, DropsRouterDeps } from "../server/routes/drops";
import type { BestBuyItem } from "../server/drops/types";
import type { DigestHit } from "../digest/types";

const WEBHOOK = "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_ABCDEF-123";

function item(over: Partial<BestBuyItem> = {}): BestBuyItem {
  return { sku: 6578000, name: "Prismatic Evolutions ETB", url: "https://www.bestbuy.com/site/x/6578000.p", salePrice: 59.99, regularPrice: 59.99, onlineAvailability: false, inStoreAvailability: true, orderable: "Available", releaseDate: null, nearbyStores: [], ...over };
}

function post(id: string): DigestHit {
  return { post: { source: "r/PokemonRestocks", id, title: `Restock at Target @everyone ${id}`, url: `https://www.reddit.com/r/x/${id}`, body: "", publishedAt: new Date() }, kind: "pokemon", store: "target", price: null, inStore: true, nearest: null, action: "" };
}

function input(items: BestBuyItem[], hits: DigestHit[], bbState: "ok" | "failed" = "ok", communityOk = true): WatchInput {
  return { bestBuy: { items, status: { name: "Best Buy API", state: bbState, detail: "" } }, community: { ok: communityOk, hits } };
}

const store = { storeId: "1118", name: "Dartmouth", address: "", city: "North Dartmouth", state: "MA", distanceMiles: 3.2, lowStock: true };

test("signals: online, each nearby store, and each Pokémon post get their own key", () => {
  const keys = signalsOf(input([item({ onlineAvailability: true, nearbyStores: [store] })], [post("a")])).map((s) => s.key);
  assert.deepEqual(keys, ["bb-online:6578000", "bb-store:6578000:1118", "post:r/PokemonRestocks:a"]);
});

test("keys are carried over only for sources that didn't answer", () => {
  const prev = ["bb-online:1", "bb-store:6578000:1118", "post:r/x:a"];
  assert.deepEqual(carriedKeys(prev, input([], [], "failed", false)), prev);
  assert.deepEqual(carriedKeys(prev, input([item({ nearbyStores: null, storeCheckError: "HTTP 500" })], [])), ["bb-store:6578000:1118"]);
  assert.deepEqual(carriedKeys(prev, input([item({ inStoreAvailability: false, nearbyStores: null })], [])), [], "not sold in stores any more: really gone");
});

async function watcherWith(reads: WatchInput[], failSend = false) {
  const dir = await mkdtemp(path.join(tmpdir(), "pd-watch-"));
  const sent: string[] = [];
  let n = 0;
  const watcher = createWatcher({
    zip: "02745",
    read: async () => reads[Math.min(n++, reads.length - 1)],
    notifier: { send: async (m) => { if (failSend) throw new Error("Discord down"); sent.push(m); } },
    stateFile: path.join(dir, "state.json"),
    now: () => Date.parse("2026-11-12T12:00:00Z"),
  });
  return { watcher, sent };
}

test("first check only records; later checks alert on what is new", async () => {
  const { watcher, sent } = await watcherWith([
    input([item()], [post("a")]),
    input([item({ onlineAvailability: true, nearbyStores: [store] })], [post("a"), post("b")]),
    input([item({ onlineAvailability: true, nearbyStores: [store] })], [post("a"), post("b")]),
  ]);
  assert.equal(await watcher.tick(), 0);
  assert.match(watcher.status().note ?? "", /First check/);
  assert.equal(await watcher.tick(), 3);
  assert.equal(sent.length, 1);
  assert.match(sent[0], /Best Buy online/);
  assert.match(sent[0], /Best Buy in store:.*Dartmouth.*3\.2 mi.*low stock/);
  assert.match(sent[0], /post b|b </);
  assert.doesNotMatch(sent[0], /post a|\/a>/);
  assert.equal(await watcher.tick(), 0, "nothing new, nothing sent");
});

test("a source outage doesn't cause a repeat alert when it comes back", async () => {
  const live = input([item({ nearbyStores: [store] })], [post("a")]);
  const { watcher, sent } = await watcherWith([live, input([], [], "failed", false), live]);
  await watcher.tick();
  await watcher.tick();
  assert.equal(await watcher.tick(), 0);
  assert.equal(sent.length, 0);
});

test("if Discord fails, the alert is tried again next time and the error is shown", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pd-watch-"));
  const stateFile = path.join(dir, "state.json");
  const reads = [input([], []), input([], [post("z")])];
  let n = 0;
  const read = async () => reads[Math.min(n++, 1)];
  const now = () => 0;
  const failing = createWatcher({ zip: "02745", read, notifier: { send: async () => { throw new Error("Discord down"); } }, stateFile, now });
  await failing.tick();
  await failing.tick();
  assert.equal(failing.status().lastError, "Discord down");
  const sent: string[] = [];
  const working = createWatcher({ zip: "02745", read, notifier: { send: async (m) => { sent.push(m); } }, stateFile, now });
  assert.equal(await working.tick(), 1);
});

test("settings: off without a real webhook URL or ZIP; interval has a floor", () => {
  assert.equal(watcherSettings({}).ok, false);
  assert.equal(watcherSettings({ DISCORD_DROPS_WEBHOOK_URL: "https://example.com/hook", DIGEST_ZIP: "02745" }).ok, false);
  assert.equal(watcherSettings({ DISCORD_DROPS_WEBHOOK_URL: WEBHOOK }).ok, false);
  const s = watcherSettings({ DISCORD_DROPS_WEBHOOK_URL: WEBHOOK, DIGEST_ZIP: "02745", DROP_ALERTS_EVERY_MINUTES: "1" });
  assert.deepEqual(s, { ok: true, webhook: WEBHOOK, zip: "02745", everyMinutes: 5 });
});

test("webhook URL check accepts only Discord webhooks", () => {
  assert.equal(isDiscordWebhookUrl(WEBHOOK), true);
  assert.equal(isDiscordWebhookUrl("http://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz"), false);
  assert.equal(isDiscordWebhookUrl("https://discord.com.evil.io/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz"), false);
});

test("messages stay under Discord's limit, at most three, and say how many didn't fit", () => {
  const lines = Array.from({ length: 200 }, (_, i) => `line ${i} ${"x".repeat(80)}`);
  const msgs = packMessages(lines);
  assert.equal(msgs.length, 3);
  for (const m of msgs) assert.ok(m.length <= 2000, `message is ${m.length} chars`);
  assert.match(msgs[2], /…and \d+ more/);
  assert.deepEqual(packMessages(["one", "two"]), ["one\ntwo"]);
});

test("the Discord notifier blocks all pings and never puts the URL in an error", async () => {
  const bodies: any[] = [];
  const ok = createDiscordNotifier(WEBHOOK, (async (_u: string, init: RequestInit) => { bodies.push(JSON.parse(String(init.body))); return new Response(null, { status: 204 }); }) as typeof fetch);
  await ok.send("Restock @everyone");
  assert.deepEqual(bodies[0].allowed_mentions, { parse: [] });
  const bad = createDiscordNotifier(WEBHOOK, (async () => new Response(null, { status: 404 })) as typeof fetch);
  await assert.rejects(bad.send("x"), (err: Error) => /HTTP 404/.test(err.message) && !err.message.includes("abcdefghij"));
  assert.throws(() => createDiscordNotifier("https://example.com"));
});

async function serve(deps: DropsRouterDeps) {
  const app = express();
  app.use(express.json());
  app.use("/api", createDropsRouter(deps));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`,
    close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

test("drops routes: ZIP checks, sighting validation, cache cleared after a report, alerts status", async () => {
  const forgotten: string[] = [];
  const asked: string[] = [];
  const s = await serve({
    feed: { get: async (zip) => { asked.push(zip); return { zip, fetchedAt: "", bestBuy: [], community: [], sightings: [], releases: [], sources: [] }; }, forget: (zip) => { forgotten.push(zip); } },
    sightings: { add: async (r) => ({ id: "1", createdAt: "2026-11-12T12:00:00.000Z", ...r }) },
    alerts: () => ({ enabled: false, reason: "Off: no webhook." }),
    defaultZip: () => "02745",
  });
  try {
    const ok = await (await fetch(`${s.base}/drops`)).json();
    assert.equal(ok.data.zip, "02745");
    assert.equal(ok.data.alerts.enabled, false);
    assert.equal((await fetch(`${s.base}/drops?zip=12;34`)).status, 400);
    assert.deepEqual(asked, ["02745"]);

    const post = (body: unknown) => fetch(`${s.base}/drops/sightings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert.equal((await post({ zip: "02745", store: "nope" })).status, 400);
    const created = await post({ zip: "02840", store: "walmart", status: "on_shelf", product: "Surging Sparks tin", location: "Newport" });
    assert.equal(created.status, 201);
    assert.deepEqual(forgotten, ["02840"]);

    assert.equal((await (await fetch(`${s.base}/drops/alerts`)).json()).data.reason, "Off: no webhook.");
  } finally {
    await s.close();
  }
});

test("a broken feed is a 502 that leaks nothing", async () => {
  const original = console.error;
  console.error = () => {};
  const s = await serve({
    feed: { get: async () => { throw new Error("apiKey=SECRET at C:\\Users\\jjard"); }, forget: () => {} },
    sightings: { add: async () => { throw new Error("x"); } },
    alerts: () => ({ enabled: false, reason: "" }),
    defaultZip: () => "02745",
  });
  try {
    const res = await fetch(`${s.base}/drops`);
    assert.equal(res.status, 502);
    assert.doesNotMatch(await res.text(), /SECRET|jjard/);
  } finally {
    console.error = original;
    await s.close();
  }
});
