import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

type ValidateSchema = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

export const validate = (schema: ValidateSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (schema.body) {
      const result = schema.body.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: z.treeifyError(result.error)
        });
      }
      req.body = result.data;
    }

    if (schema.query) {
      const result = schema.query.safeParse(req.query);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: z.treeifyError(result.error)
        });
      }
      Object.assign(req.query, result.data);
    }

    if (schema.params) {
      const result = schema.params.safeParse(req.params);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: z.treeifyError(result.error)
        });
      }
      req.params = result.data as typeof req.params;
    }

    return next();
  };
};
