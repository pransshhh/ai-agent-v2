import { createModel, stepCountIs, ToolLoopAgent, tool } from "@repo/ai";
import { z } from "zod";
import { jira } from "../../../lib/jira";
import { logger } from "../../../lib/logger";
import type { PlanningStateType } from "../state";

export async function jiraNode(
  state: PlanningStateType
): Promise<Partial<PlanningStateType>> {
  logger.info({ runId: state.runId }, "Jira node started");

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
      description: "Create a Jira story under an epic",
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
          epicKey
        });

        logger.info(
          { runId: state.runId, issueKey: issue.key },
          "Story created"
        );

        return { key: issue.key, summary: issue.summary };
      }
    }),

    createTask: tool({
      description: "Create a Jira task",
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
          priority
        });

        logger.info(
          { runId: state.runId, issueKey: issue.key },
          "Task created"
        );

        return { key: issue.key, summary: issue.summary };
      }
    }),

    createSprint: tool({
      description: "Create sprint and assign issues",
      inputSchema: z.object({
        name: z.string(),
        goal: z.string(),
        issueKeys: z.array(z.string())
      }),
      execute: async ({ name, goal, issueKeys }) => {
        const sprint = await jira.sprints.createSprint({ name, goal });

        await jira.sprints.moveIssuesToSprint(sprint.id, issueKeys);

        logger.info(
          { runId: state.runId, sprintId: sprint.id },
          "Sprint created"
        );

        return { sprintId: sprint.id, name: sprint.name };
      }
    })
  };

  const instructions = `You are a senior engineering project manager.

You MUST use tools to create Jira entities.

Rules:
- Do NOT return plain text
- Only use tool calls
- Create 2–5 epics
- Each epic → 3–8 stories/tasks
- Call createSprint EXACTLY ONCE, only after ALL epics and stories are created
- Pass ALL created ticket keys to createSprint in the issueKeys array
- Do NOT call createSprint more than once under any circumstances

Project:
${state.prompt}`;

  const epicKeys: string[] = [];
  const ticketKeys: string[] = [];
  let sprintId: number | null = null;

  try {
    const agent = new ToolLoopAgent({
      model,
      tools,
      instructions,
      stopWhen: stepCountIs(40) // 👈 important
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

          if ("sprintId" in output && typeof output.sprintId === "number") {
            sprintId = output.sprintId;
          }
        }
      }
    });

    logger.info(
      { runId: state.runId, epicKeys, ticketKeys, sprintId },
      "Jira node completed"
    );

    return {
      epicKeys,
      ticketKeys,
      sprintId,
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
