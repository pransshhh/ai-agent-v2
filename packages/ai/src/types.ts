import type { LanguageModel } from "ai";

export type AIProviderName = "anthropic" | "gemini" | "openai";

export interface AIModelConfig {
  provider: AIProviderName;
  apiKey: string;
  model?: string;
}

export type { LanguageModel };

export const DEFAULT_MODELS: Record<AIProviderName, string> = {
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.0-flash",
  openai: "gpt-4o"
};
