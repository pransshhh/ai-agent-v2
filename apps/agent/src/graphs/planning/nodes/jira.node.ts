import { createModel, stepCountIs, ToolLoopAgent, tool } from "@repo/ai";
import { z } from "zod";
import { createJira } from "../../../lib/jira";
import { logger } from "../../../lib/logger";
import type { PlanningStateType } from "../state";

export async function jiraNode(
  state: PlanningStateType
): Promise<Partial<PlanningStateType>> {
  logger.info({ runId: state.runId }, "Jira node started");

  const jira = createJira(state.jiraProjectKey, state.jiraBoardId);

  const model = createModel({
    provider: state.aiProvider,
    apiKey: state.aiApiKey,
    model: "gemini-3.1-flash-lite-preview"
  });

  const tools = {
    createEpic: tool({
      description: "Create a Jira epic",
      inputSchema: z.object({
        name: z.string(),
        summary: z.string(),
        description: z.string().optional()
      }),
      execute: async ({ name, summary, description }) => {
        const epic = await jira.epics.createEpic({
          name,
          summary,
          description
        });

        logger.info({ runId: state.runId, epicKey: epic.key }, "Epic created");

        return { key: epic.key, summary: epic.summary };
      }
    }),

    createStory: tool({
      description: "Create a Jira story under an epic (goes to backlog)",
      inputSchema: z.object({
        summary: z.string(),
        description: z.string(),
        epicKey: z.string(),
        priority: z
          .enum(["Highest", "High", "Medium", "Low", "Lowest"])
          .default("Medium")
      }),
      execute: async ({ summary, description, epicKey, priority }) => {
        const issue = await jira.issues.createIssue({
          summary,
          description,
          type: "Story",
          priority,
          epicKey,
          labels: [`ai-agent-${state.projectId}`]
        });

        logger.info(
          { runId: state.runId, issueKey: issue.key },
          "Story created"
        );

        return { key: issue.key, summary: issue.summary };
      }
    }),

    createTask: tool({
      description: "Create a Jira task (goes to backlog)",
      inputSchema: z.object({
        summary: z.string(),
        description: z.string(),
        priority: z
          .enum(["Highest", "High", "Medium", "Low", "Lowest"])
          .default("Medium")
      }),
      execute: async ({ summary, description, priority }) => {
        const issue = await jira.issues.createIssue({
          summary,
          description,
          type: "Task",
          priority,
          labels: [`ai-agent-${state.projectId}`]
        });

        logger.info(
          { runId: state.runId, issueKey: issue.key },
          "Task created"
        );

        return { key: issue.key, summary: issue.summary };
      }
    })
  };

  const instructions = `You are a staff software engineer and product manager planning a greenfield build. A teammate has described what they want; turn it into a backlog a real development team could actually execute.

First, think it through like an engineer (reason internally, then act):
- What is being built, and what does "done" look like?
- What tech stack best fits this use case? Decide, and state the assumption explicitly in the foundation epic.
- Is this frontend, backend, or both? What are the key technical challenges and risks?

Then structure the work the way a real team sequences delivery:
1. Foundation — bootstrap the project: initialize the chosen stack, scaffold the frontend and/or backend skeleton, core config/tooling, and a minimal runnable app.
2. Enabling infrastructure — data models, file handling/storage, auth, third-party integrations — whatever later features depend on.
3. Core features — built incrementally, each story extending the already-running app.
4. Experience & polish — UI/reporting, error handling, configuration, refinements.

How to create it:
- Express the ENTIRE plan through tool calls — createEpic for each phase/theme, then createStory (with that epic's key) for the concrete work under it. Do not just describe the plan in prose.
- The earliest stories MUST produce a runnable skeleton, so every later story has a real codebase to extend.
- Order stories so each builds naturally on the ones before it — foundational work first.
- Write descriptions detailed and unambiguous enough that a coding agent working file-by-file can implement each story without guessing. Reference concrete files, endpoints, or components where it helps.
- Size the plan to the actual scope. Don't pad to hit a number, and don't cram unrelated work into a single ticket.
- Everything goes to the backlog — do NOT create sprints. Use createTask only for genuinely cross-cutting work that belongs to no epic.

What the teammate asked for:
${state.prompt}`;

  const epicKeys: string[] = [];
  const ticketKeys: string[] = [];

  try {
    const agent = new ToolLoopAgent({
      model,
      tools,
      instructions,
      stopWhen: stepCountIs(40)
    });

    await agent.generate({
      prompt: state.prompt,
      onStepFinish: ({ toolCalls, toolResults, stepNumber }) => {
        logger.info(
          {
            runId: state.runId,
            step: stepNumber,
            toolsUsed: toolCalls?.map((t) => t.toolName)
          },
          "Planning step completed"
        );

        for (const result of toolResults ?? []) {
          if (result.type !== "tool-result") continue;

          const output = result.output as Record<string, unknown>;

          if ("key" in output && typeof output.key === "string") {
            if (result.toolName === "createEpic") {
              epicKeys.push(output.key);
            } else {
              ticketKeys.push(output.key);
            }
          }
        }
      }
    });

    logger.info(
      { runId: state.runId, epicKeys, ticketKeys },
      "Jira node completed — all tickets in backlog"
    );

    return {
      epicKeys,
      ticketKeys,
      status: "done"
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    logger.error({ runId: state.runId, err }, "Jira node failed");

    return {
      status: "failed",
      error: message
    };
  }
}
