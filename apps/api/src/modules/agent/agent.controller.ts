import type { Request, Response } from "express";
import { agentService } from "./agent.service";

export const agentController = {
  async startPlanning(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await agentService.startPlanning(
      id,
      res.locals.user.id,
      req.body
    );
    res.status(201).json(result);
  },

  async approvePlanning(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await agentService.approvePlanning(id, res.locals.user.id);
    res.status(200).json(result);
  },

  async startCoding(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await agentService.startCoding(
      id,
      res.locals.user.id,
      req.body
    );
    res.status(201).json(result);
  },

  async approveSprintReview(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await agentService.approveSprintReview(
      id,
      res.locals.user.id
    );
    res.status(201).json(result);
  },

  async reset(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await agentService.reset(id, res.locals.user.id);
    res.status(200).json(result);
  },

  async rejectSprintReview(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await agentService.rejectSprintReview(
      id,
      res.locals.user.id,
      req.body
    );
    res.status(201).json(result);
  }
};
