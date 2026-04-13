import { createModel, generateText } from "@repo/ai";
import { db } from "@repo/db";
import { createGithubServices } from "@repo/github";
import type { CodingJobPayload, TestingJobPayload } from "@repo/queue";
import { createTestingQueue, QUEUE_NAMES } from "@repo/queue";
import { Worker } from "bullmq";
import { codingGraph } from "../graphs/coding/graph";
import { createJira } from "../lib/jira";
import { logger } from "../lib/logger";
import { redisConnection } from "../lib/redis";

/** Parse "https://github.com/owner/repo" → { owner, repo } */
function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match?.[1] || !match[2]) throw new Error(`Invalid GitHub URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

/** Slugify a string for use in branch names */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function startCodingWorker() {
  const testingQueue = createTestingQueue(redisConnection);

  const worker = new Worker<CodingJobPayload>(
    QUEUE_NAMES.CODING,
    async (job) => {
      const { runId, projectId } = job.data;
      const {
        githubPat,
        githubRepoUrl,
        githubBaseBranch,
        sprintId,
        aiProvider,
        aiApiKey,
        jiraProjectKey,
        jiraBoardId,
        prFeedback
      } = job.data;

      const isPrFix = !!prFeedback;

      logger.info({ jobId: job.id, runId }, "Coding job started");

      // ── GitHub setup ──────────────────────────────────────────────────────
      const hasGithub = !!(githubPat && githubRepoUrl);
      let githubOwner: string | null = null;
      let githubRepo: string | null = null;
      let featureBranch: string | null = null;
      let repoContext: string | null = null;
      const baseBranch = githubBaseBranch ?? "main";

      if (hasGithub) {
        const github = createGithubServices({ pat: githubPat as string });
        const parsed = parseGithubUrl(githubRepoUrl as string);
        githubOwner = parsed.owner;
        githubRepo = parsed.repo;

        // Use explicit branch from payload (PR fix runs) or construct it
        featureBranch =
          job.data.featureBranch ?? `feature/${sprintId}-${slugify(projectId)}`;

        // ── PR fix mode: just load existing CONTEXT.md, branch already exists ──
        if (isPrFix) {
          try {
            const { content } = await github.repo.getFileContent(
              githubOwner,
              githubRepo,
              "CONTEXT.md",
              featureBranch as string
            );
            repoContext = content;
            logger.info(
              { runId },
              "PR fix: loaded CONTEXT.md from feature branch"
            );
          } catch {
            logger.info(
              { runId },
              "PR fix: no CONTEXT.md found, continuing without it"
            );
          }
        } else {
          // ── Normal flow: CONTEXT.md flow + branch creation ─────────────
          try {
            const { content } = await github.repo.getFileContent(
              githubOwner,
              githubRepo,
              "CONTEXT.md",
              baseBranch
            );
            repoContext = content;
            logger.info({ runId }, "Loaded existing CONTEXT.md");
          } catch {
            // CONTEXT.md doesn't exist — generate it
            logger.info({ runId }, "CONTEXT.md not found — generating");

            const tree = await github.repo.getRepoTree(
              githubOwner,
              githubRepo,
              baseBranch
            );
            const filePaths = tree
              .filter((e) => e.type === "blob")
              .map((e) => e.path)
              .join("\n");

            // Attempt to read package.json and README.md for more context
            const extras: string[] = [];
            for (const candidate of [
              "package.json",
              "README.md",
              "readme.md"
            ]) {
              try {
                const { content } = await github.repo.getFileContent(
                  githubOwner,
                  githubRepo,
                  candidate,
                  baseBranch
                );
                extras.push(`### ${candidate}\n\`\`\`\n${content}\n\`\`\``);
              } catch {
                // file doesn't exist, skip
              }
            }

            const model = createModel({
              provider: aiProvider,
              apiKey: aiApiKey
            });
            const { text } = await generateText({
              model,
              prompt: `You are a senior software engineer. Given the file tree and key files below, write a concise CONTEXT.md that explains:
- What this project does
- Its tech stack and architecture
- Key directories and their purpose
- Any important conventions or patterns

File tree:
${filePaths}

${extras.join("\n\n")}

Write only the CONTEXT.md content (Markdown). Be concise but complete.`
            });

            repoContext = text;

            // Write the generated CONTEXT.md to the feature branch.
            // We create the branch first so we can write to it.
            await github.repo.createBranch(
              githubOwner,
              githubRepo,
              featureBranch as string,
              baseBranch
            );

            await github.repo.writeFile(
              githubOwner,
              githubRepo,
              "CONTEXT.md",
              text,
              "docs: add CONTEXT.md",
              featureBranch as string
            );

            logger.info(
              { runId },
              "Generated and wrote CONTEXT.md to feature branch"
            );
          }

          // If we didn't create the branch above (CONTEXT.md already existed), create it now
          if (repoContext !== null) {
            try {
              await github.repo.createBranch(
                githubOwner,
                githubRepo,
                featureBranch,
                baseBranch
              );
              logger.info({ runId, featureBranch }, "Created feature branch");
            } catch (err: unknown) {
              // Branch may already exist (e.g. retry run) — that's fine
              const msg = err instanceof Error ? err.message : String(err);
              if (
                !msg.includes("already exists") &&
                !msg.includes("Reference already exists")
              ) {
                throw err;
              }
              logger.info(
                { runId, featureBranch },
                "Feature branch already exists"
              );
            }
          }
        } // end else (normal flow)
      }

      // ── Activate sprint in Jira (skipped for PR fix runs) ────────────────
      const jira = createJira(jiraProjectKey, jiraBoardId);

      if (!isPrFix) {
        const now = new Date();
        const twoWeeksLater = new Date(
          now.getTime() + 14 * 24 * 60 * 60 * 1000
        );
        try {
          await jira.sprints.updateSprint(sprintId, {
            state: "active",
            startDate: now.toISOString(),
            endDate: twoWeeksLater.toISOString()
          });
          logger.info({ runId, sprintId }, "Sprint activated");
        } catch (err) {
          logger.warn(
            { runId, sprintId, err },
            "Could not activate sprint (may already be active)"
          );
        }
      }

      try {
        // ── Run the coding graph ──────────────────────────────────────────
        const result = await codingGraph.invoke({
          runId,
          userId: job.data.userId,
          projectId,
          jiraProjectKey,
          jiraBoardId,
          sprintId,
          s3Prefix: job.data.s3Prefix,
          aiProvider,
          aiApiKey,
          githubPat: githubPat ?? null,
          githubRepoUrl: githubRepoUrl ?? null,
          githubBaseBranch: baseBranch,
          githubOwner,
          githubRepo,
          featureBranch,
          repoContext,
          rejectedTicketKey: job.data.rejectedTicketKey ?? null,
          rejectedTicketFeedback: job.data.rejectedTicketFeedback ?? null,
          prFeedback: prFeedback ?? null
        });

        if (result.status === "failed") {
          await db.project.update({
            where: { id: projectId },
            data: { status: "FAILED", currentRunId: null }
          });
          throw new Error(result.error ?? "Coding graph failed");
        }

        // ── Post-graph: update CONTEXT.md + handle PR / sprint close ─────
        if (isPrFix) {
          // PR fix run — commits already pushed to feature branch, open PR auto-updates.
          // Just return to IDLE so the user can re-review on GitHub.
          await db.project.update({
            where: { id: projectId },
            data: { status: "IDLE", currentRunId: null }
          });
          logger.info(
            { jobId: job.id, runId },
            "PR fix completed — returning to IDLE"
          );
        } else if (hasGithub && githubOwner && githubRepo && featureBranch) {
          const github = createGithubServices({ pat: githubPat as string });

          // Update CONTEXT.md with a summary of what was implemented this sprint
          const completedSummary = (result.completedTickets as string[]).join(
            ", "
          );
          const model = createModel({ provider: aiProvider, apiKey: aiApiKey });
          const { text: updatedContext } = await generateText({
            model,
            prompt: `You are a senior software engineer updating a project's CONTEXT.md after a sprint.

Current CONTEXT.md:
${repoContext ?? "(empty)"}

Tickets implemented in this sprint: ${completedSummary}

Update the CONTEXT.md to reflect the new state of the project. Keep it concise and accurate.
Write only the full updated CONTEXT.md content (Markdown).`
          });

          await github.repo.writeFile(
            githubOwner,
            githubRepo,
            "CONTEXT.md",
            updatedContext,
            `docs: update CONTEXT.md after sprint ${sprintId}`,
            featureBranch
          );

          logger.info({ runId }, "Updated CONTEXT.md on feature branch");

          // Check for remaining future sprints to decide PR vs close
          const futureSprints = await jira.sprints.listSprints("future");
          const isFinalSprint = futureSprints.length === 0;

          if (isFinalSprint) {
            // Check if PR was already created (e.g. retry after HIL ticket rejection)
            const currentProject = await db.project.findUnique({
              where: { id: projectId }
            });
            if (currentProject?.githubPrUrl) {
              logger.info(
                { runId },
                "PR already exists — new commits auto-update it"
              );
            } else {
              const prUrl = await github.pr.createPullRequest(
                githubOwner,
                githubRepo,
                featureBranch,
                baseBranch,
                `feat: sprint ${sprintId} — ${completedSummary}`,
                `## Summary\n\nImplemented by AI coding agent during sprint ${sprintId}.\n\n**Tickets:** ${completedSummary}\n\n---\n*Generated by AI Dev Agent*`
              );
              await db.project.update({
                where: { id: projectId },
                data: { githubPrUrl: prUrl }
              });
              logger.info({ runId, prUrl }, "Created PR — final sprint");
            }
          } else {
            // Close current sprint so the human can start the next one
            await jira.sprints.updateSprint(sprintId, { state: "closed" });
            logger.info(
              { runId, sprintId },
              "Closed sprint — more sprints remain"
            );
          }

          // Hand off to testing worker
          await testingQueue.add("testing", {
            runId,
            userId: job.data.userId,
            projectId,
            jiraProjectKey,
            sprintId,
            featureBranch,
            githubPat: githubPat as string,
            githubRepoUrl: githubRepoUrl as string,
            aiProvider,
            aiApiKey
          } satisfies TestingJobPayload);

          await db.project.update({
            where: { id: projectId },
            data: { status: "TESTING" }
          });

          logger.info(
            {
              jobId: job.id,
              runId,
              completedTickets: result.completedTickets,
              failedTickets: result.failedTickets
            },
            "Coding job completed — testing enqueued"
          );
        } else {
          // No GitHub — skip testing/security, go straight to HIL review
          await db.project.update({
            where: { id: projectId },
            data: { status: "SPRINT_REVIEW", currentRunId: null }
          });
          logger.info(
            { jobId: job.id, runId },
            "Coding job completed — awaiting HIL sprint review"
          );
        }

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
