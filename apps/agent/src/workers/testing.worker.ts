import { db } from "@repo/db";
import { createGithubServices } from "@repo/github";
import type { TestingJobPayload } from "@repo/queue";
import { createSecurityQueue, QUEUE_NAMES } from "@repo/queue";
import { Worker } from "bullmq";
import { testingGraph } from "../graphs/testing/graph";
import { createJira } from "../lib/jira";
import { logger } from "../lib/logger";
import { redisConnection } from "../lib/redis";

function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match?.[1] || !match[2]) throw new Error(`Invalid GitHub URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

export function startTestingWorker() {
  const securityQueue = createSecurityQueue(redisConnection);

  const worker = new Worker<TestingJobPayload>(
    QUEUE_NAMES.TESTING,
    async (job) => {
      const {
        runId,
        userId,
        projectId,
        jiraProjectKey,
        sprintId,
        featureBranch,
        githubPat,
        githubRepoUrl,
        aiProvider,
        aiApiKey
      } = job.data;

      logger.info({ jobId: job.id, runId }, "Testing job started");

      // Load project to get jiraBoardId and baseBranch
      const project = await db.project.findUniqueOrThrow({
        where: { id: projectId }
      });

      const { owner, repo } = parseGithubUrl(githubRepoUrl);

      // Load CONTEXT.md from feature branch
      const github = createGithubServices({ pat: githubPat });
      let repoContext: string | null = null;
      try {
        const { content } = await github.repo.getFileContent(
          owner,
          repo,
          "CONTEXT.md",
          featureBranch
        );
        repoContext = content;
        logger.info({ runId }, "Loaded CONTEXT.md for testing");
      } catch {
        logger.info({ runId }, "No CONTEXT.md found — testing without context");
      }

      // Fetch sprint issues for ticket list
      const jira = createJira(jiraProjectKey, project.jiraBoardId ?? 0);
      const sprintIssues = await jira.issues.getSprintIssues(sprintId);
      const tickets = sprintIssues.map((issue) => ({
        key: issue.key,
        summary: issue.summary,
        description: issue.description ?? null
      }));

      await db.project.update({
        where: { id: projectId },
        data: { status: "TESTING" }
      });

      try {
        const result = await testingGraph.invoke({
          runId,
          githubOwner: owner,
          githubRepo: repo,
          githubPat,
          featureBranch,
          repoContext,
          tickets,
          aiProvider,
          aiApiKey
        });

        if (result.status === "failed") {
          await db.project.update({
            where: { id: projectId },
            data: { status: "FAILED", currentRunId: null }
          });
          throw new Error(result.error ?? "Testing graph failed");
        }

        // Post test summary as Jira comment on each ticket
        if (result.testSummary) {
          for (const ticket of tickets) {
            await jira.issues.addComment(ticket.key, {
              body: `🧪 *Test Results*\n\n${result.testSummary}\n\nRun ID: ${runId}`
            });
          }
        }

        // Enqueue security job
        const baseBranch = project.githubBaseBranch ?? "main";
        await securityQueue.add("security", {
          runId,
          userId,
          projectId,
          jiraProjectKey,
          sprintId,
          featureBranch,
          githubPat,
          githubRepoUrl,
          githubBaseBranch: baseBranch,
          aiProvider,
          aiApiKey
        });

        await db.project.update({
          where: { id: projectId },
          data: { status: "SECURITY_SCAN" }
        });

        logger.info(
          { jobId: job.id, runId },
          "Testing job completed — security scan enqueued"
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
      "Testing job failed"
    );
  });

  logger.info("Testing worker started");
  return worker;
}
