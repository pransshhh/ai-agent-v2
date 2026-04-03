import type { Project, ProjectStatus } from "@repo/zod/project";
import { ZLinkJiraRequest } from "@repo/zod/project";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BotIcon,
  Check,
  ExternalLink,
  Loader2,
  Send,
  User2
} from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useApprovePlanning,
  useLinkJira,
  useProject,
  useStartPlanning
} from "@/hooks/use-projects";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  isLoading?: boolean;
  action?: { type: "approve" };
};

type LogEntry = {
  id: string;
  timestamp: Date;
  message: string;
  level: "info" | "success" | "error";
};

const STATUS_BADGE: Record<
  ProjectStatus,
  {
    label: string;
    variant:
      | "secondary"
      | "warning"
      | "purple"
      | "info"
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

const TIMELINE: Exclude<ProjectStatus, "FAILED">[] = [
  "CREATED",
  "PLANNING",
  "PLANNED",
  "CODING",
  "DONE"
];
const TIMELINE_LABELS: Record<string, string> = {
  CREATED: "Created",
  PLANNING: "Planning",
  PLANNED: "Planned",
  CODING: "Coding",
  DONE: "Done"
};

function StatusTimeline({ status }: { status: ProjectStatus }) {
  const isFailed = status === "FAILED";
  const effective = isFailed ? "CODING" : status;
  const currentIdx = TIMELINE.indexOf(
    effective as Exclude<ProjectStatus, "FAILED">
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start">
        {TIMELINE.map((step, idx) => {
          const done = idx < currentIdx;
          const current = idx === currentIdx;
          return (
            <Fragment key={step}>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    done && "bg-primary text-primary-foreground",
                    current &&
                      !isFailed &&
                      "bg-background ring-2 ring-primary ring-offset-2 text-primary",
                    current &&
                      isFailed &&
                      "bg-background ring-2 ring-destructive ring-offset-2 text-destructive",
                    !done && !current && "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-3" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    "text-xs whitespace-nowrap",
                    current && !isFailed && "text-foreground font-medium",
                    current && isFailed && "text-destructive font-medium",
                    done && "text-foreground",
                    !done && !current && "text-muted-foreground"
                  )}
                >
                  {TIMELINE_LABELS[step]}
                </span>
              </div>
              {idx < TIMELINE.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mt-3 mx-1",
                    done ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </div>
      {isFailed && (
        <p className="text-xs text-destructive text-center">
          The process encountered an error. Check the logs below.
        </p>
      )}
    </div>
  );
}

function LogsPanel({
  status,
  logs
}: {
  status: ProjectStatus;
  logs: LogEntry[];
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isRunning = status === "PLANNING" || status === "CODING";

  // biome-ignore lint/correctness/useExhaustiveDependencies: needed for scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Logs
        </span>
        {isRunning && (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        <StatusTimeline status={status} />

        <div className="border-t" />

        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Logs will appear here when the agent is running.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="animate-in fade-in duration-300 flex gap-3 leading-relaxed"
              >
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {entry.timestamp.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                  })}
                </span>
                <span
                  className={cn(
                    entry.level === "success" &&
                      "text-green-600 dark:text-green-400",
                    entry.level === "error" && "text-destructive",
                    entry.level === "info" && "text-foreground"
                  )}
                >
                  {entry.message}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function ChatPanel({
  project,
  messages,
  onSendMessage,
  onApprove,
  onLinkJira
}: {
  project: Project;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onApprove: () => void;
  onLinkJira: (key: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const isJiraLinked = !!project.jiraProjectKey;
  const isRunning =
    project.status === "PLANNING" || project.status === "CODING";
  const isTerminal = project.status === "DONE" || project.status === "FAILED";
  const inputDisabled = isRunning || isTerminal || project.status === "PLANNED";

  const {
    mutate: linkJira,
    isPending: isLinking,
    error: linkError
  } = useLinkJira(project.id);

  const linkForm = useForm({
    defaultValues: { projectKey: "" },
    validators: { onSubmit: ZLinkJiraRequest },
    onSubmit: async ({ value }) => {
      linkJira(
        { projectKey: value.projectKey },
        { onSuccess: () => onLinkJira(value.projectKey) }
      );
    }
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: needed for scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || inputDisabled) return;
    onSendMessage(text);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2.5 max-w-[88%]",
              msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
            )}
          >
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5",
                msg.role === "agent" ? "bg-muted" : "bg-primary"
              )}
            >
              {msg.role === "agent" ? (
                <BotIcon className="size-4 text-muted-foreground" />
              ) : (
                <User2 className="size-4 text-primary-foreground" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "agent"
                    ? "bg-muted text-foreground rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                )}
              >
                {msg.isLoading ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Working on it...
                  </span>
                ) : (
                  msg.content
                )}
              </div>

              {msg.action?.type === "approve" &&
                project.status === "PLANNED" && (
                  <Button size="sm" onClick={onApprove} className="self-start">
                    <Check className="size-3.5" />
                    Approve &amp; Start Coding
                  </Button>
                )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t p-4">
        {!isJiraLinked ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              linkForm.handleSubmit();
            }}
          >
            <FieldGroup>
              <linkForm.Field name="projectKey">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="jira-key">
                        Jira project key
                      </FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          id="jira-key"
                          placeholder="e.g. SCRUM"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(e.target.value.toUpperCase())
                          }
                          aria-invalid={isInvalid}
                          className="font-mono"
                        />
                        <linkForm.Subscribe selector={(s) => s.isSubmitting}>
                          {(isSubmitting) => (
                            <Button
                              type="submit"
                              disabled={isSubmitting || isLinking}
                            >
                              {isSubmitting || isLinking ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                "Link Jira"
                              )}
                            </Button>
                          )}
                        </linkForm.Subscribe>
                      </div>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </linkForm.Field>
              {linkError && (
                <p className="text-xs text-destructive">{linkError.message}</p>
              )}
            </FieldGroup>
          </form>
        ) : (
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder={
                isTerminal
                  ? "Project is complete."
                  : project.status === "PLANNED"
                    ? "Approve the plan above to continue..."
                    : isRunning
                      ? "Agent is working..."
                      : "Describe what you want to build..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={inputDisabled}
              rows={2}
              className="flex-1 resize-none min-h-0"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={inputDisabled || !input.trim()}
            >
              <Send className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function getInitialMessages(project: Project): ChatMessage[] {
  const mk = (content: string, extra?: Partial<ChatMessage>): ChatMessage => ({
    id: crypto.randomUUID(),
    role: "agent",
    content,
    ...extra
  });

  if (!project.jiraProjectKey) {
    return [
      mk(
        "Welcome! To get started, link your Jira project by entering the project key below (e.g. SCRUM)."
      )
    ];
  }

  switch (project.status) {
    case "CREATED":
      return [
        mk(
          `Jira project ${project.jiraProjectKey} is linked. Describe what you want to build and I'll create your epics, stories, and sprint.`
        )
      ];
    case "PLANNING":
      return [
        mk("Planning is in progress — creating your Jira tickets...", {
          isLoading: true
        })
      ];
    case "PLANNED":
      return [
        mk(
          "Planning complete! Your epics, stories, and sprint are ready in Jira. Approve below to kick off the coding agent.",
          { action: { type: "approve" } }
        )
      ];
    case "CODING":
      return [
        mk("Coding is in progress — implementing your tickets one by one...", {
          isLoading: true
        })
      ];
    case "DONE":
      return [mk("All done! Every ticket has been implemented.")];
    case "FAILED":
      return [
        mk(
          "Something went wrong during the process. Check the logs panel for details."
        )
      ];
  }
}

function mkLog(message: string, level: LogEntry["level"] = "info"): LogEntry {
  return { id: crypto.randomUUID(), timestamp: new Date(), message, level };
}

function ProjectPage({ id }: { id: string }) {
  const { data: project, isLoading } = useProject(id, {
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === "PLANNING" || data.status === "CODING"
        ? 3000
        : false;
    }
  });

  const { mutate: startPlanning } = useStartPlanning(id);
  const { mutate: approvePlanning } = useApprovePlanning(id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const prevStatus = useRef<ProjectStatus | undefined>(undefined);
  const initialized = useRef(false);

  useEffect(() => {
    if (!project || initialized.current) return;
    initialized.current = true;
    prevStatus.current = project.status;
    setMessages(getInitialMessages(project));
  }, [project]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — react to status only
  useEffect(() => {
    if (!project || !initialized.current) return;
    if (prevStatus.current === project.status) return;

    const prev = prevStatus.current;
    prevStatus.current = project.status;

    const addMsg = (content: string, extra?: Partial<ChatMessage>) =>
      setMessages((m) => [
        ...m.filter((x) => !x.isLoading),
        { id: crypto.randomUUID(), role: "agent", content, ...extra }
      ]);
    const addLog = (message: string, level: LogEntry["level"] = "info") =>
      setLogs((l) => [...l, mkLog(message, level)]);

    if (prev === "PLANNING" && project.status === "PLANNED") {
      addMsg(
        "Planning complete! Your epics, stories, and sprint are ready in Jira. Approve to start coding.",
        { action: { type: "approve" } }
      );
      addLog("Planning complete. Jira tickets created.", "success");
    } else if (prev === "PLANNED" && project.status === "CODING") {
      addMsg("Sprint activated. Starting to implement your tickets...", {
        isLoading: true
      });
      addLog("Sprint activated. Coding agent started.", "info");
    } else if (prev === "CODING" && project.status === "DONE") {
      addMsg("All done! Every ticket has been implemented.");
      addLog("All tickets implemented. Coding complete.", "success");
    } else if (project.status === "FAILED") {
      addMsg("Something went wrong. Check the logs for details.");
      addLog("Process failed.", "error");
    }
  }, [project?.status]);

  const handleSendMessage = useCallback(
    (content: string) => {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "user", content },
        {
          id: crypto.randomUUID(),
          role: "agent",
          content: "Planning your project...",
          isLoading: true
        }
      ]);
      setLogs((l) => [...l, mkLog("Planning agent started.", "info")]);
      startPlanning(
        { prompt: content },
        {
          onError: (err) => {
            setMessages((m) => [
              ...m.filter((x) => !x.isLoading),
              {
                id: crypto.randomUUID(),
                role: "agent",
                content: `Error: ${err.message}`
              }
            ]);
          }
        }
      );
    },
    [startPlanning]
  );

  const handleApprove = useCallback(() => {
    approvePlanning(undefined, {
      onError: (err) => {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "agent",
            content: `Error: ${err.message}`
          }
        ]);
      }
    });
  }, [approvePlanning]);

  const handleLinkJira = useCallback((key: string) => {
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "agent",
        content: `Jira project ${key} linked! Describe what you want to build.`
      }
    ]);
    setLogs((l) => [...l, mkLog(`Jira project ${key} linked.`, "success")]);
  }, []);

  if (isLoading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { label: statusLabel, variant: statusVariant } =
    STATUS_BADGE[project.status];

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="text-sm font-semibold truncate">{project.name}</h1>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <Link to="/dashboard/projects/$id/jira" params={{ id }}>
          <Button variant="outline" size="sm">
            <ExternalLink className="size-3.5" />
            Jira Board
          </Button>
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-1/2 flex-col overflow-hidden border-r">
          <ChatPanel
            project={project}
            messages={messages}
            onSendMessage={handleSendMessage}
            onApprove={handleApprove}
            onLinkJira={handleLinkJira}
          />
        </div>
        <div className="flex w-1/2 flex-col overflow-hidden">
          <LogsPanel status={project.status} logs={logs} />
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/projects/$id/")({
  component: () => {
    const { id } = Route.useParams();
    return <ProjectPage id={id} />;
  }
});
