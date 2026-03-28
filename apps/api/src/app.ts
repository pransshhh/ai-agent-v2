import path from "node:path";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env";
import { auth } from "./lib/auth";
import { generateOpenAPISpec } from "./lib/openapi";
import { errorHandler } from "./middleware/error";
import { v1Router } from "./router/v1";

export const createApp = (): Express => {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
      exposedHeaders: ["set-cookie"],
      credentials: true
    })
  );

  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());
  app.get("/static/openapi.json", (_, res) => {
    res.json(generateOpenAPISpec());
  });
  app.use("/static", express.static(path.join(__dirname, "..", "static")));
  app.use("/api/v1", v1Router);
  app.use(errorHandler);

  return app;
};
