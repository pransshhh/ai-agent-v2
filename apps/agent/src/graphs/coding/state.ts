import { Annotation } from "@langchain/langgraph";

/**
 * State for the coding graph.
 * One instance per ticket — graph runs once per ticket in the sprint.
 */
export const CodingState = Annotation.Root({
  // Input
  runId: Annotation<string>,
  userId: Annotation<string>,
  projectId: Annotation<string>,
  jiraProjectKey: Annotation<string>,
  jiraBoardId: Annotation<number>,
  sprintId: Annotation<number>,
  s3Prefix: Annotation<string>,
  aiProvider: Annotation<"anthropic" | "gemini" | "openai">,
  aiApiKey: Annotation<string>,

  // GitHub fields — set by worker before invoking the graph
  githubOwner: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  githubRepo: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  githubPat: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  githubRepoUrl: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  githubBaseBranch: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  featureBranch: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  // CONTEXT.md content — injected into coding node system prompt
  repoContext: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),

  // Current ticket being worked on
  currentTicketKey: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  currentTicketSummary: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  currentTicketDescription: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),

  // Tracks completed tickets across iterations
  completedTickets: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => [...a, ...b]
  }),
  failedTickets: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => [...a, ...b]
  }),

  // HIL rejection context — set when this is a retry run
  rejectedTicketKey: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  rejectedTicketFeedback: Annotation<string | null>({
    default: () => null,
    reducer: (_, b) => b
  }),

  // Working directory on the agent server
  workDir: Annotation<string | null>({
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

export type CodingStateType = typeof CodingState.State;
