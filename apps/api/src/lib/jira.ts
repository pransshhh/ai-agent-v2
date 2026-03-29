import { createJiraServices } from "@repo/jira";
import { env } from "../config/env";

export const jira = createJiraServices({
  baseUrl: env.JIRA_BASE_URL,
  email: env.JIRA_EMAIL,
  apiToken: env.JIRA_API_TOKEN,
  projectKey: env.JIRA_PROJECT_KEY,
  boardId: env.JIRA_BOARD_ID
});
