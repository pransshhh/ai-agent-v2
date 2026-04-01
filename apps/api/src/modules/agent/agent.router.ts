import {
  ZApprovePlanningRequest,
  ZStartPlanningRequest
} from "@repo/zod/agent";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { agentController } from "./agent.controller";

export const agentRouter: Router = Router();

agentRouter.use(requireAuth);

/**
 * POST /api/v1/agent/planning/start
 * Triggers the Jira planning agent with a user prompt.
 * Returns jobId + runId — store runId to use in approve-planning.
 */
agentRouter.post(
  "/planning/start",
  validate({ body: ZStartPlanningRequest }),
  agentController.startPlanning
);

/**
 * POST /api/v1/agent/planning/approve
 * User has reviewed the Jira tickets and approves coding to start.
 * Requires runId from the planning job and sprintId from Jira.
 */
agentRouter.post(
  "/planning/approve",
  validate({ body: ZApprovePlanningRequest }),
  agentController.approvePlanning
);
