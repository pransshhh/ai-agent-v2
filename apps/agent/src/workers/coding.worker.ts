import { createModel, generateText } from "@repo/ai";
import { db } from "@repo/db";
import { createGithubServices, type GithubServices } from "@repo/github";
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

type GenerateModel = ReturnType<typeof createModel>;

async function fileExistsOnAnyBranch(
  github: GithubServices,
  owner: string,
  repo: string,
  path: string,
  branches: string[]
): Promise<boolean> {
  for (const branch of branches) {
    try {
      await github.repo.getFileContent(owner, repo, path, branch);
      return true;
    } catch {
      // not found on this branch
    }
  }
  return false;
}

async function ensureCiAndEnvSample({
  github,
  owner,
  repo,
  baseBranch,
  featureBranch,
  repoContext,
  completedSummary,
  model,
  runId
}: {
  github: GithubServices;
  owner: string;
  repo: string;
  baseBranch: string;
  featureBranch: string;
  repoContext: string | null;
  completedSummary: string;
  model: GenerateModel;
  runId: string;
}) {
  const branches = [baseBranch, featureBranch];

  // ── .env.sample ────────────────────────────────────────────────────────────
  const envSampleExists = await fileExistsOnAnyBranch(
    github,
    owner,
    repo,
    ".env.sample",
    branches
  );

  if (!envSampleExists) {
    logger.info({ runId }, "Generating .env.sample");

    // Get file tree to scan for env var usage patterns
    const tree = await github.repo.getRepoTree(owner, repo, featureBranch);
    const filePaths = tree
      .filter((e) => e.type === "blob")
      .map((e) => e.path)
      .join("\n");

    const { text: envSample } = await generateText({
      model,
      prompt: `You are generating a .env.sample file for a software project.

Based on the project context and file tree below, produce a .env.sample that:
- Lists every environment variable the application is likely to use
- Uses clear placeholder values (e.g. your_database_url_here, your_api_key_here)
- Adds a short inline comment explaining each variable
- Groups related variables with blank lines and section headers
- NEVER includes real secrets or actual values

IMPORTANT: This is .env.sample only. Never produce .env content.

CONTEXT.md:
${repoContext ?? "(no context available)"}

File tree:
${filePaths}

Write only the .env.sample content. No code blocks or extra explanation.`
    });

    await github.repo.writeFile(
      owner,
      repo,
      ".env.sample",
      envSample,
      "chore: add .env.sample",
      featureBranch
    );

    logger.info({ runId }, "Wrote .env.sample to feature branch");
  } else {
    logger.info({ runId }, ".env.sample already exists — skipping");
  }

  // ── .github/workflows/ci.yml ───────────────────────────────────────────────
  const ciExists = await fileExistsOnAnyBranch(
    github,
    owner,
    repo,
    ".github/workflows/ci.yml",
    branches
  );

  if (!ciExists) {
    logger.info({ runId }, "Generating .github/workflows/ci.yml");

    const { text: ciContent } = await generateText({
      model,
      prompt: `You are generating a GitHub Actions CI/CD workflow file (.github/workflows/ci.yml) for a software project.

Rules you MUST follow:
1. NEVER reference or create a .env file. The project uses .env.sample for reference only.
2. The deploy job MUST use these exact GitHub Actions secrets:
   - \${{ secrets.EC2_HOST }}        — EC2 IP address
   - \${{ secrets.EC2_USER }}        — SSH username (typically "ubuntu" for Ubuntu AMIs)
   - \${{ secrets.EC2_SSH_KEY }}     — full contents of the .pem private key file
   - \${{ secrets.EC2_DEPLOY_PATH }} — absolute deploy directory (e.g. /home/ubuntu/app)
3. Use appleboy/ssh-action@v1.0.0 for the SSH deploy step.
4. The deploy script block MUST run these steps in order:
   a. Source nvm so node/npm/pnpm are available in the non-interactive SSH shell:
        export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
   b. cd to \${{ secrets.EC2_DEPLOY_PATH }}
   c. Fetch and hard-reset to remote so local changes (e.g. package-lock.json) never block the deploy:
        git fetch origin ${baseBranch}
        git reset --hard origin/${baseBranch}
      (.env is gitignored so it is never touched by reset --hard)
   d. Sync new env vars from .env.sample into .env (append missing keys only, never overwrite):
        if [ -f .env.sample ]; then
          touch .env
          while IFS= read -r line; do
            # skip blank lines and comments
            [[ -z "$line" || "$line" == \\#* ]] && continue
            key=$(echo "$line" | cut -d= -f1)
            # only append if key not already present in .env
            if ! grep -q "^\${key}=" .env 2>/dev/null; then
              echo "$line" >> .env
              echo "⚠️  New env var added (set real value): \${key}"
            fi
          done < .env.sample
        fi
   e. Install dependencies (detect from CONTEXT.md: npm ci / pnpm install / pip install -r requirements.txt / etc.)
   f. Run build step if the project has one (e.g. npm run build)
   g. Restart the app with PM2 using zero-downtime reload:
        pm2 reload app --update-env || pm2 start <entrypoint> --name app
      (the || handles the first-ever start when no PM2 process named "app" exists yet)
   h. pm2 save
5. Deploy ONLY runs on push to ${baseBranch} (after the CI job passes). Not on PRs.
6. CI job runs on both push to ${baseBranch} AND pull_request targeting ${baseBranch}.
7. Include a YAML comment block at the very top describing:
   - What this project is (from CONTEXT.md)
   - What was implemented in this sprint
8. Output valid YAML only — no markdown fences, no extra explanation.

CONTEXT.md:
${repoContext ?? "(no context available)"}

Sprint work completed this cycle:
${completedSummary}

Write only the .github/workflows/ci.yml YAML content.`
    });

    await github.repo.writeFile(
      owner,
      repo,
      ".github/workflows/ci.yml",
      ciContent,
      "ci: add GitHub Actions CI/CD workflow",
      featureBranch
    );

    logger.info({ runId }, "Wrote .github/workflows/ci.yml to feature branch");
  } else {
    logger.info(
      { runId },
      ".github/workflows/ci.yml already exists — skipping"
    );
  }
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
            // (Guard against retries where the branch already exists.)
            try {
              await github.repo.createBranch(
                githubOwner,
                githubRepo,
                featureBranch as string,
                baseBranch
              );
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              if (
                !msg.includes("already exists") &&
                !msg.includes("Reference already exists")
              ) {
                throw err;
              }
              logger.info(
                { runId, featureBranch },
                "Feature branch already exists (from prior run)"
              );
            }

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
              // Generate CI workflow + .env.sample before opening the PR
              await ensureCiAndEnvSample({
                github,
                owner: githubOwner,
                repo: githubRepo,
                baseBranch,
                featureBranch,
                repoContext: updatedContext,
                completedSummary,
                model,
                runId
              });

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
