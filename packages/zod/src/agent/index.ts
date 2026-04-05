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

export const ZStartCodingRequest = z.object({
  sprintId: z.number().int().positive().openapi({ example: 1 })
});

export const ZApproveSprintRequest = z.object({});

export const ZRejectSprintRequest = z.object({
  issueKey: z
    .string()
    .min(1, "Issue key is required")
    .openapi({ example: "SCRUM-5" }),
  feedback: z
    .string()
    .min(1, "Feedback is required")
    .max(2000)
    .openapi({ example: "The login flow doesn't handle invalid credentials" })
});

export const ZAgentJobResponse = z.object({
  jobId: z.string(),
  runId: z.uuid()
});

export const ZApprovePlanningResponse = z.object({
  status: z.literal("approved")
});

export type StartPlanningRequest = z.infer<typeof ZStartPlanningRequest>;
export type StartCodingRequest = z.infer<typeof ZStartCodingRequest>;
export type AgentJobResponse = z.infer<typeof ZAgentJobResponse>;
export type ApprovePlanningResponse = z.infer<typeof ZApprovePlanningResponse>;
export type RejectSprintRequest = z.infer<typeof ZRejectSprintRequest>;
