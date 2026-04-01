import type { CodingJobPayload } from "@repo/queue";
import { QUEUE_NAMES } from "@repo/queue";
import { Worker } from "bullmq";
import { codingGraph } from "../graphs/coding/graph";
import { logger } from "../lib/logger";
import { redisConnection } from "../lib/redis";

/**
 * BullMQ worker for coding jobs.
 * Picks up jobs enqueued by apps/api when user clicks "Start Coding".
 */
export function startCodingWorker() {
  const worker = new Worker<CodingJobPayload>(
    QUEUE_NAMES.CODING,
    async (job) => {
      logger.info(
        { jobId: job.id, runId: job.data.runId },
        "Coding job started"
      );

      const result = await codingGraph.invoke({
        runId: job.data.runId,
        userId: job.data.userId,
        projectId: job.data.projectId,
        sprintId: job.data.sprintId,
        s3Prefix: job.data.s3Prefix,
        aiProvider: job.data.aiProvider,
        aiApiKey: job.data.aiApiKey
      });

      if (result.status === "failed") {
        throw new Error(result.error ?? "Coding graph failed");
      }

      logger.info(
        {
          jobId: job.id,
          runId: job.data.runId,
          completedTickets: result.completedTickets,
          failedTickets: result.failedTickets
        },
        "Coding job completed"
      );

      return result;
    },
    {
      connection: redisConnection,
      concurrency: 1 // one coding job at a time — file system operations
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, runId: job?.data.runId, err },
      "Coding job failed"
    );
  });

  logger.info("Coding worker started");
  return worker;
}
