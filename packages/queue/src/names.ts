export const QUEUE_NAMES = {
  PLANNING: "planning",
  SPRINT_PLANNING: "sprint-planning",
  CODING: "coding",
  TESTING: "testing",
  SECURITY: "security"
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
