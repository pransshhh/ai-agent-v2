# AI Dev Agent V2

## Product Vision

An AI-assisted SDLC platform. Not an autonomous coding bot. Every agent is a smart team member you can either let run uninterrupted or pull into a conversation. The human is always the decision-maker — agents accelerate the work, they don't own it.

**Core principle:** Agents propose, humans approve. Nothing is committed without a human checkpoint. Planning agent proposes a backlog before writing to Jira. Coding agent proposes implementations before they're merged. Security agent surfaces findings — human decides to proceed or fix.

**Conversation is first-class.** The chat panel is the interface to the agent, not a status display. Agents must respond to mid-run corrections, not just at review gates. A team lead should be able to say "split that story" during planning. A developer should be able to say "use the existing auth middleware" mid-sprint.

**Every agent is independently invocable.** No agent should require another to have run first. Run security on a branch you coded manually. Run tests on a frontend repo your team built. The auto-chain (coding → testing → security) is a convenience shortcut, not the only path.

**Failures surface immediately.** Jira sprint has no start date → error before the job queues. Agent can't read a file → says so in chat. Silent failures are unacceptable.

---

## Full user flow (end to end)

### 1. Project setup (one-time)
- Create project, connect GitHub repo, link Jira project
- Optionally set `workingDirectory` (critical for monorepos/microservices — scopes agent to a subdirectory)

### 2. Planning — conversational, propose-then-commit

Team lead opens chat with planning agent. Describes what to build.
Agent responds with a **proposed** breakdown — epics, stories, acceptance criteria.
This is a proposal. Nothing is written to Jira yet.

The conversation continues until the lead is satisfied:
- "Split that into two stories"
- "That's out of scope for this sprint"
- "The auth story needs to cover OAuth too"

When the lead says "looks good, create the backlog" → agent writes to Jira.
Status: `IDLE` → `PLANNING` (during conversation) → `PLANNED` (after Jira write confirmed)

### 3. Sprint setup — human
- Human reviews backlog in Jira
- Creates sprint, moves tickets in, sets start/end dates (must be set — agent validates before starting)
- Comes back to app, selects sprint, triggers coding

### 4. Coding — conversational, optionally autonomous

Two modes, both valid — human chooses by whether they send messages:

**Autonomous mode:** Agent codes ticket by ticket. Human watches logs. Intervenes only at HIL review.

**Collaborative mode:** Human can interject at any point mid-sprint:
- "You're using the wrong auth middleware"
- "Don't create a new util, use the one in lib/"
- "Skip that ticket, I'll handle it manually"
Agent acknowledges and adjusts. These messages are part of the run.

Agent streams progress back: "starting on SCRUM-4", "wrote auth.service.ts", "Jira transition failed, retrying".

On completion: coding agent stops. Human decides whether to run testing, security, or both. Not auto-chained.

### 5. Testing — independent, on-demand

Triggered explicitly by user. Not tied to coding agent output.
Input: repo + branch + PAT. Sprint context optional.
Can be run on:
- A branch the coding agent just finished
- A branch the developer coded manually
- Any branch at any time

### 6. Security scan — independent, on-demand

Same as testing — fully decoupled.
Input: repo + branch (or PR URL) + PAT.
Can be run:
- After coding or testing
- On a manually created branch
- On an open PR
- Periodically on main

### 7. Sprint / PR review — HIL

Human sees: what was coded (GitHub PR link), test results if run, security report if run.
All three are optional — review proceeds even if testing or security wasn't run.
Approve → PR created or sprint closed.
Reject with feedback → coding agent retries specific ticket.

