import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ZAgentJobResponse,
  ZApprovePlanningRequest,
  ZApprovePlanningResponse,
  ZStartPlanningRequest
} from "@repo/zod/agent";
import { ZErrorResponse } from "@repo/zod/common";

export function registerAgentPaths(registry: OpenAPIRegistry) {
  const cookieAuth = [{ cookieAuth: [] }];

  registry.registerPath({
    method: "post",
    path: "/api/v1/agent/planning/start",
    tags: ["Agent"],
    summary: "Start planning — generate Jira tickets from a prompt",
    description:
      "Enqueues a planning job. The Jira agent creates epics, stories, and a sprint. " +
      "Returns a runId — store it to pass to the approve endpoint.",
    security: cookieAuth,
    request: {
      body: {
        content: { "application/json": { schema: ZStartPlanningRequest } }
      }
    },
    responses: {
      201: {
        description: "Planning job enqueued",
        content: { "application/json": { schema: ZAgentJobResponse } }
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/agent/planning/approve",
    tags: ["Agent"],
    summary: "Approve planning — start coding after reviewing Jira tickets",
    description:
      "User has reviewed the generated Jira tickets and approves coding to begin. " +
      "Enqueues a coding job that implements tickets from the sprint one by one.",
    security: cookieAuth,
    request: {
      body: {
        content: {
          "application/json": { schema: ZApprovePlanningRequest }
        }
      }
    },
    responses: {
      201: {
        description: "Coding job enqueued",
        content: { "application/json": { schema: ZApprovePlanningResponse } }
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });
}
