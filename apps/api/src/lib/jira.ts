import { createJiraServices } from "@repo/jira";
import { env } from "../config/env";

const credentials = {
  baseUrl: env.JIRA_BASE_URL,
  email: env.JIRA_EMAIL,
  apiToken: env.JIRA_API_TOKEN
};

/** Per-project Jira client. Use for all board/sprint/issue operations. */
export function createJira(projectKey: string, boardId: number) {
  return createJiraServices({ ...credentials, projectKey, boardId });
}

/**
 * Credential-only client for Jira project/board discovery.
 * Only use for listBoards() — projectKey and boardId are not known yet.
 */
export function createDiscoveryJira() {
  return createJiraServices({ ...credentials, projectKey: "", boardId: 0 });
}
