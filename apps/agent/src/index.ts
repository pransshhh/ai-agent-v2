import "./config/env";
import { logger } from "./lib/logger";
import { startCodingWorker } from "./workers/coding.worker";
import { startPlanningWorker } from "./workers/planning.worker";
import { startSecurityWorker } from "./workers/security.worker";
import { startTestingWorker } from "./workers/testing.worker";

/**
 * Agent worker bootstrap.
 * Starts all BullMQ workers and keeps the process alive.
 */
async function main() {
  logger.info("Starting agent workers...");

  const planningWorker = startPlanningWorker();
  const codingWorker = startCodingWorker();
  const testingWorker = startTestingWorker();
  const securityWorker = startSecurityWorker();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down workers...");
    await planningWorker.close();
    await codingWorker.close();
    await testingWorker.close();
    await securityWorker.close();
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
