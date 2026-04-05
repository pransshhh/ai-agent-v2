# AI Dev Agent V2

An agentic AI platform where users describe what to build, a planning agent creates Jira epics/stories/sprints, and a coding agent implements tickets with Human-in-Loop sprint reviews.

## Monorepo

```
apps/api        # Express v5 — port 3000
apps/agent      # BullMQ worker + LangGraph agents
apps/web        # React 19 frontend — port 5173
packages/ai     # Vercel AI SDK wrapper + provider factory
packages/db     # Prisma client + schema
packages/jira   # jira.js wrapper (Version3Client + AgileClient)
packages/queue  # BullMQ queue definitions + job payloads
packages/zod    # Shared Zod schemas
```

## Commands

```bash
pnpm --filter @repo/api dev
pnpm --filter @repo/agent dev
pnpm --filter @repo/web dev
```

## Gotchas

- **Zod v4:** `z.treeifyError` not `flatten()`
- **Express v5:** `req.query` is getter-only — use `Object.assign(req.query, parsed)`
- **Jira:** two clients — `Version3Client` (issues) + `AgileClient` (boards/sprints)
- **Jira Cloud:** use `parent: { key: epicKey }` not Epic Link field; `summary` not `customfield_10011`
- **Auth:** cookie-based — OpenAPI uses `cookieAuth`, Axios needs `withCredentials: true`
- **ToolLoopAgent:** required to force LLM tool execution (plain `generateText` returns text instead of tool calls)
- **Packages:** no build step — export TS source directly, `tsx` handles transpilation
- **Sprint activation:** must pass both `startDate` + `endDate` to `updateSprint`
- **Working dir:** `apps/agent/tmp/ai-agent/{projectId}/` — per project, not per run

## Database schema

```prisma
enum ProjectStatus {
  IDLE           # no agent running (default + post-sprint)
  PLANNING       # planning job running
  PLANNED        # tickets created, awaiting approval
  CODING         # coding job running
  SPRINT_REVIEW  # sprint done, awaiting HIL approve/reject
  FAILED
}

model Project {
  id             String        @id @default(cuid())
  name           String
  description    String?
  userId         String
  jiraProjectKey String?
  jiraBoardId    Int?
  jiraSprintId   Int?          # current sprint being worked on
  status         ProjectStatus @default(IDLE)
  currentRunId   String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}
```

## API routes (all /api/v1, cookie-auth except /auth)

```
# Auth
POST /auth/signup, /auth/signup/verify
POST /auth/signin, /auth/signin/verify
POST /auth/signout
GET  /auth/me

# Projects
GET|POST        /projects
GET|PATCH|DELETE /projects/:id
POST /projects/:id/jira/link            { projectKey }
DELETE /projects/:id/jira/unlink
POST /projects/:id/agent/planning/start   { prompt } → { jobId, runId }
POST /projects/:id/agent/planning/approve          → { status: "approved" }
POST /projects/:id/agent/coding/start     { sprintId } → { jobId, runId }
POST /projects/:id/agent/sprint/approve            → { jobId, runId }
POST /projects/:id/agent/sprint/reject    { issueKey, feedback } → { jobId, runId }

# Jira (frontend only)
GET  /jira/sprints?state=active|future
GET  /jira/sprints/active
GET  /jira/sprints/:sprintId/issues
POST /jira/issues/:issueKey/comments
# ...standard CRUD
```

## Agent flow

```
planning/start  → planning graph (createEpic, createStory) → status = PLANNED
planning/approve → clears stale jiraSprintId, status stays PLANNED
                   (user reviews backlog in Jira and creates a sprint manually)
coding/start    → validates sprint exists, saves jiraSprintId, status = CODING
               → coding graph: for each ticket in sprint:
                    → In Progress → ToolLoopAgent (readFile, writeFile, listFiles, runCommand) → Done
               → status = SPRINT_REVIEW  ← waits here for HIL

sprint/approve → sprint-planning worker: close sprint → pick next batch from backlog
              → create + activate new sprint → status = CODING → repeat
              → if backlog empty → status = IDLE
sprint/reject  → reset ticket K + all after K to "To Do", add feedback comments
              → queue coding job for same sprint → status = CODING
```

## Packages

- `packages/zod` exports: `./agent`, `./auth`, `./common`, `./jira`, `./project`
- `packages/ai`: `createModel(config)` — add provider = one file + one case + one `pnpm add`
- `packages/jira`: `createJiraServices(config)` — DI pattern, no `process.env` inside

## Code style

- Biome (not Prettier)
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Module pattern: `module.router.ts` / `.controller.ts` / `.service.ts`
- Errors: `AppError(message, statusCode, code?)`
- Env: Zod-validated in `config/env.ts` per app

## Status

**Done:** Full backend (auth, projects, Jira, planning agent, coding agent, HIL sprint review, manual sprint selection flow). Full frontend (landing, auth flows, dashboard with delete, project chat+logs page, Jira board with backlog + kanban tabs, approve planning + start coding dialog, sprint approve/reject UI).

**Deferred:** Realtime logs (Socket.io), S3 file storage, GitHub integration, org/team support.

<!-- claude --resume 2ef4eeea-7cdd-47f7-a646-d7a3b5879b60 -->