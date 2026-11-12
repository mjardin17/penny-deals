/**
 * Runs the stock monitor from the command line.
 *   npm run monitor -- --once    one pass, prints the table, sends nothing
 *   npm run monitor              repeats every MONITOR_EVERY_MINUTES (default 5, minimum 2),
 *                                alerting to DISCORD_DROPS_WEBHOOK_URL on stock changes only
 */

import dotenv from "dotenv";
import { createDiscordNotifier, isDiscordWebhookUrl, Notifier, packMessages } from "../drops/discord";
import { createMonitor } from "./monitor";
import { createPoliteFetcher } from "./politeFetch";
import { createStateFile, diffReadings } from "./alerts";
import { Reading } from "./types";

dotenv.config({ path: [".env.local", ".env"] });

const DEFAULT_MINUTES = 5;
const MIN_MINUTES = 2;

export function intervalMinutes(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.max(MIN_MINUTES, Math.round(n)) : DEFAULT_MINUTES;
}

export function formatTable(readings: Reading[]): string {
  const rows = readings.map((r) => [r.store, r.product, r.state, r.detail.length > 110 ? r.detail.slice(0, 109) + "…" : r.detail]);
  const head = ["Store", "Product", "State", "Why"];
  const widths = head.map((h, i) => Math.min(Math.max(h.length, ...rows.map((r) => r[i].length)), i === 3 ? 110 : 40));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join(" | ");
  return [line(head), widths.map((w) => "-".repeat(w)).join("-|-"), ...rows.map(line)].join("\n");
}

async function main() {
  const once = process.argv.includes("--once");
  const minutes = intervalMinutes(process.env.MONITOR_EVERY_MINUTES);
  const monitor = createMonitor({ fetcher: createPoliteFetcher(), bestBuyKey: process.env.BESTBUY_API_KEY?.trim() || undefined });
  const state = createStateFile(process.env.MONITOR_STATE_FILE || undefined);
  const webhook = process.env.DISCORD_DROPS_WEBHOOK_URL?.trim();
  const notifier: Notifier | null = !once && isDiscordWebhookUrl(webhook) ? createDiscordNotifier(webhook!) : null;

  const pass = async () => {
    const readings = await monitor.runOnce();
    console.log(`\n${new Date().toLocaleString()}\n${formatTable(readings)}`);
    if (once) return;
    const previous = await state.load();
    const { next, lines } = diffReadings(previous, readings);
    if (!previous) console.log("First pass: recorded current stock. Alerts start next pass.");
    for (const l of lines) console.log(`ALERT ${l}`);
    try {
      if (notifier) for (const m of packMessages(lines)) await notifier.send(m);
      await state.save(next);
    } catch (err) {
      console.error(`Alert not sent, will retry next pass: ${(err as Error).message}`);
    }
  };

  await pass();
  if (once) return;
  console.log(`Checking every ${minutes} minutes. ${notifier ? "Alerts go to Discord." : "No Discord webhook set: alerts print here only."}`);
  setInterval(() => void pass(), minutes * 60_000);
}

if (process.argv[1] && /monitor[\\/]cli\.(ts|js|cjs)$/.test(process.argv[1])) void main();
