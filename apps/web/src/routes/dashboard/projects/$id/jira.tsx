import type { JiraIssue, JiraSprint } from "@repo/zod/jira";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useActiveSprint,
  useFutureSprints,
  useSprintIssues
} from "@/hooks/use-jira";
import { useProject } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";

type Tab = "backlog" | "board";

const KANBAN_COLUMNS = ["To Do", "In Progress", "In Review", "Done"] as const;

function statusBadgeVariant(
  status: string
): "secondary" | "info" | "warning" | "success" | "outline" {
  switch (status.toLowerCase()) {
    case "to do":
      return "secondary";
    case "in progress":
      return "info";
    case "in review":
      return "warning";
    case "done":
      return "success";
    default:
      return "outline";
  }
}

function IssueRow({ issue }: { issue: JiraIssue }) {
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50">
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {issue.key}
      </span>
      <span className="flex-1 truncate text-sm">{issue.summary}</span>
      <Badge variant={statusBadgeVariant(issue.status)} className="shrink-0">
        {issue.status}
      </Badge>
    </div>
  );
}

function SprintSection({ sprint }: { sprint: JiraSprint }) {
  const [expanded, setExpanded] = useState(true);
  const { data: issues, isLoading } = useSprintIssues(
    expanded ? sprint.id : undefined
  );

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center gap-2 p-4 text-left transition-colors hover:bg-muted/50"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{sprint.name}</span>
        {sprint.goal && (
          <span className="truncate text-xs text-muted-foreground">
            — {sprint.goal}
          </span>
        )}
        <Badge variant="secondary" className="ml-auto shrink-0">
          future
        </Badge>
      </button>

      {expanded && (
        <div className="border-t">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !issues?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tickets in this sprint.
            </p>
          ) : (
            <div className="px-2 py-2">
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BacklogTab() {
  const { data: sprints, isLoading } = useFutureSprints();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sprints?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-sm font-medium">No sprints in backlog</p>
        <p className="text-xs text-muted-foreground">
          Future sprints will appear here once the planning agent creates them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      {sprints.map((sprint) => (
        <SprintSection key={sprint.id} sprint={sprint} />
      ))}
    </div>
  );
}

function KanbanCard({ issue }: { issue: JiraIssue }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-background p-3">
      <span className="font-mono text-xs text-muted-foreground">
        {issue.key}
      </span>
      <span className="text-sm leading-snug">{issue.summary}</span>
      <Badge variant={statusBadgeVariant(issue.status)} className="self-start">
        {issue.status}
      </Badge>
    </div>
  );
}

function KanbanColumn({
  title,
  issues
}: {
  title: string;
  issues: JiraIssue[];
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 border-b p-3">
        <span className="text-xs font-semibold uppercase tracking-wide">
          {title}
        </span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {issues.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {issues.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No issues
          </p>
        ) : (
          issues.map((issue) => <KanbanCard key={issue.id} issue={issue} />)
        )}
      </div>
    </div>
  );
}

function BoardTab() {
  const { data: activeSprint, isLoading: loadingSprint } = useActiveSprint();
  const { data: issues, isLoading: loadingIssues } = useSprintIssues(
    activeSprint?.id
  );

  if (loadingSprint) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-sm font-medium">No active sprint</p>
        <p className="text-xs text-muted-foreground">
          Approve the plan in the project page to activate a sprint.
        </p>
      </div>
    );
  }

  const grouped = Object.fromEntries(
    KANBAN_COLUMNS.map((col) => [col, [] as JiraIssue[]])
  ) as Record<string, JiraIssue[]>;

  for (const issue of issues ?? []) {
    if (issue.status in grouped) {
      grouped[issue.status].push(issue);
    } else {
      grouped["To Do"].push(issue);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b px-6 py-3">
        <span className="text-xs text-muted-foreground">Active sprint:</span>
        <span className="text-sm font-semibold">{activeSprint.name}</span>
        {loadingIssues && (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn key={col} title={col} issues={grouped[col]} />
        ))}
      </div>
    </div>
  );
}

function JiraPage({ id }: { id: string }) {
  const { data: project, isLoading } = useProject(id);
  const [tab, setTab] = useState<Tab>("backlog");

  if (isLoading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-6">
        <Link to="/dashboard/projects/$id" params={{ id }}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <span className="text-sm font-semibold">{project.name}</span>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm text-muted-foreground">Jira Board</span>
      </header>

      <div className="flex shrink-0 items-center gap-1 border-b px-6">
        {(["backlog", "board"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "backlog" ? "Backlog" : "Board"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "backlog" ? <BacklogTab /> : <BoardTab />}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/projects/$id/jira")({
  component: () => {
    const { id } = Route.useParams();
    return <JiraPage id={id} />;
  }
});
