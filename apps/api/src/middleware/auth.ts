import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers)
  });

  if (!session) {
    return res
      .status(401)
      .json({ message: "Unauthorized", code: "UNAUTHORIZED" });
  }

  res.locals.session = session;
  res.locals.user = session.user;

  next();
};
