import "./config/env";
import { logger } from "./lib/logger";
import { startCodingWorker } from "./workers/coding.worker";
import { startPlanningWorker } from "./workers/planning.worker";
import { startSprintPlanningWorker } from "./workers/sprint-planning.worker";

/**
 * Agent worker bootstrap.
 * Starts all BullMQ workers and keeps the process alive.
 */
async function main() {
  logger.info("Starting agent workers...");

  const planningWorker = startPlanningWorker();
  const sprintPlanningWorker = startSprintPlanningWorker();
  const codingWorker = startCodingWorker();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down workers...");
    await planningWorker.close();
    await sprintPlanningWorker.close();
    await codingWorker.close();
    logger.info("Workers shut down cleanly");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  logger.info("Agent workers running — waiting for jobs");
}

main().catch((err) => {
  logger.error({ err }, "Failed to start agent");
  process.exit(1);
});
