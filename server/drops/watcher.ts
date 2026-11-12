/**
 * Drop alerts: on a timer, checks Best Buy and the Pokémon community posts for one ZIP and sends an
 * alert for anything that newly appeared since the last check: an item turning buyable online, an item
 * showing up in stock at a nearby Best Buy, or a new Pokémon TCG post.
 *
 * The first run only records what is already there, so turning alerts on doesn't flood the channel.
 * When a source fails, what it showed last time is kept, so the item isn't announced again when the
 * source comes back.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DigestHit } from "../../digest/types";
import { STORES } from "../../digest/config";
import { createDiscordNotifier, isDiscordWebhookUrl, Notifier, packMessages } from "./discord";
import { BestBuyResult } from "./types";

const MAX_KEYS = 5000;
const DEFAULT_EVERY_MINUTES = 10;
const MIN_EVERY_MINUTES = 5;

export interface WatchInput {
  bestBuy: BestBuyResult;
  community: { ok: boolean; hits: DigestHit[] };
}

interface Signal {
  key: string;
  line: string;
}

function money(n: number | null): string {
  return n === null ? "" : ` $${n.toFixed(2)}`;
}

/** Everything worth alerting on right now, each with a stable key. Exported for tests. */
export function signalsOf(input: WatchInput): Signal[] {
  const out: Signal[] = [];
  for (const item of input.bestBuy.items) {
    const link = item.url ? ` <${item.url}>` : "";
    if (item.onlineAvailability) {
      out.push({ key: `bb-online:${item.sku}`, line: `**Best Buy online:** ${item.name}${money(item.salePrice)}${link}` });
    }
    for (const s of item.nearbyStores ?? []) {
      const miles = s.distanceMiles !== null ? ` (${s.distanceMiles.toFixed(1)} mi)` : "";
      out.push({
        key: `bb-store:${item.sku}:${s.storeId}`,
        line: `**Best Buy in store:** ${item.name}${money(item.salePrice)} at ${s.name}, ${s.city}${miles}${s.lowStock ? ", low stock" : ""}${link}`,
      });
    }
  }
  for (const hit of input.community.hits) {
    const where = hit.store ? ` (${STORES[hit.store].label})` : "";
    out.push({ key: `post:${hit.post.source}:${hit.post.id}`, line: `**${hit.post.source}${where}:** ${hit.post.title} <${hit.post.url}>` });
  }
  return out;
}

/** Keys from last time that stay "seen" because the source that would confirm them didn't answer. Exported for tests. */
export function carriedKeys(previous: string[], input: WatchInput): string[] {
  const keep: string[] = [];
  const bbDown = input.bestBuy.status.state !== "ok";
  const uncheckedSkus = new Set(
    input.bestBuy.items.filter((i) => i.storeCheckError || (i.inStoreAvailability && i.nearbyStores === null)).map((i) => String(i.sku))
  );
  for (const key of previous) {
    if (key.startsWith("bb-") && bbDown) keep.push(key);
    else if (key.startsWith("bb-store:") && uncheckedSkus.has(key.split(":")[1])) keep.push(key);
    else if (key.startsWith("post:") && !input.community.ok) keep.push(key);
  }
  return keep;
}

export interface WatcherDeps {
  zip: string;
  read: (zip: string) => Promise<WatchInput>;
  notifier: Notifier;
  stateFile: string;
  now: () => number;
}

export interface WatcherStatus {
  enabled: boolean;
  reason: string;
  zip?: string;
  everyMinutes?: number;
  lastRunAt?: string;
  lastAlertCount?: number;
  lastError?: string;
  note?: string;
}

