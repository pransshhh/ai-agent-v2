import type { SprintState } from "@repo/jira";
import type { Request, Response } from "express";
import { jiraService } from "./jira.service";

type SprintParams = { sprintId: string };
type IssueParams = { issueKey: string };
type EpicParams = { epicKey: string };
type ProjectQuery = { projectId: string };
type SprintQuery = { projectId: string; state?: SprintState };

export const jiraController = {
  async getBacklogIssues(req: Request, res: Response) {
    const { projectId } = req.query as ProjectQuery;
    const issues = await jiraService.getBacklogIssues(
      projectId,
      res.locals.user.id
    );
    res.json(issues);
  },

  async listSprints(req: Request, res: Response) {
    const { projectId, state } = req.query as SprintQuery;
    const sprints = await jiraService.listSprints(
      projectId,
      res.locals.user.id,
      state
    );
    res.json(sprints);
  },

  async getActiveSprint(req: Request, res: Response) {
    const { projectId } = req.query as ProjectQuery;
    const sprint = await jiraService.getActiveSprint(
      projectId,
      res.locals.user.id
    );
    res.json(sprint);
  },

  async createSprint(req: Request, res: Response) {
    const { projectId } = req.query as ProjectQuery;
    const sprint = await jiraService.createSprint(
      projectId,
      res.locals.user.id,
      req.body
    );
    res.status(201).json(sprint);
  },

  async updateSprint(req: Request, res: Response) {
    const { sprintId } = req.params as SprintParams;
    const { projectId } = req.query as ProjectQuery;
    const sprint = await jiraService.updateSprint(
      projectId,
      res.locals.user.id,
      Number(sprintId),
      req.body
    );
    res.json(sprint);
  },

  async moveIssuesToSprint(req: Request, res: Response) {
    const { sprintId } = req.params as SprintParams;
    const { projectId } = req.query as ProjectQuery;
    await jiraService.moveIssuesToSprint(
      projectId,
      res.locals.user.id,
      Number(sprintId),
      req.body
    );
    res.json({ message: "Issues moved to sprint" });
  },

  async getSprintIssues(req: Request, res: Response) {
    const { sprintId } = req.params as SprintParams;
    const { projectId } = req.query as ProjectQuery;
    const issues = await jiraService.getSprintIssues(
      projectId,
      res.locals.user.id,
      Number(sprintId)
    );
    res.json(issues);
  },

  async createIssue(req: Request, res: Response) {
    const { projectId } = req.query as ProjectQuery;
    const issue = await jiraService.createIssue(
      projectId,
      res.locals.user.id,
      req.body
    );
    res.status(201).json(issue);
  },

  async getIssue(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    const { projectId } = req.query as ProjectQuery;
    const issue = await jiraService.getIssue(
      projectId,
      res.locals.user.id,
      issueKey
    );
    res.json(issue);
  },

  async updateIssue(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    const { projectId } = req.query as ProjectQuery;
    const issue = await jiraService.updateIssue(
      projectId,
      res.locals.user.id,
      issueKey,
      req.body
    );
    res.json(issue);
  },

  async closeIssue(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    const { projectId } = req.query as ProjectQuery;
    await jiraService.closeIssue(projectId, res.locals.user.id, issueKey);
    res.json({ message: "Issue closed" });
  },

  async assignIssue(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    const { projectId } = req.query as ProjectQuery;
    await jiraService.assignIssue(
      projectId,
      res.locals.user.id,
      issueKey,
      req.body
    );
    res.json({ message: "Issue assigned" });
  },

  async addComment(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    const { projectId } = req.query as ProjectQuery;
    await jiraService.addComment(
      projectId,
      res.locals.user.id,
      issueKey,
      req.body
    );
    res.status(201).json({ message: "Comment added" });
  },

  async deleteIssue(req: Request, res: Response) {
    const { issueKey } = req.params as IssueParams;
    const { projectId } = req.query as ProjectQuery;
    await jiraService.deleteIssue(projectId, res.locals.user.id, issueKey);
    res.json({ message: "Issue deleted" });
  },

  async createEpic(req: Request, res: Response) {
    const { projectId } = req.query as ProjectQuery;
    const epic = await jiraService.createEpic(
      projectId,
      res.locals.user.id,
      req.body
    );
    res.status(201).json(epic);
  },

  async getEpicIssues(req: Request, res: Response) {
    const { epicKey } = req.params as EpicParams;
    const { projectId } = req.query as ProjectQuery;
    const issues = await jiraService.getEpicIssues(
      projectId,
      res.locals.user.id,
      epicKey
    );
    res.json(issues);
  }
};
