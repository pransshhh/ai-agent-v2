import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/projects/$id")({
  component: ProjectPage
});

function ProjectPage() {
  return <div>Project page</div>;
}
