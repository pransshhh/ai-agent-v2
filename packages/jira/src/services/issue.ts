import type {
  AgileClient,
  AgileModels,
  Version3Client,
  Version3Models
} from "jira.js";
import type {
  AddCommentInput,
  CreateIssueInput,
  IssuePriority,
  IssueType,
  JiraConfig,
  JiraIssue,
  UpdateIssueInput
} from "../types";

export function createIssueService(
  v3: Version3Client,
  agile: AgileClient,
  config: JiraConfig
) {
  return {
    async createIssue(input: CreateIssueInput): Promise<JiraIssue> {
      const res = await v3.issues.createIssue({
        fields: {
          project: { key: config.projectKey },
          summary: input.summary,
          issuetype: { name: input.type },
          ...(input.description ? { description: input.description } : {}),
          ...(input.priority ? { priority: { name: input.priority } } : {}),
          ...(input.assigneeAccountId
            ? { assignee: { accountId: input.assigneeAccountId } }
            : {}),
          ...(input.labels?.length ? { labels: input.labels } : {}),
          ...(input.epicKey ? { parent: { key: input.epicKey } } : {})
        }
      });

      if (input.sprintId) {
        await agile.sprint.moveIssuesToSprintAndRank({
          sprintId: input.sprintId,
          issues: [res.key ?? ""]
        });
      }

      return this.getIssue(res.key ?? "");
    },

    async getIssue(issueKey: string): Promise<JiraIssue> {
      const res = await v3.issues.getIssue({ issueIdOrKey: issueKey });
      return mapV3Issue(res);
    },

    async getSprintIssues(sprintId: number): Promise<JiraIssue[]> {
      const res =
        await agile.sprint.getIssuesForSprint<AgileModels.SearchResults>({
          sprintId
        });
      return res.issues.map(mapAgileIssue);
    },

    async updateIssue(
      issueKey: string,
      input: UpdateIssueInput
    ): Promise<JiraIssue> {
      await v3.issues.editIssue({
        issueIdOrKey: issueKey,
        fields: {
          ...(input.summary ? { summary: input.summary } : {}),
          ...(input.description ? { description: input.description } : {}),
          ...(input.priority ? { priority: { name: input.priority } } : {}),
          ...(input.assigneeAccountId
            ? { assignee: { accountId: input.assigneeAccountId } }
            : {}),
          ...(input.labels ? { labels: input.labels } : {})
        }
      });
      return this.getIssue(issueKey);
    },

    async transitionIssue(
      issueKey: string,
      targetStatus: "In Progress" | "In Review" | "Done"
    ): Promise<void> {
      const transitions = await v3.issues.getTransitions({
        issueIdOrKey: issueKey
      });
      const transition = transitions.transitions?.find(
        (t) => t.name?.toLowerCase() === targetStatus.toLowerCase()
      );
      if (!transition?.id) {
        throw new Error(
          `No "${targetStatus}" transition found for issue ${issueKey}`
        );
      }
      await v3.issues.doTransition({
        issueIdOrKey: issueKey,
        transition: { id: transition.id }
      });
    },

    async assignIssue(issueKey: string, accountId: string): Promise<void> {
      await v3.issues.assignIssue({
        issueIdOrKey: issueKey,
        accountId
      });
    },

    async addComment(issueKey: string, input: AddCommentInput): Promise<void> {
      await v3.issueComments.addComment({
        issueIdOrKey: issueKey,
        comment: input.body
      });
    },

    async deleteIssue(issueKey: string): Promise<void> {
      await v3.issues.deleteIssue({ issueIdOrKey: issueKey });
    }
  };
}

function mapV3Issue(raw: Version3Models.Issue): JiraIssue {
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
    createdAt: f.created,
    updatedAt: f.updated
  };
}

function mapAgileIssue(raw: AgileModels.Issue): JiraIssue {
  const f = raw.fields;
  if (!f) {
    return {
      id: raw.id ?? "",
      key: raw.key ?? "",
      summary: "",
      type: "Task",
      status: "",
      priority: "Medium",
      createdAt: "",
      updatedAt: ""
    };
  }
  return {
    id: raw.id ?? "",
    key: raw.key ?? "",
    summary: f.summary,
    description: typeof f.description === "string" ? f.description : undefined,
    type: f.issuetype?.name as IssueType,
    status: f.status?.name as string,
    priority: f.priority?.name as IssuePriority,
    assigneeAccountId: f.assignee?.accountId,
    reporterAccountId: f.reporter?.accountId,
    sprintId: f.sprint?.id,
    createdAt: f.created,
    updatedAt: f.updated
  };
}
