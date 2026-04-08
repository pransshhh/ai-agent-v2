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
    api.ts              # Axios instance — withCredentials: true + response interceptor
    auth-client.ts      # better-auth React client + useSession hook
    query-client.ts     # TanStack Query client
    utils.ts            # shadcn cn() util
  hooks/
    use-auth.ts         # TanStack Query mutations for signup, signin, verify, signout
    use-projects.ts     # useProjects, useProject, useCreateProject, useUpdateProject, useConnectGithub, useDisconnectGithub, useStartCoding, useApprovePlanning, useApproveSprintReview, useRejectSprintReview, useResetProject
  routes/
    __root.tsx          # Root layout
    index.tsx           # Landing page — hero, feature cards, CTA buttons (auth-aware nav)
    auth/
      route.tsx         # Auth layout guard — redirects to /dashboard if signed in
      signup.tsx
      signin.tsx
      verify.tsx        # OTP verification
      _components/
        signup-form.tsx
        signin-form.tsx
        otp-form.tsx
    dashboard/
      route.tsx         # Protected route guard — redirects to /auth/signin if not signed in
      index.tsx         # Project list, "New Project" dialog, status badges, empty state
      projects/
        $id/
          index.tsx     # Two-panel layout: left = chat, right = logs + status timeline; header has GitHub connect/disconnect + View PR button
          jira.tsx        # Jira board page — two tabs: Backlog and Board (dummy for now)
          route.tsx       # Protected route guard — redirects to /dashboard if not signed in
  components/
    app-sidebar.tsx
    ui/                 # shadcn components (Button, Input, Card, Badge, Dialog, Textarea, etc.)
```

## What needs to be built next

### Jira board page — `routes/dashboard/projects/$id/jira.tsx`

Navigated to via "View Jira Board" button on the project page top bar.

**Two tabs: Backlog and Board**

**Backlog tab:**
- Shows future sprints (not yet started)
- Each sprint is collapsible, shows its tickets as a list
- Ticket list shows: key (e.g. SCRUM-1), summary, issue type, status badge
- Data:
  - `GET /api/v1/jira/sprints?state=future` — list future sprints
  - `GET /api/v1/jira/sprints/:sprintId/issues` — tickets per sprint

**Board tab (Kanban):**
- 4 columns: To Do | In Progress | In Review | Done
- Shows the active sprint's tickets grouped by status
- Ticket cards show: key, summary, status badge
- Read-only — no drag and drop
- Data:
  - `GET /api/v1/jira/sprints/active` — get active sprint
  - `GET /api/v1/jira/sprints/:sprintId/issues` — tickets for that sprint

**General:**
- Back button → `/dashboard/projects/:id`
- Show project name + sprint name in page header
- Empty states: "No active sprint" on Board tab, "No sprints in backlog" on Backlog tab
- Read-only for now — no ticket editing, no drag and drop

## API layer conventions

All API calls go through `lib/api.ts` (Axios instance, `withCredentials: true`, base URL = `http://localhost:3000`).

Pattern for a new resource:
1. Create `hooks/use-{resource}.ts` with TanStack Query hooks
2. Query keys: `['{resource}']` for lists, `['{resource}', id]` for single items
3. Mutations invalidate relevant query keys on success
4. Error responses: `{ error: string, code?: string }`

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

File-based routing:
- `routes/index.tsx` — `/`
- `routes/dashboard/route.tsx` — layout + guard for `/dashboard/*`
- `routes/dashboard/index.tsx` — `/dashboard`
- `routes/dashboard/projects/$id/index.tsx` — `/dashboard/projects/:id`
- `routes/dashboard/projects/$id/jira.tsx` — `/dashboard/projects/:id/jira`

Path params via `useParams()`. Navigation via `Link` or `useNavigate()`.

## Styling conventions

- Tailwind v4 utility classes only
- shadcn/ui for all base UI components
- Stick to shadcn CSS variable tokens — no hardcoded colors
- Theme swapped via `index.css` later — don't override CSS vars inline
- Desktop-first layout

## Auth notes

- Cookie-based sessions — Axios `withCredentials: true` handles automatically
- `useSession()` from `lib/auth-client.ts` → `{ data: { user, session }, isPending }`
- Route guards in `routes/auth/route.tsx` and `routes/dashboard/route.tsx`
- 401 → Axios interceptor redirects to `/auth/signin`

## What NOT to build yet

- Real-time WebSocket logs (deferred — polling in place, designed for easy swap)
- Monaco editor / file viewer (deferred)
- S3 file browser (deferred)
- Org/team management (deferred)
- Drag-and-drop on Jira board (deferred)
- Ticket editing (deferred)