---

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
    testing/        # graph.ts, state.ts, nodes/testing.node.ts
    security/       # graph.ts, state.ts, nodes/security.node.ts
  tools/
    github-read-file.ts   # getFileContent via GitHub API
    github-write-file.ts  # writeFile via GitHub API (auto-fetches SHA)
    github-list-files.ts  # getRepoTree via GitHub API
    run-command.ts        # kept for future test running
  workers/
    planning.worker.ts
    coding.worker.ts
    testing.worker.ts
    security.worker.ts
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
        index.tsx   # chat left, logs+status+security-report right
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
- **Sprint precondition:** validate sprint has startDate before enqueuing coding job — surface as API error, not silent worker failure
- **AI providers:** plug-and-play via `createModel({ provider, apiKey })` — Gemini (dev), Claude Sonnet (prod)
- **GitHub PAT:** AES-256-GCM encrypted at rest in DB — never return raw PAT to frontend, never log it
- **GitHub writeFile:** must fetch current file SHA before updating an existing file — GitHub API requires it
- **Each writeFile = one commit** — GitHub contents API commits per file write, results in noisy history. Acceptable for now.

## Database schema

```prisma
enum ProjectStatus {
  IDLE           # default + resting state between sprints
  PLANNING       # planning agent running (conversational — not yet writing to Jira)
  PLANNED        # backlog confirmed and written to Jira, human sets up sprint
  CODING         # coding agent running
  TESTING        # testing agent running
  SECURITY_SCAN  # security agent running
  SPRINT_REVIEW  # all agents done, awaiting HIL approve/reject
  FAILED
}

model Project {
  id                 String        @id @default(cuid())
  name               String
  description        String?
  userId             String
  jiraProjectKey     String?
  jiraBoardId        Int?
  jiraSprintId       Int?
  status             ProjectStatus @default(IDLE)
  currentRunId       String?
  githubRepoUrl      String?
  githubPat          String?       # AES encrypted, never returned to frontend
  githubBaseBranch   String?       # default: main
  githubPrUrl        String?       # set after PR created on final sprint approve
  lastSecurityReport Json?         # ZSecurityReport shape: { critical, warnings, info }
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
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
POST   /projects/:id/agent/testing/start    { branch } → enqueues testing job (independent)
POST   /projects/:id/agent/security/start   { branch } → enqueues security job (independent)
POST   /projects/:id/agent/sprint/approve   { runId }  → PR if last sprint, else IDLE
POST   /projects/:id/agent/sprint/reject    { runId, issueKey, feedback } → retry ticket

GET  /jira/sprints?state=active|future|closed
GET  /jira/sprints/active
GET  /jira/sprints/:sprintId/issues
```

Note: `/testing/start` and `/security/start` are planned but not yet built. Currently testing
and security are auto-chained from the coding worker as a convenience. Decoupling them into
independent endpoints is the next architectural step.

## Agent pipeline (current — auto-chained)

```
coding/start { sprintId } → coding worker:
  1. validate sprint has startDate — error immediately if missing
  2. CONTEXT.md: read from base branch or generate via LLM → write to feature branch
  3. create feature branch: feature/{sprintId}-{slug}
  4. activate sprint in Jira
  5. for each ticket:
       → In Progress → ToolLoopAgent (github read/write/list tools) → Done
  6. update CONTEXT.md → write to feature branch
  7. enqueue testing job → status = TESTING

→ testing worker:
  1. read CONTEXT.md from feature branch
  2. fetch sprint issues from Jira
  3. ToolLoopAgent writes test files to feature branch
  4. post test summary as Jira comment on each ticket
  5. enqueue security job → status = SECURITY_SCAN

→ security worker:
  1. list + read files on feature branch
  2. LLM scans for: hardcoded secrets, injection risks, missing validation,
     auth gaps, exposed endpoints, unsafe functions
  3. produces report: { critical: [], warnings: [], info: [] }
  4. post security report as Jira comment on first sprint ticket
  5. save report to project.lastSecurityReport
  6. status = SPRINT_REVIEW

→ SPRINT_REVIEW:
  HIL sees: security summary panel (coding ✅, tests ✅, security ✅/⚠️/🔴)
  approve:
    - more sprints → close sprint → status = IDLE → human creates next sprint
    - final sprint → createPR → save githubPrUrl → status = IDLE
    - if critical security issues → confirmation dialog before approve
  reject { issueKey, feedback }:
    → retry that ticket → status = SPRINT_REVIEW again
```

