# apps/web — Frontend Context

## Stack

- React 19 + Vite
- TanStack Router (file-based routing)
- TanStack Query (server state)
- TanStack Form (forms)
- Tailwind v4 + shadcn/ui
- better-auth React client

## What's already built

```
apps/web/src/
  lib/
    api.ts              # Axios instance — already has withCredentials: true + response interceptor
    auth-client.ts      # better-auth React client + useSession hook
    query-client.ts     # TanStack Query client
    utils.ts            # shadcn cn() util
  hooks/
    use-auth.ts         # TanStack Query mutations for signup, signin, verify, signout
  routes/
    __root.tsx          # Root layout
    index.tsx           # / → smart redirect (to /dashboard if signed in, else landing)
    auth/
      route.tsx         # Auth layout guard — redirects to /dashboard if already signed in
      signup.tsx
      signin.tsx
      verify.tsx        # OTP verification (shared by signup + signin flows)
      _components/
        signup-form.tsx
        signin-form.tsx
        otp-form.tsx
    dashboard/
      route.tsx         # Protected route guard — redirects to /auth/signin if not signed in
      index.tsx         # Dashboard stub with signout button
  components/
    ui/                 # shadcn components (Button, Input, Card, etc.)
```

## What needs to be built

In priority order:

### 1. Landing page — `routes/index.tsx` (update existing)
Simple marketing page. Currently just redirects. Needs:
- Hero section: product name, one-line pitch, CTA buttons (Sign up, Sign in)
- Feature highlights (3–4 cards)
- Stick to shadcn defaults

### 2. Dashboard — `routes/dashboard/index.tsx`
- List user's projects (call `GET /api/v1/projects`)
- "New Project" button → opens a dialog with name + description fields, calls `POST /api/v1/projects`
- Each project card shows: name, status badge, created date
- Clicking a project card navigates to `/dashboard/projects/:id`
- Empty state when no projects

### 3. Project page — `routes/dashboard/projects/$id.tsx` (main feature)
See layout section below.

### 4. Jira board page — `routes/dashboard/projects/$id.jira.tsx`
See Jira board section below.

## Project page layout

Two-panel layout (like Claude/Gemini chat):

**Left panel — Chat:**
- Message list (user messages + AI/agent responses)
- Input box at the bottom (textarea + send button)
- Initial state (status = CREATED, Jira not linked): show "Link Jira" prompt before allowing planning
- Once Jira is linked: input is active, placeholder = "Describe what you want to build..."
- Sending a message triggers `POST /api/v1/projects/:id/agent/planning/start { prompt }`
- When status = PLANNED: show "Approve & Start Coding" button inline in the chat (as an agent message with an action button)
- Chat messages are stored in local component state (not persisted to backend — no chat history API yet)

**Right panel — Logs:**
- Shows when a prompt has been submitted (i.e. status is PLANNING, PLANNED, CODING, DONE, or FAILED)
- Before any action: placeholder text "Logs will appear here" + status machine timeline
- Log entries fade in with animation as they appear
- For now, use polling (`GET /api/v1/projects/:id` every 3s) to update project status — no WebSocket yet
- The log panel design should make it easy to swap polling for Socket.io later (keep log state in a simple array that gets appended to)

**Status machine timeline** (shown in right panel before logs exist):
```
CREATED → PLANNING → PLANNED → CODING → DONE
```
Highlight the current status. Show FAILED in red if applicable.

**Top bar** (project page):
- Project name
- Status badge
- "View Jira Board" button → navigates to `/dashboard/projects/:id/jira`

## Jira board page

Separate page at `/dashboard/projects/$id.jira.tsx` (or nested route).

**Two tabs:**

**Backlog tab:**
- Shows sprints created but not yet started (future state)
- Each sprint is collapsible, shows its tickets as a list
- Data: `GET /api/v1/jira/sprints?state=future` + `GET /api/v1/jira/sprints/:sprintId/issues`

**Board tab (Kanban):**
- 4 columns: To Do | In Progress | In Review | Done
- Shows the active sprint's tickets
- Data: `GET /api/v1/jira/sprints/active` → get sprintId → `GET /api/v1/jira/sprints/:sprintId/issues`
- Tickets are cards with: key (e.g. SCRUM-1), summary, status badge
- Read-only for now (no drag and drop)

## API layer conventions

All API calls go through `lib/api.ts` (Axios instance, `withCredentials: true`, base URL = `http://localhost:3000`).

Pattern for a new resource:
1. Create `hooks/use-{resource}.ts` with TanStack Query hooks
2. Query keys: `['{resource}']` for lists, `['{resource}', id]` for single items
3. Mutations invalidate relevant query keys on success
4. Error responses from the API have shape: `{ error: string, code?: string }`

Example hook pattern:
```ts
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/api/v1/projects').then(r => r.data),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post('/api/v1/projects', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
```

## TanStack Router conventions

File-based routing. Route files:
- `routes/__root.tsx` — root layout (already exists)
- `routes/index.tsx` — `/`
- `routes/dashboard/route.tsx` — layout + guard for `/dashboard/*`
- `routes/dashboard/index.tsx` — `/dashboard`
- `routes/dashboard/projects/$id.tsx` — `/dashboard/projects/:id`
- `routes/dashboard/projects/$id.jira.tsx` — `/dashboard/projects/:id/jira`

Path params accessed via `useParams()` from TanStack Router.

Navigation: use `Link` component or `useNavigate()` from TanStack Router.

## Styling conventions

- Tailwind v4 utility classes only
- shadcn/ui components for all base UI (Button, Input, Card, Badge, Dialog, Tabs, etc.)
- Stick to shadcn CSS variable tokens — no hardcoded colors
- Theme will be swapped via `index.css` later — don't override CSS vars inline
- Responsive design: desktop-first (target users are developers)

## Auth notes

- Sessions are cookie-based — handled automatically by Axios `withCredentials: true`
- `useSession()` from `lib/auth-client.ts` gives `{ data: { user, session }, isPending }`
- Route guards already exist in `routes/auth/route.tsx` and `routes/dashboard/route.tsx`
- On 401 responses the Axios interceptor in `lib/api.ts` should redirect to `/auth/signin`

## What NOT to build yet

- Monaco editor / file viewer (deferred)
- Real-time WebSocket logs (deferred — use polling for now, design for easy swap)
- S3 file browser (deferred)
- GitHub integration UI (deferred)
- Org/team management (deferred)
- Drag-and-drop on Jira board (deferred)