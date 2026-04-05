import { db } from "@repo/db";
import type { SprintState } from "@repo/jira";
import type {
  AddCommentRequest,
  AssignIssueRequest,
  CreateEpicRequest,
  CreateIssueRequest,
  CreateSprintRequest,
  MoveIssuesToSprintRequest,
  UpdateIssueRequest,
  UpdateSprintRequest
} from "@repo/zod/";
import { createJira } from "../../lib/jira";
import { AppError } from "../../middleware/error";

async function getProjectJira(projectId: string, userId: string) {
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
  return createJira(project.jiraProjectKey, project.jiraBoardId);
}

export const jiraService = {
  async getBacklogIssues(projectId: string, userId: string) {
    const jira = await getProjectJira(projectId, userId);
    return jira.issues.getBacklogIssues(`labels = "ai-agent-${projectId}"`);
  },

  async listSprints(projectId: string, userId: string, state?: SprintState) {
    const jira = await getProjectJira(projectId, userId);
    return jira.sprints.listSprints(state);
  },

  async getActiveSprint(projectId: string, userId: string) {
    const jira = await getProjectJira(projectId, userId);
    return jira.sprints.getActiveSprint();
  },

  async createSprint(
    projectId: string,
    userId: string,
    input: CreateSprintRequest
  ) {
    const jira = await getProjectJira(projectId, userId);
    return jira.sprints.createSprint(input);
  },

  async updateSprint(
    projectId: string,
    userId: string,
    sprintId: number,
    input: UpdateSprintRequest
  ) {
    const jira = await getProjectJira(projectId, userId);
    return jira.sprints.updateSprint(sprintId, input);
  },

  async moveIssuesToSprint(
    projectId: string,
    userId: string,
    sprintId: number,
    input: MoveIssuesToSprintRequest
  ) {
    const jira = await getProjectJira(projectId, userId);
    return jira.sprints.moveIssuesToSprint(sprintId, input.issueKeys);
  },

  async createIssue(
    projectId: string,
    userId: string,
    input: CreateIssueRequest
  ) {
    const jira = await getProjectJira(projectId, userId);
    return jira.issues.createIssue(input);
  },

  async getIssue(projectId: string, userId: string, issueKey: string) {
    const jira = await getProjectJira(projectId, userId);
    return jira.issues.getIssue(issueKey);
  },

  async getSprintIssues(projectId: string, userId: string, sprintId: number) {
    const jira = await getProjectJira(projectId, userId);
    return jira.issues.getSprintIssues(sprintId);
  },

  async updateIssue(
    projectId: string,
    userId: string,
    issueKey: string,
    input: UpdateIssueRequest
  ) {
    const jira = await getProjectJira(projectId, userId);
    return jira.issues.updateIssue(issueKey, input);
  },

  async closeIssue(projectId: string, userId: string, issueKey: string) {
    const jira = await getProjectJira(projectId, userId);
    return jira.issues.transitionIssue(issueKey, "Done");
  },

  async assignIssue(
    projectId: string,
    userId: string,
    issueKey: string,
    input: AssignIssueRequest
  ) {
    const jira = await getProjectJira(projectId, userId);
    return jira.issues.assignIssue(issueKey, input.accountId);
  },

  async addComment(
    projectId: string,
    userId: string,
    issueKey: string,
    input: AddCommentRequest
  ) {
    const jira = await getProjectJira(projectId, userId);
    return jira.issues.addComment(issueKey, { body: input.body });
  },

  async deleteIssue(projectId: string, userId: string, issueKey: string) {
    const jira = await getProjectJira(projectId, userId);
    return jira.issues.deleteIssue(issueKey);
  },

  async createEpic(
    projectId: string,
    userId: string,
    input: CreateEpicRequest
  ) {
    const jira = await getProjectJira(projectId, userId);
    return jira.epics.createEpic(input);
  },

  async getEpicIssues(projectId: string, userId: string, epicKey: string) {
    const jira = await getProjectJira(projectId, userId);
    return jira.epics.getEpicIssues(epicKey);
  }
};
