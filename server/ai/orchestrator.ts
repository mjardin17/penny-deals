/**
 * Multi-provider AI orchestrator. Tries each configured provider in order and
 * returns the first success. Nothing is invented if none are configured — it
 * throws a clear, honest error instead, same as the rest of this app's marketplace
 * providers do for missing credentials.
 */

import { callGenAI as callGemini_ } from "../gemini";
import { callOpenAi, hasOpenAiKey } from "./openai";
import { callAnthropic, hasAnthropicKey } from "./anthropic";
import { AiCallOptions, AiCallResult, AiProviderFn } from "./types";

async function callGemini(prompt: string, options?: AiCallOptions): Promise<AiCallResult> {
  const { text, model } = await callGemini_(prompt, options);
  return { text, model, provider: "gemini" };
}

export interface ProviderEntry {
  name: string;
  isConfigured: () => boolean;
  call: AiProviderFn;
}

export const liveProviders: ProviderEntry[] = [
  { name: "gemini", isConfigured: () => Boolean(process.env.GEMINI_API_KEY), call: callGemini },
  { name: "openai", isConfigured: hasOpenAiKey, call: callOpenAi },
  { name: "anthropic", isConfigured: hasAnthropicKey, call: callAnthropic },
];

export function configuredProviders(providers: ProviderEntry[] = liveProviders): string[] {
  return providers.filter((p) => p.isConfigured()).map((p) => p.name);
}

export async function callGenAI(
  prompt: string,
  options?: AiCallOptions,
  providers: ProviderEntry[] = liveProviders
): Promise<AiCallResult> {
  const configured = providers.filter((p) => p.isConfigured());
  if (configured.length === 0) {
    const err: any = new Error(
      "No AI provider is configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in .env."
    );
    err.status = 503;
    throw err;
  }

  let lastError: unknown = null;
  for (const provider of configured) {
    try {
      return await provider.call(prompt, options);
    } catch (err) {
      console.warn(`[ai-orchestrator] ${provider.name} failed, trying next provider.`, err);
      lastError = err;
    }
  }
  throw lastError || new Error("All configured AI providers failed.");
}
