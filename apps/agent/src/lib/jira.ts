import { createJiraServices } from "@repo/jira";
import { env } from "../config/env";

const credentials = {
  baseUrl: env.JIRA_BASE_URL,
  email: env.JIRA_EMAIL,
  apiToken: env.JIRA_API_TOKEN
};

/** Per-project Jira client. Pass the project's jiraProjectKey and jiraBoardId. */
export function createJira(projectKey: string, boardId: number) {
  return createJiraServices({ ...credentials, projectKey, boardId });
}
