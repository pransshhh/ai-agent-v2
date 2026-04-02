import { db } from "@repo/db";
import type {
  ApprovePlanningRequest,
  StartPlanningRequest
} from "@repo/zod/agent";
import { env } from "../../config/env";
import { codingQueue, planningQueue } from "../../lib/queue";
import { AppError } from "../../middleware/error";

export const agentService = {
  async startPlanning(
    projectId: string,
    userId: string,
    input: StartPlanningRequest
  ) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project)
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    if (project.userId !== userId)
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (!project.jiraProjectKey || !project.jiraBoardId) {
      throw new AppError(
        "Jira not linked to this project",
        400,
        "JIRA_NOT_LINKED"
      );
    }

    const runId = crypto.randomUUID();

    await db.project.update({
      where: { id: projectId },
      data: { status: "PLANNING", currentRunId: runId }
    });

    const job = await planningQueue.add("planning", {
      runId,
      userId,
      projectId,
      prompt: input.prompt,
      aiProvider: "gemini",
      aiApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    return { jobId: job.id ?? "", runId };
  },

  async approvePlanning(
    projectId: string,
    userId: string,
    input: ApprovePlanningRequest
  ) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project)
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    if (project.userId !== userId)
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (project.status !== "PLANNED") {
      throw new AppError(
        "Project is not in PLANNED status",
        400,
        "INVALID_STATUS"
      );
    }
    if (!project.jiraSprintId) {
      throw new AppError(
        "No sprint found — run planning first",
        400,
        "NO_SPRINT"
      );
    }

    await db.project.update({
      where: { id: projectId },
      data: { status: "CODING", currentRunId: input.runId }
    });

    const job = await codingQueue.add("coding", {
      runId: input.runId,
      userId,
      projectId,
      sprintId: project.jiraSprintId,
      s3Prefix: `projects/${projectId}/`,
      aiProvider: "gemini",
      aiApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    return {
      jobId: job.id ?? "",
      runId: input.runId,
      sprintId: project.jiraSprintId
    };
  }
};
