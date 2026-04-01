import type { PlanningJobPayload } from "@repo/queue";
import { QUEUE_NAMES } from "@repo/queue";
import { Worker } from "bullmq";
import { planningGraph } from "../graphs/planning/graph";
import { logger } from "../lib/logger";
import { redisConnection } from "../lib/redis";

/**
 * BullMQ worker for planning jobs.
 * Picks up jobs enqueued by apps/api when user submits a project prompt.
 */
export function startPlanningWorker() {
  const worker = new Worker<PlanningJobPayload>(
    QUEUE_NAMES.PLANNING,
    async (job) => {
      logger.info(
        { jobId: job.id, runId: job.data.runId },
        "Planning job started"
      );

      const result = await planningGraph.invoke({
        runId: job.data.runId,
        userId: job.data.userId,
        projectId: job.data.projectId,
        prompt: job.data.prompt,
        aiProvider: job.data.aiProvider,
        aiApiKey: job.data.aiApiKey
      });

      if (result.status === "failed") {
        throw new Error(result.error ?? "Planning graph failed");
      }

      logger.info(
        {
          jobId: job.id,
          runId: job.data.runId,
          epicKeys: result.epicKeys,
          ticketKeys: result.ticketKeys,
          sprintId: result.sprintId
        },
        "Planning job completed"
      );

      return result;
    },
    {
      connection: redisConnection,
      concurrency: 2 // max 2 planning jobs at once
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, runId: job?.data.runId, err },
      "Planning job failed"
    );
  });

  logger.info("Planning worker started");
  return worker;
}
