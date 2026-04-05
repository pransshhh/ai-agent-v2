import { db } from "@repo/db";
import type { CodingJobPayload } from "@repo/queue";
import { QUEUE_NAMES } from "@repo/queue";
import { Worker } from "bullmq";
import { codingGraph } from "../graphs/coding/graph";
import { logger } from "../lib/logger";
import { redisConnection } from "../lib/redis";

export function startCodingWorker() {
  const worker = new Worker<CodingJobPayload>(
    QUEUE_NAMES.CODING,
    async (job) => {
      const { runId, projectId } = job.data;

      logger.info({ jobId: job.id, runId }, "Coding job started");

      try {
        const result = await codingGraph.invoke({
          runId,
          userId: job.data.userId,
          projectId,
          jiraProjectKey: job.data.jiraProjectKey,
          jiraBoardId: job.data.jiraBoardId,
          sprintId: job.data.sprintId,
          s3Prefix: job.data.s3Prefix,
          aiProvider: job.data.aiProvider,
          aiApiKey: job.data.aiApiKey,
          rejectedTicketKey: job.data.rejectedTicketKey ?? null,
          rejectedTicketFeedback: job.data.rejectedTicketFeedback ?? null
        });

        if (result.status === "failed") {
          await db.project.update({
            where: { id: projectId },
            data: { status: "FAILED", currentRunId: null }
          });
          throw new Error(result.error ?? "Coding graph failed");
        }

        // Pause for HIL sprint review — frontend will call sprint/approve or sprint/reject
        await db.project.update({
          where: { id: projectId },
          data: { status: "SPRINT_REVIEW", currentRunId: null }
        });

        logger.info(
          {
            jobId: job.id,
            runId,
            completedTickets: result.completedTickets,
            failedTickets: result.failedTickets
          },
          "Coding job completed — awaiting HIL sprint review"
        );

        return result;
      } catch (err) {
        await db.project
          .update({
            where: { id: projectId },
            data: { status: "FAILED", currentRunId: null }
          })
          .catch(() => {});
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: 1
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
