import type { ConnectionOptions } from "bullmq";

export function createRedisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    ...(url.password ? { password: url.password } : {}),
    keepAlive: 30000,
    maxRetriesPerRequest: null
  };
}
