export const QUEUE_NAMES = {
  PLANNING: "planning",
  CODING: "coding"
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
