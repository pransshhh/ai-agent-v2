import {
  createCodingQueue,
  createPlanningQueue,
  createRedisConnection,
  createSprintPlanningQueue
} from "@repo/queue";
import { env } from "../config/env";

const connection = createRedisConnection(env.REDIS_URL);

export const planningQueue = createPlanningQueue(connection);
export const sprintPlanningQueue = createSprintPlanningQueue(connection);
export const codingQueue = createCodingQueue(connection);
