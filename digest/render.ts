import { STORES } from "./config";
import { DigestHit, HitKind, SourceStatus } from "./types";

export interface DigestMeta {
  date: string;
  generatedAt: Date;
  zip: string;
  place: string;
  radiusMiles: number;
  lookbackHours: number;
  nearbyStoreCount: number;
}

const SECTIONS: { kind: HitKind; heading: string; empty: string }[] = [
  {
    kind: "penny",
    heading: "Penny drops",
    empty: "No penny items reported by the sources in this window. Penny lists are mostly shared in private groups and apps that this digest can't read.",
  },
  { kind: "clearance", heading: "Clearance and price drops", empty: "Nothing new at Home Depot, Lowe's, Best Buy or Walmart in this window." },
  { kind: "pokemon", heading: "Pokémon TCG restocks and deals", empty: "No Pokémon TCG posts in this window." },
];

function escapeMd(text: string): string {
  return text.replace(/([\\`*_[\]<>|])/g, "\\$1");
}

function formatPrice(price: number | null): string {
  if (price === null) return "not stated";
  return price < 1 ? `${Math.round(price * 100)}¢` : `$${price.toFixed(2)}`;
}

function formatWhen(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
}

function renderHit(h: DigestHit, index: number): string {
  const store = h.store ? STORES[h.store].label : "Online seller";
  const distance = h.nearest ? `${h.nearest.miles} mi` : h.inStore ? "no branch in radius" : "online";
  const lines = [
    `### ${index}. ${escapeMd(h.post.title)}`,
    "",
    `- **Store:** ${store}${h.inStore ? " (in-store)" : ""} · **Distance:** ${distance}`,
    `- **Price:** ${formatPrice(h.price)}`,
    `- **What to do:** ${h.action}`,
  ];
  if (h.resaleNote) lines.push(`- **Resale check:** ${h.resaleNote}`);
  lines.push(
    `- **Source:** [${h.post.source}](${h.post.url}) · posted ${formatWhen(h.post.publishedAt)}${h.post.score !== undefined ? ` · score ${h.post.score > 0 ? "+" : ""}${h.post.score}` : ""}`
  );
  return lines.join("\n");
}

export function renderDigest(meta: DigestMeta, hits: DigestHit[], sources: SourceStatus[]): string {
  const out: string[] = [
    `# Deal digest: ${meta.date}`,
    "",
    `Closest first from **${meta.zip}** (${meta.place}). ${meta.nearbyStoreCount} tracked stores within ${meta.radiusMiles} mi. Posts from the last ${meta.lookbackHours} hours.`,
    "",
    `Every hit below links to the post it came from. Prices are as posted, and in-store deals vary by store (YMMV). Posts the community voted below zero are left out.`,
    "",
  ];

  let n = 0;
  for (const section of SECTIONS) {
    const inSection = hits.filter((h) => h.kind === section.kind);
    out.push(`## ${section.heading} (${inSection.length})`, "");
    if (inSection.length === 0) {
      out.push(`_${section.empty}_`, "");
      continue;
    }
    for (const h of inSection) out.push(renderHit(h, ++n), "");
  }

  out.push("## Sources checked", "", "| Source | Status | Detail |", "| --- | --- | --- |");
  for (const s of sources) out.push(`| ${s.name} | ${s.state} | ${escapeMd(s.detail)} |`);
  out.push("", `_Generated ${meta.generatedAt.toISOString()} by \`npm run digest\`._`, "");
  return out.join("\n");
}
