# Slice 3 — Dashboard & Kanban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working Dashboard at `/app/dashboard` — a stats row + a 6-column drag-and-drop Kanban board (`@dnd-kit`) with optimistic moves — backed by two new Express endpoints (`GET /api/dashboard/kanban`, `GET /api/dashboard/stats`), with **ghost-days derived live** so the signature health signal works immediately.

**Architecture:** Backend adds a layered `dashboard` module (`router → controller → service → repository → schema`) that reuses the existing `jobs` table; the service **derives `ghostDays` at read time** from `lastActivityAt` (fallback `createdAt`) so the GhostMeter/alerts/filter are live without the Slice-4 cron. Frontend: a Server Component fetches the initial board via `api-server`; a client `DashboardView` renders `DashboardStats` + a `KanbanBoard`. The board's drag logic is **pure and unit-tested** (`lib/kanban.ts`); the component wires `@dnd-kit` to it. Card moves call a new `useMoveJob()` mutation (`PATCH /api/jobs/:id/move`, already built in Slice 2) with optimistic cache updates + snapshot rollback. Clicking a card reuses the Slice-2 `JobDrawer` via `/app/dashboard?job=<id>` (the drawer's close is generalized to the current page).

**Tech Stack:** Express 5, Drizzle, Zod, Vitest + Supertest (backend); Next.js 15, React 19, TanStack Query v5, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`, Vitest + RTL (frontend).

**Decisions (design spec §9 "Slice 3 resolutions"):** dedicated dashboard endpoints (because `/api/jobs` is paginated); fractional-float `kanbanOrder` on drop; `@dnd-kit` + optimistic `useMoveJob` with snapshot rollback; 5 stat cards (Total · Applied · Interviewing · Offers · Ghost alerts); **ghost-days derived live**; reuse the `JobDrawer` on the dashboard via `?job=`; ViewToggle deferred to Slice 5; column label/color derived on the frontend from `STATUS_META`.

**Canonical contract** (ported from `backend/src/modules/dashboard`, adapted to derive ghost-days):
- `GET /api/dashboard/kanban?search=&status=&ghostFilter=` → `{ data: { columns, stats } }`.
  - `columns`: the **6 statuses always present, fixed order** (`WISHLIST→APPLIED→INTERVIEWING→OFFER→REJECTED→ARCHIVED`), each `{ status, jobs: KanbanCard[] }` (cards sorted by `kanbanOrder` ASC). **No `label`/`color`** — the frontend derives those.
  - `KanbanCard`: `{ id, title, company, location, ghostDays, status, kanbanOrder, lastActivityAt, createdAt }` (`ghostDays` **derived**).
  - `stats`: computed from the **filtered** set.
- `GET /api/dashboard/stats` → `{ data: stats }`, `stats` over **all** the user's jobs.
  - `DashboardStats`: `{ totalJobs, byStatus: Record<JobStatus, number>, ghostAlerts, recentActivity }`.
- **Ghost derivation:** `ghostDays = max(0, floor((now − (lastActivityAt ?? createdAt)) / 1 day))`. Buckets: active `≤7`, stale `>7 ≤14`, ghost `>14`. `ghostAlerts = count(ghostDays > 14)`; `recentActivity = count(ghostDays ≤ 7)`.
- Both endpoints require auth (`accessToken` cookie) and are user-scoped.

---

## File Structure

**Backend (`backend-express/`):**
- Create: `src/modules/dashboard/dashboard.schema.ts` — `DashboardQuerySchema` + response types + `.test.ts`
- Create: `src/modules/dashboard/dashboard.ghost.ts` — pure ghost-derivation helpers + `.test.ts`
- Create: `src/modules/dashboard/dashboard.repository.ts` — `findForUser` (all matching jobs, no pagination) + `.test.ts` (real DB)
- Create: `src/modules/dashboard/dashboard.service.ts` — kanban/stats build logic + `.test.ts` (mocked repo)
- Create: `src/modules/dashboard/dashboard.controller.ts` + `dashboard.router.ts` + `.test.ts` (Supertest)
- Modify: `src/shared/api-router.ts` — mount `dashboardRouter` at `/dashboard`

**Frontend (`frontend-next/`):**
- Create: `src/types/dashboard.ts` — `KanbanCard`, `KanbanColumn`, `DashboardStats`, `KanbanBoard`
- Create: `src/lib/query-keys.ts` — `JOBS_KEY`, `jobKey`, `DASHBOARD_KANBAN_KEY`, `DASHBOARD_STATS_KEY`
- Create: `src/lib/kanban.ts` — pure drag helpers (`calculateKanbanOrder`, `findCard`, `moveCardToColumn`) + `.test.ts`
- Create: `src/hooks/use-dashboard.ts` — `useKanban`, `useMoveJob` + `.test.tsx`
- Modify: `src/hooks/use-jobs.ts` — source keys from `query-keys`; also invalidate the kanban key on update/delete
- Create: `src/components/dashboard/stat-card.tsx` + `.test.tsx`
- Create: `src/components/dashboard/dashboard-stats.tsx` + `.test.tsx`
- Create: `src/components/kanban/kanban-card.tsx` + `.test.tsx`
- Create: `src/components/kanban/kanban-column.tsx` + `.test.tsx`
- Create: `src/components/kanban/kanban-board.tsx` + `.test.tsx`
- Create: `src/components/dashboard/dashboard-view.tsx` — client orchestrator (stats + board + drawer)
- Modify: `src/components/jobs/job-drawer.tsx` — generalize close to the current page
- Modify: `src/app/app/dashboard/page.tsx` — Server Component initial fetch

---

# PART A — Backend (`backend-express/`)

### Task 1: Dashboard query schema + response types

**Files:**
- Create: `backend-express/src/modules/dashboard/dashboard.schema.ts`
- Test: `backend-express/src/modules/dashboard/dashboard.schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/dashboard/dashboard.schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DashboardQuerySchema } from './dashboard.schema.js'

