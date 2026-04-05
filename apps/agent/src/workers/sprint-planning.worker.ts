import { createModel, generateObject } from "@repo/ai";
import { db } from "@repo/db";
import type { CodingJobPayload, SprintPlanningJobPayload } from "@repo/queue";
import { createCodingQueue, QUEUE_NAMES } from "@repo/queue";
import { Worker } from "bullmq";
import { z } from "zod";
import { createJira } from "../lib/jira";
import { logger } from "../lib/logger";
import { redisConnection } from "../lib/redis";

export function startSprintPlanningWorker() {
  const codingQueue = createCodingQueue(redisConnection);

  const worker = new Worker<SprintPlanningJobPayload>(
    QUEUE_NAMES.SPRINT_PLANNING,
    async (job) => {
      const {
        runId,
        projectId,
        userId,
        jiraProjectKey,
        jiraBoardId,
        previousSprintId,
        aiProvider,
        aiApiKey
      } = job.data;

      logger.info(
        { jobId: job.id, runId, previousSprintId },
        "Sprint planning job started"
      );

      const jira = createJira(jiraProjectKey, jiraBoardId);

      try {
        // 1. Close the previous sprint if this is a continuation
        if (previousSprintId) {
          // Transition any "In Review" tickets to "Done" before closing
          const prevIssues =
            await jira.issues.getSprintIssues(previousSprintId);
          await Promise.all(
            prevIssues
              .filter((i) => i.status === "In Review")
              .map((i) => jira.issues.transitionIssue(i.key, "Done"))
          );
          await jira.sprints.updateSprint(previousSprintId, {
            state: "closed"
          });
          logger.info({ previousSprintId }, "Previous sprint closed");
        }

        // 2. Fetch backlog tickets for this project only
        const backlogIssues = await jira.issues.getBacklogIssues(
          `labels = "ai-agent-${projectId}"`
        );

        if (backlogIssues.length === 0) {
          logger.info({ runId }, "Backlog is empty — project complete");
          await db.project.update({
            where: { id: projectId },
            data: { status: "IDLE", currentRunId: null, jiraSprintId: null }
          });
          return { status: "idle", reason: "backlog_empty" };
        }

        logger.info(
          { runId, backlogCount: backlogIssues.length },
          "Backlog fetched"
        );

        // 3. Ask the AI to decide which tickets form the next sprint and in what order
        const model = createModel({
          provider: aiProvider,
          apiKey: aiApiKey,
          model: "gemini-2.5-flash"
        });

        const ticketList = backlogIssues
          .map(
            (t) =>
              `- ${t.key}: ${t.summary}${t.description ? `\n  ${t.description}` : ""}`
          )
          .join("\n");

        const { object: plan } = await generateObject({
          model,
          schema: z.object({
            sprintName: z
              .string()
              .max(29)
              .describe("A short sprint name (max 29 characters)"),
            sprintGoal: z.string().describe("A clear one-sentence sprint goal"),
            issueKeys: z
              .array(z.string())
              .describe(
                "Ordered list of issue keys to include in this sprint, from first to last in implementation sequence"
              )
          }),
          prompt: `You are an experienced engineering project manager planning the next development sprint.

Here are the tickets currently in the backlog:
${ticketList}

Select a focused, deliverable group of tickets for the next sprint. Follow these principles:
1. Group tickets that form a complete, self-contained feature or layer (e.g. all DB + API work for auth before moving to UI)
2. Respect implementation order — foundational tickets come before tickets that depend on them
3. Keep the sprint practical: typically 3–6 tickets, no more than the team can complete in 2 weeks
4. Order the selected tickets strictly by implementation sequence (first ticket should have no dependencies on unselected tickets)
5. Do NOT include tickets that depend on other tickets not yet selected for this sprint

Return the sprint name, a clear goal, and the ordered list of issue keys.`
        });

        // Validate AI only returned keys that exist in the backlog
        const backlogKeySet = new Set(backlogIssues.map((i) => i.key));
        const validKeys = plan.issueKeys.filter((k: string) =>
          backlogKeySet.has(k)
        );

        if (validKeys.length === 0) {
          throw new Error("AI returned no valid backlog issue keys for sprint");
        }

        logger.info(
          { runId, sprintName: plan.sprintName, issueKeys: validKeys },
          "Sprint plan decided by AI"
        );

        // 4. Create the sprint as future
        const sprint = await jira.sprints.createSprint({
          name: plan.sprintName,
          goal: plan.sprintGoal
        });

        // 5. Move tickets to the sprint in the decided order (sets rank)
        await jira.sprints.moveIssuesToSprint(sprint.id, validKeys);

        // 6. Activate the sprint
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14);
        await jira.sprints.updateSprint(sprint.id, {
          state: "active",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        logger.info(
          { runId, sprintId: sprint.id },
          "Sprint created and activated"
        );

        // 7. Update project with new sprint ID and queue coding job
        const codingRunId = crypto.randomUUID();

        await db.project.update({
          where: { id: projectId },
          data: {
            status: "CODING",
            currentRunId: codingRunId,
            jiraSprintId: sprint.id
          }
        });

        const codingPayload: CodingJobPayload = {
          runId: codingRunId,
          userId,
          projectId,
          jiraProjectKey,
          jiraBoardId,
          sprintId: sprint.id,
          s3Prefix: `projects/${projectId}/`,
          aiProvider,
          aiApiKey
        };

        await codingQueue.add("coding", codingPayload);

        logger.info(
          { jobId: job.id, runId, sprintId: sprint.id, codingRunId },
          "Sprint planning job completed — coding job queued"
        );

        return { sprintId: sprint.id, codingRunId };
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
      "Sprint planning job failed"
    );
  });

  logger.info("Sprint planning worker started");
  return worker;
}
