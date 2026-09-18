import { Router } from "express";
import { findSpread, SpreadCandidate } from "../arbitrage/spreadEngine";
import { FEE_SOURCES, FEE_TABLES_RETRIEVED, PackageSpec } from "../../shared/fees";

export const arbitrageRouter = Router();

const MAX_BATCH = 25;

function parsePackage(raw: any): PackageSpec | undefined {
  if (!raw) return undefined;
  const pkg = {
    lengthIn: Number(raw.lengthIn),
    widthIn: Number(raw.widthIn),
    heightIn: Number(raw.heightIn),
    weightLb: Number(raw.weightLb),
  };
  return Object.values(pkg).every((n) => Number.isFinite(n) && n > 0) ? pkg : undefined;
}

export function parseCandidate(raw: any): SpreadCandidate | string {
  if (!raw || typeof raw.title !== "string" || !raw.title.trim()) return "title is required";
  const buyPrice = Number(raw.buyPrice);
  if (!Number.isFinite(buyPrice) || buyPrice < 0) return "buyPrice must be a non-negative number";
  return {
    title: raw.title.trim().slice(0, 200),
    buyPrice,
    upc: typeof raw.upc === "string" && /^\d{8,14}$/.test(raw.upc.trim()) ? raw.upc.trim() : undefined,
    store: typeof raw.store === "string" ? raw.store.slice(0, 60) : undefined,
    pkg: parsePackage(raw.pkg),
  };
}

arbitrageRouter.get("/fees/sources", (_req, res) => {
  res.json({ success: true, retrieved: FEE_TABLES_RETRIEVED, data: FEE_SOURCES });
});

arbitrageRouter.post("/arbitrage/spread", async (req, res) => {
  const parsed = parseCandidate(req.body);
  if (typeof parsed === "string") return res.status(400).json({ success: false, error: parsed });
  try {
    res.json({ success: true, data: await findSpread(parsed) });
  } catch (err: any) {
    console.error("[arbitrage/spread]", err);
    res.status(500).json({ success: false, error: err?.message || "Spread check failed" });
  }
});

arbitrageRouter.post("/arbitrage/spread-batch", async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_BATCH) {
    return res.status(400).json({ success: false, error: `items must be an array of 1-${MAX_BATCH}` });
  }
  const candidates = items.map(parseCandidate);
  const invalid = candidates.findIndex((c) => typeof c === "string");
  if (invalid !== -1) return res.status(400).json({ success: false, error: `items[${invalid}]: ${candidates[invalid]}` });

  try {
    const reports = [];
    // Sequential on purpose: the providers share rate limiters.
    for (const c of candidates as SpreadCandidate[]) reports.push(await findSpread(c));
    res.json({ success: true, data: reports });
  } catch (err: any) {
    console.error("[arbitrage/spread-batch]", err);
    res.status(500).json({ success: false, error: err?.message || "Spread batch failed" });
  }
});
