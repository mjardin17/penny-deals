import OpenAI from "openai";
import { AiCallOptions, AiCallResult } from "./types";

let client: OpenAI | null = null;

export function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient(): OpenAI | null {
  if (!hasOpenAiKey()) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// Stable model aliases (not date-pinned snapshots) so this doesn't go stale.
const CANDIDATE_MODELS = ["gpt-4o-mini", "gpt-4o"];

export async function callOpenAi(prompt: string, options?: AiCallOptions): Promise<AiCallResult> {
  const openai = getClient();
  if (!openai) {
    const err: any = new Error("OPENAI_API_KEY is not configured.");
    err.status = 503;
    throw err;
  }

  let lastError: unknown = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          ...(options?.systemInstruction ? [{ role: "system" as const, content: options.systemInstruction }] : []),
          { role: "user" as const, content: prompt },
        ],
        response_format: options?.responseMimeType === "application/json" ? { type: "json_object" } : undefined,
      });
      const text = response.choices[0]?.message?.content || "";
      if (text.trim()) return { text, model, provider: "openai" };
    } catch (err: any) {
      console.warn(`[openai] ${model} failed: ${err.status || err.message}. Trying next model.`);
      lastError = err;
    }
  }
  throw lastError || new Error("All OpenAI models failed to generate content");
}
