import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { DEFAULT_MODELS } from "../types";

export function createOpenAIModel(
  apiKey: string,
  model?: string
): LanguageModel {
  const client = createOpenAI({ apiKey });
  return client(model ?? DEFAULT_MODELS.openai);
}
