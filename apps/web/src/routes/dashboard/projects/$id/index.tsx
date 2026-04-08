import type { Project, ProjectStatus } from "@repo/zod/project";
import { ZConnectGithubRequest, ZLinkJiraRequest } from "@repo/zod/project";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BotIcon,
  Check,
  ExternalLink,
  GitBranch,
  Loader2,
  RotateCcw,
  Send,
  User2,
  X
} from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useFutureSprints } from "@/hooks/use-jira";
import {
  useApprovePlanning,
  useApproveSprintReview,
  useConnectGithub,
  useDisconnectGithub,
  useLinkJira,
  useProject,
  useRejectSprintReview,
  useResetProject,
  useStartCoding,
  useStartPlanning
} from "@/hooks/use-projects";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  isLoading?: boolean;
  action?:
    | { type: "approve-planning" }
    | { type: "start-coding" }
    | { type: "sprint-review" };
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
  IDLE: { label: "Idle", variant: "secondary" },
  PLANNING: { label: "Planning", variant: "warning" },
  PLANNED: { label: "Planned", variant: "purple" },
  CODING: { label: "Coding", variant: "info" },
  SPRINT_REVIEW: { label: "Sprint Review", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" }
};

const TIMELINE: Exclude<ProjectStatus, "FAILED" | "SPRINT_REVIEW">[] = [
  "IDLE",
  "PLANNING",
  "PLANNED",
  "CODING"
];
const TIMELINE_LABELS: Record<string, string> = {
  IDLE: "Idle",
  PLANNING: "Planning",
  PLANNED: "Planned",
  CODING: "Coding"
};

