# Timeline + Auto-Events Implementation Plan (Slice 4a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-job activity Timeline (system `AUTO` events + user `MANUAL` notes) — a `timeline` backend module (GET/POST under `/api/jobs/:jobId/timeline`), auto-events emitted by `jobs.service` on create/status-change, and a Timeline section inside the URL-driven `JobDrawer`.

**Architecture:** A new `timeline_events` table (uuid PK, `userId`/`jobId` FKs cascade-delete, `type` enum `AUTO|MANUAL`, `title`, nullable `description`) backs a standard router→controller→service→repository→schema module. The job-scoped routes mount on a `Router({ mergeParams: true })` so the controller reads `jobId` from `req.params`. Ownership is verified by delegating to `jobsRepository.findById`; manual creates bump the job's `lastActivityAt` by re-running `jobsRepository.update` with an empty patch (which already refreshes `lastActivityAt`). Auto-events are centralized in `jobs.service` as follow-on writes wrapped in try/catch (the job mutation is the source of truth and must never roll back on a timeline write failure). The frontend adds a `useTimeline`/`useAddTimelineEntry` hook pair and four presentational components, wired below `JobSnapshot` in the drawer.

**Tech Stack:** Backend — Express 5, Drizzle ORM (PostgreSQL 16), Zod, Pino, Vitest + Supertest, strict TS NodeNext (relative imports end in `.js`, `@/` → `src/`). Frontend — Next.js 15 App Router, React 19, TanStack Query v5, Tailwind v4, lucide-react, Vitest + React Testing Library (`globals: false`).

---

## File Structure

**Backend (`backend-express/`)**
- `src/db/schema/timeline.ts` — **Create.** `TIMELINE_EVENT_TYPES` const, `timelineEventTypeEnum` pgEnum, `timeline_events` pgTable, `TimelineEventRow`/`NewTimelineEventRow` inferred types.
- `src/db/schema/index.ts` — **Modify.** Add `export * from './timeline.js'`.
- `src/db/migrations/0002_*.sql` (+ `meta/`) — **Create (generated).** Drizzle migration for the enum + table.
- `src/modules/timeline/timeline.schema.ts` — **Create.** `CreateTimelineEntrySchema` Zod + `CreateTimelineEntryInput` type.
- `src/modules/timeline/timeline.repository.ts` — **Create.** `findByJob`, `create` (returns plain rows).
- `src/modules/timeline/timeline.repository.test.ts` — **Create.** Real-Postgres integration test.
- `src/modules/timeline/timeline.service.ts` — **Create.** `list`, `addManualEntry`, `addAutoEntry` (ownership + lastActivityAt bump logic).
- `src/modules/timeline/timeline.service.test.ts` — **Create.** Service unit test (mocked repos).
- `src/modules/timeline/timeline.controller.ts` — **Create.** `list`, `create` (reads `jobId` from params, `userId` from `req.user`).
- `src/modules/timeline/timeline.router.ts` — **Create.** `Router({ mergeParams: true })` + auth + validate.
- `src/modules/timeline/timeline.router.test.ts` — **Create.** Supertest HTTP test (mocked repos).
- `src/shared/api-router.ts` — **Modify.** Mount `timelineRouter` at `/jobs/:jobId/timeline`.
- `src/modules/jobs/jobs.service.ts` — **Modify.** Emit auto-events on create/status-change in `create`/`update`/`move`.
- `src/modules/jobs/jobs.service.test.ts` — **Modify.** Mock the timeline service; assert auto-event calls.
- `src/modules/jobs/jobs.router.test.ts` — **Modify.** Mock the timeline service; keep existing assertions green.

**Frontend (`frontend-next/`)**
- `src/types/timeline.ts` — **Create.** `TimelineEvent` interface.
- `src/lib/query-keys.ts` — **Modify.** Add `TIMELINE` base + `timelineKey(jobId)`.
- `src/lib/relative-time.ts` — **Create.** `relativeTime(iso)` helper (no new dependency).
- `src/lib/relative-time.test.ts` — **Create.** Unit test for the helper.
- `src/hooks/use-timeline.ts` — **Create.** `useTimeline`, `useAddTimelineEntry`.
- `src/hooks/use-timeline.test.tsx` — **Create.** Hook tests (mocked api-client).
- `src/components/jobs/timeline/timeline-entry.tsx` — **Create.** One event row (AUTO vs MANUAL icon/treatment + relative time).
- `src/components/jobs/timeline/timeline-entry.test.tsx` — **Create.** AUTO vs MANUAL render test.
- `src/components/jobs/timeline/timeline-list.tsx` — **Create.** Ordered list of `TimelineEntry`.
- `src/components/jobs/timeline/timeline-add-form.tsx` — **Create.** Manual-add form (title required, optional description).
- `src/components/jobs/timeline/timeline-add-form.test.tsx` — **Create.** Submit-calls-mutation test.
- `src/components/jobs/timeline/timeline-section.tsx` — **Create.** Fetches via `useTimeline`; renders list + add form + empty/loading states.
- `src/components/jobs/job-drawer.tsx` — **Modify.** Add bordered `<TimelineSection jobId={job.id} />` below `JobSnapshot`.

---

## Tasks

### Task 1: Timeline Drizzle schema + barrel export

**Files:**
- Create: `backend-express/src/db/schema/timeline.ts`
- Modify: `backend-express/src/db/schema/index.ts`

- [ ] **Step 1: Implement the schema file.** Mirror `jobs.ts` exactly — the `const … as const` single-source enum, `pgEnum`, `pgTable` with `timestamp({ withTimezone: true })`, `references(() => …, { onDelete: 'cascade' })`, and `index(...)` calls. Create `backend-express/src/db/schema/timeline.ts`:

```ts
import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'

// AUTO events are emitted by jobs.service on create/status-change; MANUAL events
// are user-authored notes. Single source of truth for both the Postgres enum and
// the Zod request schema (imported by timeline.schema.ts).
export const TIMELINE_EVENT_TYPES = ['AUTO', 'MANUAL'] as const

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number]

export const timelineEventTypeEnum = pgEnum('timeline_event_type', TIMELINE_EVENT_TYPES)

export const timelineEvents = pgTable(
  'timeline_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    type: timelineEventTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
  },
  (t) => [
    index('idx_timeline_events_user_id').on(t.userId),
    index('idx_timeline_events_job_id').on(t.jobId),
  ],
)

export type TimelineEventRow = typeof timelineEvents.$inferSelect
export type NewTimelineEventRow = typeof timelineEvents.$inferInsert
```

- [ ] **Step 2: Add the barrel export.** Edit `backend-express/src/db/schema/index.ts` so it reads:

```ts
// Drizzle schema barrel — one re-export per table.
export * from './users.js'
export * from './jobs.js'
export * from './timeline.js'
```

- [ ] **Step 3: Typecheck.** Run `cd backend-express && npm run typecheck` — expect no errors.

- [ ] **Step 4: Commit.**
```bash
cd backend-express
git add src/db/schema/timeline.ts src/db/schema/index.ts
git commit -m "feat(backend-express): add timeline_events Drizzle schema"
```

---

### Task 2: Generate the timeline migration

**Files:**
- Create: `backend-express/src/db/migrations/0002_*.sql` (+ `meta/` snapshot updates)

> The host may lack a Postgres on `:5433`; `db:generate` is a static SQL generator (no DB needed) but prefer the Docker stack. The backend container auto-applies `db:migrate` on (re)start.

- [ ] **Step 1: Generate the migration via the Docker stack.** Run:
```bash
docker compose exec backend-express npm run db:generate
```
Expect a new `src/db/migrations/0002_<random_name>.sql` containing `CREATE TYPE "public"."timeline_event_type" AS ENUM('AUTO', 'MANUAL');`, `CREATE TABLE "timeline_events" (...)`, the two FK `ADD CONSTRAINT` lines (`ON DELETE cascade`), and `CREATE INDEX "idx_timeline_events_user_id"` / `idx_timeline_events_job_id`.

- [ ] **Step 2: Apply the migration.** Restart the backend so it runs `db:migrate`, then confirm:
```bash
docker compose restart backend-express
docker compose logs --tail=40 backend-express
```
Expect the log to show the migration applied with no error.

- [ ] **Step 3: Verify the file landed.** Run `ls backend-express/src/db/migrations/` — expect a `0002_*.sql` file alongside `0000`/`0001`.

