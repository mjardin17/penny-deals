import { Router } from "express";
import { DropFeed, sharedDrops } from "../drops/dropFeed";
import { NewSighting, validateSighting } from "../drops/sightings";
import { dropAlertsStatus, WatcherStatus } from "../drops/watcher";
import { Sighting } from "../drops/types";

export interface DropsRouterDeps {
  feed: Pick<DropFeed, "get" | "forget">;
  sightings: { add(report: NewSighting): Promise<Sighting> };
  alerts: () => WatcherStatus;
  defaultZip: () => string;
}

function defaults(): DropsRouterDeps {
  const shared = sharedDrops();
  return { feed: shared.feed, sightings: shared.sightings, alerts: dropAlertsStatus, defaultZip: () => process.env.DROP_ALERTS_ZIP || process.env.DIGEST_ZIP || "02745" };
}

/** Router factory so tests can hand it their own parts. */
export function createDropsRouter(given?: DropsRouterDeps): Router {
  const router = Router();
  let deps = given;
  const d = () => (deps ??= defaults());

  router.get("/drops", async (req, res) => {
    const zip = typeof req.query.zip === "string" && req.query.zip ? req.query.zip : d().defaultZip();
    if (!/^\d{5}$/.test(zip)) return res.status(400).json({ success: false, error: "ZIP must be 5 digits." });
    try {
      res.json({ success: true, data: { ...(await d().feed.get(zip)), alerts: d().alerts() } });
    } catch (err) {
      console.error("[drops]", err);
      res.status(502).json({ success: false, error: "Could not build the drop feed right now. Details are in the server log." });
    }
  });

  router.post("/drops/sightings", async (req, res) => {
    const report = validateSighting(req.body);
    if (typeof report === "string") return res.status(400).json({ success: false, error: report });
    try {
      const saved = await d().sightings.add(report);
      d().feed.forget(report.zip);
      res.status(201).json({ success: true, data: saved });
    } catch (err) {
      console.error("[drops/sightings]", err);
      res.status(500).json({ success: false, error: "Could not save the report. Details are in the server log." });
    }
  });

  router.get("/drops/alerts", (_req, res) => {
    res.json({ success: true, data: d().alerts() });
  });

  return router;
}
