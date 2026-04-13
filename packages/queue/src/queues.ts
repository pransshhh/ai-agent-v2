import type { ConnectionOptions } from "bullmq";
import { Queue } from "bullmq";
import type {
  CodingJobPayload,
  PlanningJobPayload,
  SecurityJobPayload,
  SprintPlanningJobPayload,
  TestingJobPayload
} from "./jobs";
import { QUEUE_NAMES } from "./names";

export function createPlanningQueue(connection: ConnectionOptions) {
  return new Queue<PlanningJobPayload>(QUEUE_NAMES.PLANNING, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 }
    }
  });
}

export function createSprintPlanningQueue(connection: ConnectionOptions) {
  return new Queue<SprintPlanningJobPayload>(QUEUE_NAMES.SPRINT_PLANNING, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 }
    }
  });
}

export function createCodingQueue(connection: ConnectionOptions) {
  return new Queue<CodingJobPayload>(QUEUE_NAMES.CODING, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 }
    }
  });
}

export function createTestingQueue(connection: ConnectionOptions) {
  return new Queue<TestingJobPayload>(QUEUE_NAMES.TESTING, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 }
    }
  });
}

export function createSecurityQueue(connection: ConnectionOptions) {
  return new Queue<SecurityJobPayload>(QUEUE_NAMES.SECURITY, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 }
    }
  });
}
