import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env";
import { auth } from "./lib/auth";

export const createApp = (): Express => {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true
    })
  );

  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());

  return app;
};
