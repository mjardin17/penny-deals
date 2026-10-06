import { Router } from "express";
import { ebayMarketplaceProvider } from "../marketplace/ebayProvider";
import { amazonProvider } from "../marketplace/amazonProvider";
import { getBrainHandle } from "../brain/instance";
import { createIntegrationChecker, IntegrationDeps, IntegrationStatus } from "../integrations/liveChecks";

const CHECK_TIMEOUT_MS = 8_000;

type Checker = { get(options?: { fresh?: boolean }): Promise<IntegrationStatus[]> };

/** Real services, read at call time so a changed .env is picked up after a restart only. */
function liveDeps(): IntegrationDeps {
  return {
    env: process.env,
    fetchImpl: fetch,
    ebay: {
      hasCredentials: () => ebayMarketplaceProvider.tokenManager.hasCredentials(),
      probe: async () => (await ebayMarketplaceProvider.searchBrowseItems("pokemon trading cards", { limit: 1 })).length,
    },
    amazon: { status: async () => amazonProvider.getCapabilityStatus() },
    get brain() {
      const handle = getBrainHandle();
      return { available: Boolean(handle.brain), error: handle.error };
    },
    now: Date.now,
    timeoutMs: CHECK_TIMEOUT_MS,
  };
}

/** Router factory so tests can hand it their own checker. */
export function createIntegrationsRouter(checker: Checker = createIntegrationChecker(liveDeps())): Router {
  const router = Router();
  router.get("/integrations/status", async (req, res) => {
    try {
      const data = await checker.get({ fresh: req.query.fresh === "1" });
      res.json({ success: true, data });
    } catch (err) {
      console.error("[integrations/status]", err);
      res.status(500).json({ success: false, error: "Could not check the connections. Details are in the server log." });
    }
  });
  return router;
}
