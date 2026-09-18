/**
 * Reddit via app-only OAuth. Unauthenticated Reddit requests are rate-limited to
 * nothing (checked 2026-09-18), so this source runs only when
 * REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET are set (a "script" app at reddit.com/prefs/apps).
 */

import { RawPost, SourceStatus } from "../types";
import { USER_AGENT } from "../config";

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Reddit OAuth HTTP ${res.status}`);
  const json = await res.json();
  if (!json.access_token) throw new Error("Reddit OAuth returned no token");
  return json.access_token;
}

export async function fetchReddit(subs: string[], env = process.env): Promise<{ posts: RawPost[]; status: SourceStatus }> {
  const { REDDIT_CLIENT_ID: id, REDDIT_CLIENT_SECRET: secret } = env;
  if (!id || !secret) {
    return {
      posts: [],
      status: {
        name: "Reddit",
        state: "skipped",
        detail: "Needs REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET (Reddit blocks unauthenticated requests).",
      },
    };
  }

  const posts: RawPost[] = [];
  const errors: string[] = [];
  try {
    const token = await getToken(id, secret);
    for (const sub of subs) {
      const res = await fetch(`https://oauth.reddit.com/r/${sub}/new?limit=50&raw_json=1`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        errors.push(`r/${sub}: HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      for (const child of json?.data?.children ?? []) {
        const d = child.data;
        if (!d?.id || !d.title) continue;
        posts.push({
          source: `r/${sub}`,
          id: `rd-${d.id}`,
          title: d.title,
          url: `https://www.reddit.com${d.permalink}`,
          body: d.selftext ?? "",
          publishedAt: new Date(d.created_utc * 1000),
          score: d.score,
        });
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return {
    posts,
    status: {
      name: "Reddit",
      state: errors.length && !posts.length ? "failed" : "ok",
      detail: `${posts.length} posts from ${subs.map((s) => `r/${s}`).join(", ")}${errors.length ? `; errors: ${errors.join("; ")}` : ""}`,
    },
  };
}
