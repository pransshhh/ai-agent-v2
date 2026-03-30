import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { DEFAULT_MODELS } from "../types";

export function createAnthropicModel(
  apiKey: string,
  model?: string
): LanguageModel {
  const client = createAnthropic({ apiKey });
  return client(model ?? DEFAULT_MODELS.anthropic);
}
