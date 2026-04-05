import { db } from "@repo/db";
import type {
  RejectSprintRequest,
  StartCodingRequest,
  StartPlanningRequest
} from "@repo/zod/agent";
import { env } from "../../config/env";
import { createJira } from "../../lib/jira";
import {
  codingQueue,
  planningQueue,
  sprintPlanningQueue
} from "../../lib/queue";
import { AppError } from "../../middleware/error";

export const agentService = {
  async startPlanning(
    projectId: string,
    userId: string,
    input: StartPlanningRequest
  ) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project)
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    if (project.userId !== userId)
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (!project.jiraProjectKey || !project.jiraBoardId) {
      throw new AppError(
        "Jira not linked to this project",
        400,
        "JIRA_NOT_LINKED"
      );
    }

    const runId = crypto.randomUUID();

    await db.project.update({
      where: { id: projectId },
      data: { status: "PLANNING", currentRunId: runId }
    });

    const job = await planningQueue.add("planning", {
      runId,
      userId,
      projectId,
      jiraProjectKey: project.jiraProjectKey,
      jiraBoardId: project.jiraBoardId,
      prompt: input.prompt,
      aiProvider: "gemini",
      aiApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    return { jobId: job.id ?? "", runId };
  },

  /**
   * Approve planning: user has reviewed the backlog. Status stays PLANNED.
   * Clears any stale jiraSprintId. User will then pick a sprint and call startCoding.
   */
  async approvePlanning(projectId: string, userId: string) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project)
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    if (project.userId !== userId)
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (project.status !== "PLANNED") {
      throw new AppError(
        "Project is not in PLANNED status",
        400,
        "INVALID_STATUS"
      );
    }

    await db.project.update({
      where: { id: projectId },
      data: { jiraSprintId: null }
    });

    return { status: "approved" as const };
  },

  /**
   * Start coding: user picks an existing future sprint, we save it to the project
   * and enqueue the coding job immediately.
   */
  async startCoding(
    projectId: string,
    userId: string,
    input: StartCodingRequest
  ) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project)
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    if (project.userId !== userId)
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (project.status !== "PLANNED") {
      throw new AppError(
        "Project is not in PLANNED status",
        400,
        "INVALID_STATUS"
      );
    }
    if (!project.jiraProjectKey || !project.jiraBoardId) {
      throw new AppError(
        "Jira not linked to this project",
        400,
        "JIRA_NOT_LINKED"
      );
    }

    const jira = createJira(project.jiraProjectKey, project.jiraBoardId);
    const futureSprints = await jira.sprints.listSprints("future");
    const sprint = futureSprints.find((s) => s.id === input.sprintId);
    if (!sprint) {
      throw new AppError(
        `Sprint ${input.sprintId} not found in future sprints`,
        400,
        "SPRINT_NOT_FOUND"
      );
    }

    const codingRunId = crypto.randomUUID();

    await db.project.update({
      where: { id: projectId },
      data: {
        status: "CODING",
        currentRunId: codingRunId,
        jiraSprintId: input.sprintId
      }
    });

    const job = await codingQueue.add("coding", {
      runId: codingRunId,
      userId,
      projectId,
      jiraProjectKey: project.jiraProjectKey,
      jiraBoardId: project.jiraBoardId,
      sprintId: input.sprintId,
      s3Prefix: `projects/${projectId}/`,
      aiProvider: "gemini",
      aiApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    return { jobId: job.id ?? "", runId: codingRunId };
  },

  /**
   * Approve sprint review: close current sprint, queue sprint-planning which
   * picks the next logical batch from backlog and starts a new coding run.
   * If backlog is empty the sprint-planning worker sets the project to IDLE.
   */
  async approveSprintReview(projectId: string, userId: string) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project)
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    if (project.userId !== userId)
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (project.status !== "SPRINT_REVIEW") {
      throw new AppError(
        "Project is not in SPRINT_REVIEW status",
        400,
        "INVALID_STATUS"
      );
    }
    if (!project.jiraSprintId) {
      throw new AppError("No active sprint found", 400, "NO_SPRINT");
    }
    if (!project.jiraProjectKey || !project.jiraBoardId) {
      throw new AppError(
        "Jira not linked to this project",
        400,
        "JIRA_NOT_LINKED"
      );
    }

    const sprintPlanRunId = crypto.randomUUID();

    await db.project.update({
      where: { id: projectId },
      data: { status: "CODING", currentRunId: sprintPlanRunId }
    });

    const job = await sprintPlanningQueue.add("sprint-planning", {
      runId: sprintPlanRunId,
      userId,
      projectId,
      jiraProjectKey: project.jiraProjectKey,
      jiraBoardId: project.jiraBoardId,
      previousSprintId: project.jiraSprintId,
      aiProvider: "gemini",
      aiApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    return { jobId: job.id ?? "", runId: sprintPlanRunId };
  },

  /**
   * Reject sprint review at ticket K:
   *   - Finds K's position in the sprint issue list
   *   - Resets K and all tickets after K to "To Do"
   *   - Adds feedback comment to K; adds dependency warning to tickets after K
   *   - Queues a new coding job for the same sprint with rejection context
   */
  async reset(projectId: string, userId: string) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project)
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    if (project.userId !== userId)
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (project.status !== "FAILED") {
      throw new AppError(
        "Project is not in FAILED status",
        400,
        "INVALID_STATUS"
      );
    }
    if (!project.jiraProjectKey || !project.jiraBoardId) {
      throw new AppError(
        "Jira not linked to this project",
        400,
        "JIRA_NOT_LINKED"
      );
    }

    const jira = createJira(project.jiraProjectKey, project.jiraBoardId);
    const backlog = await jira.issues.getBacklogIssues(
      `labels = "ai-agent-${projectId}"`
    );
    const targetStatus = backlog.length > 0 ? "PLANNED" : "IDLE";

    await db.project.update({
      where: { id: projectId },
      data: { status: targetStatus, currentRunId: null }
    });

    return { status: targetStatus };
  },

  async rejectSprintReview(
    projectId: string,
    userId: string,
    input: RejectSprintRequest
  ) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project)
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    if (project.userId !== userId)
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (project.status !== "SPRINT_REVIEW") {
      throw new AppError(
        "Project is not in SPRINT_REVIEW status",
        400,
        "INVALID_STATUS"
      );
    }
    if (!project.jiraSprintId) {
      throw new AppError("No active sprint found", 400, "NO_SPRINT");
    }
    if (!project.jiraProjectKey || !project.jiraBoardId) {
      throw new AppError(
        "Jira not linked to this project",
        400,
        "JIRA_NOT_LINKED"
      );
    }

    const jira = createJira(project.jiraProjectKey, project.jiraBoardId);

    // Get all sprint issues in rank order
    const sprintIssues = await jira.issues.getSprintIssues(
      project.jiraSprintId
    );

    const rejectedIndex = sprintIssues.findIndex(
      (i) => i.key === input.issueKey
    );
    if (rejectedIndex === -1) {
      throw new AppError(
        `Issue ${input.issueKey} not found in current sprint`,
        400,
        "ISSUE_NOT_IN_SPRINT"
      );
    }

    // Transition tickets before K from "In Review" → "Done" (they passed review)
    const ticketsBefore = sprintIssues.slice(0, rejectedIndex);
    await Promise.all(
      ticketsBefore
        .filter((i) => i.status === "In Review")
        .map((i) => jira.issues.transitionIssue(i.key, "Done"))
    );

    // Reset K and all tickets after K to "To Do"
    const ticketsToReset = sprintIssues.slice(rejectedIndex);

    await Promise.all(
      ticketsToReset.map(async (issue) => {
        await jira.issues.transitionIssue(issue.key, "To Do");

        if (issue.key === input.issueKey) {
          await jira.issues.addComment(issue.key, {
            body: `🔁 HIL rejection feedback:\n\n${input.feedback}\n\nThis ticket has been reset to "To Do" for re-implementation.`
          });
        } else {
          await jira.issues.addComment(issue.key, {
            body: `⚠️ This ticket has been reset because ticket ${input.issueKey} (which comes before it in the sprint) was rejected by a human reviewer. It may depend on ${input.issueKey}, so it must be re-implemented once ${input.issueKey} is corrected.`
          });
        }
      })
    );

    const codingRunId = crypto.randomUUID();

    await db.project.update({
      where: { id: projectId },
      data: { status: "CODING", currentRunId: codingRunId }
    });

    const job = await codingQueue.add("coding", {
      runId: codingRunId,
      userId,
      projectId,
      jiraProjectKey: project.jiraProjectKey,
      jiraBoardId: project.jiraBoardId,
      sprintId: project.jiraSprintId,
      s3Prefix: `projects/${projectId}/`,
      aiProvider: "gemini",
      aiApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
      rejectedTicketKey: input.issueKey,
      rejectedTicketFeedback: input.feedback
    });

    return { jobId: job.id ?? "", runId: codingRunId };
  }
};
