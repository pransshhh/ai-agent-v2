import { db } from "@repo/db";
import type { PlanningJobPayload } from "@repo/queue";
import { QUEUE_NAMES } from "@repo/queue";
import { Worker } from "bullmq";
import { planningGraph } from "../graphs/planning/graph";
import { logger } from "../lib/logger";
import { redisConnection } from "../lib/redis";

export function startPlanningWorker() {
  const worker = new Worker<PlanningJobPayload>(
    QUEUE_NAMES.PLANNING,
    async (job) => {
      const { runId, projectId } = job.data;

      logger.info({ jobId: job.id, runId }, "Planning job started");

      try {
        const result = await planningGraph.invoke({
          runId,
          userId: job.data.userId,
          projectId,
          jiraProjectKey: job.data.jiraProjectKey,
          jiraBoardId: job.data.jiraBoardId,
          prompt: job.data.prompt,
          aiProvider: job.data.aiProvider,
          aiApiKey: job.data.aiApiKey
        });

        if (result.status === "failed") {
          // Update project status to FAILED
          await db.project.update({
            where: { id: projectId },
            data: { status: "FAILED", currentRunId: null }
          });
          throw new Error(result.error ?? "Planning graph failed");
        }

        // Update project — status PLANNED, tickets are in backlog
        await db.project.update({
          where: { id: projectId },
          data: {
            status: "PLANNED",
            currentRunId: null
          }
        });

        logger.info(
          {
            jobId: job.id,
            runId,
            epicKeys: result.epicKeys,
            ticketKeys: result.ticketKeys
          },
          "Planning job completed — tickets in backlog"
        );

        return result;
      } catch (err) {
        // Ensure project status is FAILED on any unexpected error
        await db.project
          .update({
            where: { id: projectId },
            data: { status: "FAILED", currentRunId: null }
          })
          .catch(() => {}); // swallow DB error — don't mask original error
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: 2
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
