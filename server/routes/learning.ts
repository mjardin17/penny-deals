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
  const soldFor = typeof actualPrice === "number" ? actualPrice : typeof actualPrice === "string" && actualPrice.trim() ? Number(actualPrice) : Number.NaN;
  if (stage === "sold" && (!Number.isFinite(soldFor) || soldFor <= 0)) {
    return res.status(400).json({ success: false, error: "actualPrice must be the real sale price, above $0" });
  }

  try {
    const updated = await recordOutcome(id, {
      stage,
      actualPrice: stage === "sold" ? soldFor : undefined,
      recordedAt: new Date().toISOString(),
      method: "manual",
    });
    if (!updated) return res.status(404).json({ success: false, error: "No prediction with that id" });
    // A real reported sale also teaches the price brain (logged, never blocks recording the outcome).
    // The brain may refuse the number (for example a typo far above the recorded price); say so instead of hiding it.
    const brain = stage === "sold" ? teachBrainFromSale(getBrain(), updated, soldFor) : undefined;
    res.json({ success: true, data: updated, brain });
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
