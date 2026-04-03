import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const ZStartPlanningRequest = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(2000)
    .openapi({ example: "Build a todo app with auth and a dashboard" })
});

export const ZApprovePlanningRequest = z.object({});

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
// ApprovePlanningRequest is intentionally empty — the backend generates its own codingRunId
export type AgentJobResponse = z.infer<typeof ZAgentJobResponse>;
export type ApprovePlanningResponse = z.infer<typeof ZApprovePlanningResponse>;
