import type { JiraIssue, JiraSprint } from "@repo/zod/jira";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useFutureSprints() {
  return useQuery<JiraSprint[]>({
    queryKey: ["jira", "sprints", "future"],
    queryFn: () =>
      api
        .get("/api/v1/jira/sprints", { params: { state: "future" } })
        .then((r) => r.data)
  });
}

export function useActiveSprint() {
  return useQuery<JiraSprint | null>({
    queryKey: ["jira", "sprints", "active"],
    queryFn: () => api.get("/api/v1/jira/sprints/active").then((r) => r.data)
  });
}

export function useSprintIssues(sprintId: number | undefined) {
  return useQuery<JiraIssue[]>({
    queryKey: ["jira", "sprints", sprintId, "issues"],
    queryFn: () =>
      api.get(`/api/v1/jira/sprints/${sprintId}/issues`).then((r) => r.data),
    enabled: sprintId !== undefined
  });
}
