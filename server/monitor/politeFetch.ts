/**
 * The only way the monitor reads a retailer page. It:
 * - says honestly who it is in the User-Agent (no browser disguise, no rotating proxies, no spoofed headers);
 * - reads robots.txt first and never fetches a path it disallows;
 * - spaces requests to the same site;
 * - on a 403, 429, captcha or challenge page, marks the site blocked and backs off (30 minutes, doubling
 *   up to 6 hours) instead of retrying. It never tries to get past a wall.
 */

import { isAllowed, parseRobots } from "./robots";

export const MONITOR_USER_AGENT = "PennyDealsStockMonitor/0.1 (personal low-rate stock check; one request per watched item every few minutes)";

export type FetchOutcome =
  | { kind: "ok"; status: number; body: string; url: string }
  | { kind: "blocked"; detail: string }
  | { kind: "disallowed"; detail: string }
  | { kind: "queue"; detail: string }
  | { kind: "error"; detail: string };

const ROBOTS_CACHE_MS = 24 * 3600_000;
const ROBOTS_RETRY_MS = 60_000;
const BACKOFF_START_MS = 30 * 60_000;
const BACKOFF_MAX_MS = 6 * 3600_000;
const DEFAULT_GAP_MS = 3_000;

/** Markers of a bot wall or challenge page rather than real content. */
const WALL_MARKERS = /_Incapsula_Resource|Incapsula incident|px-captcha|perimeterx|cf-chl|challenge-platform|Pardon Our Interruption|Request unsuccessful|<title>\s*Access Denied/i;
const QUEUE_HOSTS = /(^|\.)queue-it\.net$/i;

export function looksWalled(status: number, body: string): boolean {
  return status === 403 || status === 429 || WALL_MARKERS.test(body);
}

export interface PoliteFetchOptions {
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  gapMs?: number;
  timeoutMs?: number;
}

export function createPoliteFetcher(options: PoliteFetchOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const gapMs = options.gapMs ?? DEFAULT_GAP_MS;
  const timeoutMs = options.timeoutMs ?? 15_000;

  const robots = new Map<string, { at: number; rules: ReturnType<typeof parseRobots> }>();
  /** A robots.txt that couldn't be read is not asked for again for a minute, so one pass makes one attempt per site. */
  const robotsFailures = new Map<string, { at: number; outcome: FetchOutcome }>();
  const walls = new Map<string, { until: number; strikes: number; why: string }>();
  const lastHit = new Map<string, number>();

  function wall(host: string, why: string): FetchOutcome {
    const prev = walls.get(host);
    const strikes = (prev?.strikes ?? 0) + 1;
    const wait = Math.min(BACKOFF_START_MS * 2 ** (strikes - 1), BACKOFF_MAX_MS);
    walls.set(host, { until: now() + wait, strikes, why });
    return { kind: "blocked", detail: `${why} Backing off ${Math.round(wait / 60_000)} minutes.` };
  }

  async function rawGet(url: string): Promise<{ status: number; body: string; location: string | null }> {
    const host = new URL(url).host;
    const since = now() - (lastHit.get(host) ?? 0);
    if (since < gapMs) await sleep(gapMs - since);
    lastHit.set(host, now());
    const res = await fetchImpl(url, {
      headers: { "User-Agent": MONITOR_USER_AGENT, Accept: "text/html,application/xhtml+xml,text/plain" },
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = res.status >= 300 && res.status < 400 ? "" : await res.text();
    return { status: res.status, body, location: res.headers.get("location") };
  }

  async function rulesFor(host: string): Promise<FetchOutcome | ReturnType<typeof parseRobots>> {
    const cached = robots.get(host);
    if (cached && now() - cached.at < ROBOTS_CACHE_MS) return cached.rules;
    const failed = robotsFailures.get(host);
    if (failed && now() - failed.at < ROBOTS_RETRY_MS) return failed.outcome;
    const fail = (outcome: FetchOutcome) => {
      robotsFailures.set(host, { at: now(), outcome });
      return outcome;
    };
    let got: Awaited<ReturnType<typeof rawGet>>;
    try {
      got = await rawGet(`https://${host}/robots.txt`);
    } catch {
      return fail({ kind: "error", detail: `Couldn't reach ${host} to read its robots.txt, so nothing there was fetched.` });
    }
    if (looksWalled(got.status, got.body)) return wall(host, `${host} answered robots.txt with a bot wall (HTTP ${got.status}).`);
    if (got.status === 404 || got.status === 410) {
      robots.set(host, { at: now(), rules: [] });
      return [];
    }
    if (got.status !== 200 || /<html/i.test(got.body.slice(0, 500))) {
      // RFC 9309: if robots.txt can't be read, assume nothing is allowed.
      return fail({ kind: "error", detail: `${host} robots.txt couldn't be read (HTTP ${got.status}), so nothing there was fetched.` });
    }
    const rules = parseRobots(got.body, MONITOR_USER_AGENT);
    robots.set(host, { at: now(), rules });
    return rules;
  }

  /** GET a page the way a browser would, after the robots.txt and wall checks. Never throws. */
  async function get(url: string): Promise<FetchOutcome> {
    const u = new URL(url);
    if (u.protocol !== "https:") return { kind: "error", detail: "Only https pages are read." };
    const w = walls.get(u.host);
    if (w && now() < w.until) return { kind: "blocked", detail: `${w.why} Still backing off for ${Math.ceil((w.until - now()) / 60_000)} more minutes.` };

    const rules = await rulesFor(u.host);
    if (!Array.isArray(rules)) return rules;
    if (!isAllowed(rules, u.pathname + u.search)) return { kind: "disallowed", detail: `${u.host}/robots.txt disallows ${u.pathname}.` };

    let got: Awaited<ReturnType<typeof rawGet>>;
    try {
      got = await rawGet(url);
    } catch {
      return { kind: "error", detail: `Couldn't reach ${u.host}.` };
    }
    if (got.status >= 300 && got.status < 400 && got.location) {
      const to = new URL(got.location, url);
      if (QUEUE_HOSTS.test(to.host)) return { kind: "queue", detail: `${u.host} is sending visitors to a waiting room (queue-it), which usually means a drop is live.` };
      return { kind: "error", detail: `${u.host} redirected to ${to.host}${to.pathname}; not followed.` };
    }
    if (looksWalled(got.status, got.body)) return wall(u.host, `${u.host} answered with a bot wall or challenge (HTTP ${got.status}).`);
    if (got.status !== 200) return { kind: "error", detail: `${u.host} answered HTTP ${got.status}.` };
    walls.delete(u.host);
    return { kind: "ok", status: got.status, body: got.body, url };
  }

  /** Reads only robots.txt (or the wall in front of it), to say whether a site can be read at all. Never throws. */
  async function probe(host: string): Promise<FetchOutcome | { kind: "ok_robots" }> {
    const w = walls.get(host);
    if (w && now() < w.until) return { kind: "blocked", detail: `${w.why} Still backing off for ${Math.ceil((w.until - now()) / 60_000)} more minutes.` };
    const rules = await rulesFor(host);
    return Array.isArray(rules) ? { kind: "ok_robots" } : rules;
  }

  return { get, probe };
}

export type PoliteFetcher = ReturnType<typeof createPoliteFetcher>;
