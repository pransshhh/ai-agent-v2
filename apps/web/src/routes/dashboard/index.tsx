import type { ProjectStatus } from "@repo/zod/project";
import { ZCreateProjectRequest } from "@repo/zod/project";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen, Loader2, Plus, ScanSearch, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type CodelensScanResult,
  useCodelensScan,
  useCreateProject,
  useDeleteProject,
  useProjects
} from "@/hooks/use-projects";

const STATUS_CONFIG: Record<
  ProjectStatus,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "warning"
      | "info"
      | "purple"
      | "success"
      | "destructive";
  }
> = {
  IDLE: { label: "Idle", variant: "secondary" },
  PLANNING: { label: "Planning", variant: "warning" },
  PLANNED: { label: "Planned", variant: "purple" },
  CODING: { label: "Coding", variant: "info" },
  SPRINT_REVIEW: { label: "Sprint Review", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" }
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function DeleteProjectButton({ projectId }: { projectId: string }) {
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate: deleteProject, isPending } = useDeleteProject(projectId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirming) {
      setConfirming(true);
      timeoutRef.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    deleteProject();
  };

  return (
    <Button
      variant={confirming ? "destructive" : "ghost"}
      size="icon"
      className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      disabled={isPending}
      onClick={handleClick}
      title={confirming ? "Click again to confirm" : "Delete project"}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
    </Button>
  );
}

function parseSonarScore(report: string): number | null {
  const match = report.match(/Overall SonarQube Score:\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function severityColor(severity: string) {
  switch (severity.toUpperCase()) {
    case "BLOCKER":
      return "text-red-500";
    case "CRITICAL":
      return "text-orange-500";
    case "MAJOR":
      return "text-yellow-500";
    case "MINOR":
      return "text-blue-500";
    default:
      return "text-muted-foreground";
  }
}

function CodelensScanButton({
  projectId,
  projectName,
  hasGithub
}: {
  projectId: string;
  projectName: string;
  hasGithub: boolean;
}) {
  const [result, setResult] = useState<CodelensScanResult | null>(null);
  const [open, setOpen] = useState(false);
  const { mutate: scan, isPending } = useCodelensScan(projectId);

  const handleScan = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    scan(undefined, {
      onSuccess: (data) => {
        setResult(data);
        setOpen(true);
      }
    });
  };

  const score = result ? parseSonarScore(result.report) : null;

  const severityCounts = result
    ? result.issuesData.reduce<Record<string, number>>((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        disabled={isPending || !hasGithub}
        onClick={handleScan}
        title={hasGithub ? "Run CodeLens scan" : "Connect GitHub to run a scan"}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ScanSearch className="size-3.5" />
        )}
      </Button>

      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>CodeLens Scan — {projectName}</DialogTitle>
            {result && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {score !== null && (
                  <Badge
                    variant={
                      score >= 80
                        ? "success"
                        : score >= 60
                          ? "warning"
                          : "destructive"
                    }
                  >
                    Score: {score}/100
                  </Badge>
                )}
                <Badge variant="secondary">{result.issuesCount} issues</Badge>
                {Object.entries(severityCounts).map(([sev, count]) => (
                  <span
                    key={sev}
                    className={`text-xs font-medium ${severityColor(sev)}`}
                  >
                    {sev}: {count}
                  </span>
                ))}
              </div>
            )}
          </DialogHeader>

          {result && (
            <div className="flex-1 overflow-auto min-h-0">
              <pre className="text-xs leading-relaxed bg-muted rounded-md p-4 whitespace-pre-wrap font-mono">
                {result.report}
              </pre>
            </div>
          )}
        </DialogContent>
      </DialogRoot>
    </>
  );
}

function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const { mutate: createProject, error } = useCreateProject();

  const form = useForm({
    defaultValues: { name: "", description: "" },
    validators: { onSubmit: ZCreateProjectRequest },
    onSubmit: async ({ value }) => {
      createProject(
        { name: value.name, description: value.description },
        {
          onSuccess: () => {
            setOpen(false);
            form.reset();
          }
        }
      );
    }
  });

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        New Project
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Give your project a name. You&apos;ll link Jira and start the agent
            after creation.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="proj-name">Name</FieldLabel>
                    <Input
                      id="proj-name"
                      placeholder="Todo App"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="proj-desc">
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FieldLabel>
                  <Textarea
                    id="proj-desc"
                    placeholder="A full-stack todo app with authentication..."
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </Field>
              )}
            </form.Field>

            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}

export const Route = createFileRoute("/dashboard/")({
  component: () => {
    const { data: projects = [], isLoading } = useProjects();

    const total = projects.length;
    const active = projects.filter((p) =>
      ["PLANNING", "CODING"].includes(p.status)
    ).length;
    const failed = projects.filter((p) => p.status === "FAILED").length;

    return (
      <div className="flex flex-col h-full">
        {/* Page header */}
        <header className="flex h-14 items-center justify-between border-b px-6 shrink-0">
          <h1 className="text-sm font-semibold">Projects</h1>
          <NewProjectDialog />
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats */}
          {total > 0 && (
            <div className="grid grid-cols-3 gap-4 max-w-md">
              {[
                { label: "Total", value: total },
                { label: "Active", value: active },
                { label: "Failed", value: failed }
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="pt-5 pb-4 px-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Projects list */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No projects yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first project to get started.
                </p>
              </div>
              <NewProjectDialog />
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <div key={project.id} className="group relative">
                  <Link
                    to="/dashboard/projects/$id"
                    params={{ id: project.id }}
                    className="block"
                  >
                    <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {project.name}
                            </p>
                            {project.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <StatusBadge status={project.status} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(project.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              }
                            )}
                          </span>
                          <CodelensScanButton
                            projectId={project.id}
                            projectName={project.name}
                            hasGithub={Boolean(project.githubRepoUrl)}
                          />
                          <DeleteProjectButton projectId={project.id} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
});
