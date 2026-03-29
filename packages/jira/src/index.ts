import { createJiraClients } from "./client";
import { createBoardService } from "./services/board";
import { createEpicService } from "./services/epic";
import { createIssueService } from "./services/issue";
import { createSprintService } from "./services/sprint";
import type { JiraConfig } from "./types";

export * from "./types";

/**
 * Creates all Jira services with the provided config.
 * Call this once in apps/api/src/lib/jira.ts with validated env vars.
 *
 * Internally creates two jira.js clients:
 *  - Version3Client → issues, comments, transitions
 *  - AgileClient    → boards, sprints
 *
 * @example
 * // apps/api/src/lib/jira.ts
 * import { createJiraServices } from '@repo/jira'
 * import { env } from '../config/env'
 *
 * export const jira = createJiraServices({
 *   baseUrl: env.JIRA_BASE_URL,
 *   email: env.JIRA_EMAIL,
 *   apiToken: env.JIRA_API_TOKEN,
 *   projectKey: env.JIRA_PROJECT_KEY,
 *   boardId: env.JIRA_BOARD_ID,
 * })
 *
 * // Then anywhere in apps/api:
 * const sprint = await jira.sprints.createSprint({ name: 'Sprint 1' })
 * const issue  = await jira.issues.createIssue({ summary: 'Fix bug', type: 'Bug' })
 */
export function createJiraServices(config: JiraConfig) {
  const { v3, agile } = createJiraClients(config);

  return {
    boards: createBoardService(agile),
    sprints: createSprintService(agile, config),
    issues: createIssueService(v3, agile, config),
    epics: createEpicService(v3, config)
  };
}

export type JiraServices = ReturnType<typeof createJiraServices>;
