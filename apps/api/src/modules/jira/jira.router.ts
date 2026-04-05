import {
  ZAddCommentRequest,
  ZAssignIssueRequest,
  ZCreateEpicRequest,
  ZCreateIssueRequest,
  ZCreateSprintRequest,
  ZEpicKeyParam,
  ZIssueKeyParam,
  ZJiraProjectQuery,
  ZListSprintsQuery,
  ZMoveIssuesToSprintRequest,
  ZSprintIdParam,
  ZUpdateIssueRequest,
  ZUpdateSprintRequest
} from "@repo/zod/jira";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { jiraController } from "./jira.controller";

export const jiraRouter: Router = Router();

jiraRouter.use(requireAuth);

jiraRouter.get(
  "/backlog",
  validate({ query: ZJiraProjectQuery }),
  jiraController.getBacklogIssues
);

jiraRouter.get(
  "/sprints",
  validate({ query: ZListSprintsQuery }),
  jiraController.listSprints
);

jiraRouter.get(
  "/sprints/active",
  validate({ query: ZJiraProjectQuery }),
  jiraController.getActiveSprint
);

jiraRouter.post(
  "/sprints",
  validate({ query: ZJiraProjectQuery, body: ZCreateSprintRequest }),
  jiraController.createSprint
);

jiraRouter.patch(
  "/sprints/:sprintId",
  validate({
    params: ZSprintIdParam,
    query: ZJiraProjectQuery,
    body: ZUpdateSprintRequest
  }),
  jiraController.updateSprint
);

jiraRouter.post(
  "/sprints/:sprintId/issues",
  validate({
    params: ZSprintIdParam,
    query: ZJiraProjectQuery,
    body: ZMoveIssuesToSprintRequest
  }),
  jiraController.moveIssuesToSprint
);

jiraRouter.get(
  "/sprints/:sprintId/issues",
  validate({ params: ZSprintIdParam, query: ZJiraProjectQuery }),
  jiraController.getSprintIssues
);

jiraRouter.post(
  "/issues",
  validate({ query: ZJiraProjectQuery, body: ZCreateIssueRequest }),
  jiraController.createIssue
);

jiraRouter.get(
  "/issues/:issueKey",
  validate({ params: ZIssueKeyParam, query: ZJiraProjectQuery }),
  jiraController.getIssue
);

jiraRouter.patch(
  "/issues/:issueKey",
  validate({
    params: ZIssueKeyParam,
    query: ZJiraProjectQuery,
    body: ZUpdateIssueRequest
  }),
  jiraController.updateIssue
);

jiraRouter.post(
  "/issues/:issueKey/close",
  validate({ params: ZIssueKeyParam, query: ZJiraProjectQuery }),
  jiraController.closeIssue
);

jiraRouter.post(
  "/issues/:issueKey/assign",
  validate({
    params: ZIssueKeyParam,
    query: ZJiraProjectQuery,
    body: ZAssignIssueRequest
  }),
  jiraController.assignIssue
);

jiraRouter.post(
  "/issues/:issueKey/comments",
  validate({
    params: ZIssueKeyParam,
    query: ZJiraProjectQuery,
    body: ZAddCommentRequest
  }),
  jiraController.addComment
);

jiraRouter.post(
  "/epics",
  validate({ query: ZJiraProjectQuery, body: ZCreateEpicRequest }),
  jiraController.createEpic
);

jiraRouter.get(
  "/epics/:epicKey/issues",
  validate({ params: ZEpicKeyParam, query: ZJiraProjectQuery }),
  jiraController.getEpicIssues
);
