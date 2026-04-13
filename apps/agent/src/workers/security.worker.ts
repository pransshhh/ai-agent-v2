import { db } from "@repo/db";
import { createGithubServices } from "@repo/github";
import type { SecurityJobPayload } from "@repo/queue";
import { QUEUE_NAMES } from "@repo/queue";
import { Worker } from "bullmq";
import { securityGraph } from "../graphs/security/graph";
import { createJira } from "../lib/jira";
import { logger } from "../lib/logger";
import { redisConnection } from "../lib/redis";

function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match?.[1] || !match[2]) throw new Error(`Invalid GitHub URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

function formatSecurityReport(report: {
  critical: string[];
  warnings: string[];
  info: string[];
}): string {
  const lines: string[] = ["🔒 *Security Scan Report*\n"];

  if (report.critical.length > 0) {
    lines.push(`🚨 *Critical (${report.critical.length})*`);
    lines.push(...report.critical.map((i) => `- ${i}`));
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push(`⚠️ *Warnings (${report.warnings.length})*`);
    lines.push(...report.warnings.map((i) => `- ${i}`));
    lines.push("");
  }

  if (report.info.length > 0) {
    lines.push(`ℹ️ *Info (${report.info.length})*`);
    lines.push(...report.info.map((i) => `- ${i}`));
    lines.push("");
  }

  if (
    report.critical.length === 0 &&
    report.warnings.length === 0 &&
    report.info.length === 0
  ) {
    lines.push("✅ No security issues found.");
  }

  return lines.join("\n");
}

export function startSecurityWorker() {
  const worker = new Worker<SecurityJobPayload>(
    QUEUE_NAMES.SECURITY,
    async (job) => {
      const {
        runId,
        projectId,
        jiraProjectKey,
        sprintId,
        featureBranch,
        githubPat,
        githubRepoUrl,
        githubBaseBranch,
        aiProvider,
        aiApiKey
      } = job.data;

      logger.info({ jobId: job.id, runId }, "Security job started");

      // Load project to get jiraBoardId
      const project = await db.project.findUniqueOrThrow({
        where: { id: projectId }
      });

      const { owner, repo } = parseGithubUrl(githubRepoUrl);

      // Fetch sprint issues — post report on first ticket
      const jira = createJira(jiraProjectKey, project.jiraBoardId ?? 0);
      const sprintIssues = await jira.issues.getSprintIssues(sprintId);
      const tickets = sprintIssues.map((issue) => ({
        key: issue.key,
        summary: issue.summary
      }));

      // Verify feature branch is readable before kicking off agent
      const github = createGithubServices({ pat: githubPat });
      try {
        await github.repo.getRepoTree(owner, repo, featureBranch);
      } catch (err) {
        throw new Error(
          `Feature branch "${featureBranch}" not accessible: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      try {
        const result = await securityGraph.invoke({
          runId,
          githubOwner: owner,
          githubRepo: repo,
          githubPat,
          featureBranch,
          baseBranch: githubBaseBranch,
          tickets,
          aiProvider,
          aiApiKey
        });

        if (result.status === "failed") {
          await db.project.update({
            where: { id: projectId },
            data: { status: "FAILED", currentRunId: null }
          });
          throw new Error(result.error ?? "Security graph failed");
        }

        const report = result.securityReport ?? {
          critical: [],
          warnings: [],
          info: []
        };

        // Post formatted report as Jira comment on the first sprint ticket
        const firstTicket = tickets[0];
        if (firstTicket) {
          await jira.issues.addComment(firstTicket.key, {
            body: `${formatSecurityReport(report)}\n\nRun ID: ${runId}`
          });
        }

        // Save report to DB
        await db.project.update({
          where: { id: projectId },
          data: {
            lastSecurityReport: report,
            status: "SPRINT_REVIEW",
            currentRunId: null
          }
        });

        logger.info(
          {
            jobId: job.id,
            runId,
            critical: report.critical.length,
            warnings: report.warnings.length,
            info: report.info.length
          },
          "Security job completed — awaiting HIL sprint review"
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
      "Security job failed"
    );
  });

  logger.info("Security worker started");
  return worker;
}
