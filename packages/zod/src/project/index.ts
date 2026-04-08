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
  githubRepoUrl: z
    .string()
    .nullable()
    .openapi({ example: "https://github.com/org/repo" }),
  githubPat: z.string().nullable(),
  githubBaseBranch: z.string().nullable().openapi({ example: "main" }),
  githubPrUrl: z
    .string()
    .nullable()
    .openapi({ example: "https://github.com/org/repo/pull/1" }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

// Safe to return to frontend — omits the encrypted PAT
export const ZProjectPublic = ZProject.omit({ githubPat: true });

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

export const ZConnectGithubRequest = z.object({
  repoUrl: z.string().url().openapi({ example: "https://github.com/org/repo" }),
  pat: z
    .string()
    .min(1, "Personal access token is required")
    .openapi({ example: "github_pat_..." }),
  baseBranch: z.string().default("main").openapi({ example: "main" })
});

export type Project = z.infer<typeof ZProject>;
export type ProjectPublic = z.infer<typeof ZProjectPublic>;
export type ProjectStatus = z.infer<typeof ZProjectStatus>;
export type CreateProjectRequest = z.infer<typeof ZCreateProjectRequest>;
export type UpdateProjectRequest = z.infer<typeof ZUpdateProjectRequest>;
export type LinkJiraRequest = z.infer<typeof ZLinkJiraRequest>;
export type ConnectGithubRequest = z.infer<typeof ZConnectGithubRequest>;
