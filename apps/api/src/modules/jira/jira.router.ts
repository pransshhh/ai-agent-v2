import {
  ZAddCommentRequest,
  ZAssignIssueRequest,
  ZCreateEpicRequest,
  ZCreateIssueRequest,
  ZCreateSprintRequest,
  ZEpicKeyParam,
  ZIssueKeyParam,
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

jiraRouter.get("/boards", jiraController.listBoards);

jiraRouter.get(
  "/sprints",
  validate({ query: ZListSprintsQuery }),
  jiraController.listSprints
);

jiraRouter.get("/sprints/active", jiraController.getActiveSprint);

jiraRouter.post(
  "/sprints",
  validate({ body: ZCreateSprintRequest }),
  jiraController.createSprint
);

jiraRouter.patch(
  "/sprints/:sprintId",
  validate({ params: ZSprintIdParam, body: ZUpdateSprintRequest }),
  jiraController.updateSprint
);

jiraRouter.post(
  "/sprints/:sprintId/issues",
  validate({ params: ZSprintIdParam, body: ZMoveIssuesToSprintRequest }),
  jiraController.moveIssuesToSprint
);

jiraRouter.get(
  "/sprints/:sprintId/issues",
  validate({ params: ZSprintIdParam }),
  jiraController.getSprintIssues
);

jiraRouter.post(
  "/issues",
  validate({ body: ZCreateIssueRequest }),
  jiraController.createIssue
);

jiraRouter.get(
  "/issues/:issueKey",
  validate({ params: ZIssueKeyParam }),
  jiraController.getIssue
);

jiraRouter.patch(
  "/issues/:issueKey",
  validate({ params: ZIssueKeyParam, body: ZUpdateIssueRequest }),
  jiraController.updateIssue
);

jiraRouter.post(
  "/issues/:issueKey/close",
  validate({ params: ZIssueKeyParam }),
  jiraController.closeIssue
);

jiraRouter.post(
  "/issues/:issueKey/assign",
  validate({ params: ZIssueKeyParam, body: ZAssignIssueRequest }),
  jiraController.assignIssue
);

jiraRouter.post(
  "/issues/:issueKey/comments",
  validate({ params: ZIssueKeyParam, body: ZAddCommentRequest }),
  jiraController.addComment
);

jiraRouter.post(
  "/epics",
  validate({ body: ZCreateEpicRequest }),
  jiraController.createEpic
);

jiraRouter.get(
  "/epics/:epicKey/issues",
  validate({ params: ZEpicKeyParam }),
  jiraController.getEpicIssues
);