- [ ] **Step 4: Commit.**
```bash
cd backend-express
git add src/db/migrations
git commit -m "chore(backend-express): generate timeline_events migration"
```

---

### Task 3: Timeline Zod schema

**Files:**
- Create: `backend-express/src/modules/timeline/timeline.schema.ts`

- [ ] **Step 1: Implement the schema.** Mirror `jobs.schema.ts` (Zod object + inferred type export). Create `backend-express/src/modules/timeline/timeline.schema.ts`:

```ts
import { z } from 'zod'

export const CreateTimelineEntrySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
})

export type CreateTimelineEntryInput = z.infer<typeof CreateTimelineEntrySchema>
```

- [ ] **Step 2: Typecheck.** Run `cd backend-express && npm run typecheck` — expect no errors.

- [ ] **Step 3: Commit.**
```bash
cd backend-express
git add src/modules/timeline/timeline.schema.ts
git commit -m "feat(backend-express): add timeline create schema"
```

---

### Task 4: Timeline repository (real-DB integration test first)

**Files:**
- Create: `backend-express/src/modules/timeline/timeline.repository.test.ts`
- Create: `backend-express/src/modules/timeline/timeline.repository.ts`

- [ ] **Step 1: Write the failing test.** Follow the exact `beforeAll`/`afterAll` seed pattern from `jobs.repository.test.ts` (real Postgres, never mock Drizzle; seed a user + a job; clean up + `closeDb()`). Create `backend-express/src/modules/timeline/timeline.repository.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { timelineEvents } from '@/db/schema/timeline.js'
import { timelineRepository } from './timeline.repository.js'

const EMAIL = `timeline-repo-${Date.now()}@example.com`
let userId: string
let jobId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb()
    .insert(users)
    .values({ name: 'Repo', email: EMAIL, passwordHash: 'h' })
    .returning()
  const user = userRows[0]
  if (!user) throw new Error('failed to seed user')
  userId = user.id
  const jobRows = await getDb()
    .insert(jobs)
    .values({ userId, title: 'SWE', company: 'Acme', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date() })
    .returning()
  const job = jobRows[0]
  if (!job) throw new Error('failed to seed job')
  jobId = job.id
})

afterAll(async () => {
  await getDb().delete(timelineEvents).where(eq(timelineEvents.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('timelineRepository (real DB)', () => {
  it('creates an event and returns the row', async () => {
    const row = await timelineRepository.create({
      userId,
      jobId,
      type: 'MANUAL',
      title: 'Called the recruiter',
      description: 'Left a voicemail',
    })
    expect(row.id).toBeTruthy()
    expect(row.type).toBe('MANUAL')
    expect(row.title).toBe('Called the recruiter')
    expect(row.description).toBe('Left a voicemail')
  })

  it('lists a job’s events newest-first, scoped to the job', async () => {
    const first = await timelineRepository.create({ userId, jobId, type: 'AUTO', title: 'first' })
    const second = await timelineRepository.create({ userId, jobId, type: 'AUTO', title: 'second' })
    const rows = await timelineRepository.findByJob(jobId)
    const firstIdx = rows.findIndex((r) => r.id === first.id)
    const secondIdx = rows.findIndex((r) => r.id === second.id)
    expect(secondIdx).toBeLessThan(firstIdx)
    expect(rows.every((r) => r.jobId === jobId)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.** Run `cd backend-express && npm run test -- src/modules/timeline/timeline.repository.test.ts`. Expect failure: `Failed to resolve import "./timeline.repository.js"` (module not yet created).

- [ ] **Step 3: Implement the repository.** Mirror `jobs.repository.ts` (`getDb()`, `and`/`eq`, `orderBy(desc(...))`, returns plain objects, throws on missing insert row). Create `backend-express/src/modules/timeline/timeline.repository.ts`:

```ts
import { eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { timelineEvents, type TimelineEventRow, type NewTimelineEventRow } from '@/db/schema/timeline.js'

async function findByJob(jobId: string): Promise<TimelineEventRow[]> {
  return getDb()
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.jobId, jobId))
    .orderBy(desc(timelineEvents.createdAt))
}

async function create(values: NewTimelineEventRow): Promise<TimelineEventRow> {
  const rows = await getDb().insert(timelineEvents).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

export const timelineRepository = {
  findByJob,
  create,
}
```

- [ ] **Step 4: Run it, expect PASS.** Run `cd backend-express && npm run test -- src/modules/timeline/timeline.repository.test.ts` (needs the Docker Postgres on `:5433`). Expect both tests green.

- [ ] **Step 5: Commit.**
```bash
cd backend-express
git add src/modules/timeline/timeline.repository.ts src/modules/timeline/timeline.repository.test.ts
git commit -m "feat(backend-express): add timeline repository"
```

---

### Task 5: Timeline service (unit test first)

**Files:**
- Create: `backend-express/src/modules/timeline/timeline.service.test.ts`
- Create: `backend-express/src/modules/timeline/timeline.service.ts`

The service verifies ownership for both `list` and `addManualEntry` by calling `jobsRepository.findById(userId, jobId)` (throws `AppError('NOT_FOUND', 'Job not found')` when null). `addManualEntry` then writes a `MANUAL` event and bumps activity by calling `jobsRepository.update(userId, jobId, {})` — `jobs.repository.update` already sets `lastActivityAt: new Date()` on every call, so an empty patch is a pure activity bump. `addAutoEntry` writes an `AUTO` event and does **not** bump activity (the triggering job mutation already did).

- [ ] **Step 1: Write the failing test.** Mock the repository module(s) per the convention (`vi.mock('./X.repository.js')` and the collaborator repo). Create `backend-express/src/modules/timeline/timeline.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./timeline.repository.js', () => ({
  timelineRepository: {
    findByJob: vi.fn(),
    create: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}))

import { timelineRepository } from './timeline.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { timelineService } from './timeline.service.js'
import type { TimelineEventRow } from '@/db/schema/timeline.js'
import type { JobRow } from '@/db/schema/jobs.js'

const timeline = vi.mocked(timelineRepository)
const jobs = vi.mocked(jobsRepository)

function fakeJob(over: Record<string, unknown> = {}): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'SWE', company: 'Acme',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'WISHLIST',
    kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null, ...over,
  }
}

function fakeEvent(over: Record<string, unknown> = {}): TimelineEventRow {
  return {
    id: 't1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    type: 'MANUAL', title: 'note', description: null, ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('timelineService.list', () => {
  it('throws NOT_FOUND when the job is missing or not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(timelineService.list('u1', 'missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(timeline.findByJob).not.toHaveBeenCalled()
  })

  it('returns the job’s events when owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.findByJob.mockResolvedValue([fakeEvent()])
    const rows = await timelineService.list('u1', 'j1')
    expect(jobs.findById).toHaveBeenCalledWith('u1', 'j1')
    expect(rows).toHaveLength(1)
  })
})

describe('timelineService.addManualEntry', () => {
  it('throws NOT_FOUND when the job is missing or not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(
      timelineService.addManualEntry('u1', 'missing', { title: 'hi' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(timeline.create).not.toHaveBeenCalled()
  })

  it('writes a MANUAL event and bumps lastActivityAt via an empty job update', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.create.mockResolvedValue(fakeEvent({ title: 'Called recruiter' }))
    jobs.update.mockResolvedValue(fakeJob())
    const row = await timelineService.addManualEntry('u1', 'j1', { title: 'Called recruiter', description: 'vm' })
    expect(timeline.create).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1', type: 'MANUAL', title: 'Called recruiter', description: 'vm',
    })
    expect(jobs.update).toHaveBeenCalledWith('u1', 'j1', {})
    expect(row.title).toBe('Called recruiter')
  })

  it('omits description when not provided', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.create.mockResolvedValue(fakeEvent())
    jobs.update.mockResolvedValue(fakeJob())
    await timelineService.addManualEntry('u1', 'j1', { title: 'just a title' })
    expect(timeline.create).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1', type: 'MANUAL', title: 'just a title',
    })
  })
})

