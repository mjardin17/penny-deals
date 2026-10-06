/**
 * Shared, careful HTTP for the free card databases: a timeout on every attempt, retries for the failures
 * those free services produce at random, and a short memory of recent good answers.
 */

export class CardApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "CardApiError";
  }
}

export interface FetcherOptions {
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Test hooks. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  maxAttempts?: number;
}

const RETRY_WAITS_MS = [300, 900, 2000, 2000, 2000];
const CACHE_MS = 10 * 60_000;
const CACHE_MAX = 300;

export interface JsonResult {
  status: number;
  body: any;
}

export function createFetcher(options: FetcherOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const headers = options.headers ?? {};
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const maxAttempts = options.maxAttempts ?? 4;
  const cache = new Map<string, { at: number; body: any }>();

  async function once(url: string): Promise<JsonResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers, signal: controller.signal });
      if (res.status === 404) return { status: 404, body: null };
      if (res.status === 429) throw new CardApiError(429, "The card database is rate limiting requests (rate limit). Try again in a minute.");
      if (!res.ok) throw new CardApiError(res.status, `The card database had an error (HTTP ${res.status}).`);
      return { status: res.status, body: await res.json() };
    } catch (err) {
      if (err instanceof CardApiError) throw err;
      if (controller.signal.aborted) throw new CardApiError(0, "The card database did not answer in time (timed out).");
      throw new CardApiError(0, "Could not reach the card database.");
    } finally {
      clearTimeout(timer);
    }
  }

  /** GET a JSON URL. 404 gives { status: 404, body: null }. Failures worth retrying (timeouts, network drops, 5xx) are retried. */
  async function getJson(url: string): Promise<JsonResult> {
    const hit = cache.get(url);
    if (hit && now() - hit.at < CACHE_MS) return { status: 200, body: hit.body };
    for (let attempt = 1; ; attempt++) {
      try {
        const out = await once(url);
        if (out.status === 200) {
          if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
          cache.set(url, { at: now(), body: out.body });
        }
        return out;
      } catch (err) {
        const retryable = err instanceof CardApiError && (err.status === 0 || err.status >= 500);
        if (!retryable || attempt >= maxAttempts) throw err;
        await sleep(RETRY_WAITS_MS[attempt - 1] ?? 2000);
      }
    }
  }

  return { getJson };
}
