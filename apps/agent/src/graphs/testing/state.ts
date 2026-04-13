import { Annotation } from "@langchain/langgraph";

export interface TestingTicket {
  key: string;
  summary: string;
  description?: string | null;
}

export const TestingState = Annotation.Root({
  // Input
  runId: Annotation<string>,
  githubOwner: Annotation<string>,
  githubRepo: Annotation<string>,
  githubPat: Annotation<string>,
  featureBranch: Annotation<string>,
  repoContext: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  tickets: Annotation<TestingTicket[]>,
  aiProvider: Annotation<"anthropic" | "gemini" | "openai">,
  aiApiKey: Annotation<string>,

  // Output
  testFilePaths: Annotation<string[]>({
    default: () => [],
    reducer: (_, b) => b
  }),
  testSummary: Annotation<string | null>({
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

export type TestingStateType = typeof TestingState.State;
