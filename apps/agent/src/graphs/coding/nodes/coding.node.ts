import type { ToolSet } from "@repo/ai";
import { createModel, stepCountIs, ToolLoopAgent } from "@repo/ai";
import { createGithubServices } from "@repo/github";
import { createJira } from "../../../lib/jira";
import { logger } from "../../../lib/logger";
import { createGithubListFilesTool } from "../../../tools/github-list-files";
import { createGithubReadFileTool } from "../../../tools/github-read-file";
import { createGithubWriteFileTool } from "../../../tools/github-write-file";
import { createRunCommandTool } from "../../../tools/run-command";
import type { CodingStateType } from "../state";

export async function codingNode(
  state: CodingStateType
): Promise<Partial<CodingStateType>> {
  // ── PR fix mode ──────────────────────────────────────────────────────────
  // When prFeedback is set, skip the Jira ticket loop and apply PR feedback directly.
  if (state.prFeedback) {
    logger.info(
      { runId: state.runId },
      "PR fix mode — applying PR reviewer feedback"
    );

    const hasGithub =
      state.githubPat &&
      state.githubOwner &&
      state.githubRepo &&
      state.featureBranch;

    if (!hasGithub) {
      return {
        status: "failed",
        error: "GitHub not connected — cannot apply PR feedback"
      };
    }

    const github = createGithubServices({ pat: state.githubPat as string });
    const owner = state.githubOwner as string;
    const repo = state.githubRepo as string;
    const branch = state.featureBranch as string;

    const tools = {
      readFile: createGithubReadFileTool(github, owner, repo, branch),
      writeFile: createGithubWriteFileTool(github, owner, repo, branch),
      listFiles: createGithubListFilesTool(github, owner, repo, branch)
    };

    const model = createModel({
      provider: state.aiProvider,
      apiKey: state.aiApiKey,
      model: "gemini-2.5-flash"
    });

    const repoContextSection = state.repoContext
      ? `\n## Repository Context\n${state.repoContext}\n`
      : "";

    const instructions = `You are an expert software engineer addressing GitHub PR review feedback.
${repoContextSection}
Rules:
- ALWAYS start with listFiles to understand the current project structure
- ALWAYS read the relevant files before modifying them
- Use writeFile for all changes — each write commits directly to the feature branch
- The open PR will auto-update when you push commits to this branch
- Continue until ALL reviewer concerns are fully addressed`;

    const agent = new ToolLoopAgent({
      model,
      tools,
      instructions,
      stopWhen: stepCountIs(60)
    });

    await agent.generate({
      prompt: `A GitHub PR reviewer has requested changes. Address all of their feedback:

PR Review Feedback:
${state.prFeedback}

Start by exploring the project with listFiles, read the relevant files, then implement all requested fixes.`,
      onStepFinish: ({ stepNumber, toolCalls }) => {
        logger.info(
          {
            runId: state.runId,
            step: stepNumber,
            toolsUsed: toolCalls?.map((t) => t.toolName)
          },
          "PR fix step completed"
        );
      }
    });

    logger.info({ runId: state.runId }, "PR fix completed");
    return { status: "done" };
  }

  // ── Normal ticket loop mode ───────────────────────────────────────────────
  const jira = createJira(state.jiraProjectKey, state.jiraBoardId);
  const sprintIssues = await jira.issues.getSprintIssues(state.sprintId);

  const pending = sprintIssues.filter(
    (issue) =>
      issue.status !== "Done" &&
      issue.status !== "In Review" &&
      !state.completedTickets.includes(issue.key) &&
      !state.failedTickets.includes(issue.key)
  );

  if (pending.length === 0) {
    logger.info({ runId: state.runId }, "All tickets completed");
    return { status: "done" };
  }

  const ticket = pending[0];
  if (!ticket) return { status: "done" };

  logger.info(
    { runId: state.runId, ticketKey: ticket.key },
    "Coding node started"
  );

  await jira.issues.transitionIssue(ticket.key, "In Progress");

  await jira.issues.addComment(ticket.key, {
    body: `Agent started working on this ticket. Run ID: ${state.runId}`
  });

  // Build GitHub-aware tools when GitHub is connected
  const hasGithub =
    state.githubPat &&
    state.githubOwner &&
    state.githubRepo &&
    state.featureBranch;

  let tools: ToolSet;

  if (hasGithub) {
    const github = createGithubServices({ pat: state.githubPat as string });
    const owner = state.githubOwner as string;
    const repo = state.githubRepo as string;
    const branch = state.featureBranch as string;

    tools = {
      readFile: createGithubReadFileTool(github, owner, repo, branch),
      writeFile: createGithubWriteFileTool(github, owner, repo, branch),
      listFiles: createGithubListFilesTool(github, owner, repo, branch)
    };
  } else {
    // Fallback: no GitHub connected — agent can still attempt local run-command
    // but file tools won't work without a workDir. This path is a degraded mode.
    logger.warn(
      { runId: state.runId },
      "GitHub not connected — file tools unavailable"
    );
    tools = {
      runCommand: createRunCommandTool(process.cwd())
    };
  }

  const model = createModel({
    provider: state.aiProvider,
    apiKey: state.aiApiKey,
    model: "gemini-2.5-flash"
  });

  const repoContextSection = state.repoContext
    ? `\n## Repository Context\n${state.repoContext}\n`
    : "";

  const instructions = `You are an expert software engineer implementing Jira tickets against a real GitHub repository.

You MUST use tools to interact with the codebase. All file operations go directly to GitHub via the API.
${repoContextSection}
Rules:
- ALWAYS start with listFiles to understand project structure
- ALWAYS read relevant files before modifying them
- Use writeFile for all changes — each write commits directly to the feature branch
- Do NOT use runCommand for git operations (already managed by the workflow)
- Continue until the feature is COMPLETE and all acceptance criteria are met

DO NOT return plain text explanations.
DO NOT stop early.
Keep working until the task is fully implemented.`;

  try {
    let rejectionContext = "";
    if (state.rejectedTicketKey && state.rejectedTicketFeedback) {
      if (ticket.key === state.rejectedTicketKey) {
        rejectionContext = `
⚠️  HUMAN REVIEW REJECTION FEEDBACK:
This ticket was previously rejected by a human reviewer. You MUST address the following feedback:
"${state.rejectedTicketFeedback}"

Do not repeat the same implementation. Carefully read the feedback and fix the issue.`;
      } else {
        rejectionContext = `
⚠️  DEPENDENCY CONTEXT:
Ticket ${state.rejectedTicketKey} was rejected by a human reviewer and re-implemented. This ticket may depend on it.
You MUST re-examine and re-implement this ticket from scratch to ensure it is consistent with the corrected version of ${state.rejectedTicketKey}.
Do not assume the previous implementation was correct.`;
      }
    }

    const agent = new ToolLoopAgent({
      model,
      tools,
      instructions,
      stopWhen: stepCountIs(60)
    });

    await agent.generate({
      prompt: `Implement this Jira ticket:

Ticket: ${ticket.key}
Summary: ${ticket.summary}
Description: ${ticket.description ?? "No description provided"}
${rejectionContext}
Start by exploring the project with listFiles, then implement the feature.`,
      onStepFinish: ({ stepNumber, toolCalls }) => {
        logger.info(
          {
            runId: state.runId,
            ticketKey: ticket.key,
            step: stepNumber,
            toolsUsed: toolCalls?.map((t) => t.toolName)
          },
          "Coding step completed"
        );
      }
    });

    await jira.issues.transitionIssue(ticket.key, "In Review");

    await jira.issues.addComment(ticket.key, {
      body: `✅ Agent completed implementation — awaiting human review. Run ID: ${state.runId}`
    });

    logger.info(
      { runId: state.runId, ticketKey: ticket.key },
      "Ticket completed"
    );

    return {
      currentTicketKey: ticket.key,
      currentTicketSummary: ticket.summary,
      completedTickets: [ticket.key]
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    logger.error(
      { runId: state.runId, ticketKey: ticket.key, err },
      "Coding node failed"
    );

    await jira.issues.addComment(ticket.key, {
      body: `❌ Agent failed: ${message}. Run ID: ${state.runId}`
    });

    return {
      failedTickets: [ticket.key],
      error: message
    };
  }
}
