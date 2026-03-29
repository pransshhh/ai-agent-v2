export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  boardId: number;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
}

export type SprintState = "active" | "closed" | "future";

export interface JiraSprint {
  id: number;
  name: string;
  state: SprintState;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export interface CreateSprintInput {
  name: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export interface UpdateSprintInput {
  name?: string;
  state?: SprintState;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export type IssueType = "Story" | "Task" | "Bug" | "Epic" | "Subtask";
export type IssuePriority = "Highest" | "High" | "Medium" | "Low" | "Lowest";

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  type: IssueType;
  status: string;
  priority: IssuePriority;
  assigneeAccountId?: string;
  reporterAccountId?: string;
  sprintId?: number;
  epicKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueInput {
  summary: string;
  description?: string;
  type: IssueType;
  priority?: IssuePriority;
  assigneeAccountId?: string;
  sprintId?: number;
  epicKey?: string;
  labels?: string[];
}

export interface UpdateIssueInput {
  summary?: string;
  description?: string;
  priority?: IssuePriority;
  assigneeAccountId?: string;
  labels?: string[];
}

export interface AddCommentInput {
  body: string;
}

export interface JiraEpic {
  id: string;
  key: string;
  name: string;
  summary: string;
  status: string;
}

export interface CreateEpicInput {
  name: string;
  summary: string;
  description?: string;
  priority?: IssuePriority;
}
