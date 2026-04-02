import type { Request, Response } from "express";
import { projectService } from "./project.service";

type ProjectParams = { id: string };

export const projectController = {
  async listProjects(_req: Request, res: Response) {
    const projects = await projectService.listProjects(res.locals.user.id);
    res.json(projects);
  },

  async getProject(req: Request, res: Response) {
    const { id } = req.params as ProjectParams;
    const project = await projectService.getProject(id, res.locals.user.id);
    res.json(project);
  },

  async createProject(req: Request, res: Response) {
    const project = await projectService.createProject(
      res.locals.user.id,
      req.body
    );
    res.status(201).json(project);
  },

  async updateProject(req: Request, res: Response) {
    const { id } = req.params as ProjectParams;
    const project = await projectService.updateProject(
      id,
      res.locals.user.id,
      req.body
    );
    res.json(project);
  },

  async deleteProject(req: Request, res: Response) {
    const { id } = req.params as ProjectParams;
    const result = await projectService.deleteProject(id, res.locals.user.id);
    res.json(result);
  },

  async linkJira(req: Request, res: Response) {
    const { id } = req.params as ProjectParams;
    const project = await projectService.linkJira(
      id,
      res.locals.user.id,
      req.body
    );
    res.json(project);
  },

  async unlinkJira(req: Request, res: Response) {
    const { id } = req.params as ProjectParams;
    const project = await projectService.unlinkJira(id, res.locals.user.id);
    res.json(project);
  }
};
