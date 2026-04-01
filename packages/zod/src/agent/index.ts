import { z } from "zod";

export const ZStartPlanningRequest = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(2000, "Prompt must be at most 2000 characters")
    .openapi({ example: "Build a todo app with auth and a dashboard" }),
  // Hardcoded for now — will be derived from authenticated project in next commit
  projectId: z
    .string()
    .min(1)
    .default("default-project")
    .openapi({ example: "my-project" })
});

export const ZApprovePlanningRequest = z.object({
  // runId from the planning job response — links coding job to planning run
  runId: z.uuid("runId must be a valid UUID").openapi({
    example: "46cab1f8-eaf9-4c58-8002-de3bdd6ecb52"
  }),
  projectId: z.string().min(1).openapi({ example: "my-project" }),
  sprintId: z.coerce
    .number({ message: "sprintId must be a number" })
    .int()
    .positive()
    .openapi({ example: 68 })
});

export const ZAgentJobResponse = z.object({
  jobId: z.string(),
  runId: z.uuid()
});

export const ZApprovePlanningResponse = z.object({
  jobId: z.string(),
  runId: z.uuid(),
  sprintId: z.number()
});

export type StartPlanningRequest = z.infer<typeof ZStartPlanningRequest>;
export type ApprovePlanningRequest = z.infer<typeof ZApprovePlanningRequest>;
export type AgentJobResponse = z.infer<typeof ZAgentJobResponse>;
export type ApprovePlanningResponse = z.infer<typeof ZApprovePlanningResponse>;
