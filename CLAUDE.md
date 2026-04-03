# AI Dev Agent V2 — Project Context

## What this is
A production-grade agentic AI platform. Users describe what they want to build, a planning agent creates Jira epics/stories/sprints, and a coding agent implements the tickets one by one. Live logs stream to the frontend.

## Monorepo structure

```
.
├── apps/
│   ├── api/        # Express v5 backend — port 3000
│   ├── agent/      # BullMQ worker + LangGraph agents
│   └── web/        # React 19 frontend — port 5173 (active development)
├── packages/
│   ├── ai/         # Vercel AI SDK wrapper + provider factory
│   ├── db/         # Prisma client + schema
│   ├── jira/       # jira.js wrapper with typed services
│   ├── queue/      # BullMQ queue definitions + job payloads
│   ├── typescript-config/
│   └── zod/        # Shared Zod schemas + types
├── docker-compose.yaml   # PostgreSQL + Redis
├── biome.json
└── turbo.json
```

## How to run

```bash
pnpm db:start                        # start PostgreSQL + Redis
pnpm --filter @repo/api dev          # port 3000
pnpm --filter @repo/agent dev        # agent worker
pnpm --filter @repo/web dev          # port 5173
```

## Tech stack decisions

| Area | Choice | Why |
|---|---|---|
| Monorepo | Turborepo + pnpm | Standard, good DX |
| Linting | Biome | Replaces ESLint + Prettier |
| Commits | Husky + Commitlint | Conventional commits enforced |
| Backend | Express v5 | Familiarity over Fastify |
| ORM | Prisma v7 + PostgreSQL | Standard |
| Auth | better-auth (email OTP) | Cookie-based sessions, no passwords |
| Validation | Zod v4 | All schemas in `packages/zod` |
| Agent orchestration | LangGraph TypeScript SDK | Stateful graph |
| Job queue | BullMQ + Redis | Durable, survives restarts |
| LLM interface | Vercel AI SDK | One interface for all providers |
| AI providers | Gemini 2.0 Flash (dev), Claude Sonnet (prod) | Free tier vs quality |
| Jira | jira.js v5 | Two clients needed (see below) |

## Non-obvious gotchas

**Zod v4:** Use `z.treeifyError` not `flatten()` — `flatten()` is deprecated.

**Express v5:** `req.query` is a getter-only property. Use `Object.assign(req.query, parsed)` not `req.query = parsed`.

**Jira — two clients required:**
- `Version3Client` — issues, comments, transitions
- `AgileClient` — boards, sprints
Both imported from `jira.js v5`. This is why `packages/jira` exports `createJiraServices(config)` — it instantiates both.

**Jira Cloud (modern projects):**
- Don't use `customfield_10011` (Epic Name) — removed in newer Jira Cloud. Use `summary` + `issuetype: Epic`.
- Don't use `"Epic Link"` field — deprecated. Use `parent: { key: epicKey }`.
- Don't use `"Epic Link" = epicKey` in JQL — use `parent = epicKey`.

**Auth is cookie-based.** OpenAPI security scheme must be `cookieAuth`, not `bearerAuth`. Axios needs `withCredentials: true`.

**ToolLoopAgent:** The LLM was returning plain text instead of calling tools when using `generateText` alone. `ToolLoopAgent` from Vercel AI SDK forces tool execution.

**Packages don't build.** They export TypeScript source directly. `tsx` handles transpilation. No `dist/` folders in packages.

**Two tsconfigs:**
- `packages/typescript-config/base.json` — for packages (no declaration output)
- `packages/typescript-config/app.json` — for apps (extends base, adds declaration + sourceMap)

**Jira sprint activation:** Must pass both `startDate` and `endDate` when calling `updateSprint` to activate (move from future to active state).

**Working directory per projectId** (not per runId): `apps/agent/tmp/ai-agent/{projectId}/` — the agent builds on previous work across runs.

**Agent reads `jiraSprintId` from DB** on approve — the frontend only passes `runId`, not sprintId.

## Database schema (key models)

