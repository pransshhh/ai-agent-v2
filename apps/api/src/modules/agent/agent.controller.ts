import type { Request, Response } from "express";
import { agentService } from "./agent.service";

export const agentController = {
  async startPlanning(req: Request, res: Response) {
    const result = await agentService.startPlanning(req.body);
    res.status(201).json(result);
  },

  async approvePlanning(req: Request, res: Response) {
    const result = await agentService.approvePlanning(req.body);
    res.status(201).json(result);
  }
};
