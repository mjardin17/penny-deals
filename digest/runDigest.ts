/**
 * Daily deal digest: `npm run digest -- --zip 02745`
 * Writes digests/YYYY-MM-DD.md. Only real, linkable posts are included.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { loadConfig, SLICKDEALS_QUERIES, DigestConfig } from "./config";
import { fetchAllSlickdeals } from "./sources/slickdeals";
import { fetchReddit } from "./sources/reddit";
import { geocodeZip, loadNearbyStores } from "./geo";
import { classifyPost, sortClosestFirst } from "./classify";
import { renderDigest } from "./render";
import { DigestHit, NearbyStore, RawPost, SourceStatus } from "./types";
import { findSpread } from "../server/arbitrage/spreadEngine";

/** Sources that can't be automated honestly; listed so the digest says what it didn't check. */
const NOT_AUTOMATED: SourceStatus[] = [
  {
    name: "BrickSeek",
    state: "skipped",
    detail: "No public API; its clearance and penny data is loaded client-side behind an account. Check brickseek.com by hand.",
  },
  {
    name: "Retailer sites (Home Depot, Best Buy)",
    state: "skipped",
    detail: "Both block automated requests (HTTP 403 / timeout on 2026-09-18). In-store penny prices aren't published online anyway.",
  },
];

const MAX_RESALE_CHECKS = 15;

function localDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
}

async function addResaleChecks(hits: DigestHit[]): Promise<SourceStatus> {
  if (!process.env.EBAY_CLIENT_ID && !process.env.AMAZON_CREATORS_CREDENTIAL_ID) {
    return { name: "Resale check (eBay/Amazon)", state: "skipped", detail: "No eBay or Amazon API credentials in .env.local." };
  }
  const priced = hits.filter((h) => h.price !== null && h.kind !== "pokemon").slice(0, MAX_RESALE_CHECKS);
  let flagged = 0;
  for (const hit of priced) {
    try {
      const report = await findSpread({ title: hit.post.title, buyPrice: hit.price!, store: hit.store ?? undefined });
      const best = report.bestRealSpread;
      if (best?.profit) {
        flagged++;
        hit.resaleNote = `Real spread on ${best.channel === "ebay" ? "eBay" : "Amazon FBA"}: resale ~$${best.resalePrice?.toFixed(2)} (${best.resaleBasis}), net $${best.profit.netProfit.toFixed(2)} after fees${report.packageAssumed ? " (assumes a 1 lb package)" : ""}.`;
      } else {
        hit.resaleNote = report.channels.map((c) => `${c.channel}: ${c.statusMessage}`).join(" ");
      }
    } catch (err) {
      hit.resaleNote = `Resale check failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  return { name: "Resale check (eBay/Amazon)", state: "ok", detail: `${priced.length} hits checked, ${flagged} real spreads.` };
}

export async function runDigest(config: DigestConfig, now = new Date()): Promise<{ file: string; hits: DigestHit[] }> {
  const sources: SourceStatus[] = [];

  const origin = await geocodeZip(config.zip);
  let stores: NearbyStore[] = [];
  try {
    const loaded = await loadNearbyStores(config.zip, origin, config.radiusMiles, config.cacheDir);
    stores = loaded.stores;
    sources.push({
      name: "OpenStreetMap store locations",
      state: "ok",
      detail: `${stores.length} stores${loaded.fromCache ? " (cached)" : ""}`,
    });
  } catch (err) {
    sources.push({ name: "OpenStreetMap store locations", state: "failed", detail: `${String(err)}. Distances unavailable.` });
  }

  const sd = await fetchAllSlickdeals(SLICKDEALS_QUERIES);
  sources.push({
    name: "Slickdeals",
    state: sd.posts.length ? "ok" : "failed",
    detail: `${sd.posts.length} posts from ${SLICKDEALS_QUERIES.length} searches${sd.errors.length ? `; errors: ${sd.errors.join("; ")}` : ""}`,
  });

  const reddit = await fetchReddit(config.redditSubs);
  sources.push(reddit.status);
  sources.push(...NOT_AUTOMATED);

  const cutoff = now.getTime() - config.lookbackHours * 3600_000;
  const posts: RawPost[] = [...sd.posts, ...reddit.posts].filter((p) => p.publishedAt.getTime() >= cutoff);
  const hits = sortClosestFirst(posts.flatMap((p) => classifyPost(p, stores) ?? []));

  sources.push(await addResaleChecks(hits));

  const date = localDate(now);
  const markdown = renderDigest(
    {
      date,
      generatedAt: now,
      zip: config.zip,
      place: origin.place,
      radiusMiles: config.radiusMiles,
      lookbackHours: config.lookbackHours,
      nearbyStoreCount: stores.length,
    },
    hits,
    sources
  );

  await mkdir(config.outDir, { recursive: true });
  const file = path.join(config.outDir, `${date}.md`);
  await writeFile(file, markdown, "utf8");
  return { file, hits };
}

const isMain = process.argv[1] && /runDigest\.(ts|js|cjs)$/.test(process.argv[1]);
if (isMain) {
  dotenv.config({ path: [".env.local", ".env"], quiet: true });
  runDigest(loadConfig())
    .then(({ file, hits }) => console.log(`Wrote ${file} (${hits.length} hits)`))
    .catch((err) => {
      console.error(`Digest failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    });
}
