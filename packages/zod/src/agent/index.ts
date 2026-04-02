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

export const ZApprovePlanningRequest = z.object({
  runId: z.string().uuid("runId must be a valid UUID").openapi({
    example: "46cab1f8-eaf9-4c58-8002-de3bdd6ecb52"
  })
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
