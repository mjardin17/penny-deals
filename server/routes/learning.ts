import { Router } from "express";
import { pendingFeedback, readPredictions, recordOutcome } from "../learning/predictionsLog";
import { loadWeights } from "../learning/weights";
import { getBrain } from "../brain/instance";
import { teachBrainFromSale } from "../learning/brainBridge";

export const learningRouter = Router();

learningRouter.get("/learning/pending", async (_req, res) => {
  try {
    const records = await readPredictions();
    res.json({ success: true, data: pendingFeedback(records) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to read pending predictions" });
  }
});

learningRouter.post("/learning/outcome", async (req, res) => {
  const { id, stage, actualPrice } = req.body ?? {};
  if (typeof id !== "string" || !id.trim()) return res.status(400).json({ success: false, error: "id is required" });
  if (stage !== "bought" && stage !== "sold") return res.status(400).json({ success: false, error: 'stage must be "bought" or "sold"' });
  if (stage === "sold" && !Number.isFinite(Number(actualPrice))) {
    return res.status(400).json({ success: false, error: "actualPrice is required when stage is sold" });
  }

  try {
    const updated = await recordOutcome(id, {
      stage,
      actualPrice: stage === "sold" ? Number(actualPrice) : undefined,
      recordedAt: new Date().toISOString(),
      method: "manual",
    });
    if (!updated) return res.status(404).json({ success: false, error: "No prediction with that id" });
    // A real reported sale also teaches the price brain (logged, never blocks recording the outcome).
    if (stage === "sold") teachBrainFromSale(getBrain(), updated, Number(actualPrice));
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to record outcome" });
  }
});

learningRouter.get("/learning/weights", async (_req, res) => {
  try {
    res.json({ success: true, data: await loadWeights() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to load weights" });
  }
});
