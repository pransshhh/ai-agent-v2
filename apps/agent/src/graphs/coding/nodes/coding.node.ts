import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createModel, stepCountIs, ToolLoopAgent } from "@repo/ai";
import { jira } from "../../../lib/jira";
import { logger } from "../../../lib/logger";
import { createListFilesTool } from "../../../tools/list-files";
import { createReadFileTool } from "../../../tools/read-file";
import { createRunCommandTool } from "../../../tools/run-command";
import { createWriteFileTool } from "../../../tools/write-file";
import type { CodingStateType } from "../state";

export async function codingNode(
  state: CodingStateType
): Promise<Partial<CodingStateType>> {
  const sprintIssues = await jira.issues.getSprintIssues(state.sprintId);

  const pending = sprintIssues.filter(
    (issue) =>
      issue.status !== "Done" &&
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
    state.workDir ??
    path.join(BASE_TMP_DIR, "ai-agent", state.projectId, state.runId);

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

    await jira.issues.transitionIssue(ticket.key, "Done");

    await jira.issues.addComment(ticket.key, {
      body: `✅ Agent completed implementation. Run ID: ${state.runId}`
    });

    logger.info(
      { runId: state.runId, ticketKey: ticket.key },
      "Ticket completed"
    );

    await new Promise((resolve) => setTimeout(resolve, 4000));
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

    await new Promise((resolve) => setTimeout(resolve, 4000));
    return {
      failedTickets: [ticket.key],
      workDir,
      error: message
    };
  }
}
