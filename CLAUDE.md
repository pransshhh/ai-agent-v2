# AI Dev Agent V2

An agentic AI platform where users describe what to build, a planning agent creates Jira epics/stories in the backlog, a human reviews and creates sprints in Jira, and a coding agent implements tickets against a real GitHub repo — followed by automated testing and security scanning — with HIL sprint reviews.

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
    testing/        # TO BUILD
    security/       # TO BUILD
  tools/
    github-read-file.ts   # getFileContent via GitHub API
    github-write-file.ts  # writeFile via GitHub API (auto-fetches SHA)
    github-list-files.ts  # getRepoTree via GitHub API
    run-command.ts        # kept for future test running
  workers/
    planning.worker.ts
    coding.worker.ts
    testing.worker.ts     # TO BUILD
    security.worker.ts    # TO BUILD
  lib/              # jira, logger, redis

apps/web/src/
  lib/              # api.ts (axios, withCredentials), auth-client.ts, query-client.ts
  hooks/            # use-auth, use-projects, use-jira
  components/       # app-sidebar, user-menu, ui/ (shadcn)
  routes/
    index.tsx
    auth/
    dashboard/
      index.tsx
      projects/$id/
        index.tsx   # chat left, logs+status right
        jira.tsx    # backlog + kanban tabs
        route.tsx

packages/
  ai/       # createModel(config) — anthropic, gemini, openai via Vercel AI SDK
  db/       # Prisma client + schema
  github/   # createGithubClient(pat) → Octokit — repo tree, file read/write, branch, PR, context
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
- **GitHub PAT:** AES-256-GCM encrypted at rest in DB — never return raw PAT to frontend, never log it
- **GitHub writeFile:** must fetch current file SHA before updating an existing file — GitHub API requires it
- **Each writeFile = one commit** — GitHub contents API commits per file write, results in noisy history. Acceptable for now.

## Database schema

```prisma
enum ProjectStatus {
  IDLE           # default + resting state between sprints
  PLANNING       # planning agent running
  PLANNED        # backlog created, human reviews in Jira
  CODING         # coding agent running
  TESTING        # testing agent running
  SECURITY_SCAN  # security agent running
  SPRINT_REVIEW  # all agents done, awaiting HIL approve/reject
  FAILED
}

model Project {
  id               String        @id @default(cuid())
  name             String
  description      String?
  userId           String
  jiraProjectKey   String?
  jiraBoardId      Int?
  jiraSprintId     Int?
  status           ProjectStatus @default(IDLE)
  currentRunId     String?
  githubRepoUrl    String?
  githubPat        String?       # AES encrypted, never returned to frontend
  githubBaseBranch String?       # default: main
  githubPrUrl      String?       # set after PR created on final sprint approve
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}
```

## API routes (/api/v1, cookie-auth except /auth)

```
POST /auth/signup + /signup/verify
POST /auth/signin + /signin/verify
POST /auth/signout
GET  /auth/me

GET|POST          /projects
GET|PATCH|DELETE  /projects/:id
POST   /projects/:id/jira/link
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
```

## Full agent pipeline per sprint

```
coding/start { sprintId } → coding worker:
  1. CONTEXT.md: read from base branch or generate via LLM → write to feature branch
  2. create feature branch: feature/{sprintId}-{slug}
  3. activate sprint in Jira
  4. for each ticket:
       → In Progress → ToolLoopAgent (github read/write/list tools) → Done
  5. update CONTEXT.md → write to feature branch
  6. enqueue testing job → status = TESTING

→ testing worker:
  1. read implemented files from feature branch
  2. read CONTEXT.md for stack context
  3. ToolLoopAgent writes test files to feature branch
  4. post test summary as Jira comment on each ticket
  5. enqueue security job → status = SECURITY_SCAN

→ security worker:
  1. fetch diff: changed files on feature branch vs base branch
  2. LLM scans for: hardcoded secrets, injection risks, missing validation,
     auth gaps, exposed endpoints, unsafe dependencies
  3. produces report: { critical: [], warnings: [], info: [] }
  4. post security report as Jira comment on sprint tickets
  5. if critical issues → status = SPRINT_REVIEW (flagged)
     if clean → status = SPRINT_REVIEW (green)

→ SPRINT_REVIEW:
  HIL sees: coding summary + test results + security report
  approve:
    - more sprints → close sprint → status = IDLE → human creates next sprint
    - final sprint → createPR → save githubPrUrl → status = IDLE
  reject { issueKey, feedback }:
    → retry that ticket → status = SPRINT_REVIEW again
```

