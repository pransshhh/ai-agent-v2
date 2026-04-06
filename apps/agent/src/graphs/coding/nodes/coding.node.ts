import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createModel, stepCountIs, ToolLoopAgent } from "@repo/ai";
import { createJira } from "../../../lib/jira";
import { logger } from "../../../lib/logger";
import { createListFilesTool } from "../../../tools/list-files";
import { createReadFileTool } from "../../../tools/read-file";
import { createRunCommandTool } from "../../../tools/run-command";
import { createWriteFileTool } from "../../../tools/write-file";
import type { CodingStateType } from "../state";

export async function codingNode(
  state: CodingStateType
): Promise<Partial<CodingStateType>> {
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

  const BASE_TMP_DIR = path.resolve(process.cwd(), "tmp");

  const workDir =
    state.workDir ?? path.join(BASE_TMP_DIR, "ai-agent", state.projectId);

  await mkdir(workDir, { recursive: true });

  await jira.issues.transitionIssue(ticket.key, "In Progress");

  await jira.issues.addComment(ticket.key, {
    body: `Agent started working on this ticket. Run ID: ${state.runId}`
  });

  const tools = {
    readFile: createReadFileTool(workDir),
    writeFile: createWriteFileTool(workDir),
    listFiles: createListFilesTool(workDir),
    runCommand: createRunCommandTool(workDir)
  };

  const model = createModel({
    provider: state.aiProvider,
    apiKey: state.aiApiKey,
    model: "gemini-2.5-flash"
  });

  const instructions = `You are an expert software engineer implementing Jira tickets.

You MUST use tools to interact with the codebase.

Rules:
- ALWAYS start with listFiles to understand project structure
- ALWAYS read relevant files before modifying them
- Use writeFile for all changes
- Use runCommand to install deps or run tests
- If tests fail → fix them
- Continue until feature is COMPLETE

DO NOT return plain text explanations.
DO NOT stop early.
Keep working until the task is fully implemented.

Working directory contains project files.`;

  try {
    // Build rejection context if this ticket is the rejected one or comes after it
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
Start by exploring the project, then implement the feature.`,
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
      completedTickets: [ticket.key],
      workDir
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
      workDir,
      error: message
    };
  }
}
