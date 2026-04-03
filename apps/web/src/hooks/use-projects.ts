import type { AgentJobResponse } from "@repo/zod/agent";
import type { CreateProjectRequest, Project } from "@repo/zod/project";
import type { Query } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.get("/api/v1/projects").then((r) => r.data)
  });
}

export function useProject(
  id: string,
  options?: {
    refetchInterval?:
      | number
      | false
      | ((query: Query<Project>) => number | false);
  }
) {
  return useQuery<Project>({
    queryKey: ["projects", id],
    queryFn: () => api.get(`/api/v1/projects/${id}`).then((r) => r.data),
    ...options
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      api.post("/api/v1/projects", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] })
  });
}

export function useLinkJira(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectKey: string }) =>
      api
        .post(`/api/v1/projects/${projectId}/jira/link`, data)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", projectId] })
  });
}

export function useStartPlanning(projectId: string) {
  const qc = useQueryClient();
  return useMutation<AgentJobResponse, Error, { prompt: string }>({
    mutationFn: (data) =>
      api
        .post(`/api/v1/projects/${projectId}/agent/planning/start`, data)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", projectId] })
  });
}

export function useApprovePlanning(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post(`/api/v1/projects/${projectId}/agent/planning/approve`)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", projectId] })
  });
}
