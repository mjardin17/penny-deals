import { NextFunction, Request, RequestHandler, Response } from "express";

interface DailyCapOptions {
  max: number;
  now?: () => number;
}

const DAY_MS = 24 * 60 * 60_000;

/** A whole-server cap per UTC day, for routes that spend a metered service (not per client). */
export function dailyCap({ max, now = Date.now }: DailyCapOptions): RequestHandler {
  let day = Math.floor(now() / DAY_MS);
  let used = 0;

  return (_req: Request, res: Response, next: NextFunction) => {
    const today = Math.floor(now() / DAY_MS);
    if (today !== day) {
      day = today;
      used = 0;
    }
    if (used >= max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(((day + 1) * DAY_MS - now()) / 1000))));
      res.status(429).json({ success: false, error: `Today's limit of ${max} photo reads is used up. It resets at midnight UTC. You can still search by name and number.` });
      return;
    }
    used += 1;
    next();
  };
}
