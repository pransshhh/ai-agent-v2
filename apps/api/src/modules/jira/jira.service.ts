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
import { jira } from "../../lib/jira";

export const jiraService = {
  async listBoards() {
    return jira.boards.listBoards();
  },

  async listSprints(state?: SprintState) {
    return jira.sprints.listSprints(state);
  },

  async getActiveSprint() {
    return jira.sprints.getActiveSprint();
  },

  async createSprint(input: CreateSprintRequest) {
    return jira.sprints.createSprint(input);
  },

  async updateSprint(sprintId: number, input: UpdateSprintRequest) {
    return jira.sprints.updateSprint(sprintId, input);
  },

  async moveIssuesToSprint(sprintId: number, input: MoveIssuesToSprintRequest) {
    return jira.sprints.moveIssuesToSprint(sprintId, input.issueKeys);
  },

  async createIssue(input: CreateIssueRequest) {
    return jira.issues.createIssue(input);
  },

  async getIssue(issueKey: string) {
    return jira.issues.getIssue(issueKey);
  },

  async getSprintIssues(sprintId: number) {
    return jira.issues.getSprintIssues(sprintId);
  },

  async updateIssue(issueKey: string, input: UpdateIssueRequest) {
    return jira.issues.updateIssue(issueKey, input);
  },

  async closeIssue(issueKey: string) {
    return jira.issues.transitionIssue(issueKey, "Done");
  },

  async assignIssue(issueKey: string, input: AssignIssueRequest) {
    return jira.issues.assignIssue(issueKey, input.accountId);
  },

  async addComment(issueKey: string, input: AddCommentRequest) {
    return jira.issues.addComment(issueKey, { body: input.body });
  },

  async deleteIssue(issueKey: string) {
    return jira.issues.deleteIssue(issueKey);
  },

  async createEpic(input: CreateEpicRequest) {
    return jira.epics.createEpic(input);
  },

  async getEpicIssues(epicKey: string) {
    return jira.epics.getEpicIssues(epicKey);
  }
};