describe('DashboardQuerySchema', () => {
  it('accepts an empty query', () => {
    expect(DashboardQuerySchema.safeParse({}).success).toBe(true)
  })
  it('accepts search/status/ghostFilter', () => {
    const r = DashboardQuerySchema.parse({ search: 'acme', status: 'APPLIED', ghostFilter: 'stale' })
    expect(r).toMatchObject({ search: 'acme', status: 'APPLIED', ghostFilter: 'stale' })
  })
  it('rejects an unknown status', () => {
    expect(DashboardQuerySchema.safeParse({ status: 'NOPE' }).success).toBe(false)
  })
  it('rejects an unknown ghostFilter', () => {
    expect(DashboardQuerySchema.safeParse({ ghostFilter: 'spooky' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npx vitest run src/modules/dashboard/dashboard.schema.test.ts`
Expected: FAIL — cannot resolve `./dashboard.schema.js`.

- [ ] **Step 3: Implement the schema + types**

Create `src/modules/dashboard/dashboard.schema.ts`:

```ts
import { z } from 'zod'
import { JOB_STATUSES, type JobStatus } from '@/db/schema/jobs.js'

export const DashboardQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(JOB_STATUSES).optional(),
  ghostFilter: z.enum(['all', 'active', 'stale', 'ghost']).optional(),
})

export type DashboardQueryInput = z.infer<typeof DashboardQuerySchema>

export interface KanbanCard {
  id: string
  title: string
  company: string
  location: string | null
  ghostDays: number
  status: JobStatus
  kanbanOrder: number
  lastActivityAt: Date | null
  createdAt: Date
}

export interface KanbanColumn {
  status: JobStatus
  jobs: KanbanCard[]
}

export interface DashboardStats {
  totalJobs: number
  byStatus: Record<JobStatus, number>
  ghostAlerts: number
  recentActivity: number
}

export interface KanbanBoardResponse {
  columns: KanbanColumn[]
  stats: DashboardStats
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend-express && npx vitest run src/modules/dashboard/dashboard.schema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd backend-express
git add src/modules/dashboard/dashboard.schema.ts src/modules/dashboard/dashboard.schema.test.ts
git commit -m "feat(backend-express): dashboard query schema + kanban/stats response types"
```

---

### Task 2: Ghost-derivation helpers (pure)

**Files:**
- Create: `backend-express/src/modules/dashboard/dashboard.ghost.ts`
- Test: `backend-express/src/modules/dashboard/dashboard.ghost.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/dashboard/dashboard.ghost.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveGhostDays, passesGhostFilter } from './dashboard.ghost.js'

const NOW = new Date('2026-06-20T12:00:00Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000)

describe('deriveGhostDays', () => {
  it('is 0 for activity today', () => {
    expect(deriveGhostDays({ lastActivityAt: daysAgo(0), createdAt: daysAgo(30) }, NOW)).toBe(0)
  })
  it('counts whole days since lastActivityAt', () => {
    expect(deriveGhostDays({ lastActivityAt: daysAgo(9), createdAt: daysAgo(30) }, NOW)).toBe(9)
  })
  it('falls back to createdAt when lastActivityAt is null', () => {
    expect(deriveGhostDays({ lastActivityAt: null, createdAt: daysAgo(20) }, NOW)).toBe(20)
  })
  it('never returns negative', () => {
    expect(deriveGhostDays({ lastActivityAt: new Date(NOW + 86_400_000), createdAt: daysAgo(1) }, NOW)).toBe(0)
  })
})

describe('passesGhostFilter', () => {
  it('passes everything for all/undefined', () => {
    expect(passesGhostFilter(99, undefined)).toBe(true)
    expect(passesGhostFilter(99, 'all')).toBe(true)
  })
  it('active = <=7', () => {
    expect(passesGhostFilter(7, 'active')).toBe(true)
    expect(passesGhostFilter(8, 'active')).toBe(false)
  })
  it('stale = 8..14', () => {
    expect(passesGhostFilter(8, 'stale')).toBe(true)
    expect(passesGhostFilter(14, 'stale')).toBe(true)
    expect(passesGhostFilter(15, 'stale')).toBe(false)
    expect(passesGhostFilter(7, 'stale')).toBe(false)
  })
  it('ghost = >14', () => {
    expect(passesGhostFilter(15, 'ghost')).toBe(true)
    expect(passesGhostFilter(14, 'ghost')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npx vitest run src/modules/dashboard/dashboard.ghost.test.ts`
Expected: FAIL — cannot resolve `./dashboard.ghost.js`.

- [ ] **Step 3: Implement the helpers**

Create `src/modules/dashboard/dashboard.ghost.ts`:

```ts
import type { DashboardQueryInput } from './dashboard.schema.js'

const DAY_MS = 86_400_000

/** Days of inactivity, derived from the last activity (or creation) date. */
export function deriveGhostDays(job: { lastActivityAt: Date | null; createdAt: Date }, now: number): number {
  const activity = (job.lastActivityAt ?? job.createdAt).getTime()
  return Math.max(0, Math.floor((now - activity) / DAY_MS))
}

export function passesGhostFilter(ghostDays: number, filter: DashboardQueryInput['ghostFilter']): boolean {
  switch (filter) {
    case 'active':
      return ghostDays <= 7
    case 'stale':
      return ghostDays > 7 && ghostDays <= 14
    case 'ghost':
      return ghostDays > 14
    default:
      return true
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend-express && npx vitest run src/modules/dashboard/dashboard.ghost.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
cd backend-express
git add src/modules/dashboard/dashboard.ghost.ts src/modules/dashboard/dashboard.ghost.test.ts
git commit -m "feat(backend-express): derive ghost-days + ghost-filter helpers"
```

---

### Task 3: Dashboard repository

**Files:**
- Create: `backend-express/src/modules/dashboard/dashboard.repository.ts`
- Test: `backend-express/src/modules/dashboard/dashboard.repository.test.ts` (real Postgres)

> Returns ALL matching jobs (no pagination), ordered by `kanbanOrder` ASC. Reuses the `jobs` table. Like the auth/jobs repository tests, this hits the real Docker Postgres and seeds a user for the FK.

- [ ] **Step 1: Write the failing test**

Create `src/modules/dashboard/dashboard.repository.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { dashboardRepository } from './dashboard.repository.js'

const EMAIL = `dash-repo-${Date.now()}@example.com`
let userId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb().insert(users).values({ name: 'Dash', email: EMAIL, passwordHash: 'h' }).returning()
  const row = rows[0]
  if (!row) throw new Error('failed to seed user')
  userId = row.id
  await getDb().insert(jobs).values([
    { userId, title: 'Beta', company: 'Acme', status: 'APPLIED', kanbanOrder: 2, lastActivityAt: new Date() },
    { userId, title: 'Alpha', company: 'Globex', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() },
    { userId, title: 'Gamma', company: 'Initech', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date() },
  ])
})

afterAll(async () => {
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('dashboardRepository.findForUser (real DB)', () => {
  it('returns all the user jobs ordered by kanbanOrder asc', async () => {
    const rows = await dashboardRepository.findForUser(userId, {})
    expect(rows).toHaveLength(3)
    // APPLIED Alpha(1) before Beta(2); WISHLIST Gamma(1) — global asc by kanbanOrder
    expect(rows.map((r) => r.title).slice(0, 2)).toEqual(['Alpha', 'Gamma'])
  })
  it('filters by status', async () => {
    const rows = await dashboardRepository.findForUser(userId, { status: 'WISHLIST' })
    expect(rows.every((r) => r.status === 'WISHLIST')).toBe(true)
    expect(rows).toHaveLength(1)
  })
  it('filters by search (ILIKE title/company)', async () => {
    const rows = await dashboardRepository.findForUser(userId, { search: 'globex' })
    expect(rows.map((r) => r.title)).toEqual(['Alpha'])
  })
  it('is scoped to the owner', async () => {
    const rows = await dashboardRepository.findForUser('00000000-0000-0000-0000-000000000000', {})
    expect(rows).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npx vitest run src/modules/dashboard/dashboard.repository.test.ts`
Expected: FAIL — cannot resolve `./dashboard.repository.js`.

- [ ] **Step 3: Implement the repository**

Create `src/modules/dashboard/dashboard.repository.ts`:

```ts
import { and, or, eq, ilike, asc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { jobs, type JobRow, type JobStatus } from '@/db/schema/jobs.js'

interface BoardFilters {
  search?: string | undefined
  status?: JobStatus | undefined
}

async function findForUser(userId: string, filters: BoardFilters): Promise<JobRow[]> {
  const where = and(
    eq(jobs.userId, userId),
    filters.search
      ? or(ilike(jobs.title, `%${filters.search}%`), ilike(jobs.company, `%${filters.search}%`))
      : undefined,
    filters.status ? eq(jobs.status, filters.status) : undefined,
  )
  return getDb().select().from(jobs).where(where).orderBy(asc(jobs.kanbanOrder))
}

export const dashboardRepository = { findForUser }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend-express && npx vitest run src/modules/dashboard/dashboard.repository.test.ts`
Expected: PASS (4 tests). (Requires Docker Postgres up.)

- [ ] **Step 5: Commit**

```bash
cd backend-express
git add src/modules/dashboard/dashboard.repository.ts src/modules/dashboard/dashboard.repository.test.ts
git commit -m "feat(backend-express): dashboard repository (all user jobs, kanbanOrder order)"
```

---

### Task 4: Dashboard service

**Files:**
- Create: `backend-express/src/modules/dashboard/dashboard.service.ts`
- Test: `backend-express/src/modules/dashboard/dashboard.service.test.ts` (mocked repo)

- [ ] **Step 1: Write the failing test**

Create `src/modules/dashboard/dashboard.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./dashboard.repository.js', () => ({
  dashboardRepository: { findForUser: vi.fn() },
}))

import { dashboardRepository } from './dashboard.repository.js'
import { dashboardService } from './dashboard.service.js'
import type { JobRow } from '@/db/schema/jobs.js'

const repo = vi.mocked(dashboardRepository)
const day = 86_400_000

function fakeRow(over: Partial<JobRow> = {}): JobRow {
  const now = Date.now()
  return {
    id: 'j' + Math.round(over.kanbanOrder ?? 0),
    createdAt: new Date(now),
    updatedAt: new Date(now),
    userId: 'u1',
    title: 'T',
    company: 'C',
    location: null,
    salaryRange: null,
    sourceUrl: null,
    snapshotMarkdown: null,
    status: 'WISHLIST',
    kanbanOrder: 1,
    lastActivityAt: new Date(now),
    ghostDays: 0,
    notes: null,
    ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('dashboardService.getKanban', () => {
  it('returns all 6 columns in fixed order, even when empty', async () => {
    repo.findForUser.mockResolvedValue([])
    const board = await dashboardService.getKanban('u1', {})
    expect(board.columns.map((c) => c.status)).toEqual([
      'WISHLIST', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'ARCHIVED',
    ])
    expect(board.columns.every((c) => c.jobs.length === 0)).toBe(true)
    expect(board.stats.totalJobs).toBe(0)
  })

  it('groups cards by status and derives ghostDays from lastActivityAt', async () => {
    const now = Date.now()
    repo.findForUser.mockResolvedValue([
      fakeRow({ id: 'a', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date(now - 3 * day) }),
      fakeRow({ id: 'b', status: 'APPLIED', kanbanOrder: 2, lastActivityAt: new Date(now - 20 * day) }),
    ])
    const board = await dashboardService.getKanban('u1', {})
    const applied = board.columns.find((c) => c.status === 'APPLIED')
    expect(applied?.jobs.map((j) => j.id)).toEqual(['a', 'b'])
    expect(applied?.jobs[0]?.ghostDays).toBe(3)
    expect(applied?.jobs[1]?.ghostDays).toBe(20)
    expect(board.stats.byStatus.APPLIED).toBe(2)
    expect(board.stats.ghostAlerts).toBe(1) // b is >14
  })

  it('applies the ghostFilter on the derived value', async () => {
    const now = Date.now()
    repo.findForUser.mockResolvedValue([
      fakeRow({ id: 'fresh', status: 'APPLIED', lastActivityAt: new Date(now - 1 * day) }),
      fakeRow({ id: 'old', status: 'APPLIED', lastActivityAt: new Date(now - 30 * day) }),
    ])
    const board = await dashboardService.getKanban('u1', { ghostFilter: 'ghost' })
    const applied = board.columns.find((c) => c.status === 'APPLIED')
    expect(applied?.jobs.map((j) => j.id)).toEqual(['old'])
    expect(board.stats.totalJobs).toBe(1) // stats reflect the filtered set
  })
})

describe('dashboardService.getStats', () => {
  it('computes global stats with derived ghost data', async () => {
    const now = Date.now()
    repo.findForUser.mockResolvedValue([
      fakeRow({ status: 'OFFER', lastActivityAt: new Date(now - 1 * day) }),
      fakeRow({ status: 'OFFER', lastActivityAt: new Date(now - 40 * day) }),
      fakeRow({ status: 'WISHLIST', lastActivityAt: new Date(now) }),
    ])
    const stats = await dashboardService.getStats('u1')
    expect(stats.totalJobs).toBe(3)
    expect(stats.byStatus.OFFER).toBe(2)
    expect(stats.byStatus.WISHLIST).toBe(1)
    expect(stats.ghostAlerts).toBe(1)
    expect(stats.recentActivity).toBe(2) // the two <=7d
    expect(repo.findForUser).toHaveBeenCalledWith('u1', {})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npx vitest run src/modules/dashboard/dashboard.service.test.ts`
Expected: FAIL — cannot resolve `./dashboard.service.js`.

- [ ] **Step 3: Implement the service**

Create `src/modules/dashboard/dashboard.service.ts`:

```ts
import { JOB_STATUSES, type JobStatus, type JobRow } from '@/db/schema/jobs.js'
import { dashboardRepository } from './dashboard.repository.js'
import { deriveGhostDays, passesGhostFilter } from './dashboard.ghost.js'
import type {
  DashboardQueryInput,
  KanbanBoardResponse,
  KanbanCard,
  KanbanColumn,
  DashboardStats,
} from './dashboard.schema.js'

function toCard(row: JobRow, ghostDays: number): KanbanCard {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    ghostDays,
    status: row.status,
    kanbanOrder: row.kanbanOrder,
    lastActivityAt: row.lastActivityAt,
    createdAt: row.createdAt,
  }
}

function emptyByStatus(): Record<JobStatus, number> {
  return { WISHLIST: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }
}

function buildColumns(cards: KanbanCard[]): KanbanColumn[] {
  // Repo already ordered rows by kanbanOrder asc, so per-status order is preserved.
  return JOB_STATUSES.map((status) => ({
    status,
    jobs: cards.filter((c) => c.status === status),
  }))
}

function calculateStats(cards: KanbanCard[]): DashboardStats {
  const byStatus = emptyByStatus()
  for (const card of cards) byStatus[card.status] += 1
  return {
    totalJobs: cards.length,
    byStatus,
    ghostAlerts: cards.filter((c) => c.ghostDays > 14).length,
    recentActivity: cards.filter((c) => c.ghostDays <= 7).length,
  }
}

async function getKanban(userId: string, query: DashboardQueryInput): Promise<KanbanBoardResponse> {
  const filters: { search?: string; status?: JobStatus } = {}
  if (query.search !== undefined) filters.search = query.search
  if (query.status !== undefined) filters.status = query.status

  const rows = await dashboardRepository.findForUser(userId, filters)
  const now = Date.now()
  const cards = rows
    .map((row) => toCard(row, deriveGhostDays(row, now)))
    .filter((card) => passesGhostFilter(card.ghostDays, query.ghostFilter))

  return { columns: buildColumns(cards), stats: calculateStats(cards) }
}

async function getStats(userId: string): Promise<DashboardStats> {
  const rows = await dashboardRepository.findForUser(userId, {})
  const now = Date.now()
  const cards = rows.map((row) => toCard(row, deriveGhostDays(row, now)))
  return calculateStats(cards)
}

export const dashboardService = { getKanban, getStats }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend-express && npx vitest run src/modules/dashboard/dashboard.service.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd backend-express
git add src/modules/dashboard/dashboard.service.ts src/modules/dashboard/dashboard.service.test.ts
git commit -m "feat(backend-express): dashboard service (kanban grouping + derived-ghost stats)"
```

---

### Task 5: Dashboard controller + router + wiring + HTTP tests

**Files:**
- Create: `backend-express/src/modules/dashboard/dashboard.controller.ts`
- Create: `backend-express/src/modules/dashboard/dashboard.router.ts`
- Modify: `backend-express/src/shared/api-router.ts`
- Test: `backend-express/src/modules/dashboard/dashboard.router.test.ts`

- [ ] **Step 1: Implement the controller**

Create `src/modules/dashboard/dashboard.controller.ts`:

```ts
import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { dashboardService } from './dashboard.service.js'
import type { DashboardQueryInput } from './dashboard.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

async function kanban(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as DashboardQueryInput
  const board = await dashboardService.getKanban(requireUserId(req), query)
  res.status(200).json({ data: board })
}

async function stats(req: Request, res: Response): Promise<void> {
  const result = await dashboardService.getStats(requireUserId(req))
  res.status(200).json({ data: result })
}

export const dashboardController = { kanban, stats }
```

- [ ] **Step 2: Implement the router**

Create `src/modules/dashboard/dashboard.router.ts`:

```ts
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { dashboardController } from './dashboard.controller.js'
import { DashboardQuerySchema } from './dashboard.schema.js'

const router = Router()

router.use(authMiddleware)
router.get('/kanban', validate(DashboardQuerySchema, 'query'), asyncHandler(dashboardController.kanban))
router.get('/stats', asyncHandler(dashboardController.stats))

export { router as dashboardRouter }
```

- [ ] **Step 3: Wire it into the api-router**

Replace the contents of `src/shared/api-router.ts` with:

```ts
import { Router } from 'express'
import { healthRouter } from '@/modules/health/health.router.js'
import { authRouter } from '@/modules/auth/auth.router.js'
import { jobsRouter } from '@/modules/jobs/jobs.router.js'
import { dashboardRouter } from '@/modules/dashboard/dashboard.router.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/jobs', jobsRouter)
router.use('/dashboard', dashboardRouter)

export { router as apiRouter }
```

- [ ] **Step 4: Write the HTTP integration test**

Create `src/modules/dashboard/dashboard.router.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

vi.mock('./dashboard.repository.js', () => ({
  dashboardRepository: { findForUser: vi.fn() },
}))

import { dashboardRepository } from './dashboard.repository.js'

const repo = vi.mocked(dashboardRepository)
let app: Express
let cookie: string

beforeAll(async () => {
  process.env['NODE_ENV'] = 'test'
  process.env['PORT'] = '3000'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
  process.env['LOG_LEVEL'] = 'silent'
  app = (await import('@/app.js')).createApp()
  const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
  cookie = `accessToken=${signAccessToken({ id: 'u1', email: 'a@b.c' })}`
})

beforeEach(() => vi.clearAllMocks())

describe('GET /api/dashboard/kanban', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/dashboard/kanban')
    expect(res.status).toBe(401)
  })

  it('200s with 6 columns and stats', async () => {
    repo.findForUser.mockResolvedValue([])
    const res = await request(app).get('/api/dashboard/kanban').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data.columns).toHaveLength(6)
    expect(res.body.data.columns[0].status).toBe('WISHLIST')
    expect(res.body.data.stats).toMatchObject({ totalJobs: 0 })
  })

  it('400s on an invalid ghostFilter', async () => {
    const res = await request(app).get('/api/dashboard/kanban?ghostFilter=spooky').set('Cookie', [cookie])
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('forwards search/status to the repository', async () => {
    repo.findForUser.mockResolvedValue([])
    await request(app).get('/api/dashboard/kanban?search=acme&status=APPLIED').set('Cookie', [cookie])
    expect(repo.findForUser).toHaveBeenCalledWith('u1', { search: 'acme', status: 'APPLIED' })
  })
})

describe('GET /api/dashboard/stats', () => {
  it('401s without a cookie', async () => {
    const res = await request(app).get('/api/dashboard/stats')
    expect(res.status).toBe(401)
  })

  it('200s with global stats', async () => {
    repo.findForUser.mockResolvedValue([])
    const res = await request(app).get('/api/dashboard/stats').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ totalJobs: 0, ghostAlerts: 0, recentActivity: 0 })
    expect(res.body.data.byStatus.WISHLIST).toBe(0)
  })
})
```

- [ ] **Step 5: Run the test**

Run: `cd backend-express && npx vitest run src/modules/dashboard/dashboard.router.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Backend full gate**

Run: `cd backend-express && DATABASE_URL='postgres://postgres:postgres@localhost:5433/jobvault' npm run typecheck && npm run lint && npm run test`
Expected: all green (the dashboard repository real-DB test requires Docker Postgres up).

- [ ] **Step 7: Commit**

```bash
cd backend-express
git add src/modules/dashboard/dashboard.controller.ts src/modules/dashboard/dashboard.router.ts src/modules/dashboard/dashboard.router.test.ts src/shared/api-router.ts
git commit -m "feat(backend-express): dashboard controller, router, wiring under /api/dashboard"
```

---

# PART B — Frontend (`frontend-next/`)

### Task 6: Install @dnd-kit

**Files:** `frontend-next/package.json` (via npm)

- [ ] **Step 1: Install**

```bash
cd frontend-next
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify**

Run: `cd frontend-next && npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd frontend-next
git add package.json package-lock.json
git commit -m "chore(frontend-next): add @dnd-kit for the kanban board"
```

---

### Task 7: Dashboard types + query keys

**Files:**
- Create: `frontend-next/src/types/dashboard.ts`
- Create: `frontend-next/src/lib/query-keys.ts`

- [ ] **Step 1: Create the types**

Create `src/types/dashboard.ts`:

```ts
import type { JobStatus } from '@/lib/job-status'

export interface KanbanCard {
  id: string
  title: string
  company: string
  location: string | null
  ghostDays: number
  status: JobStatus
  kanbanOrder: number
  lastActivityAt: string | null
  createdAt: string
}

export interface KanbanColumn {
  status: JobStatus
  jobs: KanbanCard[]
}

export interface DashboardStats {
  totalJobs: number
  byStatus: Record<JobStatus, number>
  ghostAlerts: number
  recentActivity: number
}

export interface KanbanBoard {
  columns: KanbanColumn[]
  stats: DashboardStats
}
```

- [ ] **Step 2: Create the shared query keys**

Create `src/lib/query-keys.ts`:

```ts
export const JOBS_KEY = ['jobs'] as const
export const jobKey = (id: string) => ['jobs', id] as const
export const DASHBOARD_KANBAN_KEY = ['dashboard', 'kanban'] as const
export const DASHBOARD_STATS_KEY = ['dashboard', 'stats'] as const
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend-next && npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd frontend-next
git add src/types/dashboard.ts src/lib/query-keys.ts
git commit -m "feat(frontend-next): dashboard types + shared query keys"
```

---

### Task 8: Kanban pure helpers

**Files:**
- Create: `frontend-next/src/lib/kanban.ts`
- Test: `frontend-next/src/lib/kanban.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/kanban.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calculateKanbanOrder, findCard, moveCardToColumn } from './kanban'
import type { KanbanBoard, KanbanCard } from '@/types/dashboard'

function card(id: string, status: KanbanCard['status'], kanbanOrder: number): KanbanCard {
  return { id, title: id, company: 'C', location: null, ghostDays: 0, status, kanbanOrder, lastActivityAt: null, createdAt: '' }
}

function board(): KanbanBoard {
  return {
    columns: [
      { status: 'WISHLIST', jobs: [card('w1', 'WISHLIST', 1), card('w2', 'WISHLIST', 2)] },
      { status: 'APPLIED', jobs: [card('a1', 'APPLIED', 1)] },
      { status: 'INTERVIEWING', jobs: [] },
      { status: 'OFFER', jobs: [] },
      { status: 'REJECTED', jobs: [] },
      { status: 'ARCHIVED', jobs: [] },
    ],
    stats: { totalJobs: 3, byStatus: { WISHLIST: 2, APPLIED: 1, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 3 },
  }
}

describe('calculateKanbanOrder', () => {
  it('returns 1 for an empty column', () => {
    expect(calculateKanbanOrder([], 0)).toBe(1)
  })
  it('halves the first order when inserting at the top', () => {
    expect(calculateKanbanOrder([{ kanbanOrder: 4 }], 0)).toBe(2)
  })
  it('appends with last + 1', () => {
    expect(calculateKanbanOrder([{ kanbanOrder: 4 }], 1)).toBe(5)
  })
  it('uses the midpoint between neighbors', () => {
    expect(calculateKanbanOrder([{ kanbanOrder: 2 }, { kanbanOrder: 4 }], 1)).toBe(3)
  })
})

describe('findCard', () => {
  it('locates a card by id', () => {
    expect(findCard(board(), 'a1')).toEqual({ status: 'APPLIED', index: 0 })
  })
  it('returns null for an unknown id', () => {
    expect(findCard(board(), 'nope')).toBeNull()
  })
})

describe('moveCardToColumn', () => {
  it('moves a card to another column at an index and updates its status', () => {
    const next = moveCardToColumn(board(), 'w1', 'APPLIED', 0)
    const applied = next.columns.find((c) => c.status === 'APPLIED')
    const wishlist = next.columns.find((c) => c.status === 'WISHLIST')
    expect(applied?.jobs.map((j) => j.id)).toEqual(['w1', 'a1'])
    expect(applied?.jobs[0]?.status).toBe('APPLIED')
    expect(wishlist?.jobs.map((j) => j.id)).toEqual(['w2'])
  })
  it('reorders within the same column', () => {
    const next = moveCardToColumn(board(), 'w1', 'WISHLIST', 2)
    const wishlist = next.columns.find((c) => c.status === 'WISHLIST')
    expect(wishlist?.jobs.map((j) => j.id)).toEqual(['w2', 'w1'])
  })
  it('is a no-op for an unknown card', () => {
    const b = board()
    expect(moveCardToColumn(b, 'nope', 'APPLIED', 0)).toEqual(b)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/lib/kanban.test.ts`
Expected: FAIL — cannot resolve `./kanban`.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/kanban.ts`:

```ts
import type { JobStatus } from '@/lib/job-status'
import type { KanbanBoard, KanbanCard } from '@/types/dashboard'

/** Fractional-float order for inserting at `index` among `siblings` (sorted asc). */
export function calculateKanbanOrder(siblings: { kanbanOrder: number }[], index: number): number {
  if (siblings.length === 0) return 1
  if (index <= 0) {
    const first = siblings[0]
    return first ? first.kanbanOrder / 2 : 1
  }
  if (index >= siblings.length) {
    const last = siblings[siblings.length - 1]
    return last ? last.kanbanOrder + 1 : 1
  }
  const before = siblings[index - 1]
  const after = siblings[index]
  if (!before || !after) return 1
  return (before.kanbanOrder + after.kanbanOrder) / 2
}

export function findCard(board: KanbanBoard, id: string): { status: JobStatus; index: number } | null {
  for (const column of board.columns) {
    const index = column.jobs.findIndex((j) => j.id === id)
    if (index !== -1) return { status: column.status, index }
  }
  return null
}

/** Immutably remove `id` from its column and insert it into `toStatus` at `toIndex`. */
export function moveCardToColumn(board: KanbanBoard, id: string, toStatus: JobStatus, toIndex: number): KanbanBoard {
  let moved: KanbanCard | undefined
  for (const column of board.columns) {
    const found = column.jobs.find((j) => j.id === id)
    if (found) moved = found
  }
  if (!moved) return board

  const card: KanbanCard = { ...moved, status: toStatus }
  const columns = board.columns.map((column) => {
    const withoutCard = column.jobs.filter((j) => j.id !== id)
    if (column.status !== toStatus) return { ...column, jobs: withoutCard }
    const clamped = Math.max(0, Math.min(toIndex, withoutCard.length))
    const jobs = [...withoutCard.slice(0, clamped), card, ...withoutCard.slice(clamped)]
    return { ...column, jobs }
  })
  return { ...board, columns }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/lib/kanban.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/lib/kanban.ts src/lib/kanban.test.ts
git commit -m "feat(frontend-next): pure kanban drag helpers (order + board transforms)"
```

---

### Task 9: use-dashboard hooks + invalidate kanban on job mutations

**Files:**
- Create: `frontend-next/src/hooks/use-dashboard.ts`
- Test: `frontend-next/src/hooks/use-dashboard.test.tsx`
- Modify: `frontend-next/src/hooks/use-jobs.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/use-dashboard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useKanban, useMoveJob } from './use-dashboard'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useKanban', () => {
  it('fetches the board from /api/dashboard/kanban', async () => {
    api.get.mockResolvedValue({ columns: [], stats: { totalJobs: 0 } })
    const { result } = renderHook(() => useKanban(), { wrapper })
    await waitFor(() => expect(result.current.data?.stats.totalJobs).toBe(0))
    expect(api.get).toHaveBeenCalledWith('/api/dashboard/kanban')
  })
})

describe('useMoveJob', () => {
  it('PATCHes /api/jobs/:id/move with status + kanbanOrder', async () => {
    api.patch.mockResolvedValue({ id: 'j1', status: 'OFFER', kanbanOrder: 3 })
    const { result } = renderHook(() => useMoveJob(), { wrapper })
    result.current.mutate({ id: 'j1', status: 'OFFER', kanbanOrder: 3 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/jobs/j1/move', { status: 'OFFER', kanbanOrder: 3 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/hooks/use-dashboard.test.tsx`
Expected: FAIL — cannot resolve `./use-dashboard`.

- [ ] **Step 3: Implement the hooks**

Create `src/hooks/use-dashboard.ts`:

```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { DASHBOARD_KANBAN_KEY, JOBS_KEY } from '@/lib/query-keys'
import type { KanbanBoard } from '@/types/dashboard'
import type { JobStatus } from '@/lib/job-status'

export function useKanban(initialData?: KanbanBoard) {
  return useQuery({
    queryKey: DASHBOARD_KANBAN_KEY,
    queryFn: () => apiClient.get<KanbanBoard>('/api/dashboard/kanban'),
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}

export interface MoveJobVars {
  id: string
  status: JobStatus
  kanbanOrder: number
}

export function useMoveJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, kanbanOrder }: MoveJobVars) =>
      apiClient.patch(`/api/jobs/${id}/move`, { status, kanbanOrder }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
    },
  })
}
```

- [ ] **Step 4: Update `use-jobs.ts`** to source keys from `query-keys` and keep the board in sync.

Replace the top of `src/hooks/use-jobs.ts` (the key definitions) — change:

```ts
export const JOBS_KEY = ['jobs'] as const
export const jobKey = (id: string) => ['jobs', id] as const
```

to:

```ts
import { JOBS_KEY, jobKey, DASHBOARD_KANBAN_KEY } from '@/lib/query-keys'

export { JOBS_KEY, jobKey }
```

Then in `useUpdateJob`, change the `onSuccess` to also refresh the board:

```ts
    onSuccess: (job) => {
      qc.setQueryData(jobKey(id), job)
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
    },
```

And in `useDeleteJob`, change the `onSuccess`:

```ts
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
    },
```

(Leave `useCreateJob`/`useScrapeJob`/`useJobs`/`useJob` unchanged.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend-next && npx vitest run src/hooks/use-dashboard.test.tsx src/hooks/use-jobs.test.tsx`
Expected: PASS (use-dashboard 2 tests; use-jobs unchanged tests still pass).

- [ ] **Step 6: Commit**

```bash
cd frontend-next
git add src/hooks/use-dashboard.ts src/hooks/use-dashboard.test.tsx src/hooks/use-jobs.ts
git commit -m "feat(frontend-next): use-dashboard (kanban query + move mutation); sync board on job edits"
```

---

### Task 10: StatCard + DashboardStats

**Files:**
- Create: `frontend-next/src/components/dashboard/stat-card.tsx`
- Create: `frontend-next/src/components/dashboard/dashboard-stats.tsx`
- Test: `frontend-next/src/components/dashboard/dashboard-stats.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/dashboard/dashboard-stats.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardStats } from './dashboard-stats'
import type { DashboardStats as Stats } from '@/types/dashboard'

const STATS: Stats = {
  totalJobs: 12,
  byStatus: { WISHLIST: 2, APPLIED: 5, INTERVIEWING: 3, OFFER: 1, REJECTED: 1, ARCHIVED: 0 },
  ghostAlerts: 4,
  recentActivity: 7,
}

describe('DashboardStats', () => {
  it('renders the five stat cards with their values', () => {
    render(<DashboardStats stats={STATS} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.getByText('Interviewing')).toBeInTheDocument()
    expect(screen.getByText('Offers')).toBeInTheDocument()
    expect(screen.getByText('Ghost alerts')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/dashboard/dashboard-stats.test.tsx`
Expected: FAIL — cannot resolve `./dashboard-stats`.

- [ ] **Step 3: Implement the components**

Create `src/components/dashboard/stat-card.tsx`:

```tsx
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', accent && 'text-ghost-ghosted')}>
        {value}
      </p>
    </div>
  )
}
```

Create `src/components/dashboard/dashboard-stats.tsx`:

```tsx
import { StatCard } from './stat-card'
import type { DashboardStats as Stats } from '@/types/dashboard'

export function DashboardStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Total" value={stats.totalJobs} />
      <StatCard label="Applied" value={stats.byStatus.APPLIED} />
      <StatCard label="Interviewing" value={stats.byStatus.INTERVIEWING} />
      <StatCard label="Offers" value={stats.byStatus.OFFER} />
      <StatCard label="Ghost alerts" value={stats.ghostAlerts} accent />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/components/dashboard/dashboard-stats.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/components/dashboard/stat-card.tsx src/components/dashboard/dashboard-stats.tsx src/components/dashboard/dashboard-stats.test.tsx
git commit -m "feat(frontend-next): StatCard + DashboardStats (5-card pipeline snapshot)"
```

---

### Task 11: KanbanCard (sortable)

**Files:**
- Create: `frontend-next/src/components/kanban/kanban-card.tsx`
- Test: `frontend-next/src/components/kanban/kanban-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/kanban/kanban-card.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { KanbanCard } from './kanban-card'
import type { KanbanCard as Card } from '@/types/dashboard'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/app/dashboard' }))

const CARD: Card = {
  id: 'j1', title: 'Staff Engineer', company: 'Acme', location: 'Remote',
  ghostDays: 3, status: 'APPLIED', kanbanOrder: 1, lastActivityAt: null, createdAt: '',
}

function renderCard(card: Card = CARD) {
  return render(
    <DndContext>
      <SortableContext items={[card.id]}>
        <KanbanCard card={card} />
      </SortableContext>
    </DndContext>,
  )
}

describe('KanbanCard', () => {
  it('shows the title, company and ghost meter', () => {
    renderCard()
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByTestId('ghost-meter')).toBeInTheDocument()
  })

  it('navigates to the job query param on click', async () => {
    renderCard()
    await userEvent.click(screen.getByText('Staff Engineer'))
    expect(push).toHaveBeenCalledWith('/app/dashboard?job=j1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/kanban/kanban-card.test.tsx`
Expected: FAIL — cannot resolve `./kanban-card`.

- [ ] **Step 3: Implement the component**

Create `src/components/kanban/kanban-card.tsx`:

```tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import { cn } from '@/lib/utils'
import type { KanbanCard as Card } from '@/types/dashboard'

export function KanbanCard({ card }: { card: Card }) {
  const router = useRouter()
  const pathname = usePathname()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const style = { transform: CSS.Translate.toString(transform), transition }

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={() => router.push(`${pathname}?job=${card.id}`)}
      {...attributes}
      {...listeners}
      className={cn(
        'w-full cursor-grab touch-none rounded-lg border border-border bg-card p-3 text-left transition-colors',
        'hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'opacity-50',
      )}
    >
      <p className="truncate text-sm font-medium">{card.title}</p>
      <p className="truncate text-xs text-muted-foreground">
        {card.company}
        {card.location ? ` · ${card.location}` : ''}
      </p>
      <div className="mt-2">
        <GhostMeter days={card.ghostDays} />
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/components/kanban/kanban-card.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/components/kanban/kanban-card.tsx src/components/kanban/kanban-card.test.tsx
git commit -m "feat(frontend-next): sortable KanbanCard (click opens drawer via ?job=)"
```

---

### Task 12: KanbanColumn

**Files:**
- Create: `frontend-next/src/components/kanban/kanban-column.tsx`
- Test: `frontend-next/src/components/kanban/kanban-column.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/kanban/kanban-column.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import type { KanbanColumn as Column } from '@/types/dashboard'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/app/dashboard' }))

const COLUMN: Column = {
  status: 'APPLIED',
  jobs: [
    { id: 'j1', title: 'Role A', company: 'Acme', location: null, ghostDays: 0, status: 'APPLIED', kanbanOrder: 1, lastActivityAt: null, createdAt: '' },
    { id: 'j2', title: 'Role B', company: 'Globex', location: null, ghostDays: 0, status: 'APPLIED', kanbanOrder: 2, lastActivityAt: null, createdAt: '' },
  ],
}

describe('KanbanColumn', () => {
  it('renders the status label, the mono count, and the cards', () => {
    render(
      <DndContext>
        <KanbanColumn column={COLUMN} />
      </DndContext>,
    )
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Role A')).toBeInTheDocument()
    expect(screen.getByText('Role B')).toBeInTheDocument()
  })

  it('shows an empty hint when there are no cards', () => {
    render(
      <DndContext>
        <KanbanColumn column={{ status: 'OFFER', jobs: [] }} />
      </DndContext>,
    )
    expect(screen.getByText('Offer')).toBeInTheDocument()
    expect(screen.getByText(/no jobs/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/kanban/kanban-column.test.tsx`
Expected: FAIL — cannot resolve `./kanban-column`.

- [ ] **Step 3: Implement the component**

Create `src/components/kanban/kanban-column.tsx`:

```tsx
'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { STATUS_META } from '@/lib/job-status'
import { KanbanCard } from './kanban-card'
import { cn } from '@/lib/utils'
import type { KanbanColumn as Column } from '@/types/dashboard'

export function KanbanColumn({ column }: { column: Column }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status })
  const meta = STATUS_META[column.status]

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{meta.label}</h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{column.jobs.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-24 flex-1 flex-col gap-2 rounded-xl border border-border bg-muted/30 p-2 transition-colors',
          isOver && 'border-ring/50 bg-accent/40',
        )}
      >
        <SortableContext items={column.jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {column.jobs.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {column.jobs.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">No jobs</p>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/components/kanban/kanban-column.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/components/kanban/kanban-column.tsx src/components/kanban/kanban-column.test.tsx
git commit -m "feat(frontend-next): droppable KanbanColumn (label + count + sortable cards)"
```

---

### Task 13: KanbanBoard (DndContext orchestrator)

**Files:**
- Create: `frontend-next/src/components/kanban/kanban-board.tsx`
- Test: `frontend-next/src/components/kanban/kanban-board.test.tsx`

> The board renders from the `useKanban` query cache and mutates it via `setQueryData` during drag (live cross-column preview), snapshotting on drag start for rollback. Drag interactions themselves are validated by the manual smoke; the test asserts the board renders all columns/cards from data. The move math lives in the tested `lib/kanban.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/components/kanban/kanban-board.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { KanbanBoard } from './kanban-board'
import type { KanbanBoard as Board } from '@/types/dashboard'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/app/dashboard' }))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

const BOARD: Board = {
  columns: [
    { status: 'WISHLIST', jobs: [{ id: 'w1', title: 'Wished', company: 'Acme', location: null, ghostDays: 0, status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: null, createdAt: '' }] },
    { status: 'APPLIED', jobs: [] },
    { status: 'INTERVIEWING', jobs: [] },
    { status: 'OFFER', jobs: [] },
    { status: 'REJECTED', jobs: [] },
    { status: 'ARCHIVED', jobs: [] },
  ],
  stats: { totalJobs: 1, byStatus: { WISHLIST: 1, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 1 },
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('KanbanBoard', () => {
  it('renders all six columns and the seeded card', () => {
    render(<KanbanBoard board={BOARD} />, { wrapper })
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('Wished')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/kanban/kanban-board.test.tsx`
Expected: FAIL — cannot resolve `./kanban-board`.

- [ ] **Step 3: Implement the component**

Create `src/components/kanban/kanban-board.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useKanban, useMoveJob } from '@/hooks/use-dashboard'
import { DASHBOARD_KANBAN_KEY } from '@/lib/query-keys'
import { calculateKanbanOrder, findCard, moveCardToColumn } from '@/lib/kanban'
import { JOB_STATUSES, type JobStatus } from '@/lib/job-status'
import { KanbanColumn } from './kanban-column'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import type { KanbanBoard as Board, KanbanCard as Card } from '@/types/dashboard'

function isStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value)
}

/** The droppable id is either a column status, or a card id (resolve to its column). */
function resolveTargetStatus(board: Board, overId: string): JobStatus | null {
  if (isStatus(overId)) return overId
  const located = findCard(board, overId)
  return located ? located.status : null
}

export function KanbanBoard({ board: initial }: { board: Board }) {
  const qc = useQueryClient()
  const move = useMoveJob()
  const { data } = useKanban(initial)
  const board = data ?? initial
  const snapshot = useRef<Board | null>(null)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function setBoard(next: Board) {
    qc.setQueryData(DASHBOARD_KANBAN_KEY, next)
  }

  function onDragStart(event: DragStartEvent) {
    snapshot.current = board
    const located = findCard(board, String(event.active.id))
    if (located) {
      const col = board.columns.find((c) => c.status === located.status)
      setActiveCard(col?.jobs[located.index] ?? null)
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const targetStatus = resolveTargetStatus(board, String(over.id))
    if (!targetStatus) return
    const from = findCard(board, activeId)
    if (!from) return
    if (from.status === targetStatus) return // within-column handled on drag end

    const targetColumn = board.columns.find((c) => c.status === targetStatus)
    const index = targetColumn ? targetColumn.jobs.length : 0
    setBoard(moveCardToColumn(board, activeId, targetStatus, index))
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over) {
      if (snapshot.current) setBoard(snapshot.current)
      return
    }
    const activeId = String(active.id)
    const targetStatus = resolveTargetStatus(board, String(over.id))
    const from = findCard(board, activeId)
    if (!targetStatus || !from) return

    // Determine the drop index within the target column.
    const overIsCard = !isStatus(String(over.id))
    const targetColumn = board.columns.find((c) => c.status === targetStatus)
    const overIndex = overIsCard
      ? (targetColumn?.jobs.findIndex((j) => j.id === String(over.id)) ?? 0)
      : (targetColumn?.jobs.length ?? 0)

    const placed = moveCardToColumn(board, activeId, targetStatus, overIndex)
    setBoard(placed)

    // Compute the persisted order from the new neighbours (excluding the moved card).
    const placedColumn = placed.columns.find((c) => c.status === targetStatus)
    const finalIndex = placedColumn?.jobs.findIndex((j) => j.id === activeId) ?? 0
    const siblings = (placedColumn?.jobs ?? []).filter((j) => j.id !== activeId)
    const kanbanOrder = calculateKanbanOrder(siblings, finalIndex)

    const before = snapshot.current
    move.mutate(
      { id: activeId, status: targetStatus, kanbanOrder },
      { onError: () => { if (before) setBoard(before) } },
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <KanbanColumn key={column.status} column={column} />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="w-72 rounded-lg border border-border bg-card p-3 shadow-lg">
            <p className="truncate text-sm font-medium">{activeCard.title}</p>
            <p className="truncate text-xs text-muted-foreground">{activeCard.company}</p>
            <div className="mt-2">
              <GhostMeter days={activeCard.ghostDays} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/components/kanban/kanban-board.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/components/kanban/kanban-board.tsx src/components/kanban/kanban-board.test.tsx
git commit -m "feat(frontend-next): KanbanBoard (@dnd-kit drag + optimistic cache moves with rollback)"
```

---

### Task 14: Generalize the JobDrawer close

**Files:**
- Modify: `frontend-next/src/components/jobs/job-drawer.tsx`
- Test: `frontend-next/src/components/jobs/job-drawer.test.tsx`

> The drawer's close currently hardcodes `/app/jobs`. Generalize it to drop only the `job` param from the current URL, so it works on `/app/dashboard` too (and preserves any future params).

- [ ] **Step 1: Write the failing test**

Create `src/components/jobs/job-drawer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/app/dashboard',
  useSearchParams: () => new URLSearchParams('job=j1'),
}))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ id: 'j1', title: 'Role', company: 'Acme', status: 'APPLIED', ghostDays: 0, notes: null, snapshotMarkdown: null, sourceUrl: null, location: null, salaryRange: null }), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { JobDrawer } from './job-drawer'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('JobDrawer', () => {
  it('closes back to the current page without the job param', async () => {
    render(<JobDrawer jobId="j1" />, { wrapper })
    await userEvent.keyboard('{Escape}')
    expect(push).toHaveBeenCalledWith('/app/dashboard')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/jobs/job-drawer.test.tsx`
Expected: FAIL — the current drawer pushes `/app/jobs`, not `/app/dashboard`.

- [ ] **Step 3: Update the drawer**

Replace `src/components/jobs/job-drawer.tsx` with:

```tsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useJob } from '@/hooks/use-jobs'
import { JobDetails } from './job-details'
import { JobSnapshot } from './job-snapshot'

export function JobDrawer({ jobId }: { jobId: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: job, isLoading } = useJob(jobId)
  const open = jobId !== null

  const close = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('job')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? undefined : close())}>
      <SheetContent>
        <SheetTitle className="sr-only">Job details</SheetTitle>
        <div className="space-y-6 p-6">
          {isLoading || !job ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <JobDetails job={job} onDeleted={close} />
              <div className="border-t border-border pt-5">
                <JobSnapshot markdown={job.snapshotMarkdown} sourceUrl={job.sourceUrl} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/components/jobs/job-drawer.test.tsx`
Expected: PASS (1 test). (Also confirms the Slice-2 `/app/jobs` usage still works — close drops `job` and stays on the page.)

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/components/jobs/job-drawer.tsx src/components/jobs/job-drawer.test.tsx
git commit -m "fix(frontend-next): JobDrawer close returns to the current page (reusable on dashboard)"
```

---

### Task 15: DashboardView orchestrator + page

**Files:**
- Create: `frontend-next/src/components/dashboard/dashboard-view.tsx`
- Test: `frontend-next/src/components/dashboard/dashboard-view.test.tsx`
- Modify: `frontend-next/src/app/app/dashboard/page.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/dashboard/dashboard-view.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DashboardView } from './dashboard-view'
import type { KanbanBoard } from '@/types/dashboard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

const BOARD: KanbanBoard = {
  columns: [
    { status: 'WISHLIST', jobs: [] }, { status: 'APPLIED', jobs: [] }, { status: 'INTERVIEWING', jobs: [] },
    { status: 'OFFER', jobs: [] }, { status: 'REJECTED', jobs: [] }, { status: 'ARCHIVED', jobs: [] },
  ],
  stats: { totalJobs: 0, byStatus: { WISHLIST: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 0 },
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('DashboardView', () => {
  it('renders the heading, stats, and the board columns', () => {
    render(<DashboardView initialBoard={BOARD} />, { wrapper })
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/dashboard/dashboard-view.test.tsx`
Expected: FAIL — cannot resolve `./dashboard-view`.

- [ ] **Step 3: Implement the orchestrator**

Create `src/components/dashboard/dashboard-view.tsx`:

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useKanban } from '@/hooks/use-dashboard'
import { DashboardStats } from './dashboard-stats'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { JobDrawer } from '@/components/jobs/job-drawer'
import type { KanbanBoard as Board } from '@/types/dashboard'

export function DashboardView({ initialBoard }: { initialBoard: Board }) {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job')
  const { data } = useKanban(initialBoard)
  const board = data ?? initialBoard

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <DashboardStats stats={board.stats} />
      <KanbanBoard board={board} />
      <JobDrawer jobId={jobId} />
    </section>
  )
}
```

- [ ] **Step 4: Update the page (Server Component initial fetch)**

Replace `src/app/app/dashboard/page.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import type { KanbanBoard } from '@/types/dashboard'

export const metadata: Metadata = { title: 'Dashboard' }

const EMPTY_BOARD: KanbanBoard = {
  columns: [
    { status: 'WISHLIST', jobs: [] }, { status: 'APPLIED', jobs: [] }, { status: 'INTERVIEWING', jobs: [] },
    { status: 'OFFER', jobs: [] }, { status: 'REJECTED', jobs: [] }, { status: 'ARCHIVED', jobs: [] },
  ],
  stats: { totalJobs: 0, byStatus: { WISHLIST: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 0 },
}

export default async function DashboardPage() {
  let initialBoard: KanbanBoard = EMPTY_BOARD
  try {
    initialBoard = await apiServer.get<KanbanBoard>('/api/dashboard/kanban')
  } catch {
    initialBoard = EMPTY_BOARD
  }

  // useSearchParams() in DashboardView requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <DashboardView initialBoard={initialBoard} />
    </Suspense>
  )
}
```

- [ ] **Step 5: Run test + typecheck + lint**

Run: `cd frontend-next && npx vitest run src/components/dashboard/dashboard-view.test.tsx && npm run typecheck && npm run lint`
Expected: test PASS (1); typecheck + lint exit 0.

- [ ] **Step 6: Commit**

```bash
cd frontend-next
git add src/components/dashboard/dashboard-view.tsx src/components/dashboard/dashboard-view.test.tsx src/app/app/dashboard/page.tsx
git commit -m "feat(frontend-next): DashboardView + /app/dashboard page (stats + board + drawer)"
```

---

### Task 16: Frontend full gate + production build

**Files:** none (verification)

- [ ] **Step 1: Full frontend gate**

Run: `cd frontend-next && npm run typecheck && npm run lint && npm run test`
Expected: all green (Slice 0–2 tests + the new dashboard/kanban tests).

- [ ] **Step 2: Verify the production build via Docker**

Run: `docker build --target production ./frontend-next`
Expected: build succeeds (confirms the dashboard page + `useSearchParams` Suspense boundary + `@dnd-kit` bundle).

- [ ] **Step 3: Commit (only if lint autofix changed files; otherwise skip)**

```bash
cd frontend-next
git add -A
git commit -m "chore(frontend-next): slice 3 gate green" || echo "nothing to commit"
```

---

### Task 17: End-to-end smoke + progress.md

**Files:**
- Modify: `progress.md`

- [ ] **Step 1: Rebuild the stack (adds @dnd-kit) and watch logs**

Run: `docker compose up -d --build --force-recreate --renew-anon-volumes`
Then: `docker compose logs -f backend-express` until it logs migration applied + listening.

- [ ] **Step 2: Smoke the dashboard contract through the proxy**

```bash
# Register (or log in) to get cookies
curl -s -c /tmp/jv.cookies -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke","email":"smoke-s3@example.com","password":"longenough"}' | head -c 200; echo
# Create two jobs
curl -s -b /tmp/jv.cookies -X POST http://localhost:8080/api/jobs -H 'Content-Type: application/json' -d '{"title":"A","company":"Acme","status":"APPLIED"}' -o /dev/null
curl -s -b /tmp/jv.cookies -X POST http://localhost:8080/api/jobs -H 'Content-Type: application/json' -d '{"title":"B","company":"Globex","status":"WISHLIST"}' -o /dev/null
# Kanban (expect 6 columns + stats; ghostDays derived = 0 for fresh jobs)
curl -s -b /tmp/jv.cookies http://localhost:8080/api/dashboard/kanban | head -c 600; echo
# Stats (expect totalJobs 2, byStatus.APPLIED 1)
curl -s -b /tmp/jv.cookies http://localhost:8080/api/dashboard/stats | head -c 300; echo
```
Expected: kanban → `{ "data": { "columns": [6…], "stats": { "totalJobs": 2, … } } }` with the APPLIED column holding job A; stats → `byStatus.APPLIED = 1`, `byStatus.WISHLIST = 1`.

- [ ] **Step 3: Browser smoke (manual checklist)**

Open `http://localhost:8080/app/dashboard`, signed in:
- [ ] Sidebar shows **Dashboard** active; the page shows the 5 stat cards + 6 columns.
- [ ] **Drag a card** to another column → it moves and stays after a refresh (persisted via `/move`).
- [ ] **Reorder** within a column → order persists after refresh.
- [ ] **Click a card** → the drawer opens on the dashboard (`/app/dashboard?job=…`); changing status there updates the board; **Back**/close returns to `/app/dashboard` with no `?job`.
- [ ] Toggle dark mode — board, cards, columns, stats, drawer all read correctly.

- [ ] **Step 4: Update progress.md**

Add a Slice 3 section after the Slice 2 section (mirror its formatting):

```markdown
## Migration Slice 3 — Dashboard & Kanban (NEW)

> **Plan**: `docs/superpowers/plans/2026-06-02-slice-3-dashboard-kanban.md`
> **Spec**: `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md` (§9 Slice 3 resolutions)
> **Decisions**: dedicated `/api/dashboard/kanban`+`/stats` (because `/api/jobs` is paginated); fractional-float `kanbanOrder` on drop; `@dnd-kit` + optimistic `useMoveJob` (snapshot rollback); ghost-days **derived live** from `lastActivityAt`; reuse the JobDrawer on the dashboard; ViewToggle deferred to Slice 5.

### Backend (`backend-express`)
- [x] `dashboard` module: query schema + response types, pure ghost-derivation helpers, repository (all user jobs, kanbanOrder order), service (grouping + derived-ghost stats), controller/router under `/api/dashboard`
- [x] `GET /api/dashboard/kanban` (6 columns + filtered stats) and `GET /api/dashboard/stats` (global) — user-scoped, auth-guarded
- [x] HTTP integration tests (Supertest) + real-DB repository test

### Frontend (`frontend-next`)
- [x] `@dnd-kit` installed; dashboard types + shared query keys; pure kanban helpers (`lib/kanban.ts`) — unit tested
- [x] `use-dashboard` (kanban query + optimistic `useMoveJob`); job edits/deletes also refresh the board
- [x] StatCard + DashboardStats (5 cards); sortable KanbanCard, droppable KanbanColumn, KanbanBoard (drag + rollback)
- [x] JobDrawer close generalized to the current page (reused on the dashboard via `?job=`)
- [x] DashboardView + `/app/dashboard` page (SSR initial board, Suspense)

### Verification
- [x] Backend: typecheck + lint + test — all green
- [x] Frontend: typecheck + lint + test + Docker production build — all green
- [x] End-to-end smoke on the Docker stack: kanban/stats endpoints; drag-move persists; card → dashboard drawer
- [ ] **Note — ghost-days derived live; move events don't write timeline entries yet** (timeline auto-events land in Slice 4).
```

- [ ] **Step 5: Commit**

```bash
git add progress.md
git commit -m "docs(progress): mark Slice 3 (Dashboard & Kanban) complete"
```

---

## Self-Review (run before handing off to execution)

- **Spec coverage** — Slice 3 row "Express kanban/stats; KanbanBoard (@dnd-kit), KanbanColumn, KanbanCard, GhostMeter, DashboardStats, ViewToggle, optimistic moves": kanban/stats endpoints (Tasks 1–5); KanbanBoard/Column/Card (11–13); GhostMeter reused; DashboardStats (10); optimistic moves (9 + 13). ViewToggle **deferred to Slice 5** per the resolution. ✅ All §9 resolutions honored (dedicated endpoints, fractional float, derived ghost, drawer reuse).
- **Contract parity** — endpoints/shapes match the NestJS reference, adapted to derive ghost-days; 6 always-present columns, fixed order, cards sorted by `kanbanOrder`; `{data}` envelope.
- **Type consistency** — `KanbanCard`/`KanbanColumn`/`KanbanBoard`/`DashboardStats` shared shape (backend `Date`, frontend `string`); `DASHBOARD_KANBAN_KEY` single-sourced in `lib/query-keys.ts` and used by `use-dashboard` + `use-jobs`; `JOB_STATUSES`/`STATUS_META` reused; `calculateKanbanOrder`/`findCard`/`moveCardToColumn` signatures consistent across `lib/kanban.ts` and `kanban-board.tsx`.
- **Strict-mode** — array access guarded (`siblings[0] ?? …`, `?.`); optionals assigned conditionally (`filters.search` build in the service); `req.query as unknown as DashboardQueryInput`; `isStatus` type guard avoids unsafe casts.
- **No placeholders** — every code/test step is complete and runnable.

---

## Execution notes

- Backend Tasks 1–5 are independent of frontend Tasks 6–16 and can run in either order, but land the backend first so the smoke (Task 17) has live endpoints.
- The drag interactions are validated by the manual browser smoke (Task 17); the automated tests cover the **pure move math** (`lib/kanban.ts`), the hooks, and that components render from data — the realistic line for `@dnd-kit` in jsdom.
- Don't run two `next build`/`vitest` in the same dir concurrently (they race on `.next`/caches).
- Repository tests (Task 3) and the smoke (Task 17) require the Docker Postgres / full stack.