## packages/github

```
src/
  client.ts    # createGithubClient(pat) → Octokit instance
  repo.ts      # getRepoTree, getFileContent, createBranch, writeFile, getFileDiff
  pr.ts        # createPullRequest(owner, repo, head, base, title, body) → PR url
  context.ts   # generateContext(owner, repo, branch) → CONTEXT.md string
               # updateContext(existing, sprintSummary) → updated CONTEXT.md string
  index.ts
```

DI pattern — no `process.env` inside package. Both `apps/api` and `apps/agent` consume it.

## Testing agent spec

- **Graph:** `graphs/testing/` — single node `testing.node.ts`
- **Input state:** githubOwner, githubRepo, githubPat, featureBranch, repoContext, tickets[]
- **Tools:** github-read-file, github-write-file, github-list-files (same as coding agent)
- **System prompt focus:**
  - Read implemented files for each ticket
  - Write focused unit tests only — no integration test infrastructure
  - No new test frameworks unless one already exists in the repo (detect from package.json)
  - No jest/vitest setup if not already present — use whatever is in the repo
  - Test file naming: `{filename}.test.{ext}` co-located with source file
  - Do not modify source files
- **Output:** test file paths written, summary string per ticket
- **Worker:** enqueues security job on completion

## Security agent spec

- **Graph:** `graphs/security/` — single node `security.node.ts`
- **Input state:** githubOwner, githubRepo, githubPat, featureBranch, baseBranch, tickets[]
- **Tools:** github-read-file, github-list-files (read-only — security agent never writes code)
- **What it scans (per changed file):**
  - Hardcoded secrets, tokens, passwords
  - SQL/NoSQL injection patterns
  - Missing input validation on endpoints
  - Auth/authz gaps (unprotected routes, missing middleware)
  - Exposed sensitive data in responses
  - Use of dangerous functions (eval, exec without sanitization)
- **Output:** `{ critical: string[], warnings: string[], info: string[] }`
- **Worker:**
  - Posts report as a Jira comment on the sprint's first ticket
  - Saves report to project (new `lastSecurityReport` JSON field on Project)
  - Sets status = SPRINT_REVIEW regardless of findings (human decides to proceed)

## Sprint review UI (updated)

When status = SPRINT_REVIEW, right panel shows:
```
✅ Coding — X tickets implemented
✅ Tests — X test files written
⚠️  Security — X warnings, X critical   ← red if critical, yellow if warnings, green if clean
    [view details]
[Approve]  [Reject with feedback]
```
If critical security issues exist, Approve shows a confirmation warning before proceeding.

## Code style

- Biome (not Prettier), conventional commits
- Module pattern: `.router.ts` / `.controller.ts` / `.service.ts`
- Errors: `AppError(message, statusCode, code?)`
- Env: Zod-validated `config/env.ts` per app
- Packages: DI pattern — no `process.env` inside packages

## Agent prompt discipline

When writing planning prompts, always include:
- Exact library to use (e.g. "use mongoose, not the mongodb driver")
- Explicit "Do not" list (no tests, no retry logic, no extra abstractions unless asked)
- Keep it minimal — agent fills gaps with over-engineering by default

## Status

**Done:**
- Auth, projects CRUD, Jira integration
- Planning agent (epics + stories in backlog, no sprint)
- Coding agent (GitHub API file tools, CONTEXT.md flow)
- HIL sprint review (SPRINT_REVIEW, approve/reject)
- GitHub integration (connect/disconnect, PAT encryption, feature branch, PR creation)
- Full frontend (landing, auth, dashboard, project chat+logs, Jira board, GitHub connect UI)

**Next — testing + security agents (in order):**
1. DB migration — add `TESTING`, `SECURITY_SCAN` to ProjectStatus enum, add `lastSecurityReport Json?` to Project
2. Zod — update `ZProjectStatus`, add `ZSecurityReport`
3. Queue — add `testing` and `security` queue names + job payload types
4. Testing agent — graph, node, worker (enqueues security on completion)
5. Security agent — graph, node, worker (sets SPRINT_REVIEW on completion)
6. Coding worker — replace `status = SPRINT_REVIEW` with enqueue testing job + `status = TESTING`
7. Frontend — update sprint review panel to show test + security results

**Deferred:** Realtime logs (Socket.io), S3, org/team support, GitHub OAuth App.