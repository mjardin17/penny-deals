import { NextFunction, Request, RequestHandler, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  now?: () => number;
}

const MAX_TRACKED_CLIENTS = 10_000;

/** Small fixed-window limiter per client address. Enough to stop a flood without a new dependency. */
export function rateLimit({ windowMs, max, now = Date.now }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const t = now();
    if (hits.size > MAX_TRACKED_CLIENTS) {
      for (const [client, entry] of hits) if (entry.resetAt <= t) hits.delete(client);
      if (hits.size > MAX_TRACKED_CLIENTS) hits.clear();
    }

    const client = req.ip || "unknown";
    const entry = hits.get(client);
    if (!entry || entry.resetAt <= t) {
      hits.set(client, { count: 1, resetAt: t + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - t) / 1000))));
      res.status(429).json({ success: false, error: "Too many requests. Slow down and try again in a moment." });
      return;
    }
    next();
  };
}
