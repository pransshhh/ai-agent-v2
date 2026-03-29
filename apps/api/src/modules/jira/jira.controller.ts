import type { SprintState } from "@repo/jira";
import type { Request, Response } from "express";
import { jiraService } from "./jira.service";

type SprintParams = { sprintId: string };
type IssueParams = { issueKey: string };
type EpicParams = { epicKey: string };
type SprintQuery = { state?: SprintState };

export const jiraController = {
  async listBoards(_req: Request, res: Response) {
    const boards = await jiraService.listBoards();
    res.json(boards);
  },

  async listSprints(req: Request, res: Response) {
    const { state } = req.query as SprintQuery;
    const sprints = await jiraService.listSprints(state);
    res.json(sprints);
  },

  async getActiveSprint(_req: Request, res: Response) {
    const sprint = await jiraService.getActiveSprint();
    res.json(sprint);
  },

  async createSprint(req: Request, res: Response) {
    const sprint = await jiraService.createSprint(req.body);
    res.status(201).json(sprint);
  },

  async updateSprint(req: Request, res: Response) {
    const { sprintId } = req.params as SprintParams;
    const sprint = await jiraService.updateSprint(Number(sprintId), req.body);
    res.json(sprint);
  },

  async moveIssuesToSprint(req: Request, res: Response) {
    const { sprintId } = req.params as SprintParams;
    await jiraService.moveIssuesToSprint(Number(sprintId), req.body);
    res.json({ message: "Issues moved to sprint" });
  },

  async createIssue(req: Request, res: Response) {
    const issue = await jiraService.createIssue(req.body);
    res.status(201).json(issue);
  },

  async getIssue(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    const issue = await jiraService.getIssue(issueKey);
    res.json(issue);
  },

  async getSprintIssues(req: Request, res: Response) {
    const { sprintId } = req.params as SprintParams;
    const issues = await jiraService.getSprintIssues(Number(sprintId));
    res.json(issues);
  },

  async updateIssue(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    const issue = await jiraService.updateIssue(issueKey, req.body);
    res.json(issue);
  },

  async closeIssue(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    await jiraService.closeIssue(issueKey);
    res.json({ message: "Issue closed" });
  },

  async assignIssue(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    await jiraService.assignIssue(issueKey, req.body);
    res.json({ message: "Issue assigned" });
  },

  async addComment(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    await jiraService.addComment(issueKey, req.body);
    res.status(201).json({ message: "Comment added" });
  },

  async createEpic(req: Request, res: Response) {
    const epic = await jiraService.createEpic(req.body);
    res.status(201).json(epic);
  },

  async getEpicIssues(req: Request, res: Response) {
    const { epicKey } = req.params as EpicParams;
    const issues = await jiraService.getEpicIssues(epicKey);
    res.json(issues);
  }
};
