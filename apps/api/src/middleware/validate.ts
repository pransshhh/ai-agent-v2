import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type ValidateSchema = {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
};

export const validate = (schema: ValidateSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (schema.body) {
      const result = schema.body.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors
        });
      }
      req.body = result.data;
    }

    if (schema.query) {
      const result = schema.query.safeParse(req.query);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors
        });
      }
      req.query = result.data as typeof req.query;
    }

    if (schema.params) {
      const result = schema.params.safeParse(req.params);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors
        });
      }
      req.params = result.data as typeof req.params;
    }

    next();
  };
};
