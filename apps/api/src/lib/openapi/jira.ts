import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ZErrorResponse, ZSuccessResponse } from "@repo/zod/common";
import {
  ZAddCommentRequest,
  ZAssignIssueRequest,
  ZCreateEpicRequest,
  ZCreateIssueRequest,
  ZCreateSprintRequest,
  ZJiraBoard,
  ZJiraEpic,
  ZJiraIssue,
  ZJiraSprint,
  ZMoveIssuesToSprintRequest,
  ZUpdateIssueRequest,
  ZUpdateSprintRequest
} from "@repo/zod/jira";
import { z } from "zod";

export function registerJiraPaths(registry: OpenAPIRegistry) {
  const cookieAuth = [{ cookieAuth: [] }];

  registry.registerPath({
    method: "get",
    path: "/api/v1/jira/boards",
    tags: ["Jira / Boards"],
    summary: "List all boards",
    security: cookieAuth,
    responses: {
      200: {
        description: "List of boards",
        content: {
          "application/json": { schema: z.array(ZJiraBoard) }
        }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/jira/sprints",
    tags: ["Jira / Sprints"],
    summary: "List sprints",
    security: cookieAuth,
    request: {
      query: z.object({
        state: z
          .enum(["active", "closed", "future"])
          .optional()
          .openapi({ description: "Filter by sprint state" })
      })
    },
    responses: {
      200: {
        description: "List of sprints",
        content: { "application/json": { schema: z.array(ZJiraSprint) } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/jira/sprints/active",
    tags: ["Jira / Sprints"],
    summary: "Get the current active sprint",
    security: cookieAuth,
    responses: {
      200: {
        description: "Active sprint or null if none exists",
        content: {
          "application/json": { schema: ZJiraSprint.nullable() }
        }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/jira/sprints",
    tags: ["Jira / Sprints"],
    summary: "Create a sprint",
    security: cookieAuth,
    request: {
      body: {
        content: { "application/json": { schema: ZCreateSprintRequest } }
      }
    },
    responses: {
      201: {
        description: "Sprint created",
        content: { "application/json": { schema: ZJiraSprint } }
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
    method: "patch",
    path: "/api/v1/jira/sprints/{sprintId}",
    tags: ["Jira / Sprints"],
    summary: "Update a sprint",
    security: cookieAuth,
    request: {
      params: z.object({
        sprintId: z.coerce.number().openapi({ example: 1 })
      }),
      body: {
        content: { "application/json": { schema: ZUpdateSprintRequest } }
      }
    },
    responses: {
      200: {
        description: "Sprint updated",
        content: { "application/json": { schema: ZJiraSprint } }
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
    path: "/api/v1/jira/sprints/{sprintId}/issues",
    tags: ["Jira / Sprints"],
    summary: "Get issues in a sprint",
    security: cookieAuth,
    request: {
      params: z.object({
        sprintId: z.coerce.number().openapi({ example: 1 })
      })
    },
    responses: {
      200: {
        description: "List of issues in the sprint",
        content: { "application/json": { schema: z.array(ZJiraIssue) } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/jira/sprints/{sprintId}/issues",
    tags: ["Jira / Sprints"],
    summary: "Move issues into a sprint",
    security: cookieAuth,
    request: {
      params: z.object({
        sprintId: z.coerce.number().openapi({ example: 1 })
      }),
      body: {
        content: {
          "application/json": { schema: ZMoveIssuesToSprintRequest }
        }
      }
    },
    responses: {
      200: {
        description: "Issues moved",
        content: { "application/json": { schema: ZSuccessResponse } }
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
    path: "/api/v1/jira/issues",
    tags: ["Jira / Issues"],
    summary: "Create an issue",
    security: cookieAuth,
    request: {
      body: {
        content: { "application/json": { schema: ZCreateIssueRequest } }
      }
    },
    responses: {
      201: {
        description: "Issue created",
        content: { "application/json": { schema: ZJiraIssue } }
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
    path: "/api/v1/jira/issues/{issueKey}",
    tags: ["Jira / Issues"],
    summary: "Get an issue by key",
    security: cookieAuth,
    request: {
      params: z.object({
        issueKey: z.string().openapi({ example: "SCRUM-1" })
      })
    },
    responses: {
      200: {
        description: "Issue details",
        content: { "application/json": { schema: ZJiraIssue } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      },
      404: {
        description: "Issue not found",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/jira/issues/{issueKey}",
    tags: ["Jira / Issues"],
    summary: "Update an issue",
    security: cookieAuth,
    request: {
      params: z.object({
        issueKey: z.string().openapi({ example: "SCRUM-1" })
      }),
      body: {
        content: { "application/json": { schema: ZUpdateIssueRequest } }
      }
    },
    responses: {
      200: {
        description: "Issue updated",
        content: { "application/json": { schema: ZJiraIssue } }
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
    path: "/api/v1/jira/issues/{issueKey}/close",
    tags: ["Jira / Issues"],
    summary: "Close an issue (transition to Done)",
    security: cookieAuth,
    request: {
      params: z.object({
        issueKey: z.string().openapi({ example: "SCRUM-1" })
      })
    },
    responses: {
      200: {
        description: "Issue closed",
        content: { "application/json": { schema: ZSuccessResponse } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/jira/issues/{issueKey}/assign",
    tags: ["Jira / Issues"],
    summary: "Assign an issue to a user",
    security: cookieAuth,
    request: {
      params: z.object({
        issueKey: z.string().openapi({ example: "SCRUM-1" })
      }),
      body: {
        content: { "application/json": { schema: ZAssignIssueRequest } }
      }
    },
    responses: {
      200: {
        description: "Issue assigned",
        content: { "application/json": { schema: ZSuccessResponse } }
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
    path: "/api/v1/jira/issues/{issueKey}/comments",
    tags: ["Jira / Issues"],
    summary: "Add a comment to an issue",
    security: cookieAuth,
    request: {
      params: z.object({
        issueKey: z.string().openapi({ example: "SCRUM-1" })
      }),
      body: {
        content: { "application/json": { schema: ZAddCommentRequest } }
      }
    },
    responses: {
      201: {
        description: "Comment added",
        content: { "application/json": { schema: ZSuccessResponse } }
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
    path: "/api/v1/jira/epics",
    tags: ["Jira / Epics"],
    summary: "Create an epic",
    security: cookieAuth,
    request: {
      body: {
        content: { "application/json": { schema: ZCreateEpicRequest } }
      }
    },
    responses: {
      201: {
        description: "Epic created",
        content: { "application/json": { schema: ZJiraEpic } }
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
    path: "/api/v1/jira/epics/{epicKey}/issues",
    tags: ["Jira / Epics"],
    summary: "Get all issues under an epic",
    security: cookieAuth,
    request: {
      params: z.object({
        epicKey: z.string().openapi({ example: "SCRUM-6" })
      })
    },
    responses: {
      200: {
        description: "List of issues under the epic",
        content: { "application/json": { schema: z.array(ZJiraIssue) } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });
}