```prisma
enum ProjectStatus {
  IDLE       // no agent running — default state and post-sprint completion
  PLANNING   // planning job running
  PLANNED    // tickets created, awaiting user approval
  CODING     // coding job running
  FAILED     // something went wrong
}

model Project {
  id             String        @id @default(cuid())
  name           String
  description    String?
  userId         String
  jiraProjectKey String?       # null until user links Jira
  jiraBoardId    Int?
  jiraSprintId   Int?          # set after planning completes
  status         ProjectStatus @default(IDLE)
  currentRunId   String?       # BullMQ runId of active job
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}
```

## API routes (all under /api/v1, all cookie-authenticated except auth routes)

### Auth
```
POST /auth/signup
POST /auth/signup/verify
POST /auth/signin
POST /auth/signin/verify
POST /auth/signout
GET  /auth/me
```

### Projects
```
GET    /projects
POST   /projects                          { name, description? }
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
POST   /projects/:id/jira/link            { projectKey: "SCRUM" }
DELETE /projects/:id/jira/unlink
POST   /projects/:id/agent/planning/start  { prompt } → { jobId, runId }
POST   /projects/:id/agent/planning/approve { runId } → { jobId, runId, sprintId }
```

### Jira (for frontend use, not agent)
```
GET  /jira/boards
GET  /jira/sprints?state=active|closed|future
GET  /jira/sprints/active
GET  /jira/sprints/:sprintId/issues
POST /jira/issues/:issueKey/close
POST /jira/issues/:issueKey/comments
GET  /jira/epics/:epicKey/issues
# ...and more CRUD
```

## Agent architecture

```
api enqueues job → Redis/BullMQ → agent worker picks up → LangGraph runs → updates DB + Jira
```

**Planning graph:** `jira_node` uses ToolLoopAgent with 3 tools: `createEpic`, `createStory`, `createSprint`. Output: `{ epicKeys, ticketKeys, sprintId }`. Worker sets `status = PLANNED`, saves `jiraSprintId`.

**Coding graph:** Worker first activates sprint. `coding_node` loops sprint tickets: transitions to "In Progress" → ToolLoopAgent with file tools → transitions to "Done". File tools: `readFile`, `writeFile`, `listFiles`, `runCommand` (with dangerous command blocking + path traversal protection).

## Packages reference

**`packages/zod` exports:**
- `"."` — re-exports all
- `"./agent"` — ZStartPlanningRequest, ZApprovePlanningRequest, ZAgentJobResponse
- `"./auth"` — ZUser, ZAuthResponse, ZSendOtpRequest, ZVerifySignupOtpRequest, ZVerifySigninOtpRequest
- `"./common"` — ZSuccessResponse, ZErrorResponse, schemaWithPagination
- `"./jira"` — ZJiraBoard, ZJiraSprint, ZJiraIssue, ZJiraEpic + request schemas
- `"./project"` — ZProject, ZProjectStatus, ZCreateProjectRequest, ZUpdateProjectRequest, ZLinkJiraRequest

**`packages/ai`:** `createModel(config)` factory. Switch on `AIProviderName`. To add provider: one file in `providers/`, one case in `model.ts`, one `pnpm add`.

**`packages/jira`:** `createJiraServices(config)` → `{ boards, sprints, issues, epics }`. DI pattern — no `process.env` inside the package.

## Code style

- Biome for formatting (not Prettier)
- Conventional commits enforced — `feat:`, `fix:`, `docs:`, `chore:` etc.
- Module pattern: `module.router.ts`, `module.controller.ts`, `module.service.ts`
- Error class: `AppError(message, statusCode, code?)`
- Env vars: Zod-validated in `config/env.ts` per app

## Known issues

- Planning agent sometimes calls `createSprint` twice — fix: tighten system prompt
- Epic keys leak into `ticketKeys` — fix: only push when `type === "Story"`
- Gemini free tier rate limits cause occasional coding failures
- `/api/v1/projects/:id/reset` is dev-only, should be gated in prod

## Current task

Building `apps/web` — see `apps/web/CLAUDE.md` for frontend-specific context.

// Put completed tickets to in-review not to done.
<!-- claude --resume b8e1cc31-8cea-4e47-aa11-c54a6e16652a -->