import { Router } from "express";
import { authRouter } from "../../modules/auth/auth.router";

export const v1Router: Router = Router();

v1Router.use("/auth", authRouter);
