import { Response, Router } from "express";
import { BrainHandle, getBrainHandle } from "../brain/instance";
import { BrainInputError, itemKey, normalizeStore, OutcomeInput, OutcomeKind } from "../brain/brain";

const OUTCOME_KINDS: readonly string[] = ["sold", "wrong_match", "not_in_store"];
const MAX_TEXT = 200;
const NUMERIC_STRING = /^\d{1,7}(\.\d{1,6})?$/;
const BRAIN_OFF = "Memory is unavailable right now (details are in the server log).";

function text(value: unknown, max = MAX_TEXT): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function upcOf(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{8,14}$/.test(value.trim()) ? value.trim() : undefined;
}

/** A number, or a plain numeric string. null, "", true and [5] are NOT numbers and come back as NaN. */
function money(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && NUMERIC_STRING.test(value.trim())) return Number(value.trim());
  return Number.NaN;
}

/** Bad input is the caller's (400, message shown). Anything else is ours (500, details only in the log). */
function failWith(res: Response, route: string, err: unknown): void {
  if (err instanceof BrainInputError) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }
  console.error(`[brain${route}]`, err);
  res.status(500).json({ success: false, error: "Could not save to memory. Details are in the server log." });
}

/** Router factory so tests can hand it a brain of their own. */
export function createBrainRouter(getHandle: () => BrainHandle = getBrainHandle): Router {
  const router = Router();

  router.get("/brain/status", (_req, res) => {
    const { brain } = getHandle();
    if (!brain) return res.json({ success: true, data: { available: false, error: BRAIN_OFF } });
    try {
      res.json({ success: true, data: { available: true, ...brain.summary() } });
    } catch (err) {
      failWith(res, "/status", err);
    }
  });

  router.get("/brain/item", (req, res) => {
    const { brain } = getHandle();
    if (!brain) return res.status(503).json({ success: false, error: BRAIN_OFF });
    const title = text(req.query.title);
    const upc = upcOf(req.query.upc);
    if (!title && !upc) return res.status(400).json({ success: false, error: "title or upc is required" });
    try {
      const key = itemKey(title ?? "", upc);
      res.json({
        success: true,
        data: { key, priceHistory: brain.history(key), yourPrices: brain.paidHistory(key), calibration: brain.calibration(key) },
      });
    } catch (err) {
      failWith(res, "/item", err);
    }
  });

  router.post("/brain/price", (req, res) => {
    const { brain } = getHandle();
    if (!brain) return res.status(503).json({ success: false, error: BRAIN_OFF });
    const title = text(req.body?.title);
    const upc = upcOf(req.body?.upc);
    if (!title && !upc) return res.status(400).json({ success: false, error: "title or upc is required" });
    try {
      const saved = brain.recordSighting({
        key: itemKey(title ?? "", upc),
        price: money(req.body?.price),
        store: normalizeStore(req.body?.store),
      });
      res.json({ success: true, data: { saved } });
    } catch (err) {
      failWith(res, "/price", err);
    }
  });

  router.post("/brain/outcome", (req, res) => {
    const { brain } = getHandle();
    if (!brain) return res.status(503).json({ success: false, error: BRAIN_OFF });
    const kind: unknown = req.body?.kind;
    if (typeof kind !== "string" || !OUTCOME_KINDS.includes(kind)) {
      return res.status(400).json({ success: false, error: `kind must be one of: ${OUTCOME_KINDS.join(", ")}` });
    }
    const title = text(req.body?.title);
    const upc = upcOf(req.body?.upc);
    if (!title && !upc) return res.status(400).json({ success: false, error: "title or upc is required" });

    try {
      const key = itemKey(title ?? "", upc);
      const outcome: OutcomeInput = {
        key,
        kind: kind as OutcomeKind,
        store: normalizeStore(req.body?.store),
        matchUrl: text(req.body?.matchUrl, 500),
        note: text(req.body?.note, 500),
      };
      if (kind === "sold") {
        // Compare against the price the app itself recorded, never one the caller supplies, so the
        // app can't be taught from its own already-adjusted number.
        const predicted = brain.latestRawResale(key);
        if (predicted === undefined) {
          throw new BrainInputError("Check this item's price once first, so there is a recorded price to compare the sale with.");
        }
        outcome.predictedResale = predicted;
        outcome.actualResale = money(req.body?.actualResale);
      }
      brain.recordOutcome(outcome);
      res.json({ success: true, data: { saved: true } });
    } catch (err) {
      failWith(res, "/outcome", err);
    }
  });

  return router;
}
