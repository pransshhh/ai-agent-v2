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
    /**
     * Creates a new issue (Story, Task, Bug, Subtask) in the configured project.
     */
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
          // parent links issue to epic in modern Jira Cloud
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

    /**
     * Fetches a single issue by key (e.g. "SCRUM-1").
     */
    async getIssue(issueKey: string): Promise<JiraIssue> {
      const res = await v3.issues.getIssue({ issueIdOrKey: issueKey });
      return mapV3Issue(res);
    },

    /**
     * Lists all issues in a sprint.
     * Uses AgileModels.SearchResults — the correct public type for this response.
     */
    async getSprintIssues(sprintId: number): Promise<JiraIssue[]> {
      const res =
        await agile.sprint.getIssuesForSprint<AgileModels.SearchResults>({
          sprintId
        });
      return res.issues.map(mapAgileIssue);
    },

    /**
     * Updates issue fields (summary, description, priority, assignee, labels).
     */
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

    /**
     * Transitions an issue to "Done".
     * Fetches transitions dynamically — avoids hardcoding workflow IDs
     * which differ per Jira project configuration.
     */
    async closeIssue(issueKey: string): Promise<void> {
      const transitions = await v3.issues.getTransitions({
        issueIdOrKey: issueKey
      });
      const doneTransition = transitions.transitions?.find(
        (t) =>
          t.name?.toLowerCase() === "done" ||
          t.to?.statusCategory?.key === "done"
      );
      if (!doneTransition?.id) {
        throw new Error(`No 'Done' transition found for issue ${issueKey}`);
      }
      await v3.issues.doTransition({
        issueIdOrKey: issueKey,
        transition: { id: doneTransition.id }
      });
    },

    /**
     * Assigns an issue to a user by their Jira accountId.
     */
    async assignIssue(issueKey: string, accountId: string): Promise<void> {
      await v3.issues.assignIssue({
        issueIdOrKey: issueKey,
        accountId
      });
    },

    /**
     * Adds a plain-text comment to an issue.
     * jira.js accepts a plain string for `comment` and handles ADF internally.
     */
    async addComment(issueKey: string, input: AddCommentInput): Promise<void> {
      await v3.issueComments.addComment({
        issueIdOrKey: issueKey,
        comment: input.body
      });
    }
  };
}

/**
 * Maps a Version3 Issue (from getIssue) to our JiraIssue type.
 * Version3Models.Issue has typed fields — no Record<string,any> needed.
 */
function mapV3Issue(raw: Version3Models.Issue): JiraIssue {
  const f = raw.fields;
  // description is a Document (ADF) — extract plain text from first paragraph
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

/**
 * Maps an Agile Issue (from getSprintIssues) to our JiraIssue type.
 * AgileModels.Issue.fields is typed as Fields which has [key: string]: any
 * index signature — we access known fields safely via their typed properties.
 */
function mapAgileIssue(raw: AgileModels.Issue): JiraIssue {
  const f = raw.fields;
  // fields is optional in AgileModels.Issue — return a minimal shell if missing
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
