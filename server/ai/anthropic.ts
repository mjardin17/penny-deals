import Anthropic from "@anthropic-ai/sdk";
import { AiCallOptions, AiCallResult } from "./types";

let client: Anthropic | null = null;

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic | null {
  if (!hasAnthropicKey()) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// "-latest" aliases so this doesn't go stale as Anthropic ships new snapshots.
const CANDIDATE_MODELS = ["claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"];
const MAX_TOKENS = 4096;

export async function callAnthropic(prompt: string, options?: AiCallOptions): Promise<AiCallResult> {
  const anthropic = getClient();
  if (!anthropic) {
    const err: any = new Error("ANTHROPIC_API_KEY is not configured.");
    err.status = 503;
    throw err;
  }

  // Claude has no strict JSON response mode; ask for it explicitly and lean on the
  // caller's resilient JSON extraction (parseJsonResponse) for markdown-fenced replies.
  const system =
    options?.responseMimeType === "application/json"
      ? [options?.systemInstruction, "Respond with JSON only, no prose, no markdown fences."].filter(Boolean).join("\n\n")
      : options?.systemInstruction;

  let lastError: unknown = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content.filter((b) => b.type === "text").map((b) => (b as any).text).join("");
      if (text.trim()) return { text, model, provider: "anthropic" };
    } catch (err: any) {
      console.warn(`[anthropic] ${model} failed: ${err.status || err.message}. Trying next model.`);
      lastError = err;
    }
  }
  throw lastError || new Error("All Anthropic models failed to generate content");
}