function StatusTimeline({ status }: { status: ProjectStatus }) {
  const isFailed = status === "FAILED";
  const isReview = status === "SPRINT_REVIEW";
  const effective = isFailed || isReview ? "CODING" : status;
  const currentIdx = TIMELINE.indexOf(
    effective as Exclude<ProjectStatus, "FAILED" | "SPRINT_REVIEW">
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
      {isReview && (
        <p className="text-xs text-muted-foreground text-center">
          Sprint complete — awaiting your review.
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
  const isRunning =
    status === "PLANNING" || status === "CODING" || status === "SPRINT_REVIEW";

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

function RejectDialog({
  onReject
}: {
  onReject: (data: { issueKey: string; feedback: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [issueKey, setIssueKey] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<{
    issueKey?: string;
    feedback?: string;
  }>({});

  const handleSubmit = () => {
    const e: typeof errors = {};
    if (!issueKey.trim()) e.issueKey = "Issue key is required";
    if (!feedback.trim()) e.feedback = "Feedback is required";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onReject({ issueKey: issueKey.trim(), feedback: feedback.trim() });
    setOpen(false);
    setIssueKey("");
    setFeedback("");
    setErrors({});
  };

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <X className="size-3.5" />
            Reject a Ticket
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Sprint Ticket</DialogTitle>
          <DialogDescription>
            Specify which ticket failed review and why. The ticket and all
            subsequent tickets in the sprint will be reset and re-implemented.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={!!errors.issueKey}>
            <FieldLabel htmlFor="issue-key">Issue Key</FieldLabel>
            <Input
              id="issue-key"
              placeholder="e.g. MYAPP-3"
              value={issueKey}
              onChange={(e) => {
                setIssueKey(e.target.value.toUpperCase());
                setErrors((p) => ({ ...p, issueKey: undefined }));
              }}
              className="font-mono"
            />
            {errors.issueKey && (
              <FieldError errors={[{ message: errors.issueKey }]} />
            )}
          </Field>
          <Field data-invalid={!!errors.feedback}>
            <FieldLabel htmlFor="reject-feedback">Feedback</FieldLabel>
            <Textarea
              id="reject-feedback"
              placeholder="Describe what's wrong and what the agent should fix..."
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                setErrors((p) => ({ ...p, feedback: undefined }));
              }}
              rows={4}
              className="resize-none"
            />
            {errors.feedback && (
              <FieldError errors={[{ message: errors.feedback }]} />
            )}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="destructive" onClick={handleSubmit}>
            Reject &amp; Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function StartCodingDialog({
  projectId,
  onSuccess
}: {
  projectId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const { data: sprints, isLoading: sprintsLoading } =
    useFutureSprints(projectId);
  const { mutate: startCoding, isPending } = useStartCoding(projectId);

  const handleStart = () => {
    if (!selectedSprintId) return;
    startCoding(
      { sprintId: selectedSprintId },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedSprintId(null);
          onSuccess();
        }
      }
    );
  };

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Check className="size-3.5" />
            Start Coding Sprint
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Coding Sprint</DialogTitle>
          <DialogDescription>
            Select a future sprint from your Jira board. The coding agent will
            implement all tickets in it.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {sprintsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !sprints || sprints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No future sprints found. Create one in Jira first.
            </p>
          ) : (
            sprints.map((sprint) => (
              <button
                key={sprint.id}
                type="button"
                onClick={() => setSelectedSprintId(sprint.id ?? null)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted",
                  selectedSprintId === sprint.id &&
                    "border-primary bg-primary/5"
                )}
              >
                <span className="text-sm font-medium">{sprint.name}</span>
                {sprint.goal && (
                  <span className="text-xs text-muted-foreground">
                    {sprint.goal}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleStart}
            disabled={!selectedSprintId || isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Start Coding"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

/** Parse "https://github.com/owner/repo" → "owner/repo" */
function parseRepoName(url: string): string {
  const match = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?(?:\/.*)?$/);
  return match?.[1] ?? url;
}

function GithubConnectButton({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [pat, setPat] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");
  const [errors, setErrors] = useState<{
    repoUrl?: string;
    pat?: string;
    baseBranch?: string;
  }>({});

  const { mutate: connect, isPending: isConnecting } = useConnectGithub(
    project.id
  );
  const { mutate: disconnect, isPending: isDisconnecting } =
    useDisconnectGithub(project.id);

  const handleConnect = () => {
    const result = ZConnectGithubRequest.safeParse({
      repoUrl,
      pat,
      baseBranch
    });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof typeof errors;
        if (field) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    connect(result.data, {
      onSuccess: () => {
        setOpen(false);
        setRepoUrl("");
        setPat("");
        setBaseBranch("main");
        setErrors({});
      }
    });
  };

  if (project.githubRepoUrl) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={project.githubRepoUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <GitBranch className="size-3.5" />
          {parseRepoName(project.githubRepoUrl)}
          <ExternalLink className="size-3" />
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 text-muted-foreground"
          disabled={isDisconnecting}
          onClick={() => disconnect()}
        >
          {isDisconnecting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            "Disconnect"
          )}
        </Button>
      </div>
    );
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <GitBranch className="size-3.5" />
            Connect GitHub
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect GitHub Repository</DialogTitle>
          <DialogDescription>
            Connect a GitHub repo so the coding agent can read and write files
            directly via the GitHub API.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={!!errors.repoUrl}>
            <FieldLabel htmlFor="github-repo-url">Repository URL</FieldLabel>
            <Input
              id="github-repo-url"
              placeholder="https://github.com/org/repo"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                setErrors((p) => ({ ...p, repoUrl: undefined }));
              }}
            />
            {errors.repoUrl && (
              <FieldError errors={[{ message: errors.repoUrl }]} />
            )}
          </Field>
          <Field data-invalid={!!errors.pat}>
            <FieldLabel htmlFor="github-pat">Personal Access Token</FieldLabel>
            <Input
              id="github-pat"
              type="password"
              placeholder="github_pat_..."
              value={pat}
              onChange={(e) => {
                setPat(e.target.value);
                setErrors((p) => ({ ...p, pat: undefined }));
              }}
            />
            {errors.pat && <FieldError errors={[{ message: errors.pat }]} />}
          </Field>
          <Field data-invalid={!!errors.baseBranch}>
            <FieldLabel htmlFor="github-base-branch">Base Branch</FieldLabel>
            <Input
              id="github-base-branch"
              placeholder="main"
              value={baseBranch}
              onChange={(e) => {
                setBaseBranch(e.target.value);
                setErrors((p) => ({ ...p, baseBranch: undefined }));
              }}
            />
            {errors.baseBranch && (
              <FieldError errors={[{ message: errors.baseBranch }]} />
            )}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Connect"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function ChatPanel({
  project,
  messages,
  onSendMessage,
  onApprove,
  onStartCodingSuccess,
  onApproveSprint,
  onRejectSprint,
  onLinkJira
}: {
  project: Project;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onApprove: () => void;
  onStartCodingSuccess: () => void;
  onApproveSprint: () => void;
  onRejectSprint: (data: { issueKey: string; feedback: string }) => void;
  onLinkJira: (key: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const isJiraLinked = !!project.jiraProjectKey;
  const isRunning =
    project.status === "PLANNING" || project.status === "CODING";
  const inputDisabled =
    isRunning ||
    project.status === "PLANNED" ||
    project.status === "SPRINT_REVIEW";

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

              {msg.action?.type === "approve-planning" &&
                project.status === "PLANNED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onApprove}
                    className="self-start"
                  >
                    <Check className="size-3.5" />
                    Approve Planning
                  </Button>
                )}

              {msg.action?.type === "start-coding" &&
                project.status === "PLANNED" && (
                  <StartCodingDialog
                    projectId={project.id}
                    onSuccess={onStartCodingSuccess}
                  />
                )}

              {msg.action?.type === "sprint-review" &&
                project.status === "SPRINT_REVIEW" && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={onApproveSprint}>
                      <Check className="size-3.5" />
                      Approve Sprint
                    </Button>
                    <RejectDialog onReject={onRejectSprint} />
                  </div>
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
                        <FieldError
                          errors={field.state.meta.errors.map((e) => ({
                            message: String(e)
                          }))}
                        />
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
                project.status === "PLANNED"
                  ? "Approve the plan above to continue..."
                  : project.status === "SPRINT_REVIEW"
                    ? "Review the sprint above and approve or reject..."
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
    case "IDLE":
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
          "Planning approved! Review your tickets in Jira, create a sprint, then come back to start coding.",
          { action: { type: "start-coding" } }
        )
      ];
    case "CODING":
      return [
        mk("Coding is in progress — implementing your tickets one by one...", {
          isLoading: true
        })
      ];
    case "SPRINT_REVIEW":
      return [
        mk(
          "Sprint complete! Review the tickets on the Jira board. Approve to move to the next sprint, or reject a ticket (and everything after it) with feedback.",
          { action: { type: "sprint-review" } }
        )
      ];
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
  const { mutate: approveSprintReview } = useApproveSprintReview(id);
  const { mutate: rejectSprintReview } = useRejectSprintReview(id);
  const { mutate: resetProject, isPending: isResetting } = useResetProject(id);

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
        "Planning complete! Your epics and stories are in the Jira backlog. Approve below to confirm.",
        { action: { type: "approve-planning" } }
      );
      addLog("Planning complete. Jira tickets created in backlog.", "success");
    } else if (prev === "PLANNED" && project.status === "CODING") {
      addMsg("Coding agent is starting on your sprint...", { isLoading: true });
      addLog("Coding agent started.", "info");
    } else if (prev === "CODING" && project.status === "SPRINT_REVIEW") {
      addMsg(
        "Sprint complete! Review the implemented tickets on the Jira board. Approve to continue with the next sprint, or reject a ticket with feedback.",
        { action: { type: "sprint-review" } }
      );
      addLog("Sprint complete. Awaiting HIL review.", "success");
    } else if (prev === "SPRINT_REVIEW" && project.status === "CODING") {
      setMessages((m) => [
        ...m.filter((x) => !x.isLoading && x.action?.type !== "sprint-review"),
        {
          id: crypto.randomUUID(),
          role: "agent",
          content: "Review submitted. Agent is processing the next sprint...",
          isLoading: true
        }
      ]);
      addLog("Sprint review actioned. Coding agent restarted.", "info");
    } else if (prev === "CODING" && project.status === "IDLE") {
      addMsg(
        "All done! The backlog is empty and all tickets have been implemented."
      );
      addLog("All sprints complete. Project finished.", "success");
    } else if (prev === "FAILED" && project.status === "PLANNED") {
      addMsg(
        "Project reset. Your Jira backlog is ready — pick a sprint to start coding.",
        { action: { type: "start-coding" } }
      );
      addLog("Project reset to PLANNED.", "info");
    } else if (prev === "FAILED" && project.status === "IDLE") {
      addMsg("Project reset. Describe what you want to build to start over.");
      addLog("Project reset to IDLE.", "info");
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
      onSuccess: () => {
        setMessages((m) => [
          ...m.filter((x) => x.action?.type !== "approve-planning"),
          {
            id: crypto.randomUUID(),
            role: "agent",
            content:
              "Planning approved! Review your tickets in Jira, create a sprint, then come back to start coding.",
            action: { type: "start-coding" as const }
          }
        ]);
      },
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

  const handleApproveSprint = useCallback(() => {
    setLogs((l) => [
      ...l,
      mkLog("Sprint approved. Plan your next sprint...", "info")
    ]);
    approveSprintReview(undefined, {
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
  }, [approveSprintReview]);

  const handleStartCodingSuccess = useCallback(() => {
    setLogs((l) => [...l, mkLog("Coding agent started.", "info")]);
  }, []);

  const handleRejectSprint = useCallback(
    (data: { issueKey: string; feedback: string }) => {
      setLogs((l) => [
        ...l,
        mkLog(
          `Ticket ${data.issueKey} rejected. Agent will retry with feedback.`,
          "info"
        )
      ]);
      rejectSprintReview(data, {
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
    },
    [rejectSprintReview]
  );

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
        <div className="flex items-center gap-2">
          <GithubConnectButton project={project} />
          {project.githubPrUrl && (
            <a href={project.githubPrUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="size-3.5" />
                View PR
              </Button>
            </a>
          )}
          {project.status === "FAILED" && (
            <Button
              variant="outline"
              size="sm"
              disabled={isResetting}
              onClick={() => resetProject()}
            >
              {isResetting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              Reset
            </Button>
          )}
          <Link to="/dashboard/projects/$id/jira" params={{ id }}>
            <Button variant="outline" size="sm">
              <ExternalLink className="size-3.5" />
              Jira Board
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-1/2 flex-col overflow-hidden border-r">
          <ChatPanel
            project={project}
            messages={messages}
            onSendMessage={handleSendMessage}
            onApprove={handleApprove}
            onStartCodingSuccess={handleStartCodingSuccess}
            onApproveSprint={handleApproveSprint}
            onRejectSprint={handleRejectSprint}
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
