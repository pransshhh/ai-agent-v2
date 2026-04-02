import type { ProjectStatus } from "@repo/zod/project";
import { ZCreateProjectRequest } from "@repo/zod/project";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen, Plus } from "lucide-react";
import { useState } from "react";
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
import { useCreateProject, useProjects } from "@/hooks/use-projects";

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
  CREATED: { label: "Created", variant: "secondary" },
  PLANNING: { label: "Planning", variant: "warning" },
  PLANNED: { label: "Planned", variant: "purple" },
  CODING: { label: "Coding", variant: "info" },
  DONE: { label: "Done", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" }
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
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
    const done = projects.filter((p) => p.status === "DONE").length;

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
                { label: "Done", value: done }
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
                <Link
                  key={project.id}
                  to="/dashboard/projects/$id"
                  params={{ id: project.id }}
                  className="group block"
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
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
});