## Agent pipeline (target — independent invocation)

Each agent should be independently triggerable via its own API endpoint.
The auto-chain above becomes a shortcut, not the only path.

```
# Independent testing run (e.g. on a manually coded branch)
POST /projects/:id/agent/testing/start { branch: "feature/my-branch" }

# Independent security scan
POST /projects/:id/agent/security/start { branch: "feature/my-branch" }

# Full pipeline shortcut (one click)
POST /projects/:id/agent/pipeline/start { sprintId } → coding → testing → security → SPRINT_REVIEW
```

Sprint review panel adapts: shows whatever ran (test results only if testing ran, security only
if security ran). HIL review proceeds regardless of which agents were invoked.

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

## Repo type considerations

The agent works across repo types — quality depends on CONTEXT.md and ticket specificity:

- **Backend only** — works best. REST endpoints, models, middleware are file-based and unambiguous.
- **Frontend only** — works well for structure/logic. Testing agent is weaker (no browser runtime). Security agent less useful (XSS/CSP not visible statically).
- **Monorepo** — works with good CONTEXT.md documenting what each package/app does and import conventions. Future: `workingDirectory` field to scope agent to a subdirectory.
- **Microservices** — works if planning tickets specify which service to touch. Future: per-service CONTEXT.md.
- **Monolith** — hardest. Large file trees, risk of touching wrong files. CONTEXT.md must document module boundaries explicitly.

What makes it work across all types:
1. **CONTEXT.md quality** — richer = better agent output regardless of architecture
2. **Ticket specificity** — vague tickets produce bad output in any architecture
3. **Planning prompt discipline** — specific prompts produce specific tickets which constrain the coding agent

## Code style

- Biome (not Prettier), conventional commits
- Module pattern: `.router.ts` / `.controller.ts` / `.service.ts`
- Errors: `AppError(message, statusCode, code?)`
- Env: Zod-validated `config/env.ts` per app
- Packages: DI pattern — no `process.env` inside packages, callers inject config

## Status

**Done:**
- Auth, projects CRUD, Jira integration
- Planning agent (fire-and-forget — creates epics + stories in backlog)
- Coding agent (GitHub API file tools, CONTEXT.md flow, feature branch, PR creation)
- Testing agent (writes test files to feature branch, posts Jira comment)
- Security agent (read-only scan, structured report, saves to DB)
- HIL sprint review (SPRINT_REVIEW, approve with security confirmation, reject with feedback)
- GitHub integration (connect/disconnect, PAT encryption)
- Full frontend (landing, auth, dashboard, project page with security report panel, Jira board)
- Status timeline: IDLE → PLANNING → PLANNED → CODING → TESTING → SECURITY_SCAN → SPRINT_REVIEW

**Next — conversational agents + independent invocation:**
- [ ] Planning agent: conversational loop (propose → discuss → commit to Jira on explicit approval)
- [ ] Coding agent: mid-run message handling (human can interject corrections during a sprint)
- [ ] Real-time streaming (SSE or Socket.io) — replace polling with push
- [ ] Independent testing endpoint: `POST /agent/testing/start { branch }`
- [ ] Independent security endpoint: `POST /agent/security/start { branch }`
- [ ] Sprint precondition validation: check Jira sprint has startDate before enqueuing coding job
- [ ] workingDirectory field on jobs — scope agent to subdirectory (monorepo/microservices support)
- [ ] Error toasts on frontend for job failures (currently silent)

**Deferred:** S3, org/team support, GitHub OAuth App, per-service CONTEXT.md, file diff scoping for testing/security agents.
