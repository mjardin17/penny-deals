/**
 * Gemini helpers ported from Ebay-amazon-app/server.ts.
 * Everything produced here is an AI estimate and must be labelled
 * provenance: "estimated_inferred_ai" by the caller.
 */

import { GoogleGenAI } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!genAIClient) genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return genAIClient;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 300;
const apiCache = new Map<string, { data: unknown; timestamp: number }>();

export function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    apiCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached(key: string, data: unknown): void {
  if (apiCache.size >= CACHE_MAX) {
    const oldestKey = apiCache.keys().next().value;
    if (oldestKey) apiCache.delete(oldestKey);
  }
  apiCache.set(key, { data, timestamp: Date.now() });
}

export function cacheSize(): number {
  return apiCache.size;
}

export function parseJsonResponse(rawText: string): any {
  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBracket = cleaned.indexOf("[");
    const firstBrace = cleaned.indexOf("{");
    const useBracket = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
    const start = useBracket ? firstBracket : firstBrace;
    const end = useBracket ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.substring(start, end + 1));
    throw new Error(`Failed to parse AI JSON response: ${rawText.slice(0, 200)}...`);
  }
}

const CANDIDATE_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

export async function callGenAI(
  contents: unknown,
  options?: { responseMimeType?: string; systemInstruction?: string }
): Promise<{ text: string; model: string }> {
  const ai = getGenAI();
  if (!ai) {
    const err: any = new Error("GEMINI_API_KEY is not configured.");
    err.status = 503;
    throw err;
  }

  let lastError: unknown = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const config: Record<string, string> = {};
      if (options?.responseMimeType) config.responseMimeType = options.responseMimeType;
      if (options?.systemInstruction) config.systemInstruction = options.systemInstruction;
      const response = await ai.models.generateContent({
        model,
        contents: contents as any,
        config: Object.keys(config).length > 0 ? config : undefined,
      });
      const text = response.text || "";
      if (text.trim()) return { text, model };
    } catch (err: any) {
      console.warn(`[gemini] ${model} failed: ${err.status || err.message}. Trying next model.`);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini models failed to generate content");
}
