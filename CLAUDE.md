# AI Dev Agent V2

An agentic AI platform where users describe what to build, a planning agent creates Jira epics/stories in the backlog, a human reviews and creates sprints in Jira, and a coding agent implements tickets against a real GitHub repo with HIL sprint reviews.

## Repo structure

```
apps/api/src/
  config/env.ts
  lib/              # auth, jira, logger, queue, openapi/
  middleware/       # auth, error, validate
  modules/          # agent/, auth/, jira/, project/ (each: router, controller, service)
  router/v1/index.ts

apps/agent/src/
  config/env.ts
  graphs/
    planning/       # graph.ts, state.ts, nodes/jira.node.ts
    coding/         # graph.ts, state.ts, nodes/coding.node.ts
  tools/            # read-file, write-file, list-files, run-command, utils
  workers/          # planning.worker.ts, coding.worker.ts
  lib/              # jira, logger, redis

apps/web/src/
  lib/              # api.ts (axios, withCredentials), auth-client.ts, query-client.ts
  hooks/            # use-auth, use-projects, use-jira
  components/       # app-sidebar, user-menu, ui/ (shadcn)
  routes/
    index.tsx               # landing
    auth/                   # signup, signin, verify + guards
    dashboard/
      index.tsx             # project list
      projects/$id/
        index.tsx           # project page — chat left, logs right
        jira.tsx            # jira board — backlog + kanban tabs
        route.tsx           # param loader

packages/
  ai/       # createModel(config) — anthropic, gemini, openai via Vercel AI SDK
  db/       # Prisma client + schema
  github/   # createGithubClient(pat) → Octokit — repo tree, file read/write, branch, PR
  jira/     # createJiraServices(config) → { boards, sprints, issues, epics }
  queue/    # BullMQ queue definitions + job payloads
  zod/      # shared schemas: ./agent ./auth ./common ./jira ./project
```

## Commands

```bash
pnpm --filter @repo/api dev
pnpm --filter @repo/agent dev
pnpm --filter @repo/web dev
pnpm --filter @repo/db db:reset
docker exec ai-agent-redis redis-cli FLUSHALL
```

## Gotchas

- **Zod v4:** `z.treeifyError` not `flatten()`
- **Express v5:** `req.query` is getter-only — `Object.assign(req.query, parsed)`
- **Jira:** two clients — `Version3Client` (issues) + `AgileClient` (boards/sprints)
- **Jira Cloud:** `parent: { key: epicKey }` not Epic Link; `summary` not `customfield_10011`
- **Auth:** cookie-based — OpenAPI uses `cookieAuth`, Axios needs `withCredentials: true`
- **ToolLoopAgent:** required to force LLM tool execution
- **Packages:** no build step — export TS source directly via `tsx`
- **Sprint activation:** must pass both `startDate` + `endDate` to `updateSprint`
- **AI providers:** plug-and-play via `createModel({ provider, apiKey })` — Gemini (dev), Claude Sonnet (prod)
- **GitHub PAT:** AES encrypted at rest — never return raw PAT to frontend, never log it

## Database schema

```prisma
enum ProjectStatus {
  IDLE           # default + resting state between sprints
  PLANNING       # planning agent running
  PLANNED        # backlog created, human reviews in Jira
  CODING         # coding agent running
  SPRINT_REVIEW  # sprint done, awaiting HIL approve/reject
  FAILED
}

model Project {
  id               String        @id @default(cuid())
  name             String
  description      String?
  userId           String
  jiraProjectKey   String?
  jiraBoardId      Int?
  jiraSprintId     Int?          # sprint currently being coded
  status           ProjectStatus @default(IDLE)
  currentRunId     String?
  githubRepoUrl    String?       # https://github.com/org/repo
  githubPat        String?       # AES encrypted, never returned to frontend
  githubBaseBranch String?       # default: main
  githubPrUrl      String?       # set after PR created on final sprint approve
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}
```

## API routes (/api/v1, cookie-auth except /auth)

```
POST   /auth/signup + /signup/verify
POST   /auth/signin + /signin/verify
POST   /auth/signout
GET    /auth/me

GET|POST          /projects
GET|PATCH|DELETE  /projects/:id
POST   /projects/:id/jira/link              { projectKey }
DELETE /projects/:id/jira/unlink
POST   /projects/:id/github/connect         { repoUrl, pat, baseBranch? }
DELETE /projects/:id/github/disconnect
POST   /projects/:id/agent/planning/start   { prompt } → { jobId, runId }
POST   /projects/:id/agent/planning/approve { runId }  → status = PLANNED
POST   /projects/:id/agent/coding/start     { sprintId } → enqueues coding job
POST   /projects/:id/agent/sprint/approve   { runId }  → PR if last sprint, else IDLE
POST   /projects/:id/agent/sprint/reject    { runId, issueKey, feedback } → retry ticket

GET  /jira/sprints?state=active|future|closed
GET  /jira/sprints/active
GET  /jira/sprints/:sprintId/issues
# ...standard jira CRUD
```

