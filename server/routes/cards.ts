import path from "node:path";
import { Router, Response } from "express";
import { ebayMarketplaceProvider } from "../marketplace/ebayProvider";
import { CardApiError, createPokemonTcgClient, parseCardNumber, PokemonCard } from "../cards/pokemonTcg";
import { PhotoInput, PhotoRead, readCardPhoto, VisionNotConfigured } from "../cards/vision";
import { CardValue, valueCard, ValueDeps } from "../cards/value";
import { FileGradeLog, GradeLog, GradeLogInputError } from "../cards/gradeLog";

export interface CardsDeps {
  tcg: { search(hint: { name?: string; number?: string; printedTotal?: string }, limit?: number): Promise<PokemonCard[]>; get(id: string): Promise<PokemonCard | null> };
  readPhoto(image: PhotoInput): Promise<PhotoRead>;
  value(card: PokemonCard): Promise<CardValue>;
  gradeLog(): GradeLog;
}

let sharedLog: GradeLog | null = null;

export function liveCardsDeps(): CardsDeps {
  const tcg = createPokemonTcgClient({ apiKey: process.env.POKEMONTCG_API_KEY?.trim() || undefined });
  const ebay: ValueDeps = {
    ebaySearch: (q) => ebayMarketplaceProvider.searchBrowseItems(q, { limit: 50, filter: "buyingOptions:{FIXED_PRICE}" }),
  };
  return {
    tcg,
    readPhoto: (image) => readCardPhoto(image, { env: process.env, fetchImpl: fetch, timeoutMs: 25_000 }),
    value: (card) => valueCard(card, ebay),
    gradeLog: () => (sharedLog ??= new GradeLog(new FileGradeLog(process.env.CARD_GRADES_FILE || path.join(process.cwd(), "data", "card-grades.json")))),
  };
}

function fail(res: Response, route: string, err: unknown): void {
  if (err instanceof VisionNotConfigured) {
    res.status(503).json({ success: false, code: "vision_not_configured", error: err.message });
  } else if (err instanceof GradeLogInputError) {
    res.status(400).json({ success: false, error: err.message });
  } else if (err instanceof CardApiError) {
    // These messages are written for people and never contain keys or paths.
    res.status(err.status === 400 ? 400 : 502).json({ success: false, error: err.message });
  } else if (err instanceof Error && /^(Google rejected|The photo reader|That (isn't|photo)|Could not reach the photo)/.test(err.message)) {
    res.status(err.message.startsWith("That ") ? 400 : 502).json({ success: false, error: err.message });
  } else {
    console.error(`[cards${route}]`, err);
    res.status(500).json({ success: false, error: "Something went wrong with the card lookup. Details are in the server log." });
  }
}

/** Router factory so tests can hand it their own services. */
export function createCardsRouter(deps: CardsDeps = liveCardsDeps()): Router {
  const router = Router();

  router.get("/cards/search", async (req, res) => {
    const name = typeof req.query.name === "string" ? req.query.name : undefined;
    const rawNumber = typeof req.query.number === "string" ? req.query.number : undefined;
    const parsed = rawNumber ? parseCardNumber(rawNumber) : null;
    if (rawNumber && !parsed) return res.status(400).json({ success: false, error: "That card number doesn't look right. Try 4/102." });
    try {
      res.json({ success: true, data: await deps.tcg.search({ name, number: parsed?.number, printedTotal: parsed?.printedTotal }) });
    } catch (err) {
      fail(res, "/search", err);
    }
  });

  router.post("/cards/identify", async (req, res) => {
    const image = req.body?.image;
    if (!image || typeof image !== "object") return res.status(400).json({ success: false, error: "image is required." });
    try {
      const read = await deps.readPhoto({ base64: image.base64, mimeType: image.mimeType });
      let candidates = await deps.tcg.search({ name: read.name, number: read.number, printedTotal: read.printedTotal });
      // If the exact set size didn't match anything, widen to name + number.
      if (candidates.length === 0 && read.printedTotal) candidates = await deps.tcg.search({ name: read.name, number: read.number });
      res.json({ success: true, data: { read, candidates } });
    } catch (err) {
      fail(res, "/identify", err);
    }
  });

  router.get("/cards/grade-summary", (_req, res) => {
    try {
      res.json({ success: true, data: deps.gradeLog().summary() });
    } catch (err) {
      fail(res, "/grade-summary", err);
    }
  });

  router.post("/cards/grade-result", (req, res) => {
    try {
      const { cardId, company, grade, centering } = req.body ?? {};
      deps.gradeLog().record({ cardId, company, grade, centering });
      res.json({ success: true, data: deps.gradeLog().summary() });
    } catch (err) {
      fail(res, "/grade-result", err);
    }
  });

  router.get("/cards/card/:id", async (req, res) => {
    if (!/^[A-Za-z0-9.-]{1,24}$/.test(req.params.id)) return res.status(400).json({ success: false, error: "That card id doesn't look right." });
    try {
      const card = await deps.tcg.get(req.params.id);
      if (!card) return res.status(404).json({ success: false, error: "No card with that id." });
      res.json({ success: true, data: { card, value: await deps.value(card) } });
    } catch (err) {
      fail(res, "/card", err);
    }
  });

  return router;
}
