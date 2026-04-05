import type { JiraIssue, JiraSprint } from "@repo/zod/jira";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useBacklogIssues(projectId: string) {
  return useQuery<JiraIssue[]>({
    queryKey: ["jira", projectId, "backlog"],
    queryFn: () =>
      api
        .get("/api/v1/jira/backlog", { params: { projectId } })
        .then((r) => r.data)
  });
}

export function useFutureSprints(projectId: string) {
  return useQuery<JiraSprint[]>({
    queryKey: ["jira", projectId, "sprints", "future"],
    queryFn: () =>
      api
        .get("/api/v1/jira/sprints", { params: { state: "future", projectId } })
        .then((r) => r.data)
  });
}

export function useActiveSprint(projectId: string) {
  return useQuery<JiraSprint | null>({
    queryKey: ["jira", projectId, "sprints", "active"],
    queryFn: () =>
      api
        .get("/api/v1/jira/sprints/active", { params: { projectId } })
        .then((r) => r.data)
  });
}

export function useSprintIssues(
  projectId: string,
  sprintId: number | undefined
) {
  return useQuery<JiraIssue[]>({
    queryKey: ["jira", projectId, "sprints", sprintId, "issues"],
    queryFn: () =>
      api
        .get(`/api/v1/jira/sprints/${sprintId}/issues`, {
          params: { projectId }
        })
        .then((r) => r.data),
    enabled: sprintId !== undefined
  });
}
