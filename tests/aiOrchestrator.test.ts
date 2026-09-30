import { test } from "node:test";
import assert from "node:assert/strict";
import { callGenAI, configuredProviders, ProviderEntry } from "../server/ai/orchestrator";
import { AiCallResult } from "../server/ai/types";

function fakeProvider(name: string, configured: boolean, behavior: "succeed" | "fail"): ProviderEntry {
  return {
    name,
    isConfigured: () => configured,
    call: async (prompt: string): Promise<AiCallResult> => {
      if (behavior === "fail") throw new Error(`${name} boom`);
      return { text: `${name}:${prompt}`, model: `${name}-model`, provider: name };
    },
  };
}

test("callGenAI throws an honest error when nothing is configured, never invents a response", async () => {
  const providers = [fakeProvider("gemini", false, "succeed"), fakeProvider("openai", false, "succeed")];
  await assert.rejects(() => callGenAI("hi", undefined, providers), /No AI provider is configured/);
});

test("callGenAI uses the first configured provider", async () => {
  const providers = [fakeProvider("gemini", true, "succeed"), fakeProvider("openai", true, "succeed")];
  const result = await callGenAI("hi", undefined, providers);
  assert.equal(result.provider, "gemini");
  assert.equal(result.text, "gemini:hi");
});

test("callGenAI skips unconfigured providers and uses the next configured one", async () => {
  const providers = [fakeProvider("gemini", false, "succeed"), fakeProvider("openai", true, "succeed")];
  const result = await callGenAI("hi", undefined, providers);
  assert.equal(result.provider, "openai");
});

test("callGenAI falls through to the next configured provider if the first one fails", async () => {
  const providers = [
    fakeProvider("gemini", true, "fail"),
    fakeProvider("openai", true, "fail"),
    fakeProvider("anthropic", true, "succeed"),
  ];
  const result = await callGenAI("hi", undefined, providers);
  assert.equal(result.provider, "anthropic");
});

test("callGenAI throws the last error when every configured provider fails", async () => {
  const providers = [fakeProvider("gemini", true, "fail"), fakeProvider("openai", true, "fail")];
  await assert.rejects(() => callGenAI("hi", undefined, providers), /openai boom/);
});

test("configuredProviders lists only the ones with credentials", () => {
  const providers = [fakeProvider("gemini", true, "succeed"), fakeProvider("openai", false, "succeed"), fakeProvider("anthropic", true, "succeed")];
  assert.deepEqual(configuredProviders(providers), ["gemini", "anthropic"]);
});
