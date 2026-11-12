import { Router } from "express";
import { LiveDealsResult, sharedLiveDeals } from "../deals/liveDeals";

type Feed = { get(zip: string): Promise<LiveDealsResult> };

function defaultFeed(): Feed {
  return sharedLiveDeals();
}

/** Router factory so tests can hand it their own feed. */
export function createDealsRouter(feed?: Feed, defaultZip = () => process.env.DIGEST_ZIP || "02745"): Router {
  const router = Router();
  router.get("/deals/today", async (req, res) => {
    const zip = typeof req.query.zip === "string" && req.query.zip ? req.query.zip : defaultZip();
    if (!/^\d{5}$/.test(zip)) return res.status(400).json({ success: false, error: "ZIP must be 5 digits." });
    try {
      res.json({ success: true, data: await (feed ?? defaultFeed()).get(zip) });
    } catch (err) {
      console.error("[deals/today]", err);
      res.status(502).json({ success: false, error: "Could not reach the deal sources right now. Details are in the server log." });
    }
  });
  return router;
}
