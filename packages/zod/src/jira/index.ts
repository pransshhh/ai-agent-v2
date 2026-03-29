import { z } from "zod";

export const ZIssueType = z.enum(["Story", "Task", "Bug", "Epic", "Subtask"]);
export const ZIssuePriority = z.enum([
  "Highest",
  "High",
  "Medium",
  "Low",
  "Lowest"
]);
export const ZSprintState = z.enum(["active", "closed", "future"]);

export const ZJiraBoard = z.object({
  id: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "SCRUM board" }),
  type: z.string().openapi({ example: "scrum" })
});

export const ZJiraSprint = z.object({
  id: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Sprint 1" }),
  state: ZSprintState,
  startDate: z.iso
    .datetime()
    .optional()
    .openapi({ example: "2025-01-01T00:00:00.000Z" }),
  endDate: z.iso
    .datetime()
    .optional()
    .openapi({ example: "2025-01-14T00:00:00.000Z" }),
  goal: z.string().optional().openapi({ example: "Ship auth module" })
});

export const ZCreateSprintRequest = z.object({
  name: z
    .string()
    .min(1, "Sprint name is required")
    .max(100)
    .openapi({ example: "Sprint 1" }),
  startDate: z.iso
    .datetime()
    .optional()
    .openapi({ example: "2025-01-01T00:00:00.000Z" }),
  endDate: z.iso
    .datetime()
    .optional()
    .openapi({ example: "2025-01-14T00:00:00.000Z" }),
  goal: z.string().max(500).optional().openapi({ example: "Ship auth module" })
});

export const ZUpdateSprintRequest = z.object({
  name: z.string().min(1).max(100).optional(),
  state: ZSprintState.optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  goal: z.string().max(500).optional()
});

export const ZSprintIdParam = z.object({
  sprintId: z.coerce.number({ message: "sprintId must be a number" })
});

export const ZListSprintsQuery = z.object({
  state: ZSprintState.optional()
});

export const ZMoveIssuesToSprintRequest = z.object({
  issueKeys: z
    .array(z.string().min(1))
    .min(1, "At least one issue key required")
    .openapi({ example: ["SCRUM-1", "SCRUM-2"] })
});

export const ZJiraIssue = z.object({
  id: z.string().openapi({ example: "10001" }),
  key: z.string().openapi({ example: "SCRUM-1" }),
  summary: z.string().openapi({ example: "Implement login page" }),
  description: z.string().optional(),
  type: ZIssueType,
  status: z.string().openapi({ example: "In Progress" }),
  priority: ZIssuePriority,
  assigneeAccountId: z.string().optional(),
  reporterAccountId: z.string().optional(),
  sprintId: z.number().optional(),
  epicKey: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ZCreateIssueRequest = z.object({
  summary: z
    .string()
    .min(1, "Summary is required")
    .max(255)
    .openapi({ example: "Implement login page" }),
  description: z.string().optional().openapi({ example: "Use OTP flow" }),
  type: ZIssueType.openapi({ example: "Story" }),
  priority: ZIssuePriority.optional().openapi({ example: "Medium" }),
  assigneeAccountId: z.string().optional(),
  sprintId: z.number().optional(),
  epicKey: z.string().optional(),
  labels: z.array(z.string()).optional()
});

export const ZUpdateIssueRequest = z.object({
  summary: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority: ZIssuePriority.optional(),
  assigneeAccountId: z.string().optional(),
  labels: z.array(z.string()).optional()
});

export const ZIssueKeyParam = z.object({
  issueKey: z
    .string()
    .regex(/^[A-Z]+-\d+$/, "Invalid issue key format (e.g. SCRUM-1)")
    .openapi({ example: "SCRUM-1" })
});

export const ZAssignIssueRequest = z.object({
  accountId: z.string().min(1, "accountId is required")
});

export const ZAddCommentRequest = z.object({
  body: z.string().min(1, "Comment body is required").max(5000)
});

export const ZGetSprintIssuesParam = z.object({
  sprintId: z.coerce.number({ message: "sprintId must be a number" })
});

export const ZJiraEpic = z.object({
  id: z.string().openapi({ example: "10010" }),
  key: z.string().openapi({ example: "SCRUM-10" }),
  name: z.string().openapi({ example: "Authentication" }),
  summary: z.string().openapi({ example: "Auth epic" }),
  status: z.string().openapi({ example: "In Progress" })
});

export const ZCreateEpicRequest = z.object({
  name: z
    .string()
    .min(1, "Epic name is required")
    .max(100)
    .openapi({ example: "Authentication" }),
  summary: z
    .string()
    .min(1, "Summary is required")
    .max(255)
    .openapi({ example: "All auth related work" }),
  description: z.string().optional(),
  priority: ZIssuePriority.optional()
});

export const ZEpicKeyParam = z.object({
  epicKey: z
    .string()
    .regex(/^[A-Z]+-\d+$/, "Invalid epic key format (e.g. SCRUM-10)")
    .openapi({ example: "SCRUM-10" })
});

export type JiraBoard = z.infer<typeof ZJiraBoard>;
export type JiraSprint = z.infer<typeof ZJiraSprint>;
export type JiraIssue = z.infer<typeof ZJiraIssue>;
export type JiraEpic = z.infer<typeof ZJiraEpic>;
export type CreateSprintRequest = z.infer<typeof ZCreateSprintRequest>;
export type UpdateSprintRequest = z.infer<typeof ZUpdateSprintRequest>;
export type CreateIssueRequest = z.infer<typeof ZCreateIssueRequest>;
export type UpdateIssueRequest = z.infer<typeof ZUpdateIssueRequest>;
export type AssignIssueRequest = z.infer<typeof ZAssignIssueRequest>;
export type AddCommentRequest = z.infer<typeof ZAddCommentRequest>;
export type CreateEpicRequest = z.infer<typeof ZCreateEpicRequest>;
export type MoveIssuesToSprintRequest = z.infer<
  typeof ZMoveIssuesToSprintRequest
>;
