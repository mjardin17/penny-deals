import { XMLParser } from "fast-xml-parser";
import { RawPost } from "../types";
import { USER_AGENT } from "../config";

const FEED = "https://slickdeals.net/newsearch.php";
const DELAY_MS = 1200;

const parser = new XMLParser({ ignoreAttributes: true, cdataPropName: false, processEntities: true, htmlEntities: true });

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function text(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/** Parses a Slickdeals RSS document into posts. Exported for tests. */
export function parseSlickdealsRss(xml: string): RawPost[] {
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item;
  const items: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return items.flatMap((item) => {
    const url = text(item.link);
    const title = text(item.title);
    const published = new Date(text(item.pubDate));
    if (!url || !title || Number.isNaN(published.getTime())) return [];

    const content = stripHtml(text(item["content:encoded"]));
    const scoreMatch = content.match(/Thumb Score:\s*([+-]?\d+)/i);
    const threadId = url.match(/\/f\/(\d+)/)?.[1] ?? url;

    return [
      {
        source: "Slickdeals",
        id: `sd-${threadId}`,
        title,
        url: url.replace(/\?utm_[^#]*$/, ""),
        body: stripHtml(text(item.description)) || content,
        publishedAt: published,
        score: scoreMatch ? Number(scoreMatch[1]) : undefined,
      },
    ];
  });
}

export async function fetchSlickdeals(query: string): Promise<RawPost[]> {
  const params = new URLSearchParams({ q: query, searcharea: "deals", searchin: "first", rss: "1" });
  const res = await fetch(`${FEED}?${params}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Slickdeals "${query}": HTTP ${res.status}`);
  return parseSlickdealsRss(await res.text());
}

/** Runs every query sequentially (polite pacing) and de-duplicates by thread. */
export async function fetchAllSlickdeals(queries: string[]): Promise<{ posts: RawPost[]; errors: string[] }> {
  const byId = new Map<string, RawPost>();
  const errors: string[] = [];
  for (const [i, q] of queries.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    try {
      for (const post of await fetchSlickdeals(q)) byId.set(post.id, post);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  return { posts: [...byId.values()], errors };
}
