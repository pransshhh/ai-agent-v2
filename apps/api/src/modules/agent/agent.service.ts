import type {
  ApprovePlanningRequest,
  StartPlanningRequest
} from "@repo/zod/agent";
import { env } from "../../config/env";
import { codingQueue, planningQueue } from "../../lib/queue";

export const agentService = {
  /**
   * Enqueues a planning job.
   * The Jira agent will create epics, stories, and a sprint from the prompt.
   * Returns runId so the client can poll job status and pass it to approvePlanning.
   *
   * TODO (next commit): derive userId from session, projectId from DB project
   */
  async startPlanning(input: StartPlanningRequest) {
    const runId = crypto.randomUUID();

    const job = await planningQueue.add("planning", {
      runId,
      userId: "test",
      projectId: input.projectId,
      prompt: input.prompt,
      aiProvider: "gemini",
      aiApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    return { jobId: job.id ?? "", runId };
  },

  /**
   * Enqueues a coding job after the user has reviewed and approved the Jira plan.
   * The coding agent picks tickets from the sprint and implements them one by one.
   *
   * TODO (next commit): validate that runId belongs to the authenticated user's project
   */
  async approvePlanning(input: ApprovePlanningRequest) {
    const job = await codingQueue.add("coding", {
      runId: input.runId,
      userId: "test",
      projectId: input.projectId,
      sprintId: input.sprintId,
      s3Prefix: `projects/${input.projectId}/`,
      aiProvider: "gemini",
      aiApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    return {
      jobId: job.id ?? "",
      runId: input.runId,
      sprintId: input.sprintId
    };
  }
};
