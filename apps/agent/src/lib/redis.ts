import { createRedisConnection } from "@repo/queue";
import { env } from "../config/env";

export const redisConnection = createRedisConnection(env.REDIS_URL);
