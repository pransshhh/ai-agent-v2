import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { DEFAULT_MODELS } from "../types";

export function createGeminiModel(
  apiKey: string,
  model?: string
): LanguageModel {
  const client = createGoogleGenerativeAI({ apiKey });
  return client(model ?? DEFAULT_MODELS.gemini);
}
