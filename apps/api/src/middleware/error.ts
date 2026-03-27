import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code
    });
  }

  logger.error({ err, path: req.path }, "Unhandled error");

  return res.status(500).json({
    message: "Internal server error"
  });
};
