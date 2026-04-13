import { Annotation } from "@langchain/langgraph";
import type { SecurityReport } from "@repo/zod/agent";

export interface SecurityTicket {
  key: string;
  summary: string;
}

export const SecurityState = Annotation.Root({
  // Input
  runId: Annotation<string>,
  githubOwner: Annotation<string>,
  githubRepo: Annotation<string>,
  githubPat: Annotation<string>,
  featureBranch: Annotation<string>,
  baseBranch: Annotation<string>,
  tickets: Annotation<SecurityTicket[]>,
  aiProvider: Annotation<"anthropic" | "gemini" | "openai">,
  aiApiKey: Annotation<string>,

  // Output
  securityReport: Annotation<SecurityReport | null>({
    default: () => null,
    reducer: (_, b) => b
  }),

  // Terminal state
  status: Annotation<"running" | "done" | "failed">({
    default: () => "running",
    reducer: (_, b) => b
  }),
  error: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  })
});

export type SecurityStateType = typeof SecurityState.State;
