import pino, { type Logger, type LoggerOptions } from "pino";
import { env } from "../config/env";

type CreateLoggerOptions = {
  service: string;
} & LoggerOptions;

export const createLogger = ({
  service,
  ...options
}: CreateLoggerOptions): Logger => {
  const isProd = env.NODE_ENV === "production";

  return pino({
    level: isProd ? "info" : "debug",
    base: {
      service,
      environment: env.NODE_ENV
    },
    transport: isProd
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname"
          }
        },
    ...options
  });
};

export const logger = createLogger({
  service: "agent"
});
