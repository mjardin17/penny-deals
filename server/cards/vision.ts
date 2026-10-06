/**
 * Reads the printed name and number off a card photo with Gemini. The answer is only a HINT: the card is
 * then looked up in the real card database, and the person confirms it. Whatever the model returns is
 * checked field by field before it is used.
 */

import { parseCardNumber } from "./pokemonTcg";

export class VisionNotConfigured extends Error {
  constructor() {
    super("Reading card photos needs GEMINI_API_KEY (free at aistudio.google.com). You can still search by name and number.");
    this.name = "VisionNotConfigured";
  }
}

export interface PhotoInput {
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

export interface PhotoRead {
  name?: string;
  number?: string;
  printedTotal?: string;
  setName?: string;
  confidence: "high" | "medium" | "low";
}

export interface VisionDeps {
  env: Record<string, string | undefined>;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}

const MAX_BASE64_CHARS = 1_200_000;
const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PROMPT =
  "Read this photo of a Pokemon trading card. Reply with JSON only: " +
  '{"name": the card\'s printed name, "number": the collector number exactly as printed (for example 4/102), ' +
  '"setName": the set name only if it is printed or you are sure, "confidence": "high", "medium" or "low"}. ' +
  "Leave out any field you cannot actually read. Do not guess.";

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return clean || undefined;
}

export async function readCardPhoto(image: PhotoInput, deps: VisionDeps): Promise<PhotoRead> {
  if (!MIME_TYPES.includes(image?.mimeType)) throw new Error("That isn't a supported image (use a JPEG, PNG or WebP photo).");
  if (typeof image.base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64)) throw new Error("That isn't a readable image.");
  if (image.base64.length > MAX_BASE64_CHARS) throw new Error("That photo is too large. Use a smaller photo (size limit).");

  const key = deps.env.GEMINI_API_KEY?.trim();
  if (!key) throw new VisionNotConfigured();

  const model = /^[\w.-]+$/.test(deps.env.GEMINI_VISION_MODEL ?? "") && deps.env.GEMINI_VISION_MODEL ? deps.env.GEMINI_VISION_MODEL : "gemini-2.5-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs);
  let payload: any;
  try {
    const res = await deps.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: image.mimeType, data: image.base64 } }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error(`Google rejected the key or the photo (HTTP ${res.status}).`);
      throw new Error(`The photo reader is unavailable right now (HTTP ${res.status}).`);
    }
    payload = await res.json();
  } catch (err) {
    if (controller.signal.aborted) throw new Error("The photo reader timed out.");
    if (err instanceof Error && /^(Google rejected|The photo reader)/.test(err.message)) throw err;
    throw new Error("Could not reach the photo reader.");
  } finally {
    clearTimeout(timer);
  }

  const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  let parsed: any;
  try {
    parsed = JSON.parse(String(raw ?? "").replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new Error("The photo reader returned something unreadable (not JSON).");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("The photo reader returned something unreadable (not JSON).");

  const out: PhotoRead = { confidence: parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low" };
  const name = text(parsed.name, 80);
  if (name) out.name = name;
  const num = typeof parsed.number === "string" ? parseCardNumber(parsed.number) : null;
  if (num) {
    out.number = num.number;
    if (num.printedTotal) out.printedTotal = num.printedTotal;
  }
  const setName = text(parsed.setName, 60);
  if (setName) out.setName = setName;
  if (!out.name && !out.number) throw new Error("The photo reader couldn't read a name or number from this card. Try a sharper, straighter photo.");
  return out;
}
