import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { logger } from "./lib/logger";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.json({ message: "Hello World" });
});

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "API running");
});
