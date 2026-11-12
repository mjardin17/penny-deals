/**
 * Alerts only when stock really changes, and each change once.
 * The last definite answer (in stock, pre-order, out of stock) per store and product is kept on disk.
 * A blocked, disallowed or unknown reading never counts as a change, so a source that drops out and
 * comes back doesn't announce the same stock twice. The first pass only records.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Reading, StockState } from "./types";

const DEFINITE: StockState[] = ["in_stock", "preorder", "out_of_stock"];
const LABEL: Record<StockState, string> = {
  in_stock: "IN STOCK",
  preorder: "PRE-ORDER OPEN",
  out_of_stock: "out of stock",
  blocked: "blocked",
  disallowed: "disallowed",
  unknown: "unknown",
};

export type KnownState = Record<string, StockState>;

export function keyOf(r: Reading): string {
  return `${r.retailer}|${r.store}|${r.product}`;
}

/** New known-state map and the alert lines for definite changes. Exported for tests. */
export function diffReadings(previous: KnownState | null, readings: Reading[]): { next: KnownState; lines: string[] } {
  const next: KnownState = { ...(previous ?? {}) };
  const lines: string[] = [];
  for (const r of readings) {
    if (!DEFINITE.includes(r.state)) continue;
    const key = keyOf(r);
    const before = next[key];
    next[key] = r.state;
    if (!previous || before === r.state) continue;
    // Going out of stock is only news if it had been buyable.
    if (r.state === "out_of_stock" && before === undefined) continue;
    lines.push(`**${r.store}:** ${r.product} is ${LABEL[r.state]}${before ? ` (was ${LABEL[before]})` : ""}. ${r.detail}${r.source && r.source.startsWith("https://") ? ` <${r.source.split(" ")[0]}>` : ""}`);
  }
  return { next, lines };
}

export function createStateFile(filePath = path.join(process.cwd(), "data", "monitor-state.json")) {
  return {
    async load(): Promise<KnownState | null> {
      try {
        const parsed = JSON.parse(await readFile(filePath, "utf8"));
        return parsed && typeof parsed.known === "object" ? (parsed.known as KnownState) : null;
      } catch {
        return null;
      }
    },
    async save(known: KnownState): Promise<void> {
      await mkdir(path.dirname(filePath), { recursive: true });
      const tmp = `${filePath}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify({ savedAt: new Date().toISOString(), known }, null, 2) + "\n", "utf8");
      await rename(tmp, filePath);
    },
  };
}
