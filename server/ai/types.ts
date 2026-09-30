export interface AiCallOptions {
  responseMimeType?: string;
  systemInstruction?: string;
}

export interface AiCallResult {
  text: string;
  model: string;
  provider: string;
}

export type AiProviderFn = (prompt: string, options?: AiCallOptions) => Promise<AiCallResult>;
