import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ZAgentJobResponse,
  ZApprovePlanningRequest,
  ZApprovePlanningResponse,
  ZStartPlanningRequest
} from "@repo/zod";
import { ZErrorResponse, ZSuccessResponse } from "@repo/zod/common";
import {
  ZCreateProjectRequest,
  ZLinkJiraRequest,
  ZProject,
  ZUpdateProjectRequest
} from "@repo/zod/project";
import { z } from "zod";

export function registerProjectPaths(registry: OpenAPIRegistry) {
  const cookieAuth = [{ cookieAuth: [] }];
  const idParam = z.object({ id: z.string().openapi({ example: "clx1234" }) });

  registry.registerPath({
    method: "get",
    path: "/api/v1/projects",
    tags: ["Projects"],
    summary: "List all projects for the authenticated user",
    security: cookieAuth,
    responses: {
      200: {
        description: "List of projects",
        content: { "application/json": { schema: z.array(ZProject) } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/projects",
    tags: ["Projects"],
    summary: "Create a new project",
    security: cookieAuth,
    request: {
      body: {
        content: { "application/json": { schema: ZCreateProjectRequest } }
      }
    },
    responses: {
      201: {
        description: "Project created",
        content: { "application/json": { schema: ZProject } }
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
    method: "get",
    path: "/api/v1/projects/{id}",
    tags: ["Projects"],
    summary: "Get a project by ID",
    security: cookieAuth,
    request: { params: idParam },
    responses: {
      200: {
        description: "Project details",
        content: { "application/json": { schema: ZProject } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      403: {
        description: "Forbidden",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      404: {
        description: "Project not found",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/projects/{id}",
    tags: ["Projects"],
    summary: "Update a project",
    security: cookieAuth,
    request: {
      params: idParam,
      body: {
        content: { "application/json": { schema: ZUpdateProjectRequest } }
      }
    },
    responses: {
      200: {
        description: "Project updated",
        content: { "application/json": { schema: ZProject } }
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      404: {
        description: "Project not found",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/projects/{id}",
    tags: ["Projects"],
    summary: "Delete a project",
    security: cookieAuth,
    request: { params: idParam },
    responses: {
      200: {
        description: "Project deleted",
        content: { "application/json": { schema: ZSuccessResponse } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      404: {
        description: "Project not found",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/projects/{id}/jira/link",
    tags: ["Projects"],
    summary: "Link a Jira project to this project",
    security: cookieAuth,
    request: {
      params: idParam,
      body: {
        content: { "application/json": { schema: ZLinkJiraRequest } }
      }
    },
    responses: {
      200: {
        description: "Jira project linked",
        content: { "application/json": { schema: ZProject } }
      },
      400: {
        description: "Validation failed",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      404: {
        description: "Project or Jira board not found",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/projects/{id}/jira/unlink",
    tags: ["Projects"],
    summary: "Remove Jira link from this project",
    security: cookieAuth,
    request: { params: idParam },
    responses: {
      200: {
        description: "Jira unlinked",
        content: { "application/json": { schema: ZProject } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      404: {
        description: "Project not found",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/projects/{id}/agent/planning/start",
    tags: ["Projects"],
    summary: "Start planning — generate Jira tickets from a prompt",
    description:
      "Enqueues a planning job. The Jira agent creates epics, stories, and a sprint. " +
      "Returns a runId — store it to pass to the approve endpoint. " +
      "Project must have Jira linked before calling this.",
    security: cookieAuth,
    request: {
      params: idParam,
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
        description: "Validation failed or Jira not linked",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      404: {
        description: "Project not found",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/projects/{id}/agent/planning/approve",
    tags: ["Projects"],
    summary: "Approve planning — start coding after reviewing Jira tickets",
    description:
      "User has reviewed the generated Jira tickets and approves coding to begin. " +
      "Sprint ID is read from the project in DB — no need to pass it. " +
      "Project must be in PLANNED status.",
    security: cookieAuth,
    request: {
      params: idParam,
      body: {
        content: { "application/json": { schema: ZApprovePlanningRequest } }
      }
    },
    responses: {
      201: {
        description: "Coding job enqueued",
        content: { "application/json": { schema: ZApprovePlanningResponse } }
      },
      400: {
        description: "Validation failed or project not in PLANNED status",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      404: {
        description: "Project not found",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });
}
