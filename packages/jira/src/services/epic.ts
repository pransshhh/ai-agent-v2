import type { Version3Client, Version3Models } from "jira.js";
import type {
  CreateEpicInput,
  IssuePriority,
  IssueType,
  JiraConfig,
  JiraEpic,
  JiraIssue
} from "../types";

export function createEpicService(v3: Version3Client, config: JiraConfig) {
  return {
    /**
     * Creates an Epic in the configured project.
     * customfield_10011 is the standard Jira "Epic Name" field — required for epics.
     * The fields type already has [key: string]: any so customfield_* keys are valid.
     */
    async createEpic(input: CreateEpicInput): Promise<JiraEpic> {
      const fields: {
        [key: string]: unknown;
        summary: string;
        project: { key: string };
        issuetype: { name: string };
      } = {
        project: { key: config.projectKey },
        summary: input.summary,
        issuetype: { name: "Epic" },
        customfield_10011: input.name,
        ...(input.description ? { description: input.description } : {}),
        ...(input.priority ? { priority: { name: input.priority } } : {})
      };

      const created = await v3.issues.createIssue({ fields });

      const issue = await v3.issues.getIssue({
        issueIdOrKey: created.key ?? ""
      });

      return {
        id: issue.id,
        key: issue.key,
        name: input.name,
        summary: issue.fields.summary,
        status: issue.fields.status.name ?? ""
      };
    },

    /**
     * Gets all issues belonging to an epic via JQL.
     */
    async getEpicIssues(epicKey: string): Promise<JiraIssue[]> {
      const res = await v3.issueSearch.searchForIssuesUsingJql({
        jql: `project = "${config.projectKey}" AND "Epic Link" = "${epicKey}" ORDER BY created DESC`,
        fields: [
          "summary",
          "description",
          "issuetype",
          "status",
          "priority",
          "assignee",
          "reporter",
          "created",
          "updated",
          "sprint"
        ]
      });

      return (res.issues ?? []).map((raw: Version3Models.Issue) => {
        const f = raw.fields;
        const description =
          f.description?.content?.[0]?.content
            ?.filter((n) => n.type === "text")
            .map((n) => n.text)
            .join("") ?? undefined;

        return {
          id: raw.id,
          key: raw.key,
          summary: f.summary,
          description,
          type: f.issuetype?.name as IssueType,
          status: f.status.name as string,
          priority: f.priority.name as IssuePriority,
          assigneeAccountId: f.assignee?.accountId,
          reporterAccountId: f.reporter.accountId,
          epicKey,
          createdAt: f.created,
          updatedAt: f.updated
        };
      });
    }
  };
}
