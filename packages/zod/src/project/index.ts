import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const ZProjectStatus = z.enum([
  "IDLE",
  "PLANNING",
  "PLANNED",
  "CODING",
  "SPRINT_REVIEW",
  "FAILED"
]);

export const ZProject = z.object({
  id: z.string().openapi({ example: "clx1234" }),
  name: z.string().openapi({ example: "Todo App" }),
  description: z
    .string()
    .nullable()
    .openapi({ example: "A full stack todo app" }),
  userId: z.string(),
  jiraProjectKey: z.string().nullable().openapi({ example: "SCRUM" }),
  jiraBoardId: z.number().nullable().openapi({ example: 1 }),
  jiraSprintId: z.number().nullable().openapi({ example: 68 }),
  status: ZProjectStatus,
  currentRunId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const ZCreateProjectRequest = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .openapi({ example: "Todo App" }),
  description: z
    .string()
    .max(500)
    .openapi({ example: "A full stack todo app with auth" })
});

export const ZUpdateProjectRequest = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional()
});

export const ZProjectIdParam = z.object({
  id: z.string().min(1, "Project ID is required")
});

export const ZLinkJiraRequest = z.object({
  projectKey: z
    .string()
    .min(1, "Jira project key is required")
    .max(20)
    .regex(/^[A-Z][A-Z0-9]+$/, "Invalid Jira project key format (e.g. SCRUM)")
    .openapi({ example: "SCRUM" })
});

export type Project = z.infer<typeof ZProject>;
export type ProjectStatus = z.infer<typeof ZProjectStatus>;
export type CreateProjectRequest = z.infer<typeof ZCreateProjectRequest>;
export type UpdateProjectRequest = z.infer<typeof ZUpdateProjectRequest>;
export type LinkJiraRequest = z.infer<typeof ZLinkJiraRequest>;
