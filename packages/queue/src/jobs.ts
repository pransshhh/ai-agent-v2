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
  /** Decrypted GitHub PAT — only set when GitHub is connected. */
  githubPat?: string;
  githubRepoUrl?: string;
  githubBaseBranch?: string;
  /** Ticket key that was HIL-rejected. Coding agent receives feedback for this ticket. */
  rejectedTicketKey?: string;
  /** Feedback from the human reviewer for the rejected ticket. */
  rejectedTicketFeedback?: string;
  /** Feedback from a GitHub PR reviewer. When set, agent fixes the PR instead of iterating tickets. */
  prFeedback?: string;
  /** Explicit feature branch name — used for PR fix runs where the branch already exists. */
  featureBranch?: string;
}

export interface TestingJobPayload {
  runId: string;
  userId: string;
  projectId: string;
  jiraProjectKey: string;
  sprintId: number;
  featureBranch: string;
  githubPat: string;
  githubRepoUrl: string;
  aiProvider: "anthropic" | "gemini" | "openai";
  aiApiKey: string;
}

export interface SecurityJobPayload {
  runId: string;
  userId: string;
  projectId: string;
  jiraProjectKey: string;
  sprintId: number;
  featureBranch: string;
  githubPat: string;
  githubRepoUrl: string;
  githubBaseBranch: string;
  aiProvider: "anthropic" | "gemini" | "openai";
  aiApiKey: string;
}

export type JobPayload =
  | PlanningJobPayload
  | SprintPlanningJobPayload
  | CodingJobPayload
  | TestingJobPayload
  | SecurityJobPayload;