export function createWatcher(deps: WatcherDeps) {
  const status: WatcherStatus = { enabled: true, reason: "Alerts are on.", zip: deps.zip };
  let running = false;

  async function loadState(): Promise<string[] | null> {
    try {
      const parsed = JSON.parse(await readFile(deps.stateFile, "utf8"));
      return parsed?.zip === deps.zip && Array.isArray(parsed.keys) ? parsed.keys.filter((k: unknown) => typeof k === "string") : null;
    } catch {
      return null;
    }
  }

  async function saveState(keys: string[]): Promise<void> {
    await mkdir(path.dirname(deps.stateFile), { recursive: true });
    const tmp = `${deps.stateFile}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ zip: deps.zip, savedAt: new Date(deps.now()).toISOString(), keys: keys.slice(-MAX_KEYS) }) + "\n", "utf8");
    await rename(tmp, deps.stateFile);
  }

  /** One check. Returns how many alerts went out. Never throws. */
  async function tick(): Promise<number> {
    if (running) return 0;
    running = true;
    status.lastRunAt = new Date(deps.now()).toISOString();
    try {
      const input = await deps.read(deps.zip);
      const previous = await loadState();
      const signals = signalsOf(input);
      const nextKeys = [...new Set([...carriedKeys(previous ?? [], input), ...signals.map((s) => s.key)])];

      let sent = 0;
      if (previous) {
        const seen = new Set(previous);
        const fresh = signals.filter((s) => !seen.has(s.key));
        for (const message of packMessages(fresh.map((s) => s.line))) await deps.notifier.send(message);
        sent = fresh.length;
      }
      // Saved after sending: if Discord failed, the same items are tried again next time.
      await saveState(nextKeys);
      status.lastAlertCount = sent;
      status.lastError = undefined;
      status.note = previous ? undefined : "First check recorded what is already there. Alerts start from the next check.";
      return sent;
    } catch (err) {
      status.lastError = (err as Error).message;
      return 0;
    } finally {
      running = false;
    }
  }

  return { tick, status: () => ({ ...status }) };
}

/** Reads DISCORD_DROPS_WEBHOOK_URL, DROP_ALERTS_ZIP (or DIGEST_ZIP) and DROP_ALERTS_EVERY_MINUTES. */
export function watcherSettings(env: Record<string, string | undefined>): { ok: true; webhook: string; zip: string; everyMinutes: number } | { ok: false; reason: string } {
  const webhook = env.DISCORD_DROPS_WEBHOOK_URL?.trim();
  if (!webhook) return { ok: false, reason: "Off: set DISCORD_DROPS_WEBHOOK_URL to a webhook in your own Discord channel." };
  if (!isDiscordWebhookUrl(webhook)) return { ok: false, reason: "Off: DISCORD_DROPS_WEBHOOK_URL is not a Discord webhook URL." };
  const zip = (env.DROP_ALERTS_ZIP || env.DIGEST_ZIP || "").trim();
  if (!/^\d{5}$/.test(zip)) return { ok: false, reason: "Off: set DROP_ALERTS_ZIP (or DIGEST_ZIP) to your 5-digit ZIP." };
  const n = Number(env.DROP_ALERTS_EVERY_MINUTES);
  const everyMinutes = Number.isFinite(n) && n > 0 ? Math.max(MIN_EVERY_MINUTES, Math.round(n)) : DEFAULT_EVERY_MINUTES;
  return { ok: true, webhook, zip, everyMinutes };
}

let current: { status: () => WatcherStatus } = { status: () => ({ enabled: false, reason: "Alerts haven't been started." }) };

export function dropAlertsStatus(): WatcherStatus {
  return current.status();
}

/** Starts the timer when settings allow. Returns a stop function. */
export function startDropAlerts(env: Record<string, string | undefined>, read: (zip: string) => Promise<WatchInput>): () => void {
  const settings = watcherSettings(env);
  if (settings.ok === false) {
    const { reason } = settings as { ok: false; reason: string };
    current = { status: () => ({ enabled: false, reason }) };
    console.log(`Drop alerts: ${reason}`);
    return () => {};
  }
  const watcher = createWatcher({
    zip: settings.zip,
    read,
    notifier: createDiscordNotifier(settings.webhook),
    stateFile: env.DROP_ALERTS_STATE_FILE || path.join(process.cwd(), "data", "drop-alert-state.json"),
    now: Date.now,
  });
  current = { status: () => ({ ...watcher.status(), everyMinutes: settings.everyMinutes }) };
  console.log(`Drop alerts: on for ZIP ${settings.zip}, every ${settings.everyMinutes} minutes, to Discord.`);
  void watcher.tick();
  const timer = setInterval(() => void watcher.tick(), settings.everyMinutes * 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
