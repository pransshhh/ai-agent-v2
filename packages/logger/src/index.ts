import pino, { type Logger } from "pino";

type LoggerOptions = {
  service: string;
  environment: string;
};

export const createLogger = ({
  service,
  environment
}: LoggerOptions): Logger => {
  return pino({
    level: environment === "production" ? "info" : "debug",
    base: {
      service,
      environment
    },
    transport:
      environment === "production"
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname"
            }
          }
  });
};

export type { Logger };
