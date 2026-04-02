import { Router } from "express";
import { authRouter } from "../../modules/auth/auth.router";
import { jiraRouter } from "../../modules/jira/jira.router";
import { projectRouter } from "../../modules/project/project.router";

export const v1Router: Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/jira", jiraRouter);
v1Router.use("/projects", projectRouter);
