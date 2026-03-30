import type { LanguageModel } from "ai";
import { createAnthropicModel } from "./providers/anthropic";
import { createGeminiModel } from "./providers/gemini";
import { createOpenAIModel } from "./providers/openai";
import type { AIModelConfig } from "./types";

export function createModel(config: AIModelConfig): LanguageModel {
  switch (config.provider) {
    case "anthropic":
      return createAnthropicModel(config.apiKey, config.model);
    case "gemini":
      return createGeminiModel(config.apiKey, config.model);
    case "openai":
      return createOpenAIModel(config.apiKey, config.model);
  }
}
