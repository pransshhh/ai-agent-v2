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
    res.status(201).json(result);
  }
};
