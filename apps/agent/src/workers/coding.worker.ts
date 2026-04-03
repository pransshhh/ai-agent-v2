import { db } from "@repo/db";
import type { CodingJobPayload } from "@repo/queue";
import { QUEUE_NAMES } from "@repo/queue";
import { Worker } from "bullmq";
import { codingGraph } from "../graphs/coding/graph";
import { jira } from "../lib/jira";
import { logger } from "../lib/logger";
import { redisConnection } from "../lib/redis";

export function startCodingWorker() {
  const worker = new Worker<CodingJobPayload>(
    QUEUE_NAMES.CODING,
    async (job) => {
      const { runId, projectId } = job.data;

      logger.info({ jobId: job.id, runId }, "Coding job started");

      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14);
        await jira.sprints.updateSprint(job.data.sprintId, {
          state: "active",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        logger.info({ sprintId: job.data.sprintId }, "Sprint started");

        const result = await codingGraph.invoke({
          runId,
          userId: job.data.userId,
          projectId,
          sprintId: job.data.sprintId,
          s3Prefix: job.data.s3Prefix,
          aiProvider: job.data.aiProvider,
          aiApiKey: job.data.aiApiKey
        });

        if (result.status === "failed") {
          await db.project.update({
            where: { id: projectId },
            data: { status: "FAILED", currentRunId: null }
          });
          throw new Error(result.error ?? "Coding graph failed");
        }

        // Back to IDLE if all tickets succeeded, FAILED otherwise
        const finalStatus =
          result.failedTickets?.length > 0 ? "FAILED" : "IDLE";

        await db.project.update({
          where: { id: projectId },
          data: { status: finalStatus, currentRunId: null }
        });

        logger.info(
          {
            jobId: job.id,
            runId,
            completedTickets: result.completedTickets,
            failedTickets: result.failedTickets,
            finalStatus
          },
          "Coding job completed"
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
