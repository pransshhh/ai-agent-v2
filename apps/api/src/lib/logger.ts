import { createLogger, type Logger } from "@repo/logger";
import { env } from "../config/env";

export const logger: Logger = createLogger({
  service: "api",
  environment: env.NODE_ENV
});
