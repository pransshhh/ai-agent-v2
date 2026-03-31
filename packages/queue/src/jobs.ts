export interface PlanningJobPayload {
  runId: string;
  userId: string;
  projectId: string;
  prompt: string;
  aiProvider: "anthropic" | "gemini" | "openai";
  aiApiKey: string;
}

export interface CodingJobPayload {
  runId: string;
  userId: string;
  projectId: string;
  sprintId: number;
  s3Prefix: string;
  aiProvider: "anthropic" | "gemini" | "openai";
  aiApiKey: string;
}

export type JobPayload = PlanningJobPayload | CodingJobPayload;