describe('timelineService.addAutoEntry', () => {
  it('writes an AUTO event and does NOT bump lastActivityAt', async () => {
    timeline.create.mockResolvedValue(fakeEvent({ type: 'AUTO', title: 'Job added to vault' }))
    await timelineService.addAutoEntry({
      userId: 'u1', jobId: 'j1', title: 'Job added to vault', description: 'Added to WISHLIST column',
    })
    expect(timeline.create).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1', type: 'AUTO', title: 'Job added to vault', description: 'Added to WISHLIST column',
    })
    expect(jobs.update).not.toHaveBeenCalled()
    expect(jobs.findById).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.** Run `cd backend-express && npm run test -- src/modules/timeline/timeline.service.test.ts`. Expect failure: `Failed to resolve import "./timeline.service.js"`.

- [ ] **Step 3: Implement the service.** Mirror `jobs.service.ts` (imports `AppError`, conditional optional-field assignment). Create `backend-express/src/modules/timeline/timeline.service.ts`:

```ts
import { AppError } from '@/shared/errors.js'
import { timelineRepository } from './timeline.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import type { TimelineEventRow, NewTimelineEventRow } from '@/db/schema/timeline.js'
import type { CreateTimelineEntryInput } from './timeline.schema.js'

export interface AutoEntryInput {
  userId: string
  jobId: string
  title: string
  description?: string
}

async function assertJobOwned(userId: string, jobId: string): Promise<void> {
  const job = await jobsRepository.findById(userId, jobId)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
}

async function list(userId: string, jobId: string): Promise<TimelineEventRow[]> {
  await assertJobOwned(userId, jobId)
  return timelineRepository.findByJob(jobId)
}

async function addManualEntry(
  userId: string,
  jobId: string,
  input: CreateTimelineEntryInput,
): Promise<TimelineEventRow> {
  await assertJobOwned(userId, jobId)

  const values: NewTimelineEventRow = { userId, jobId, type: 'MANUAL', title: input.title }
  if (input.description !== undefined) values.description = input.description

  const event = await timelineRepository.create(values)
  // jobsRepository.update refreshes lastActivityAt on every call; an empty patch
  // is therefore a pure activity bump (a manual note counts as activity).
  await jobsRepository.update(userId, jobId, {})
  return event
}

async function addAutoEntry(input: AutoEntryInput): Promise<TimelineEventRow> {
  const values: NewTimelineEventRow = {
    userId: input.userId,
    jobId: input.jobId,
    type: 'AUTO',
    title: input.title,
  }
  if (input.description !== undefined) values.description = input.description
  return timelineRepository.create(values)
}

export const timelineService = { list, addManualEntry, addAutoEntry }
```

- [ ] **Step 4: Run it, expect PASS.** Run `cd backend-express && npm run test -- src/modules/timeline/timeline.service.test.ts`. Expect all green.

- [ ] **Step 5: Commit.**
```bash
cd backend-express
git add src/modules/timeline/timeline.service.ts src/modules/timeline/timeline.service.test.ts
git commit -m "feat(backend-express): add timeline service with ownership checks"
```

---

### Task 6: Timeline controller

**Files:**
- Create: `backend-express/src/modules/timeline/timeline.controller.ts`

The controller reads `userId` via `req.user.id` (guarded) and `jobId` from `req.params` — normalized exactly like `jobs.controller.paramId` because Express 5 widens `req.params` values to `string | string[]`.

- [ ] **Step 1: Implement the controller.** Create `backend-express/src/modules/timeline/timeline.controller.ts`:

```ts
import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { timelineService } from './timeline.service.js'
import type { CreateTimelineEntryInput } from './timeline.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

// Express 5's params type widens to `string | string[]`; a single `:jobId` route
// param is always a single string at runtime, so normalize it to one.
function paramJobId(req: Request): string {
  const id = req.params['jobId']
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '')
}

async function list(req: Request, res: Response): Promise<void> {
  const rows = await timelineService.list(requireUserId(req), paramJobId(req))
  res.status(200).json({ data: rows })
}

async function create(req: Request, res: Response): Promise<void> {
  const event = await timelineService.addManualEntry(
    requireUserId(req),
    paramJobId(req),
    req.body as CreateTimelineEntryInput,
  )
  res.status(201).json({ data: event })
}

export const timelineController = { list, create }
```

- [ ] **Step 2: Typecheck.** Run `cd backend-express && npm run typecheck` — expect no errors.

- [ ] **Step 3: Commit.**
```bash
cd backend-express
git add src/modules/timeline/timeline.controller.ts
git commit -m "feat(backend-express): add timeline controller"
```

---

### Task 7: Timeline router + api-router registration (HTTP test first)

**Files:**
- Create: `backend-express/src/modules/timeline/timeline.router.test.ts`
- Create: `backend-express/src/modules/timeline/timeline.router.ts`
- Modify: `backend-express/src/shared/api-router.ts`

The router is created with `Router({ mergeParams: true })` so it inherits `:jobId` from the mount point in `api-router`.

- [ ] **Step 1: Write the failing test.** Follow `jobs.router.test.ts`'s `beforeAll` env setup + cookie build exactly. Mock both repositories (the timeline service depends on `jobsRepository.findById`/`update`). Create `backend-express/src/modules/timeline/timeline.router.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { TimelineEventRow } from '@/db/schema/timeline.js'
import type { JobRow } from '@/db/schema/jobs.js'

vi.mock('./timeline.repository.js', () => ({
  timelineRepository: {
    findByJob: vi.fn(),
    create: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}))

import { timelineRepository } from './timeline.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'

const timeline = vi.mocked(timelineRepository)
const jobs = vi.mocked(jobsRepository)
let app: Express
let cookie: string

function fakeJob(over: Record<string, unknown> = {}): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'SWE', company: 'Acme',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'WISHLIST',
    kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null, ...over,
  }
}

function fakeEvent(over: Record<string, unknown> = {}): TimelineEventRow {
  return {
    id: 't1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    type: 'MANUAL', title: 'note', description: null, ...over,
  }
}

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

describe('GET /api/jobs/:jobId/timeline', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/jobs/j1/timeline')
    expect(res.status).toBe(401)
  })

  it('200s with the event list when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.findByJob.mockResolvedValue([fakeEvent()])
    const res = await request(app).get('/api/jobs/j1/timeline').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(jobs.findById).toHaveBeenCalledWith('u1', 'j1')
  })

  it('404s when the job is missing or not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    const res = await request(app).get('/api/jobs/missing/timeline').set('Cookie', [cookie])
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })
})

