import { ZApprovePlanningRequest, ZStartPlanningRequest } from "@repo/zod";
import {
  ZCreateProjectRequest,
  ZLinkJiraRequest,
  ZProjectIdParam,
  ZUpdateProjectRequest
} from "@repo/zod/project";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { agentController } from "../agent/agent.controller";
import { projectController } from "./project.controller";

export const projectRouter: Router = Router();

projectRouter.use(requireAuth);

projectRouter.get("/", projectController.listProjects);

projectRouter.post(
  "/",
  validate({ body: ZCreateProjectRequest }),
  projectController.createProject
);

projectRouter.get(
  "/:id",
  validate({ params: ZProjectIdParam }),
  projectController.getProject
);

projectRouter.patch(
  "/:id",
  validate({ params: ZProjectIdParam, body: ZUpdateProjectRequest }),
  projectController.updateProject
);

projectRouter.delete(
  "/:id",
  validate({ params: ZProjectIdParam }),
  projectController.deleteProject
);

projectRouter.post(
  "/:id/jira/link",
  validate({ params: ZProjectIdParam, body: ZLinkJiraRequest }),
  projectController.linkJira
);

projectRouter.delete(
  "/:id/jira/unlink",
  validate({ params: ZProjectIdParam }),
  projectController.unlinkJira
);

projectRouter.post(
  "/:id/agent/planning/start",
  validate({ params: ZProjectIdParam, body: ZStartPlanningRequest }),
  agentController.startPlanning
);

projectRouter.post(
  "/:id/agent/planning/approve",
  validate({ params: ZProjectIdParam, body: ZApprovePlanningRequest }),
  agentController.approvePlanning
);
