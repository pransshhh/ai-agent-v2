import { Annotation } from "@langchain/langgraph";

/**
 * State for the planning graph.
 * LangGraph passes this between nodes — each node reads and updates it.
 */
export const PlanningState = Annotation.Root({
  // Input — set when job is dequeued
  runId: Annotation<string>,
  userId: Annotation<string>,
  projectId: Annotation<string>,
  prompt: Annotation<string>,
  aiProvider: Annotation<"anthropic" | "gemini" | "openai">,
  aiApiKey: Annotation<string>,

  // Set by jira node
  epicKeys: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => [...a, ...b]
  }),
  sprintId: Annotation<number | null>({
    default: () => null,
    reducer: (_, b) => b
  }),
  ticketKeys: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => [...a, ...b]
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

export type PlanningStateType = typeof PlanningState.State;