describe('POST /api/jobs/:jobId/timeline', () => {
  it('400s on a missing title', async () => {
    const res = await request(app).post('/api/jobs/j1/timeline').set('Cookie', [cookie]).send({ description: 'x' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('201s, creates a MANUAL event, and bumps the job', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    timeline.create.mockResolvedValue(fakeEvent({ title: 'Called recruiter' }))
    jobs.update.mockResolvedValue(fakeJob())
    const res = await request(app)
      .post('/api/jobs/j1/timeline')
      .set('Cookie', [cookie])
      .send({ title: 'Called recruiter', description: 'vm' })
    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Called recruiter')
    expect(jobs.update).toHaveBeenCalledWith('u1', 'j1', {})
  })

  it('404s when posting to a job that is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/jobs/missing/timeline')
      .set('Cookie', [cookie])
      .send({ title: 'x' })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.** Run `cd backend-express && npm run test -- src/modules/timeline/timeline.router.test.ts`. Expect failure: the routes 404 (router not mounted) / import of `timeline.router.js` fails.

- [ ] **Step 3: Implement the router.** Mirror `jobs.router.ts` but use `Router({ mergeParams: true })`. Create `backend-express/src/modules/timeline/timeline.router.ts`:

```ts
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { timelineController } from './timeline.controller.js'
import { CreateTimelineEntrySchema } from './timeline.schema.js'

// mergeParams lets this router read `:jobId` from the mount path in api-router.
const router = Router({ mergeParams: true })

router.use(authMiddleware)

router.get('/', asyncHandler(timelineController.list))
router.post('/', validate(CreateTimelineEntrySchema), asyncHandler(timelineController.create))

export { router as timelineRouter }
```

- [ ] **Step 4: Register it in api-router.** Edit `backend-express/src/shared/api-router.ts` to add the import and mount. The final file reads:

```ts
import { Router } from 'express'
import { healthRouter } from '@/modules/health/health.router.js'
import { authRouter } from '@/modules/auth/auth.router.js'
import { jobsRouter } from '@/modules/jobs/jobs.router.js'
import { dashboardRouter } from '@/modules/dashboard/dashboard.router.js'
import { timelineRouter } from '@/modules/timeline/timeline.router.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/jobs', jobsRouter)
router.use('/jobs/:jobId/timeline', timelineRouter)
router.use('/dashboard', dashboardRouter)

export { router as apiRouter }
```

- [ ] **Step 5: Run it, expect PASS.** Run `cd backend-express && npm run test -- src/modules/timeline/timeline.router.test.ts`. Expect all green.

- [ ] **Step 6: Typecheck + lint.** Run `cd backend-express && npm run typecheck && npm run lint` — expect no errors.

- [ ] **Step 7: Commit.**
```bash
cd backend-express
git add src/modules/timeline/timeline.router.ts src/modules/timeline/timeline.router.test.ts src/shared/api-router.ts
git commit -m "feat(backend-express): mount timeline router under /api/jobs/:jobId/timeline"
```

---

### Task 8: Retrofit jobs.service to emit auto-events

**Files:**
- Modify: `backend-express/src/modules/jobs/jobs.service.ts`
- Modify: `backend-express/src/modules/jobs/jobs.service.test.ts`

**Transaction-boundary rationale (state in the plan):** The auto-event is a *follow-on* write after the job mutation has already succeeded. `addAutoEntry` is wrapped in `try/catch`; on failure we log via the Pino `logger` and continue. The job mutation is the source of truth and must never roll back because a timeline write failed. To detect a status change, `update`/`move` read the current job first (`jobsRepository.findById`) to capture `oldStatus`, then compare against the post-mutation status — the repository stays pure.

- [ ] **Step 1: Write the failing test (update jobs.service.test.ts).** Add a mock of the timeline service to the existing `vi.mock` calls, capture the spy, and add assertions. Edit `backend-express/src/modules/jobs/jobs.service.test.ts`.

  First, add the timeline service mock immediately after the existing `vi.mock('./scraper.js', () => ({ scrapeUrl: vi.fn() }))` line:
```ts
vi.mock('@/modules/timeline/timeline.service.js', () => ({
  timelineService: { addAutoEntry: vi.fn() },
}))
```

  Then add the import + handle after the existing `import { scrapeUrl } from './scraper.js'` line:
```ts
import { timelineService } from '@/modules/timeline/timeline.service.js'
```
  and after the existing `const scrape = vi.mocked(scrapeUrl)` line:
```ts
const timeline = vi.mocked(timelineService)
```

  Next, replace the existing `describe('jobsService.create', ...)` block with this expanded version (keeps the original assertion, adds the auto-event assertion):
```ts
describe('jobsService.create', () => {
  it('defaults status to WISHLIST and assigns the next kanbanOrder', async () => {
    repo.nextKanbanOrder.mockResolvedValue(3)
    repo.create.mockResolvedValue(fakeJob({ kanbanOrder: 3 }))
    const job = await jobsService.create('u1', { title: 'SWE', company: 'Acme' })
    expect(repo.nextKanbanOrder).toHaveBeenCalledWith('u1', 'WISHLIST')
    const values = repo.create.mock.calls[0]?.[0] as { kanbanOrder: number; userId: string }
    expect(values.kanbanOrder).toBe(3)
    expect(values.userId).toBe('u1')
    expect(job.id).toBe('j1')
  })

  it('emits a "Job added to vault" auto-event after create', async () => {
    repo.nextKanbanOrder.mockResolvedValue(1)
    repo.create.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    await jobsService.create('u1', { title: 'SWE', company: 'Acme' })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1',
      jobId: 'j1',
      title: 'Job added to vault',
      description: 'Added to WISHLIST column',
    })
  })
})
```

  Then replace the existing `describe('jobsService.update / move / remove', ...)` block with this expanded version (keeps the three original NOT_FOUND assertions, mocks `findById`, and adds status-change auto-event coverage):
```ts
describe('jobsService.update / move / remove', () => {
  it('throws NOT_FOUND from update when repo returns null', async () => {
    repo.findById.mockResolvedValue(fakeJob())
    repo.update.mockResolvedValue(null)
    await expect(jobsService.update('u1', 'x', { title: 'y' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('throws NOT_FOUND from move when repo returns null', async () => {
    repo.findById.mockResolvedValue(fakeJob())
    repo.move.mockResolvedValue(null)
    await expect(jobsService.move('u1', 'x', { status: 'OFFER', kanbanOrder: 1 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
  it('throws NOT_FOUND from remove when repo returns false', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(jobsService.remove('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('emits a status-change auto-event from update when status differs', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    repo.update.mockResolvedValue(fakeJob({ status: 'APPLIED' }))
    await jobsService.update('u1', 'j1', { status: 'APPLIED' })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1',
      jobId: 'j1',
      title: 'Status changed to APPLIED',
      description: 'Moved from WISHLIST to APPLIED',
    })
  })

  it('does NOT emit an auto-event from update when status is unchanged', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    repo.update.mockResolvedValue(fakeJob({ status: 'WISHLIST', title: 'Renamed' }))
    await jobsService.update('u1', 'j1', { title: 'Renamed' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })

  it('emits a status-change auto-event from move when status differs', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    repo.move.mockResolvedValue(fakeJob({ status: 'OFFER', kanbanOrder: 3 }))
    await jobsService.move('u1', 'j1', { status: 'OFFER', kanbanOrder: 3 })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1',
      jobId: 'j1',
      title: 'Status changed to OFFER',
      description: 'Moved from WISHLIST to OFFER',
    })
  })

  it('does NOT emit an auto-event from move when status is unchanged', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'OFFER' }))
    repo.move.mockResolvedValue(fakeJob({ status: 'OFFER', kanbanOrder: 9 }))
    await jobsService.move('u1', 'j1', { status: 'OFFER', kanbanOrder: 9 })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it, expect FAIL (red).** Run `cd backend-express && npm run test -- src/modules/jobs/jobs.service.test.ts`. The new RED assertions are precisely:
  - **create** → `timeline.addAutoEntry` must be called once with `{ userId: 'u1', jobId: 'j1', title: 'Job added to vault', description: 'Added to WISHLIST column' }`.
  - **update with a differing status** → called with `{ userId: 'u1', jobId: 'j1', title: 'Status changed to APPLIED', description: 'Moved from WISHLIST to APPLIED' }`.
  - **update with an unchanged status** → `timeline.addAutoEntry` must **NOT** be called.
  - **move with a differing status** → called with `{ userId: 'u1', jobId: 'j1', title: 'Status changed to OFFER', description: 'Moved from WISHLIST to OFFER' }`.
  - **move with an unchanged status** → `timeline.addAutoEntry` must **NOT** be called.

  All five new assertions fail now (the service does not yet import/call `timelineService`); the three original `update`/`move` NOT_FOUND tests still pass (since `repo.update`/`repo.move` return null before any status compare). Because `jobs.service.test.ts` already declares `vi.mock('@/modules/timeline/timeline.service.js', …)` and `repo.findById` is mocked to return `fakeJob`, **no real timeline module (and therefore no `getDb`) is ever imported** by this suite.

- [ ] **Step 3: Implement the retrofit.** Edit `backend-express/src/modules/jobs/jobs.service.ts` to import the logger + timeline service, add a private `emitAutoEntry` helper (the try/catch wrapper), and update `create`/`update`/`move`. The final file reads:

```ts
import { AppError } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'
import { jobsRepository } from './jobs.repository.js'
import { timelineService } from '@/modules/timeline/timeline.service.js'
import { scrapeUrl, type ScrapeResult } from './scraper.js'
import type { JobRow, NewJobRow } from '@/db/schema/jobs.js'
import type { CreateJobInput, UpdateJobInput, MoveJobInput, JobQueryInput } from './jobs.schema.js'

// The auto-event is a follow-on write after the job mutation has already
// committed. The job mutation is the source of truth, so a timeline write
// failure is logged and swallowed — it must never roll back the mutation.
async function emitAutoEntry(entry: {
  userId: string
  jobId: string
  title: string
  description?: string
}): Promise<void> {
  try {
    await timelineService.addAutoEntry(entry)
  } catch (err) {
    logger.error({ err, jobId: entry.jobId }, 'failed to write timeline auto-event')
  }
}

async function create(userId: string, input: CreateJobInput): Promise<JobRow> {
  const status = input.status ?? 'WISHLIST'
  const kanbanOrder = await jobsRepository.nextKanbanOrder(userId, status)

  const values: NewJobRow = {
    userId,
    title: input.title,
    company: input.company,
    status,
    kanbanOrder,
    lastActivityAt: new Date(),
  }
  if (input.location !== undefined) values.location = input.location
  if (input.salaryRange !== undefined) values.salaryRange = input.salaryRange
  if (input.sourceUrl !== undefined) values.sourceUrl = input.sourceUrl
  if (input.snapshotMarkdown !== undefined) values.snapshotMarkdown = input.snapshotMarkdown
  if (input.notes !== undefined) values.notes = input.notes

  const job = await jobsRepository.create(values)
  await emitAutoEntry({
    userId,
    jobId: job.id,
    title: 'Job added to vault',
    description: `Added to ${job.status} column`,
  })
  return job
}

async function list(
  userId: string,
  query: JobQueryInput,
): Promise<{ rows: JobRow[]; total: number; page: number; limit: number }> {
  const { rows, total } = await jobsRepository.findAll(userId, query)
  return { rows, total, page: query.page, limit: query.limit }
}

async function get(userId: string, id: string): Promise<JobRow> {
  const job = await jobsRepository.findById(userId, id)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
  return job
}

async function update(userId: string, id: string, input: UpdateJobInput): Promise<JobRow> {
  // Read the current status first so we can detect a status change after the
  // repo update (the repository stays pure — it never reads the prior row).
  const current = await jobsRepository.findById(userId, id)
  const oldStatus = current?.status

  const job = await jobsRepository.update(userId, id, input)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')

  if (input.status !== undefined && oldStatus !== undefined && input.status !== oldStatus) {
    await emitAutoEntry({
      userId,
      jobId: job.id,
      title: `Status changed to ${job.status}`,
      description: `Moved from ${oldStatus} to ${job.status}`,
    })
  }
  return job
}

async function move(userId: string, id: string, input: MoveJobInput): Promise<JobRow> {
  const current = await jobsRepository.findById(userId, id)
  const oldStatus = current?.status

  const job = await jobsRepository.move(userId, id, input.status, input.kanbanOrder)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')

  if (oldStatus !== undefined && input.status !== oldStatus) {
    await emitAutoEntry({
      userId,
      jobId: job.id,
      title: `Status changed to ${job.status}`,
      description: `Moved from ${oldStatus} to ${job.status}`,
    })
  }
  return job
}

async function remove(userId: string, id: string): Promise<void> {
  const ok = await jobsRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Job not found')
}

async function scrape(url: string): Promise<ScrapeResult> {
  try {
    return await scrapeUrl(url)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to scrape URL'
    throw new AppError('VALIDATION_ERROR', `Scraping failed: ${message}`, err)
  }
}

export const jobsService = { create, list, get, update, move, remove, scrape }
```

- [ ] **Step 4: Run it, expect PASS.** Run `cd backend-express && npm run test -- src/modules/jobs/jobs.service.test.ts`. Expect all green.

- [ ] **Step 5: Commit.**
```bash
cd backend-express
git add src/modules/jobs/jobs.service.ts src/modules/jobs/jobs.service.test.ts
git commit -m "feat(backend-express): emit timeline auto-events on job create + status change"
```

---

### Task 9: Update jobs.router.test.ts for the timeline-service dependency

**Files:**
- Modify: `backend-express/src/modules/jobs/jobs.router.test.ts`

`jobs.service` now imports `timelineService`, and `update`/`move` now call `jobsRepository.findById` first. The HTTP test mocks the repository, so it must also mock the timeline service and make `findById` return a job for the PATCH/move cases — otherwise `oldStatus` is `undefined` (auto-events simply won't fire, which is harmless, but mocking keeps the test explicit) and the real timeline service would be imported.

- [ ] **Step 1: Write the failing test (extend jobs.router.test.ts).** Add the timeline-service mock immediately after the existing `vi.mock('./scraper.js', () => ({ scrapeUrl: vi.fn() }))` line:
```ts
vi.mock('@/modules/timeline/timeline.service.js', () => ({
  timelineService: { addAutoEntry: vi.fn() },
}))
```

  Update the `PATCH /api/jobs/:id` "200s and returns the updated job" test to seed `findById` so the status-change path is exercised:
```ts
  it('200s and returns the updated job', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    repo.update.mockResolvedValue(fakeJob({ title: 'Updated' }))
    const res = await request(app).patch('/api/jobs/j1').set('Cookie', [cookie]).send({ title: 'Updated' })
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Updated')
  })
```

  Update the `PATCH /api/jobs/:id/move` "200s and returns the moved job" test similarly:
```ts
  it('200s and returns the moved job', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    repo.move.mockResolvedValue(fakeJob({ status: 'OFFER', kanbanOrder: 3 }))
    const res = await request(app)
      .patch('/api/jobs/j1/move')
      .set('Cookie', [cookie])
      .send({ status: 'OFFER', kanbanOrder: 3 })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('OFFER')
  })
```

  Add a new assertion at the end of the `PATCH /api/jobs/:id/move` describe block (before its closing `})`) confirming the auto-event reaches the timeline service via the HTTP path:
```ts
  it('triggers the status-change auto-event through the service', async () => {
    repo.findById.mockResolvedValue(fakeJob({ status: 'WISHLIST' }))
    repo.move.mockResolvedValue(fakeJob({ status: 'OFFER', kanbanOrder: 3 }))
    const { timelineService } = await import('@/modules/timeline/timeline.service.js')
    await request(app)
      .patch('/api/jobs/j1/move')
      .set('Cookie', [cookie])
      .send({ status: 'OFFER', kanbanOrder: 3 })
    expect(vi.mocked(timelineService.addAutoEntry)).toHaveBeenCalledWith({
      userId: 'u1',
      jobId: 'j1',
      title: 'Status changed to OFFER',
      description: 'Moved from WISHLIST to OFFER',
    })
  })
```

- [ ] **Step 2: Run it, expect FAIL/PASS check.** Run `cd backend-express && npm run test -- src/modules/jobs/jobs.router.test.ts`. The new `addAutoEntry` assertion fails only if the mock/wiring is wrong; with the mock added it should pass. If it fails because the timeline mock is missing, that confirms the test now exercises the dependency. Resolve by ensuring the `vi.mock` from Step 1 is present, then re-run.

- [ ] **Step 3: Run the full backend suite (green checkpoint).** Run `cd backend-express && npm run test`. Expect **every** file green (timeline + jobs + dashboard + auth) — confirming the timeline-service retrofit kept the whole suite passing, not just the two jobs test files. Then `npm run typecheck && npm run lint`.

  Confirm no unit/HTTP test pulls in the **real** timeline module (which would open a real `getDb` connection): both `jobs.service.test.ts` and `jobs.router.test.ts` declare `vi.mock('@/modules/timeline/timeline.service.js', …)`, so the only test files that import the real `timeline.repository`/`getDb` are the repository integration test (`timeline.repository.test.ts`, which is supposed to hit real Postgres). Verify with:
```bash
cd backend-express
grep -rl "timeline.repository.js\|getDb" src/modules/jobs && echo "UNEXPECTED: jobs tests reference the real timeline repo/getDb" || echo "OK: jobs tests never import the real timeline repository or getDb"
grep -rL "vi.mock('@/modules/timeline/timeline.service.js'" src/modules/jobs/jobs.service.test.ts src/modules/jobs/jobs.router.test.ts && echo "UNEXPECTED: a jobs test is missing the timeline-service mock" || echo "OK: both jobs tests mock the timeline service"
```
  Expect both checks to print their `OK:` line.

- [ ] **Step 4: Commit.**
```bash
cd backend-express
git add src/modules/jobs/jobs.router.test.ts
git commit -m "test(backend-express): cover timeline auto-event through the jobs HTTP path"
```

---

### Task 10: Frontend timeline type + query key

**Files:**
- Create: `frontend-next/src/types/timeline.ts`
- Modify: `frontend-next/src/lib/query-keys.ts`

- [ ] **Step 1: Create the type.** Mirror `types/job.ts` (timestamps are ISO strings over the wire). Create `frontend-next/src/types/timeline.ts`:

```ts
export interface TimelineEvent {
  id: string
  jobId: string
  userId: string
  type: 'AUTO' | 'MANUAL'
  title: string
  description: string | null
  createdAt: string
}
```

- [ ] **Step 2: Add the query keys.** Edit `frontend-next/src/lib/query-keys.ts` to add the timeline base + factory. The final file reads:

```ts
export const JOBS_KEY = ['jobs'] as const
export const jobKey = (id: string) => ['jobs', id] as const
export const DASHBOARD_KANBAN_KEY = ['dashboard', 'kanban'] as const
export const DASHBOARD_STATS_KEY = ['dashboard', 'stats'] as const
export const TIMELINE_KEY = ['timeline'] as const
export const timelineKey = (jobId: string) => ['timeline', jobId] as const
```

- [ ] **Step 3: Typecheck.** Run `cd frontend-next && npm run typecheck` — expect no errors.

- [ ] **Step 4: Commit.**
```bash
cd frontend-next
git add src/types/timeline.ts src/lib/query-keys.ts
git commit -m "feat(frontend-next): add timeline type and query keys"
```

---

### Task 11: Relative-time helper

**Files:**
- Create: `frontend-next/src/lib/relative-time.test.ts`
- Create: `frontend-next/src/lib/relative-time.ts`

No `date-fns` dependency exists; this is a tiny `Intl.RelativeTimeFormat`-based helper so `TimelineEntry` can render "2h ago" without adding a package.

- [ ] **Step 1: Write the failing test.** Create `frontend-next/src/lib/relative-time.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { relativeTime } from './relative-time'

describe('relativeTime', () => {
  const now = new Date('2026-06-03T12:00:00.000Z')

  it('renders "just now" for under a minute', () => {
    expect(relativeTime('2026-06-03T11:59:30.000Z', now)).toBe('just now')
  })

  it('renders minutes', () => {
    expect(relativeTime('2026-06-03T11:45:00.000Z', now)).toBe('15 minutes ago')
  })

  it('renders hours', () => {
    expect(relativeTime('2026-06-03T09:00:00.000Z', now)).toBe('3 hours ago')
  })

  it('renders days', () => {
    expect(relativeTime('2026-06-01T12:00:00.000Z', now)).toBe('2 days ago')
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.** Run `cd frontend-next && npm run test -- src/lib/relative-time.test.ts`. Expect failure: `Failed to resolve import "./relative-time"`.

- [ ] **Step 3: Implement the helper.** Create `frontend-next/src/lib/relative-time.ts`:

```ts
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'always' })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// Renders an ISO timestamp as a coarse relative string (e.g. "3 hours ago").
// `now` is injectable so tests are deterministic.
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime()
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour')
  return rtf.format(-Math.floor(diff / DAY), 'day')
}
```

- [ ] **Step 4: Run it, expect PASS.** Run `cd frontend-next && npm run test -- src/lib/relative-time.test.ts`. Expect all green.

- [ ] **Step 5: Commit.**
```bash
cd frontend-next
git add src/lib/relative-time.ts src/lib/relative-time.test.ts
git commit -m "feat(frontend-next): add relative-time helper"
```

---

### Task 12: useTimeline / useAddTimelineEntry hooks

**Files:**
- Create: `frontend-next/src/hooks/use-timeline.test.tsx`
- Create: `frontend-next/src/hooks/use-timeline.ts`

`useAddTimelineEntry` is **optimistic**: `onMutate` cancels in-flight `timelineKey(jobId)` queries, snapshots the previous list, and prepends a synthesized `MANUAL` event so the note appears instantly; `onError` rolls back from the snapshot. On settle it invalidates **all five** keys — `timelineKey(jobId)` (the list), `jobKey(jobId)` + `JOBS_KEY`, **and** `DASHBOARD_KANBAN_KEY` + `DASHBOARD_STATS_KEY` — because a manual entry bumps the job's `lastActivityAt`, and the kanban/stats derive ghost-days **live** from it (mirroring the established "every job-mutating write refreshes jobs+kanban+stats" convention in `use-jobs.ts`).

- [ ] **Step 1: Write the failing test.** Follow `use-jobs.test.tsx` exactly (the api-client mock shape, the `wrapper`, and the `spiedClient` invalidation spy). Create `frontend-next/src/hooks/use-timeline.test.tsx`:

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
import { useTimeline, useAddTimelineEntry } from './use-timeline'
import {
  JOBS_KEY,
  jobKey,
  timelineKey,
  DASHBOARD_KANBAN_KEY,
  DASHBOARD_STATS_KEY,
} from '@/lib/query-keys'
import type { TimelineEvent } from '@/types/timeline'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function spiedClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, Wrapper, invalidate }
}

beforeEach(() => vi.clearAllMocks())

describe('useTimeline', () => {
  it('fetches a job’s timeline from /api/jobs/:id/timeline', async () => {
    api.get.mockResolvedValue([{ id: 't1', type: 'AUTO', title: 'Job added to vault' }])
    const { result } = renderHook(() => useTimeline('j1'), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.id).toBe('t1'))
    expect(api.get).toHaveBeenCalledWith('/api/jobs/j1/timeline')
  })

  it('is disabled when jobId is null', () => {
    const { result } = renderHook(() => useTimeline(null), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(api.get).not.toHaveBeenCalled()
  })
})

describe('useAddTimelineEntry', () => {
  it('posts the entry to /api/jobs/:id/timeline', async () => {
    api.post.mockResolvedValue({ id: 't2', type: 'MANUAL', title: 'Called recruiter' })
    const { result } = renderHook(() => useAddTimelineEntry('j1'), { wrapper })
    result.current.mutate({ title: 'Called recruiter', description: 'vm' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/timeline', { title: 'Called recruiter', description: 'vm' })
  })

  it('optimistically prepends the entry to the cache before the request resolves', async () => {
    // Hold the POST open so we can observe the cache mid-flight (before settle).
    let resolvePost: (value: TimelineEvent) => void = () => {}
    api.post.mockImplementation(
      () =>
        new Promise<TimelineEvent>((resolve) => {
          resolvePost = resolve
        }),
    )
    const { client, Wrapper } = spiedClient()
    // Seed an existing event so we can assert the optimistic one lands in front.
    client.setQueryData<TimelineEvent[]>(timelineKey('j1'), [
      {
        id: 't-existing',
        jobId: 'j1',
        userId: 'u1',
        type: 'AUTO',
        title: 'Job added to vault',
        description: null,
        createdAt: '2026-06-03T11:00:00.000Z',
      },
    ])
    const { result } = renderHook(() => useAddTimelineEntry('j1'), { wrapper: Wrapper })
    result.current.mutate({ title: 'Called recruiter', description: 'vm' })

    await waitFor(() => {
      const cached = client.getQueryData<TimelineEvent[]>(timelineKey('j1'))
      expect(cached?.[0]?.title).toBe('Called recruiter')
      expect(cached?.[0]?.type).toBe('MANUAL')
      expect(cached?.[0]?.description).toBe('vm')
      expect(cached?.[1]?.id).toBe('t-existing')
    })

    resolvePost({ id: 't2', jobId: 'j1', userId: 'u1', type: 'MANUAL', title: 'Called recruiter', description: 'vm', createdAt: '2026-06-03T12:00:00.000Z' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('rolls the cache back to the snapshot on error', async () => {
    api.post.mockRejectedValue(new Error('boom'))
    const { client, Wrapper } = spiedClient()
    const previous: TimelineEvent[] = [
      {
        id: 't-existing',
        jobId: 'j1',
        userId: 'u1',
        type: 'AUTO',
        title: 'Job added to vault',
        description: null,
        createdAt: '2026-06-03T11:00:00.000Z',
      },
    ]
    client.setQueryData<TimelineEvent[]>(timelineKey('j1'), previous)
    const { result } = renderHook(() => useAddTimelineEntry('j1'), { wrapper: Wrapper })
    result.current.mutate({ title: 'Called recruiter' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData<TimelineEvent[]>(timelineKey('j1'))).toEqual(previous)
  })

  it('invalidates the timeline, the job, the jobs list, and the dashboard on success', async () => {
    api.post.mockResolvedValue({ id: 't2', jobId: 'j1', userId: 'u1', type: 'MANUAL', title: 'note', description: null, createdAt: '2026-06-03T12:00:00.000Z' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useAddTimelineEntry('j1'), { wrapper: Wrapper })
    result.current.mutate({ title: 'note' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: timelineKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: jobKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_KANBAN_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_STATS_KEY })
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.** Run `cd frontend-next && npm run test -- src/hooks/use-timeline.test.tsx`. Expect failure: `Failed to resolve import "./use-timeline"`.

- [ ] **Step 3: Implement the hooks.** Mirror `use-jobs.ts`. Create `frontend-next/src/hooks/use-timeline.ts`:

```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  JOBS_KEY,
  jobKey,
  timelineKey,
  DASHBOARD_KANBAN_KEY,
  DASHBOARD_STATS_KEY,
} from '@/lib/query-keys'
import type { TimelineEvent } from '@/types/timeline'

export interface AddTimelineEntryValues {
  title: string
  description?: string
}

interface AddTimelineContext {
  previous: TimelineEvent[] | undefined
}

export function useTimeline(jobId: string | null) {
  return useQuery({
    queryKey: jobId ? timelineKey(jobId) : ['timeline', '__none__'],
    queryFn: () => apiClient.get<TimelineEvent[]>(`/api/jobs/${jobId}/timeline`),
    enabled: jobId !== null,
  })
}

export function useAddTimelineEntry(jobId: string) {
  const qc = useQueryClient()
  return useMutation<TimelineEvent, Error, AddTimelineEntryValues, AddTimelineContext>({
    mutationFn: (values: AddTimelineEntryValues) =>
      apiClient.post<TimelineEvent>(`/api/jobs/${jobId}/timeline`, values),
    // Optimistic prepend: cancel in-flight refetches, snapshot the list, and show
    // the note instantly. The synthesized event uses a temp id + the current
    // moment; the real row replaces it once the invalidate-on-settle refetch lands.
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: timelineKey(jobId) })
      const previous = qc.getQueryData<TimelineEvent[]>(timelineKey(jobId))
      const optimistic: TimelineEvent = {
        id: `optimistic-${Date.now()}`,
        jobId,
        userId: '',
        type: 'MANUAL',
        title: values.title,
        description: values.description ?? null,
        createdAt: new Date().toISOString(),
      }
      qc.setQueryData<TimelineEvent[]>(timelineKey(jobId), (old) => [optimistic, ...(old ?? [])])
      return { previous }
    },
    onError: (_err, _values, context) => {
      if (context) qc.setQueryData(timelineKey(jobId), context.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: timelineKey(jobId) })
      // A manual entry bumps the job's lastActivityAt, so refresh the job, the
      // list, and the dashboard (kanban + stats derive ghost-days live from it).
      void qc.invalidateQueries({ queryKey: jobKey(jobId) })
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY })
    },
  })
}
```

- [ ] **Step 4: Run it, expect PASS.** Run `cd frontend-next && npm run test -- src/hooks/use-timeline.test.tsx`. Expect all green.

- [ ] **Step 5: Commit.**
```bash
cd frontend-next
git add src/hooks/use-timeline.ts src/hooks/use-timeline.test.tsx
git commit -m "feat(frontend-next): add useTimeline and useAddTimelineEntry hooks"
```

---

### Task 13: TimelineEntry component

**Files:**
- Create: `frontend-next/src/components/jobs/timeline/timeline-entry.test.tsx`
- Create: `frontend-next/src/components/jobs/timeline/timeline-entry.tsx`

AUTO vs MANUAL differ by icon (`Bot` vs `PencilLine`) and treatment (muted vs foreground), following the `GhostMeter` icon-map + `cn()` idiom.

- [ ] **Step 1: Write the failing test.** Create `frontend-next/src/components/jobs/timeline/timeline-entry.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineEntry } from './timeline-entry'
import type { TimelineEvent } from '@/types/timeline'

function event(over: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 't1',
    jobId: 'j1',
    userId: 'u1',
    type: 'AUTO',
    title: 'Job added to vault',
    description: 'Added to WISHLIST column',
    createdAt: new Date().toISOString(),
    ...over,
  }
}

describe('TimelineEntry', () => {
  it('renders an AUTO event with its title and description', () => {
    render(<TimelineEntry event={event()} />)
    expect(screen.getByText('Job added to vault')).toBeInTheDocument()
    expect(screen.getByText('Added to WISHLIST column')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-entry')).toHaveAttribute('data-type', 'AUTO')
  })

  it('renders a MANUAL event and omits a null description', () => {
    render(<TimelineEntry event={event({ type: 'MANUAL', title: 'Called recruiter', description: null })} />)
    expect(screen.getByText('Called recruiter')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-entry')).toHaveAttribute('data-type', 'MANUAL')
    expect(screen.queryByText('Added to WISHLIST column')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.** Run `cd frontend-next && npm run test -- src/components/jobs/timeline/timeline-entry.test.tsx`. Expect failure: `Failed to resolve import "./timeline-entry"`.

- [ ] **Step 3: Implement the component.** Create `frontend-next/src/components/jobs/timeline/timeline-entry.tsx`:

```tsx
import { Bot, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/relative-time'
import type { TimelineEvent } from '@/types/timeline'

const TYPE_ICON = {
  AUTO: Bot,
  MANUAL: PencilLine,
} as const

const TYPE_ICON_STYLES = {
  AUTO: 'text-muted-foreground',
  MANUAL: 'text-primary',
} as const

export function TimelineEntry({ event }: { event: TimelineEvent }) {
  const Icon = TYPE_ICON[event.type]
  return (
    <li data-testid="timeline-entry" data-type={event.type} className="flex gap-3">
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background',
          TYPE_ICON_STYLES[event.type],
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium leading-tight text-foreground">{event.title}</p>
          <time className="shrink-0 font-mono text-xs text-muted-foreground" dateTime={event.createdAt}>
            {relativeTime(event.createdAt)}
          </time>
        </div>
        {event.description ? <p className="text-sm text-muted-foreground">{event.description}</p> : null}
      </div>
    </li>
  )
}
```

- [ ] **Step 4: Run it, expect PASS.** Run `cd frontend-next && npm run test -- src/components/jobs/timeline/timeline-entry.test.tsx`. Expect all green.

- [ ] **Step 5: Commit.**
```bash
cd frontend-next
git add src/components/jobs/timeline/timeline-entry.tsx src/components/jobs/timeline/timeline-entry.test.tsx
git commit -m "feat(frontend-next): add TimelineEntry component"
```

---

### Task 14: TimelineList component

**Files:**
- Create: `frontend-next/src/components/jobs/timeline/timeline-list.tsx`

A thin presentational wrapper rendering `TimelineEntry` rows (events arrive already newest-first from the API). No test of its own — it is covered through `TimelineSection` in Task 16.

- [ ] **Step 1: Implement the component.** Create `frontend-next/src/components/jobs/timeline/timeline-list.tsx`:

```tsx
import { TimelineEntry } from './timeline-entry'
import type { TimelineEvent } from '@/types/timeline'

export function TimelineList({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <TimelineEntry key={event.id} event={event} />
      ))}
    </ol>
  )
}
```

- [ ] **Step 2: Typecheck.** Run `cd frontend-next && npm run typecheck` — expect no errors.

- [ ] **Step 3: Commit.**
```bash
cd frontend-next
git add src/components/jobs/timeline/timeline-list.tsx
git commit -m "feat(frontend-next): add TimelineList component"
```

---

### Task 15: TimelineAddForm component

**Files:**
- Create: `frontend-next/src/components/jobs/timeline/timeline-add-form.test.tsx`
- Create: `frontend-next/src/components/jobs/timeline/timeline-add-form.tsx`

Title is required (empty submit is blocked), description optional. On submit it calls `useAddTimelineEntry(jobId).mutate` and clears the inputs on success.

- [ ] **Step 1: Write the failing test.** Follow `manual-job-form.test.tsx` (api-client mock + QueryClient wrapper + userEvent). Create `frontend-next/src/components/jobs/timeline/timeline-add-form.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { TimelineAddForm } from './timeline-add-form'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('TimelineAddForm', () => {
  it('does not submit when the title is blank', async () => {
    render(<TimelineAddForm jobId="j1" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /add note/i }))
    expect(api.post).not.toHaveBeenCalled()
  })

  it('submits the title (and description) via the mutation', async () => {
    api.post.mockResolvedValue({ id: 't1', type: 'MANUAL', title: 'Called recruiter' })
    render(<TimelineAddForm jobId="j1" />, { wrapper })
    await userEvent.type(screen.getByLabelText(/note/i), 'Called recruiter')
    await userEvent.type(screen.getByLabelText(/detail/i), 'Left a voicemail')
    await userEvent.click(screen.getByRole('button', { name: /add note/i }))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/timeline', {
        title: 'Called recruiter',
        description: 'Left a voicemail',
      }),
    )
  })

  it('omits an empty description', async () => {
    api.post.mockResolvedValue({ id: 't1' })
    render(<TimelineAddForm jobId="j1" />, { wrapper })
    await userEvent.type(screen.getByLabelText(/note/i), 'Quick note')
    await userEvent.click(screen.getByRole('button', { name: /add note/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/timeline', { title: 'Quick note' }))
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.** Run `cd frontend-next && npm run test -- src/components/jobs/timeline/timeline-add-form.test.tsx`. Expect failure: `Failed to resolve import "./timeline-add-form"`.

- [ ] **Step 3: Implement the component.** Reuse `Input`, `Textarea`, `Label`, `Button`. Create `frontend-next/src/components/jobs/timeline/timeline-add-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useAddTimelineEntry } from '@/hooks/use-timeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function TimelineAddForm({ jobId }: { jobId: string }) {
  const add = useAddTimelineEntry(jobId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const trimmedDescription = description.trim()
    add.mutate(
      { title: trimmedTitle, ...(trimmedDescription ? { description: trimmedDescription } : {}) },
      {
        onSuccess: () => {
          setTitle('')
          setDescription('')
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="space-y-1.5">
        <Label htmlFor="timeline-note">Note</Label>
        <Input
          id="timeline-note"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Called the recruiter"
          maxLength={255}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="timeline-detail">Detail (optional)</Label>
        <Textarea
          id="timeline-detail"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any extra context"
        />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={add.isPending || title.trim() === ''}>
        Add note
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Run it, expect PASS.** Run `cd frontend-next && npm run test -- src/components/jobs/timeline/timeline-add-form.test.tsx`. Expect all green.

- [ ] **Step 5: Commit.**
```bash
cd frontend-next
git add src/components/jobs/timeline/timeline-add-form.tsx src/components/jobs/timeline/timeline-add-form.test.tsx
git commit -m "feat(frontend-next): add TimelineAddForm component"
```

---

### Task 16: TimelineSection component

**Files:**
- Create: `frontend-next/src/components/jobs/timeline/timeline-section.test.tsx`
- Create: `frontend-next/src/components/jobs/timeline/timeline-section.tsx`

Owns its data via `useTimeline(jobId)`; renders a heading, the add form, and either a loading line, an empty-state line, or the `TimelineList`.

- [ ] **Step 1: Write the failing test.** Create `frontend-next/src/components/jobs/timeline/timeline-section.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { TimelineSection } from './timeline-section'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('TimelineSection', () => {
  it('renders fetched events', async () => {
    api.get.mockResolvedValue([
      { id: 't1', jobId: 'j1', userId: 'u1', type: 'AUTO', title: 'Job added to vault', description: null, createdAt: new Date().toISOString() },
    ])
    render(<TimelineSection jobId="j1" />, { wrapper })
    await waitFor(() => expect(screen.getByText('Job added to vault')).toBeInTheDocument())
  })

  it('shows an empty state when there are no events', async () => {
    api.get.mockResolvedValue([])
    render(<TimelineSection jobId="j1" />, { wrapper })
    await waitFor(() => expect(screen.getByText(/no activity yet/i)).toBeInTheDocument())
  })

  it('always renders the add-note form', async () => {
    api.get.mockResolvedValue([])
    render(<TimelineSection jobId="j1" />, { wrapper })
    await waitFor(() => expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.** Run `cd frontend-next && npm run test -- src/components/jobs/timeline/timeline-section.test.tsx`. Expect failure: `Failed to resolve import "./timeline-section"`.

- [ ] **Step 3: Implement the component.** Mirror the `JobSnapshot` heading style. Create `frontend-next/src/components/jobs/timeline/timeline-section.tsx`:

```tsx
'use client'

import { useTimeline } from '@/hooks/use-timeline'
import { TimelineList } from './timeline-list'
import { TimelineAddForm } from './timeline-add-form'

export function TimelineSection({ jobId }: { jobId: string }) {
  const { data: events, isLoading } = useTimeline(jobId)

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Timeline</h3>
      <TimelineAddForm jobId={jobId} />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : events && events.length > 0 ? (
        <TimelineList events={events} />
      ) : (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run it, expect PASS.** Run `cd frontend-next && npm run test -- src/components/jobs/timeline/timeline-section.test.tsx`. Expect all green.

- [ ] **Step 5: Commit.**
```bash
cd frontend-next
git add src/components/jobs/timeline/timeline-section.tsx src/components/jobs/timeline/timeline-section.test.tsx
git commit -m "feat(frontend-next): add TimelineSection component"
```

---

### Task 17: Wire the Timeline section into JobDrawer

**Files:**
- Modify: `frontend-next/src/components/jobs/job-drawer.tsx`

- [ ] **Step 1: Add the section.** Edit `frontend-next/src/components/jobs/job-drawer.tsx` to import `TimelineSection` and render it in a bordered block below `JobSnapshot`. Add the import after the `JobSnapshot` import:
```ts
import { TimelineSection } from './timeline/timeline-section'
```
  Then replace the rendered fragment so it reads:
```tsx
            <>
              <JobDetails job={job} onDeleted={close} />
              <div className="border-t border-border pt-5">
                <JobSnapshot markdown={job.snapshotMarkdown} sourceUrl={job.sourceUrl} />
              </div>
              <div className="border-t border-border pt-5">
                <TimelineSection jobId={job.id} />
              </div>
            </>
```

- [ ] **Step 2: Run the JobDrawer test (regression).** Run `cd frontend-next && npm run test -- src/components/jobs/job-drawer.test.tsx`. Expect it still passes (the existing test mocks `useJob`; the new section fetches via a separate query that resolves to empty/undefined under the test's mocked api-client and does not break existing assertions).

- [ ] **Step 3: Typecheck.** Run `cd frontend-next && npm run typecheck` — expect no errors.

- [ ] **Step 4: Commit.**
```bash
cd frontend-next
git add src/components/jobs/job-drawer.tsx
git commit -m "feat(frontend-next): show the Timeline section in the JobDrawer"
```

---

### Task 18: Verification (full gates + Docker smoke)

**Files:** none (verification only).

- [ ] **Step 1: Backend gates.** Run `cd backend-express && npm run typecheck && npm run lint && npm run test` (the repository integration test needs the Docker Postgres on `:5433`). Expect everything green.

- [ ] **Step 2: Frontend gates.** Run `cd frontend-next && npm run test && npm run typecheck && npm run lint` (do not run a `next build` concurrently with vitest in the same dir). Then run `cd frontend-next && npm run build` on its own. Expect everything green.

- [ ] **Step 3: Rebuild and start the Docker stack.** Run:
```bash
docker compose up -d --build
docker compose logs --tail=40 backend-express
```
Expect the backend to apply migration `0002_*` and report listening.

- [ ] **Step 4: Smoke — create job emits an auto-event.** Log in via the app at http://localhost:8080 to obtain cookies in the browser, or use the API directly. Using the browser: open the app, add a job, open it (`?job=<id>`), and confirm the Timeline section shows **"Job added to vault"** with description **"Added to WISHLIST column"**.

  Equivalent API smoke (substitute a real `accessToken` cookie captured from the browser dev-tools and the returned `id`):
```bash
docker compose exec backend-express sh -c 'echo "smoke runs against http://localhost:3100/api"'
# From the host, with $COOKIE = accessToken=... and after POST /api/jobs returns $JOB_ID:
curl -s -H "Cookie: $COOKIE" http://localhost:3100/api/jobs/$JOB_ID/timeline | grep "Job added to vault"
```
Expect the response to contain `"Job added to vault"`.

- [ ] **Step 5: Smoke — moving a job emits a status-change event.** In the app, drag the job to another column (or `PATCH /api/jobs/:id/move`), reopen the drawer, and confirm a new Timeline entry **"Status changed to <NEW>"** with description **"Moved from <OLD> to <NEW>"** appears above the create event.

- [ ] **Step 6: Update progress.md.** Edit `progress.md` to record Slice 4a (Timeline + auto-events) as done — the `timeline` module, jobs-service auto-events, `useTimeline`/`useAddTimelineEntry`, and the JobDrawer Timeline section — and note 4b (reminders + notifications + scheduler) and 4c (socket.io) remain. Then commit:
```bash
git add progress.md
git commit -m "docs(progress): record Slice 4a timeline + auto-events"
```