## Full user flow

```
signup → create project → connect GitHub → link Jira → submit prompt

planning/start → agent creates epics + stories (NO sprint) → status = PLANNED

human: review tickets in Jira → create sprint → move tickets in → come back to app

coding/start { sprintId } → coding worker:
  1. check CONTEXT.md on base branch:
       - exists → read it → use as system context
       - missing → fetch repo tree + key files → LLM generates CONTEXT.md
                 → write to feature branch (included in first PR)
  2. create feature branch: feature/{sprintId}-{slug} via GitHub API
  3. activate sprint in Jira
  4. for each ticket:
       → In Progress (Jira)
       → ToolLoopAgent with GitHub-aware file tools:
           readFile  → GET /repos/.../contents/{path}?ref={branch}
           writeFile → PUT /repos/.../contents/{path} (auto-commits to branch)
           listFiles → GET /repos/.../git/trees/{sha}?recursive=1
       → Done (Jira)
  5. update CONTEXT.md with sprint summary → write to feature branch
  6. status = SPRINT_REVIEW

HIL approve:
  - more sprints remain → close sprint → status = IDLE → human repeats from "create sprint"
  - final sprint → create PR (base: main, head: feature branch) → save githubPrUrl → status = IDLE

HIL reject { issueKey, feedback }:
  → retry that ticket with feedback → overwrite files on same branch → status = SPRINT_REVIEW
```

## packages/github

```
src/
  client.ts    # createGithubClient(pat) → Octokit instance
  repo.ts      # getRepoTree, getFileContent, createBranch, writeFile(path, content, message, branch, sha?)
  pr.ts        # createPullRequest(owner, repo, head, base, title, body) → PR url
  context.ts   # generateContext(owner, repo, branch) → CONTEXT.md string
               # updateContext(existing, sprintSummary) → updated CONTEXT.md string
  index.ts
```

DI pattern — `createGithubClient(pat)` takes PAT as argument, no `process.env` inside package.
`writeFile` needs `sha` param for updates (GitHub API requires blob SHA to overwrite existing files).
Both `apps/api` (validate repo on connect) and `apps/agent` (file tools + PR) consume this package.

## Agent file tools

Current tools in `apps/agent/src/tools/` will be replaced with GitHub API equivalents:
- `read-file.ts` → `getFileContent(owner, repo, path, branch)`
- `write-file.ts` → `writeFile(owner, repo, path, content, message, branch, sha?)`
- `list-files.ts` → `getRepoTree(owner, repo, branch)`
- `run-command.ts` → keep (future: test running) but remove any git operations

## Code style

- Biome (not Prettier), conventional commits
- Module pattern: `.router.ts` / `.controller.ts` / `.service.ts`
- Errors: `AppError(message, statusCode, code?)`
- Env: Zod-validated `config/env.ts` per app
- Packages: DI pattern — no `process.env` inside packages, callers inject config

## Status

**Done:**
- Auth, projects CRUD, Jira integration
- Planning agent (creates epics + stories in backlog, no sprint)
- Coding agent (local file tools — to be replaced)
- HIL sprint review flow (SPRINT_REVIEW status, approve/reject endpoints)
- Full frontend (landing, auth, dashboard, project chat+logs, Jira board)
- `packages/github` (client, repo, pr — built, not yet wired in)

**In progress — GitHub integration (remaining steps):**
2. DB migration — add github fields to Project (githubRepoUrl, githubPat, githubBaseBranch, githubPrUrl)
3. Zod — add `ZConnectGithubRequest`, update `ZProject` with github fields, add `ZStartCodingRequest { sprintId }`
4. API — `github/connect` (validate + encrypt PAT) + `github/disconnect`, update `coding/start` to accept `sprintId`
5. Coding worker — replace local file tools with GitHub API tools, add CONTEXT.md flow, add PR on final approve
6. Frontend — GitHub connect dialog, "Start Coding Sprint" sprint-picker, "View PR" button

**Deferred:** Realtime logs (Socket.io), S3, org/team support.