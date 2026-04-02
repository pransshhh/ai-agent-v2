import type { CreateProjectRequest, Project } from "@repo/zod/project";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.get("/api/v1/projects").then((r) => r.data)
  });
}

export function useProject(id: string) {
  return useQuery<Project>({
    queryKey: ["projects", id],
    queryFn: () => api.get(`/api/v1/projects/${id}`).then((r) => r.data)
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
