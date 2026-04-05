export interface PlanningJobPayload {
  runId: string;
  userId: string;
  projectId: string;
  jiraProjectKey: string;
  jiraBoardId: number;
  prompt: string;
  aiProvider: "anthropic" | "gemini" | "openai";
  aiApiKey: string;
}

export interface SprintPlanningJobPayload {
  runId: string;
  userId: string;
  projectId: string;
  jiraProjectKey: string;
  jiraBoardId: number;
  /** If set, this sprint is closed before picking the next batch from backlog. */
  previousSprintId?: number;
  aiProvider: "anthropic" | "gemini" | "openai";
  aiApiKey: string;
}

export interface CodingJobPayload {
  runId: string;
  userId: string;
  projectId: string;
  jiraProjectKey: string;
  jiraBoardId: number;
  sprintId: number;
  s3Prefix: string;
  aiProvider: "anthropic" | "gemini" | "openai";
  aiApiKey: string;
  /** Ticket key that was HIL-rejected. Coding agent receives feedback for this ticket. */
  rejectedTicketKey?: string;
  /** Feedback from the human reviewer for the rejected ticket. */
  rejectedTicketFeedback?: string;
}

export type JobPayload =
  | PlanningJobPayload
  | SprintPlanningJobPayload
  | CodingJobPayload;
