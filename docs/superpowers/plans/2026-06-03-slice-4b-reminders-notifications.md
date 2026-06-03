# Slice 4b — Reminders, Notifications & Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-job reminders + a header notification bell, a `node-cron` background scheduler that turns due reminders into notifications and fires ghost-threshold alerts, and fix the broken `/api/jobs?ghostFilter=` query so it derives ghost-days live in SQL.

**Architecture:** Backend gains two Drizzle tables (`reminders`, `notifications` + `notification_type` enum) behind layered `reminders`/`notifications` modules (router → controller → service → repository → Zod schema), a `src/scheduler/` directory holding **its own system-wide repository** (`scheduler.repository.ts`) plus pure sweep functions wired to cron, and a shared `src/shared/ghost.ts` holding the ghost thresholds + `deriveGhostDays` consumed by the dashboard, the jobs repository, and the ghost cron. The frontend adds TanStack Query hooks (`use-notifications`, `use-reminders`) with event-driven liveness (refetch-on-window-focus, no interval polling), a `NotificationBell`/popover in the page header, and a `RemindersSection` inside the URL-driven `JobDrawer`.

**Tech Stack:** Express 5, Drizzle ORM, PostgreSQL 16, Zod, strict TypeScript (NodeNext, relative imports end in `.js`), Vitest + supertest, node-cron; Next.js 15 App Router, React 19, TanStack Query v5, Tailwind v4, Radix dialog primitives, lucide-react, Vitest + React Testing Library.

> **Double-crossing decision (load-bearing, decided here):** the ghost sweep uses **two independent `if` statements** (NOT `else-if`) for the 7-day and 14-day thresholds. A job that jumps from `prev <= 7` to `next > 14` in a single daily run therefore **fires BOTH the 7-day AND the 14-day `GHOST_ALERT`** — matching the legacy behavior where each threshold crossing emits its own notification. This is asserted by a dedicated double-crossing test in Task 15.

---

## File Structure

**Backend — created**
- `backend-express/src/shared/ghost.ts` — shared `GHOST_STALE_DAYS`/`GHOST_GHOST_DAYS`, `GhostFilter` type, and `deriveGhostDays`.
- `backend-express/src/shared/ghost.test.ts` — unit tests for the shared ghost helpers.
- `backend-express/src/db/schema/reminders.ts` — `reminders` table + `ReminderRow`/`NewReminderRow`.
- `backend-express/src/db/schema/notifications.ts` — `NOTIFICATION_TYPES` const, `notificationTypeEnum`, `notifications` table + `NotificationRow`/`NewNotificationRow`.
- `backend-express/src/modules/reminders/reminders.schema.ts` — Zod schemas for reminder create/update/params.
- `backend-express/src/modules/reminders/reminders.repository.ts` — Drizzle data access for reminders (incl. `findDue`/`markCompleted` for the cron).
- `backend-express/src/modules/reminders/reminders.repository.test.ts` — real-DB integration tests.
- `backend-express/src/modules/reminders/reminders.service.ts` — ownership-checked reminder use-cases.
- `backend-express/src/modules/reminders/reminders.service.test.ts` — service unit tests (mocked repos).
- `backend-express/src/modules/reminders/reminders.controller.ts` — request/response glue.
- `backend-express/src/modules/reminders/reminders.router.ts` — `remindersJobRouter` + `remindersRouter`.
- `backend-express/src/modules/reminders/reminders.router.test.ts` — supertest HTTP tests.
- `backend-express/src/modules/notifications/notifications.schema.ts` — Zod query/param schemas.
- `backend-express/src/modules/notifications/notifications.repository.ts` — Drizzle data access for notifications.
- `backend-express/src/modules/notifications/notifications.repository.test.ts` — real-DB integration tests (incl. `relatedJobId` SET NULL).
- `backend-express/src/modules/notifications/notifications.service.ts` — list/read/read-all + internal `create`.
- `backend-express/src/modules/notifications/notifications.service.test.ts` — service unit tests.
- `backend-express/src/modules/notifications/notifications.controller.ts` — request/response glue.
- `backend-express/src/modules/notifications/notifications.router.ts` — notifications router (route order: `read-all` before `:id/read`).
- `backend-express/src/modules/notifications/notifications.router.test.ts` — supertest HTTP tests.
- `backend-express/src/scheduler/scheduler.repository.ts` — **system-wide** (all-users) Drizzle accessors for the cron (`findAllNonArchivedJobs`/`setJobGhostDays`).
- `backend-express/src/scheduler/scheduler.repository.test.ts` — real-DB integration tests for the system-wide accessors.
- `backend-express/src/scheduler/reminder-sweep.ts` — pure `sweepDueReminders(now)`.
- `backend-express/src/scheduler/reminder-sweep.test.ts` — unit tests (mocked repo + notification service), incl. a UTC-boundary find-due test.
- `backend-express/src/scheduler/ghost-sweep.ts` — pure `sweepGhostAlerts(now)`.
- `backend-express/src/scheduler/ghost-sweep.test.ts` — crossing-detection unit tests (incl. consecutive-day dedup + double-crossing).
- `backend-express/src/scheduler/scheduler.ts` — `startScheduler`/`stopScheduler` cron wiring.

**Backend — modified**
- `backend-express/src/db/schema/index.ts` — re-export the two new schema files.
- `backend-express/src/db/migrations/0002_*.sql` (+ `meta/`) — generated migration for both tables + enum.
- `backend-express/src/modules/dashboard/dashboard.ghost.ts` — import shared constants/`deriveGhostDays`.
- `backend-express/src/modules/jobs/jobs.repository.ts` — `ghostCondition` rewritten to derive live in SQL (**ghost-filter bug fix only**; the sweep accessors live in `scheduler.repository.ts`, not here).
- `backend-express/src/modules/jobs/jobs.repository.test.ts` — add a live-derivation ghost-filter test.
- `backend-express/src/shared/api-router.ts` — register the new routers.
- `backend-express/src/config/env.ts` — add `ENABLE_SCHEDULER` (safe boolean parse).
- `backend-express/src/config/env.test.ts` — **append** an `ENABLE_SCHEDULER` describe block (existing file — never replaced).
- `backend-express/src/index.ts` — start/stop the scheduler in the server lifecycle.
- `backend-express/package.json` — add `node-cron` dep + `@types/node-cron` devDep.
- `docker-compose.yml` — `ENABLE_SCHEDULER: ${ENABLE_SCHEDULER:-true}` for the backend service.

**Frontend — created**
- `frontend-next/src/types/notification.ts` — `Notification` + `NotificationType`.
- `frontend-next/src/types/reminder.ts` — `Reminder`.
- `frontend-next/src/hooks/use-notifications.ts` — notification query + read mutations.
- `frontend-next/src/hooks/use-notifications.test.tsx` — hook tests.
- `frontend-next/src/hooks/use-reminders.ts` — reminder query + CRUD mutations.
- `frontend-next/src/hooks/use-reminders.test.tsx` — hook tests.
- `frontend-next/src/components/ui/popover.tsx` — Radix-dialog-backed popover primitive.
- `frontend-next/src/components/notifications/notification-bell.tsx` — bell + unread badge + popover.
- `frontend-next/src/components/notifications/notification-bell.test.tsx` — bell tests.
- `frontend-next/src/components/notifications/notification-popover.tsx` — list + "mark all read".
- `frontend-next/src/components/notifications/notification-item.tsx` — one notification row.
- `frontend-next/src/components/notifications/notification-item.test.tsx` — item tests.
- `frontend-next/src/components/jobs/reminders/reminders-section.tsx` — section wrapper.
- `frontend-next/src/components/jobs/reminders/reminder-list.tsx` — sorted list.
- `frontend-next/src/components/jobs/reminders/reminder-item.tsx` — one reminder row (due/overdue, complete, delete).
- `frontend-next/src/components/jobs/reminders/reminder-item.test.tsx` — item tests.
- `frontend-next/src/components/jobs/reminders/reminder-form.tsx` — add-reminder form.
- `frontend-next/src/components/jobs/reminders/reminder-form.test.tsx` — form tests.

**Frontend — modified**
- `frontend-next/src/lib/query-keys.ts` — add notification + reminder keys.
- `frontend-next/src/components/jobs/job-drawer.tsx` — render `RemindersSection` below the snapshot.
- `frontend-next/src/components/jobs/jobs-workspace.tsx` — render `NotificationBell` in the header actions.
- `frontend-next/src/components/dashboard/dashboard-overview.tsx` — render `NotificationBell` in the header actions.

---

## Tasks

### Task 1: Shared ghost helpers (`src/shared/ghost.ts`)

**Files:**
- Create: `backend-express/src/shared/ghost.ts`
- Create: `backend-express/src/shared/ghost.test.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/shared/ghost.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { GHOST_STALE_DAYS, GHOST_GHOST_DAYS, deriveGhostDays } from './ghost.js'

const NOW = new Date('2026-06-20T12:00:00Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000)

describe('shared ghost constants', () => {
  it('exposes the 7/14-day thresholds', () => {
    expect(GHOST_STALE_DAYS).toBe(7)
    expect(GHOST_GHOST_DAYS).toBe(14)
  })
})

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
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/shared/ghost.test.ts`. Expect failure: cannot resolve `./ghost.js` (module does not exist).

- [ ] **Step 3: Implement** — `backend-express/src/shared/ghost.ts`:
```ts
export const GHOST_STALE_DAYS = 7
export const GHOST_GHOST_DAYS = 14

export type GhostFilter = 'all' | 'active' | 'stale' | 'ghost' | undefined

const DAY_MS = 86_400_000

/** Days of inactivity, derived from the last activity (or creation) date. */
export function deriveGhostDays(job: { lastActivityAt: Date | null; createdAt: Date }, now: number): number {
  const activity = (job.lastActivityAt ?? job.createdAt).getTime()
  return Math.max(0, Math.floor((now - activity) / DAY_MS))
}
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/shared/ghost.test.ts`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/shared/ghost.ts backend-express/src/shared/ghost.test.ts
git commit -m "feat(backend-express): extract shared ghost thresholds + deriveGhostDays"
```

---

### Task 2: Refactor `dashboard.ghost.ts` onto the shared helpers

**Files:**
- Modify: `backend-express/src/modules/dashboard/dashboard.ghost.ts`

- [ ] **Step 1: Confirm the guard test** — `backend-express/src/modules/dashboard/dashboard.ghost.test.ts` already exists and exercises `deriveGhostDays` + `passesGhostFilter`. Run it as the baseline: `cd backend-express && npm run test -- src/modules/dashboard/dashboard.ghost.test.ts`. Expect PASS (current implementation).

- [ ] **Step 2: Implement the refactor** — replace `backend-express/src/modules/dashboard/dashboard.ghost.ts` entirely:
```ts
import { GHOST_STALE_DAYS, GHOST_GHOST_DAYS, deriveGhostDays, type GhostFilter } from '@/shared/ghost.js'

export { deriveGhostDays }

export function passesGhostFilter(ghostDays: number, filter: GhostFilter): boolean {
  switch (filter) {
    case 'active':
      return ghostDays <= GHOST_STALE_DAYS
    case 'stale':
      return ghostDays > GHOST_STALE_DAYS && ghostDays <= GHOST_GHOST_DAYS
    case 'ghost':
      return ghostDays > GHOST_GHOST_DAYS
    default:
      return true
  }
}
```

- [ ] **Step 3: Run the ghost + service tests, expect PASS** — `cd backend-express && npm run test -- src/modules/dashboard/dashboard.ghost.test.ts src/modules/dashboard/dashboard.service.test.ts`. Both must still pass (the `DashboardQueryInput['ghostFilter']` argument is assignable to `GhostFilter`).

- [ ] **Step 4: Typecheck** — `cd backend-express && npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/modules/dashboard/dashboard.ghost.ts
git commit -m "refactor(backend-express): point dashboard.ghost at the shared ghost helpers"
```

---

### Task 3: `reminders` + `notifications` Drizzle schema + barrel

**Files:**
- Create: `backend-express/src/db/schema/reminders.ts`
- Create: `backend-express/src/db/schema/notifications.ts`
- Modify: `backend-express/src/db/schema/index.ts`
- Create: `backend-express/src/db/schema/slice4b-schema.test.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/db/schema/slice4b-schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { reminders } from './reminders.js'
import { notifications, NOTIFICATION_TYPES } from './notifications.js'

describe('reminders table', () => {
  it('declares the expected columns', () => {
    const cols = Object.keys(reminders)
    expect(cols).toEqual(
      expect.arrayContaining(['id', 'createdAt', 'updatedAt', 'userId', 'jobId', 'message', 'remindAt', 'isCompleted']),
    )
  })
})

describe('notifications table', () => {
  it('declares the expected columns', () => {
    const cols = Object.keys(notifications)
    expect(cols).toEqual(
      expect.arrayContaining(['id', 'createdAt', 'updatedAt', 'userId', 'message', 'type', 'isRead', 'relatedJobId']),
    )
  })
  it('exposes the 4 notification types', () => {
    expect(NOTIFICATION_TYPES).toEqual(['GHOST_ALERT', 'REMINDER', 'STATUS_CHANGE', 'GENERAL'])
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/db/schema/slice4b-schema.test.ts`. Expect failure: cannot resolve `./reminders.js` / `./notifications.js`.

- [ ] **Step 3a: Implement `reminders.ts`** — `backend-express/src/db/schema/reminders.ts`:
```ts
import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'

export const reminders = pgTable(
  'reminders',
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
    message: varchar('message', { length: 500 }).notNull(),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
  },
  (t) => [
    index('idx_reminders_user_id').on(t.userId),
    index('idx_reminders_job_id').on(t.jobId),
    index('idx_reminders_remind_at').on(t.remindAt),
  ],
)

export type ReminderRow = typeof reminders.$inferSelect
export type NewReminderRow = typeof reminders.$inferInsert
```

- [ ] **Step 3b: Implement `notifications.ts`** — `backend-express/src/db/schema/notifications.ts`:
```ts
import { pgTable, uuid, text, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'

// Single source of truth for the Postgres enum and the Zod request schemas.
// Only GHOST_ALERT + REMINDER are created in Slice 4; the other two are reserved.
export const NOTIFICATION_TYPES = ['GHOST_ALERT', 'REMINDER', 'STATUS_CHANGE', 'GENERAL'] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const notificationTypeEnum = pgEnum('notification_type', NOTIFICATION_TYPES)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    // Deliberately ON DELETE SET NULL (not cascade) so deleting a job preserves
    // notification history.
    relatedJobId: uuid('related_job_id').references(() => jobs.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('idx_notifications_user_id').on(t.userId),
    index('idx_notifications_user_id_is_read').on(t.userId, t.isRead),
  ],
)

export type NotificationRow = typeof notifications.$inferSelect
export type NewNotificationRow = typeof notifications.$inferInsert
```

- [ ] **Step 3c: Modify the barrel** — `backend-express/src/db/schema/index.ts` becomes:
```ts
// Drizzle schema barrel — one re-export per table.
export * from './users.js'
export * from './jobs.js'
export * from './reminders.js'
export * from './notifications.js'
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/db/schema/slice4b-schema.test.ts` then `cd backend-express && npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/db/schema/reminders.ts backend-express/src/db/schema/notifications.ts backend-express/src/db/schema/index.ts backend-express/src/db/schema/slice4b-schema.test.ts
git commit -m "feat(backend-express): add reminders + notifications Drizzle schema"
```

---

### Task 4: Generate the migration (Docker)

**Files:**
- Create: `backend-express/src/db/migrations/0002_*.sql` (+ updated `meta/`)

- [ ] **Step 1: Generate via the Docker stack** — the host may lack Postgres on `:5433`, so generate inside the running backend container (drizzle-kit only reads the schema, but the project runs DB tooling there):
```bash
cd /home/weloin/Projects/job-vault
docker compose up -d --build
docker compose exec backend-express npm run db:generate
```
Expect a new `src/db/migrations/0002_<name>.sql` plus updated `meta/_journal.json` + a `meta/0002_snapshot.json`.

- [ ] **Step 2: Verify the new SQL landed on the host BEFORE committing** — the container bind-mounts `./backend-express`, so the generated files appear on the host. Confirm git sees them:
```bash
cd /home/weloin/Projects/job-vault
git status --short backend-express/src/db/migrations
```
Expect new entries (e.g. `?? backend-express/src/db/migrations/0002_<name>.sql`, modified `meta/_journal.json`, new `meta/0002_snapshot.json`). If nothing appears, the generate ran against a container layer that did not write through to the mount — re-run Step 1 and re-check before proceeding.

- [ ] **Step 3: Inspect the generated SQL** — `Read backend-express/src/db/migrations/0002_*.sql`. Confirm it `CREATE TYPE "public"."notification_type" AS ENUM('GHOST_ALERT', 'REMINDER', 'STATUS_CHANGE', 'GENERAL')`, creates both tables, the `reminders_job_id_jobs_id_fk` / `reminders_user_id_users_id_fk` cascade FKs, the `notifications_related_job_id_jobs_id_fk` **SET NULL** FK, and the three reminder + two notification indexes.

- [ ] **Step 4: Apply (auto) + verify** — the backend container runs `db:migrate` on (re)start, but apply explicitly to confirm:
```bash
cd /home/weloin/Projects/job-vault
docker compose exec backend-express npm run db:migrate
docker compose exec postgres psql -U postgres -d jobvault -c "\dt reminders" -c "\dt notifications"
```
Expect both tables listed.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/db/migrations
git commit -m "chore(backend-express): generate reminders + notifications migration"
```

---

### Task 5: Reminders Zod schema

**Files:**
- Create: `backend-express/src/modules/reminders/reminders.schema.ts`
- Create: `backend-express/src/modules/reminders/reminders.schema.test.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/modules/reminders/reminders.schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { CreateReminderSchema, UpdateReminderSchema, ReminderIdParamSchema } from './reminders.schema.js'

describe('CreateReminderSchema', () => {
  it('coerces remindAt to a Date', () => {
    const parsed = CreateReminderSchema.parse({ message: 'Ping recruiter', remindAt: '2026-06-20T12:00:00Z' })
    expect(parsed.message).toBe('Ping recruiter')
    expect(parsed.remindAt).toBeInstanceOf(Date)
  })
  it('rejects an empty message', () => {
    expect(CreateReminderSchema.safeParse({ message: '', remindAt: '2026-06-20T12:00:00Z' }).success).toBe(false)
  })
  it('rejects a message over 500 chars', () => {
    expect(CreateReminderSchema.safeParse({ message: 'x'.repeat(501), remindAt: '2026-06-20T12:00:00Z' }).success).toBe(false)
  })
  it('rejects an invalid remindAt', () => {
    expect(CreateReminderSchema.safeParse({ message: 'hi', remindAt: 'not-a-date' }).success).toBe(false)
  })
})

describe('UpdateReminderSchema', () => {
  it('accepts a partial patch', () => {
    expect(UpdateReminderSchema.parse({ isCompleted: true })).toEqual({ isCompleted: true })
  })
  it('coerces remindAt when present', () => {
    const parsed = UpdateReminderSchema.parse({ remindAt: '2026-07-01T00:00:00Z' })
    expect(parsed.remindAt).toBeInstanceOf(Date)
  })
})

describe('ReminderIdParamSchema', () => {
  it('requires a uuid id', () => {
    expect(ReminderIdParamSchema.safeParse({ id: 'nope' }).success).toBe(false)
    expect(ReminderIdParamSchema.safeParse({ id: '00000000-0000-0000-0000-000000000000' }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/modules/reminders/reminders.schema.test.ts`. Expect: cannot resolve `./reminders.schema.js`.

- [ ] **Step 3: Implement** — `backend-express/src/modules/reminders/reminders.schema.ts`:
```ts
import { z } from 'zod'

export const CreateReminderSchema = z.object({
  message: z.string().min(1).max(500),
  remindAt: z.coerce.date(),
})

export const UpdateReminderSchema = z
  .object({
    message: z.string().min(1).max(500),
    remindAt: z.coerce.date(),
    isCompleted: z.boolean(),
  })
  .partial()

export const ReminderIdParamSchema = z.object({
  id: z.string().uuid(),
})

export type CreateReminderInput = z.infer<typeof CreateReminderSchema>
export type UpdateReminderInput = z.infer<typeof UpdateReminderSchema>
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/modules/reminders/reminders.schema.test.ts`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/modules/reminders/reminders.schema.ts backend-express/src/modules/reminders/reminders.schema.test.ts
git commit -m "feat(backend-express): add reminders Zod schemas"
```

---

### Task 6: Reminders repository (real-DB integration)

**Files:**
- Create: `backend-express/src/modules/reminders/reminders.repository.ts`
- Create: `backend-express/src/modules/reminders/reminders.repository.test.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/modules/reminders/reminders.repository.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { reminders } from '@/db/schema/reminders.js'
import { remindersRepository } from './reminders.repository.js'

const EMAIL = `reminders-repo-${Date.now()}@example.com`
let userId: string
let jobId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb().insert(users).values({ name: 'Rem', email: EMAIL, passwordHash: 'h' }).returning()
  const user = userRows[0]
  if (!user) throw new Error('failed to seed user')
  userId = user.id
  const jobRows = await getDb()
    .insert(jobs)
    .values({ userId, title: 'Role', company: 'Acme', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() })
    .returning()
  const job = jobRows[0]
  if (!job) throw new Error('failed to seed job')
  jobId = job.id
})

afterAll(async () => {
  await getDb().delete(reminders).where(eq(reminders.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('remindersRepository (real DB)', () => {
  it('creates and lists reminders for a job ordered by remindAt asc', async () => {
    await remindersRepository.create({ userId, jobId, message: 'Later', remindAt: new Date('2026-08-01T00:00:00Z') })
    await remindersRepository.create({ userId, jobId, message: 'Sooner', remindAt: new Date('2026-07-01T00:00:00Z') })
    const rows = await remindersRepository.listForJob(userId, jobId)
    expect(rows.map((r) => r.message)).toEqual(['Sooner', 'Later'])
  })

  it('finds, updates and deletes scoped to the owner', async () => {
    const created = await remindersRepository.create({
      userId,
      jobId,
      message: 'Edit me',
      remindAt: new Date('2026-09-01T00:00:00Z'),
    })
    expect((await remindersRepository.findById(userId, created.id))?.message).toBe('Edit me')
    expect(await remindersRepository.findById('00000000-0000-0000-0000-000000000000', created.id)).toBeNull()

    const updated = await remindersRepository.update(userId, created.id, { message: 'Edited', isCompleted: true })
    expect(updated?.message).toBe('Edited')
    expect(updated?.isCompleted).toBe(true)

    expect(await remindersRepository.remove(userId, created.id)).toBe(true)
    expect(await remindersRepository.findById(userId, created.id)).toBeNull()
    expect(await remindersRepository.remove(userId, created.id)).toBe(false)
  })

  it('findDue returns only past-due, not-completed reminders', async () => {
    const past = await remindersRepository.create({
      userId,
      jobId,
      message: 'Due now',
      remindAt: new Date('2000-01-01T00:00:00Z'),
    })
    await remindersRepository.create({
      userId,
      jobId,
      message: 'Future',
      remindAt: new Date('2099-01-01T00:00:00Z'),
    })
    const due = await remindersRepository.findDue(new Date())
    expect(due.some((r) => r.id === past.id)).toBe(true)
    expect(due.every((r) => r.isCompleted === false)).toBe(true)

    await remindersRepository.markCompleted([past.id])
    const dueAfter = await remindersRepository.findDue(new Date())
    expect(dueAfter.some((r) => r.id === past.id)).toBe(false)
  })

  it('findDue treats remindAt as a UTC instant boundary (due at/after, not-due just before)', async () => {
    // An explicit UTC instant. findDue must return it when "now" is at/after the
    // instant and exclude it the millisecond before — proving the comparison is on
    // the stored UTC timestamp, not a local wall-clock interpretation.
    const boundary = new Date('2026-06-20T00:00:00.000Z')
    const onBoundary = await remindersRepository.create({
      userId,
      jobId,
      message: 'UTC boundary',
      remindAt: boundary,
    })

    const justBefore = new Date(boundary.getTime() - 1)
    const beforeDue = await remindersRepository.findDue(justBefore)
    expect(beforeDue.some((r) => r.id === onBoundary.id)).toBe(false)

    const atBoundary = await remindersRepository.findDue(boundary)
    expect(atBoundary.some((r) => r.id === onBoundary.id)).toBe(true)

    await remindersRepository.markCompleted([onBoundary.id])
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/modules/reminders/reminders.repository.test.ts`. Expect: cannot resolve `./reminders.repository.js`.

- [ ] **Step 3: Implement** — `backend-express/src/modules/reminders/reminders.repository.ts`:
```ts
import { and, eq, lte, asc, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { reminders, type ReminderRow, type NewReminderRow } from '@/db/schema/reminders.js'
import type { UpdateReminderInput } from './reminders.schema.js'

async function create(values: NewReminderRow): Promise<ReminderRow> {
  const rows = await getDb().insert(reminders).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function listForJob(userId: string, jobId: string): Promise<ReminderRow[]> {
  return getDb()
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.jobId, jobId)))
    .orderBy(asc(reminders.remindAt))
}

async function findById(userId: string, id: string): Promise<ReminderRow | null> {
  const rows = await getDb()
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(userId: string, id: string, patch: UpdateReminderInput): Promise<ReminderRow | null> {
  const set: Partial<NewReminderRow> = { updatedAt: new Date() }
  if (patch.message !== undefined) set.message = patch.message
  if (patch.remindAt !== undefined) set.remindAt = patch.remindAt
  if (patch.isCompleted !== undefined) set.isCompleted = patch.isCompleted

  const rows = await getDb()
    .update(reminders)
    .set(set)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .returning({ id: reminders.id })
  return rows.length > 0
}

async function findDue(now: Date): Promise<ReminderRow[]> {
  return getDb()
    .select()
    .from(reminders)
    .where(and(lte(reminders.remindAt, now), eq(reminders.isCompleted, false)))
}

async function markCompleted(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  // System-wide (not user-scoped): the cron sweeps every user's due reminders by
  // id, so this update is intentionally unscoped. All request paths remain
  // user-scoped (findById/update/remove take a userId).
  await getDb()
    .update(reminders)
    .set({ isCompleted: true, updatedAt: new Date() })
    .where(inArray(reminders.id, ids))
}

export const remindersRepository = {
  create,
  listForJob,
  findById,
  update,
  remove,
  findDue,
  markCompleted,
}
```

- [ ] **Step 4: Run it, expect PASS** — ensure the Docker DB is up, then `cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run test -- src/modules/reminders/reminders.repository.test.ts`. (If the host cannot reach `:5433`, run inside the container: `docker compose exec backend-express npm run test -- src/modules/reminders/reminders.repository.test.ts`.)

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/modules/reminders/reminders.repository.ts backend-express/src/modules/reminders/reminders.repository.test.ts
git commit -m "feat(backend-express): add reminders repository"
```

---

### Task 7: Notifications repository (real-DB integration, incl. SET NULL)

**Files:**
- Create: `backend-express/src/modules/notifications/notifications.repository.ts`
- Create: `backend-express/src/modules/notifications/notifications.repository.test.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/modules/notifications/notifications.repository.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { notifications } from '@/db/schema/notifications.js'
import { notificationsRepository } from './notifications.repository.js'

const EMAIL = `notif-repo-${Date.now()}@example.com`
let userId: string
let jobId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb().insert(users).values({ name: 'Notif', email: EMAIL, passwordHash: 'h' }).returning()
  const user = userRows[0]
  if (!user) throw new Error('failed to seed user')
  userId = user.id
  const jobRows = await getDb()
    .insert(jobs)
    .values({ userId, title: 'Role', company: 'Acme', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() })
    .returning()
  const job = jobRows[0]
  if (!job) throw new Error('failed to seed job')
  jobId = job.id
})

afterAll(async () => {
  await getDb().delete(notifications).where(eq(notifications.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('notificationsRepository (real DB)', () => {
  it('creates and lists newest-first, capped, with unreadOnly filtering', async () => {
    await notificationsRepository.create({ userId, message: 'one', type: 'REMINDER', relatedJobId: jobId })
    const read = await notificationsRepository.create({ userId, message: 'two', type: 'GHOST_ALERT', relatedJobId: jobId })
    await notificationsRepository.markRead(userId, read.id)

    const all = await notificationsRepository.list(userId, false)
    expect(all.length).toBeGreaterThanOrEqual(2)
    expect(all[0]?.message).toBe('two') // newest first

    const unread = await notificationsRepository.list(userId, true)
    expect(unread.every((n) => n.isRead === false)).toBe(true)
  })

  it('marks one read and marks all read scoped to the owner', async () => {
    const n = await notificationsRepository.create({ userId, message: 'mark', type: 'REMINDER' })
    const marked = await notificationsRepository.markRead(userId, n.id)
    expect(marked?.isRead).toBe(true)
    expect(await notificationsRepository.markRead('00000000-0000-0000-0000-000000000000', n.id)).toBeNull()

    await notificationsRepository.create({ userId, message: 'still unread', type: 'GENERAL' })
    const updated = await notificationsRepository.markAllRead(userId)
    expect(updated).toBeGreaterThanOrEqual(1)
    const remaining = await notificationsRepository.list(userId, true)
    expect(remaining).toHaveLength(0)
  })

  it('keeps notification history when its related job is deleted (SET NULL)', async () => {
    const tmpJob = await getDb()
      .insert(jobs)
      .values({ userId, title: 'Temp', company: 'X', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date() })
      .returning()
    const tmpId = tmpJob[0]?.id
    if (!tmpId) throw new Error('failed to seed temp job')
    const n = await notificationsRepository.create({ userId, message: 'survives', type: 'GHOST_ALERT', relatedJobId: tmpId })

    await getDb().delete(jobs).where(eq(jobs.id, tmpId))

    const after = await notificationsRepository.findById(userId, n.id)
    expect(after).not.toBeNull()
    expect(after?.relatedJobId).toBeNull()
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/modules/notifications/notifications.repository.test.ts`. Expect: cannot resolve `./notifications.repository.js`.

- [ ] **Step 3: Implement** — `backend-express/src/modules/notifications/notifications.repository.ts`:
```ts
import { and, eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { notifications, type NotificationRow, type NewNotificationRow } from '@/db/schema/notifications.js'

const LIST_CAP = 50

async function create(values: NewNotificationRow): Promise<NotificationRow> {
  const rows = await getDb().insert(notifications).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function list(userId: string, unreadOnly: boolean): Promise<NotificationRow[]> {
  const where = unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    : eq(notifications.userId, userId)
  return getDb()
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(LIST_CAP)
}

async function findById(userId: string, id: string): Promise<NotificationRow | null> {
  const rows = await getDb()
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function markRead(userId: string, id: string): Promise<NotificationRow | null> {
  const rows = await getDb()
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function markAllRead(userId: string): Promise<number> {
  const rows = await getDb()
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id })
  return rows.length
}

export const notificationsRepository = {
  create,
  list,
  findById,
  markRead,
  markAllRead,
}
```

- [ ] **Step 4: Run it, expect PASS** — ensure the Docker DB is up: `cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run test -- src/modules/notifications/notifications.repository.test.ts` (or via `docker compose exec backend-express ...`).

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/modules/notifications/notifications.repository.ts backend-express/src/modules/notifications/notifications.repository.test.ts
git commit -m "feat(backend-express): add notifications repository"
```

---

### Task 8: Notifications service (internal `create` + read use-cases)

**Files:**
- Create: `backend-express/src/modules/notifications/notifications.service.ts`
- Create: `backend-express/src/modules/notifications/notifications.service.test.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/modules/notifications/notifications.service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./notifications.repository.js', () => ({
  notificationsRepository: {
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

import { notificationsRepository } from './notifications.repository.js'
import { notificationsService } from './notifications.service.js'
import type { NotificationRow } from '@/db/schema/notifications.js'

const repo = vi.mocked(notificationsRepository)

function fakeNotification(over: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: 'n1',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'u1',
    message: 'hi',
    type: 'REMINDER',
    isRead: false,
    relatedJobId: null,
    ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('notificationsService.create', () => {
  it('forwards to the repo with the related job when present and returns the created row', async () => {
    repo.create.mockResolvedValue(fakeNotification({ relatedJobId: 'j1' }))
    const created = await notificationsService.create({ userId: 'u1', message: 'hi', type: 'REMINDER', relatedJobId: 'j1' })
    expect(repo.create).toHaveBeenCalledWith({ userId: 'u1', message: 'hi', type: 'REMINDER', relatedJobId: 'j1' })
    expect(created.relatedJobId).toBe('j1')
  })

  it('omits relatedJobId when not given', async () => {
    repo.create.mockResolvedValue(fakeNotification())
    await notificationsService.create({ userId: 'u1', message: 'hi', type: 'GENERAL' })
    expect(repo.create).toHaveBeenCalledWith({ userId: 'u1', message: 'hi', type: 'GENERAL' })
  })
})

describe('notificationsService.markRead', () => {
  it('returns the updated notification', async () => {
    repo.markRead.mockResolvedValue(fakeNotification({ isRead: true }))
    const result = await notificationsService.markRead('u1', 'n1')
    expect(result.isRead).toBe(true)
  })

  it('throws NOT_FOUND when missing', async () => {
    repo.markRead.mockResolvedValue(null)
    await expect(notificationsService.markRead('u1', 'missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('notificationsService.markAllRead', () => {
  it('returns the updated count', async () => {
    repo.markAllRead.mockResolvedValue(3)
    expect(await notificationsService.markAllRead('u1')).toEqual({ updated: 3 })
  })
})

describe('notificationsService.list', () => {
  it('passes unreadOnly through', async () => {
    repo.list.mockResolvedValue([fakeNotification()])
    await notificationsService.list('u1', true)
    expect(repo.list).toHaveBeenCalledWith('u1', true)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/modules/notifications/notifications.service.test.ts`. Expect: cannot resolve `./notifications.service.js`.

- [ ] **Step 3: Implement** — `backend-express/src/modules/notifications/notifications.service.ts`:
```ts
import { AppError } from '@/shared/errors.js'
import { notificationsRepository } from './notifications.repository.js'
import type { NotificationRow, NotificationType } from '@/db/schema/notifications.js'

export interface CreateNotificationInput {
  userId: string
  message: string
  type: NotificationType
  relatedJobId?: string
}

// Returns the created NotificationRow (the cron + 4c socket push both need the row).
async function create(input: CreateNotificationInput): Promise<NotificationRow> {
  const values: {
    userId: string
    message: string
    type: NotificationType
    relatedJobId?: string
  } = { userId: input.userId, message: input.message, type: input.type }
  if (input.relatedJobId !== undefined) values.relatedJobId = input.relatedJobId
  return notificationsRepository.create(values)
}

async function list(userId: string, unreadOnly: boolean): Promise<NotificationRow[]> {
  return notificationsRepository.list(userId, unreadOnly)
}

async function markRead(userId: string, id: string): Promise<NotificationRow> {
  const updated = await notificationsRepository.markRead(userId, id)
  if (!updated) throw new AppError('NOT_FOUND', 'Notification not found')
  return updated
}

async function markAllRead(userId: string): Promise<{ updated: number }> {
  const updated = await notificationsRepository.markAllRead(userId)
  return { updated }
}

export const notificationsService = { create, list, markRead, markAllRead }
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/modules/notifications/notifications.service.test.ts`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/modules/notifications/notifications.service.ts backend-express/src/modules/notifications/notifications.service.test.ts
git commit -m "feat(backend-express): add notifications service"
```

---

### Task 9: Notifications schema (Zod) + controller + router (route order)

**Files:**
- Create: `backend-express/src/modules/notifications/notifications.schema.ts`
- Create: `backend-express/src/modules/notifications/notifications.controller.ts`
- Create: `backend-express/src/modules/notifications/notifications.router.ts`
- Create: `backend-express/src/modules/notifications/notifications.router.test.ts`
- Modify: `backend-express/src/shared/api-router.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/modules/notifications/notifications.router.test.ts`:
```ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { NotificationRow } from '@/db/schema/notifications.js'

vi.mock('./notifications.repository.js', () => ({
  notificationsRepository: {
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

import { notificationsRepository } from './notifications.repository.js'

const repo = vi.mocked(notificationsRepository)
let app: Express
let cookie: string

function fakeNotification(over: Record<string, unknown> = {}): NotificationRow {
  return {
    id: 'n1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', message: 'hi',
    type: 'REMINDER', isRead: false, relatedJobId: null, ...over,
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

describe('GET /api/notifications', () => {
  it('401s without an access token cookie', async () => {
    const res = await request(app).get('/api/notifications')
    expect(res.status).toBe(401)
  })

  it('200s with the list (unreadOnly=false by default)', async () => {
    repo.list.mockResolvedValue([fakeNotification()])
    const res = await request(app).get('/api/notifications').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(repo.list).toHaveBeenCalledWith('u1', false)
  })

  it('passes unreadOnly=true through', async () => {
    repo.list.mockResolvedValue([])
    await request(app).get('/api/notifications?unreadOnly=true').set('Cookie', [cookie])
    expect(repo.list).toHaveBeenCalledWith('u1', true)
  })
})

describe('PATCH /api/notifications/read-all', () => {
  it('routes to read-all (NOT captured as :id) and returns the count', async () => {
    repo.markAllRead.mockResolvedValue(2)
    const res = await request(app).patch('/api/notifications/read-all').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ updated: 2 })
    expect(repo.markRead).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/notifications/:id/read', () => {
  it('200s and returns the updated notification', async () => {
    repo.markRead.mockResolvedValue(fakeNotification({ isRead: true }))
    const res = await request(app).patch('/api/notifications/n1/read').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data.isRead).toBe(true)
  })

  it('404s when the notification is missing', async () => {
    repo.markRead.mockResolvedValue(null)
    const res = await request(app).patch('/api/notifications/missing/read').set('Cookie', [cookie])
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/modules/notifications/notifications.router.test.ts`. Expect: cannot resolve `./notifications.controller.js` / router not registered.

- [ ] **Step 3a: Implement `notifications.schema.ts`**:
```ts
import { z } from 'zod'

export const NotificationQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})

export const NotificationIdParamSchema = z.object({
  id: z.string().uuid(),
})

export type NotificationQueryInput = z.infer<typeof NotificationQuerySchema>
```

- [ ] **Step 3b: Implement `notifications.controller.ts`**:
```ts
import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { notificationsService } from './notifications.service.js'
import type { NotificationQueryInput } from './notifications.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

function paramId(req: Request): string {
  const id = req.params['id']
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '')
}

async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as NotificationQueryInput
  const rows = await notificationsService.list(requireUserId(req), query.unreadOnly)
  res.status(200).json({ data: rows })
}

async function readAll(req: Request, res: Response): Promise<void> {
  const result = await notificationsService.markAllRead(requireUserId(req))
  res.status(200).json({ data: result })
}

async function read(req: Request, res: Response): Promise<void> {
  const notification = await notificationsService.markRead(requireUserId(req), paramId(req))
  res.status(200).json({ data: notification })
}

export const notificationsController = { list, readAll, read }
```

- [ ] **Step 3c: Implement `notifications.router.ts`** (read-all declared before :id/read):
```ts
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { notificationsController } from './notifications.controller.js'
import { NotificationQuerySchema, NotificationIdParamSchema } from './notifications.schema.js'

const router = Router()

router.use(authMiddleware)

router.get('/', validate(NotificationQuerySchema, 'query'), asyncHandler(notificationsController.list))
// Declared BEFORE ':id/read' so Express never captures 'read-all' as :id.
router.patch('/read-all', asyncHandler(notificationsController.readAll))
router.patch('/:id/read', validate(NotificationIdParamSchema, 'params'), asyncHandler(notificationsController.read))

export { router as notificationsRouter }
```

- [ ] **Step 3d: Register in `api-router.ts`** — add the import + mount:
```ts
import { Router } from 'express'
import { healthRouter } from '@/modules/health/health.router.js'
import { authRouter } from '@/modules/auth/auth.router.js'
import { jobsRouter } from '@/modules/jobs/jobs.router.js'
import { dashboardRouter } from '@/modules/dashboard/dashboard.router.js'
import { notificationsRouter } from '@/modules/notifications/notifications.router.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/jobs', jobsRouter)
router.use('/dashboard', dashboardRouter)
router.use('/notifications', notificationsRouter)

export { router as apiRouter }
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/modules/notifications/notifications.router.test.ts` then `cd backend-express && npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/modules/notifications/notifications.schema.ts backend-express/src/modules/notifications/notifications.controller.ts backend-express/src/modules/notifications/notifications.router.ts backend-express/src/modules/notifications/notifications.router.test.ts backend-express/src/shared/api-router.ts
git commit -m "feat(backend-express): add notifications HTTP routes"
```

---

### Task 10: Reminders service (ownership-checked, depends on jobs + notifications)

**Files:**
- Create: `backend-express/src/modules/reminders/reminders.service.ts`
- Create: `backend-express/src/modules/reminders/reminders.service.test.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/modules/reminders/reminders.service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./reminders.repository.js', () => ({
  remindersRepository: {
    create: vi.fn(),
    listForJob: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findDue: vi.fn(),
    markCompleted: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: { findById: vi.fn() },
}))

import { remindersRepository } from './reminders.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { remindersService } from './reminders.service.js'
import type { ReminderRow } from '@/db/schema/reminders.js'
import type { JobRow } from '@/db/schema/jobs.js'

const repo = vi.mocked(remindersRepository)
const jobs = vi.mocked(jobsRepository)

function fakeReminder(over: Partial<ReminderRow> = {}): ReminderRow {
  return {
    id: 'r1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    message: 'Ping', remindAt: new Date('2026-07-01T00:00:00Z'), isCompleted: false, ...over,
  }
}

function fakeJob(): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'T', company: 'C',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'APPLIED',
    kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('remindersService.listForJob', () => {
  it('returns reminders when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.listForJob.mockResolvedValue([fakeReminder()])
    const rows = await remindersService.listForJob('u1', 'j1')
    expect(rows).toHaveLength(1)
  })
  it('throws NOT_FOUND when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(remindersService.listForJob('u1', 'jX')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('remindersService.create', () => {
  it('creates a reminder under the owned job', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeReminder())
    const created = await remindersService.create('u1', 'j1', { message: 'Ping', remindAt: new Date('2026-07-01T00:00:00Z') })
    expect(repo.create).toHaveBeenCalledWith({ userId: 'u1', jobId: 'j1', message: 'Ping', remindAt: new Date('2026-07-01T00:00:00Z') })
    expect(created.id).toBe('r1')
  })
  it('throws NOT_FOUND when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(
      remindersService.create('u1', 'jX', { message: 'Ping', remindAt: new Date() }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('remindersService.update', () => {
  it('updates an owned reminder', async () => {
    repo.update.mockResolvedValue(fakeReminder({ message: 'Edited' }))
    const updated = await remindersService.update('u1', 'r1', { message: 'Edited' })
    expect(updated.message).toBe('Edited')
  })
  it('throws NOT_FOUND when missing', async () => {
    repo.update.mockResolvedValue(null)
    await expect(remindersService.update('u1', 'rX', { message: 'x' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('remindersService.remove', () => {
  it('returns the deleted id', async () => {
    repo.remove.mockResolvedValue(true)
    expect(await remindersService.remove('u1', 'r1')).toEqual({ id: 'r1' })
  })
  it('throws NOT_FOUND when missing', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(remindersService.remove('u1', 'rX')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/modules/reminders/reminders.service.test.ts`. Expect: cannot resolve `./reminders.service.js`.

- [ ] **Step 3: Implement** — `backend-express/src/modules/reminders/reminders.service.ts`:
```ts
import { AppError } from '@/shared/errors.js'
import { remindersRepository } from './reminders.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import type { ReminderRow } from '@/db/schema/reminders.js'
import type { CreateReminderInput, UpdateReminderInput } from './reminders.schema.js'

async function assertJobOwned(userId: string, jobId: string): Promise<void> {
  const job = await jobsRepository.findById(userId, jobId)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
}

async function listForJob(userId: string, jobId: string): Promise<ReminderRow[]> {
  await assertJobOwned(userId, jobId)
  return remindersRepository.listForJob(userId, jobId)
}

async function create(userId: string, jobId: string, input: CreateReminderInput): Promise<ReminderRow> {
  await assertJobOwned(userId, jobId)
  return remindersRepository.create({ userId, jobId, message: input.message, remindAt: input.remindAt })
}

async function update(userId: string, id: string, input: UpdateReminderInput): Promise<ReminderRow> {
  const updated = await remindersRepository.update(userId, id, input)
  if (!updated) throw new AppError('NOT_FOUND', 'Reminder not found')
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await remindersRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Reminder not found')
  return { id }
}

export const remindersService = { listForJob, create, update, remove }
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/modules/reminders/reminders.service.test.ts`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/modules/reminders/reminders.service.ts backend-express/src/modules/reminders/reminders.service.test.ts
git commit -m "feat(backend-express): add reminders service"
```

---

### Task 11: Reminders controller + two routers + register

**Files:**
- Create: `backend-express/src/modules/reminders/reminders.controller.ts`
- Create: `backend-express/src/modules/reminders/reminders.router.ts`
- Create: `backend-express/src/modules/reminders/reminders.router.test.ts`
- Modify: `backend-express/src/shared/api-router.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/modules/reminders/reminders.router.test.ts`:
```ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { ReminderRow } from '@/db/schema/reminders.js'
import type { JobRow } from '@/db/schema/jobs.js'

vi.mock('./reminders.repository.js', () => ({
  remindersRepository: {
    create: vi.fn(),
    listForJob: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findDue: vi.fn(),
    markCompleted: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: {
    findById: vi.fn(),
    nextKanbanOrder: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    remove: vi.fn(),
  },
}))

import { remindersRepository } from './reminders.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'

const repo = vi.mocked(remindersRepository)
const jobs = vi.mocked(jobsRepository)
let app: Express
let cookie: string

function fakeReminder(over: Record<string, unknown> = {}): ReminderRow {
  return {
    id: 'r1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    message: 'Ping', remindAt: new Date('2026-07-01T00:00:00Z'), isCompleted: false, ...over,
  }
}
function fakeJob(): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'T', company: 'C',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'APPLIED',
    kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null,
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

describe('GET /api/jobs/:jobId/reminders', () => {
  it('401s without a cookie', async () => {
    const res = await request(app).get('/api/jobs/j1/reminders')
    expect(res.status).toBe(401)
  })
  it('200s with the reminders list when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.listForJob.mockResolvedValue([fakeReminder()])
    const res = await request(app).get('/api/jobs/j1/reminders').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })
  it('404s when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    const res = await request(app).get('/api/jobs/jX/reminders').set('Cookie', [cookie])
    expect(res.status).toBe(404)
  })
})

describe('POST /api/jobs/:jobId/reminders', () => {
  it('201s and returns the created reminder', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeReminder())
    const res = await request(app)
      .post('/api/jobs/j1/reminders')
      .set('Cookie', [cookie])
      .send({ message: 'Ping', remindAt: '2026-07-01T00:00:00Z' })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('r1')
  })
  it('400s on an empty message', async () => {
    const res = await request(app)
      .post('/api/jobs/j1/reminders')
      .set('Cookie', [cookie])
      .send({ message: '', remindAt: '2026-07-01T00:00:00Z' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/reminders/:id', () => {
  it('200s and returns the updated reminder', async () => {
    repo.update.mockResolvedValue(fakeReminder({ isCompleted: true }))
    const res = await request(app).patch('/api/reminders/r1').set('Cookie', [cookie]).send({ isCompleted: true })
    expect(res.status).toBe(200)
    expect(res.body.data.isCompleted).toBe(true)
  })
  it('404s when missing', async () => {
    repo.update.mockResolvedValue(null)
    const res = await request(app).patch('/api/reminders/rX').set('Cookie', [cookie]).send({ message: 'x' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/reminders/:id', () => {
  it('200s with the deleted id', async () => {
    repo.remove.mockResolvedValue(true)
    const res = await request(app).delete('/api/reminders/r1').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id: 'r1' })
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/modules/reminders/reminders.router.test.ts`. Expect: cannot resolve `./reminders.controller.js` / routers not registered.

- [ ] **Step 3a: Implement `reminders.controller.ts`**:
```ts
import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { remindersService } from './reminders.service.js'
import type { CreateReminderInput, UpdateReminderInput } from './reminders.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

function paramValue(req: Request, key: string): string {
  const value = req.params[key]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

async function list(req: Request, res: Response): Promise<void> {
  const rows = await remindersService.listForJob(requireUserId(req), paramValue(req, 'jobId'))
  res.status(200).json({ data: rows })
}

async function create(req: Request, res: Response): Promise<void> {
  const reminder = await remindersService.create(requireUserId(req), paramValue(req, 'jobId'), req.body as CreateReminderInput)
  res.status(201).json({ data: reminder })
}

async function update(req: Request, res: Response): Promise<void> {
  const reminder = await remindersService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdateReminderInput)
  res.status(200).json({ data: reminder })
}

async function remove(req: Request, res: Response): Promise<void> {
  const result = await remindersService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(200).json({ data: result })
}

export const remindersController = { list, create, update, remove }
```

- [ ] **Step 3b: Implement `reminders.router.ts`** (two routers; the job-scoped one uses `mergeParams`):
```ts
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { remindersController } from './reminders.controller.js'
import { CreateReminderSchema, UpdateReminderSchema, ReminderIdParamSchema } from './reminders.schema.js'

// Mounted at '/jobs/:jobId/reminders' — mergeParams exposes :jobId to handlers.
const jobRouter = Router({ mergeParams: true })
jobRouter.use(authMiddleware)
jobRouter.get('/', asyncHandler(remindersController.list))
jobRouter.post('/', validate(CreateReminderSchema), asyncHandler(remindersController.create))

// Mounted at '/reminders' — :id update/delete.
const idRouter = Router()
idRouter.use(authMiddleware)
idRouter.patch('/:id', validate(ReminderIdParamSchema, 'params'), validate(UpdateReminderSchema), asyncHandler(remindersController.update))
idRouter.delete('/:id', validate(ReminderIdParamSchema, 'params'), asyncHandler(remindersController.remove))

export { jobRouter as remindersJobRouter, idRouter as remindersRouter }
```

- [ ] **Step 3c: Register in `api-router.ts`** — final content:
```ts
import { Router } from 'express'
import { healthRouter } from '@/modules/health/health.router.js'
import { authRouter } from '@/modules/auth/auth.router.js'
import { jobsRouter } from '@/modules/jobs/jobs.router.js'
import { dashboardRouter } from '@/modules/dashboard/dashboard.router.js'
import { notificationsRouter } from '@/modules/notifications/notifications.router.js'
import { remindersJobRouter, remindersRouter } from '@/modules/reminders/reminders.router.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/jobs', jobsRouter)
// The job-scoped reminders sub-router (and the 4a '/jobs/:jobId/timeline'
// sub-router) coexist with the '/jobs' jobsRouter above: jobsRouter's '/:id'
// routes only match a single path segment, so a deeper path like
// '/jobs/<id>/reminders' falls through to the mount registered here.
router.use('/jobs/:jobId/reminders', remindersJobRouter)
router.use('/reminders', remindersRouter)
router.use('/dashboard', dashboardRouter)
router.use('/notifications', notificationsRouter)

export { router as apiRouter }
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/modules/reminders/reminders.router.test.ts` then `cd backend-express && npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/modules/reminders/reminders.controller.ts backend-express/src/modules/reminders/reminders.router.ts backend-express/src/modules/reminders/reminders.router.test.ts backend-express/src/shared/api-router.ts
git commit -m "feat(backend-express): add reminders HTTP routes"
```

---

### Task 12: Ghost-filter bug fix (derive live in SQL)

**Files:**
- Modify: `backend-express/src/modules/jobs/jobs.repository.ts`
- Modify: `backend-express/src/modules/jobs/jobs.repository.test.ts`

> Scope note: this task fixes **only** the broken `ghostFilter` query. The system-wide cron accessors (`findAllNonArchivedJobs`/`setJobGhostDays`) deliberately do **not** live on the user-scoped `jobsRepository`; they get their own `scheduler.repository.ts` in Task 14.

- [ ] **Step 1: Write the failing test** — append to `backend-express/src/modules/jobs/jobs.repository.test.ts` (inside the existing `describe('jobsRepository (real DB)', ...)` block, after the last `it`):
```ts
  it('ghostFilter derives days live from lastActivityAt (stale/ghost now match)', async () => {
    const now = Date.now()
    const stale = await jobsRepository.create({
      userId,
      title: 'Stale Role',
      company: 'StaleCo',
      status: 'APPLIED',
      kanbanOrder: 50,
      lastActivityAt: new Date(now - 10 * 86_400_000), // 10 days -> stale (8..14)
    })
    const ghost = await jobsRepository.create({
      userId,
      title: 'Ghost Role',
      company: 'GhostCo',
      status: 'APPLIED',
      kanbanOrder: 51,
      lastActivityAt: new Date(now - 30 * 86_400_000), // 30 days -> ghost (>14)
    })

    const staleRows = await jobsRepository.findAll(userId, {
      page: 1,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ghostFilter: 'stale',
    })
    expect(staleRows.rows.some((j) => j.id === stale.id)).toBe(true)
    expect(staleRows.rows.some((j) => j.id === ghost.id)).toBe(false)

    const ghostRows = await jobsRepository.findAll(userId, {
      page: 1,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ghostFilter: 'ghost',
    })
    expect(ghostRows.rows.some((j) => j.id === ghost.id)).toBe(true)
    expect(ghostRows.rows.some((j) => j.id === stale.id)).toBe(false)
  })
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run test -- src/modules/jobs/jobs.repository.test.ts` (or via container). Expect failure: the stale/ghost filters return nothing (still keyed on the always-0 `ghostDays` column).

- [ ] **Step 3: Implement** — edit `backend-express/src/modules/jobs/jobs.repository.ts`. Change the imports line to add `sql` (drop the now-unused `gt`/`lte`), import the shared constants, and replace `ghostCondition` with the live-derivation version.

  Replace the top imports line:
```ts
import { and, or, eq, ilike, asc, desc, max, count, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { jobs, type JobRow, type NewJobRow, type JobStatus } from '@/db/schema/jobs.js'
import { GHOST_STALE_DAYS, GHOST_GHOST_DAYS } from '@/shared/ghost.js'
import type { JobQueryInput, JobSortField, UpdateJobInput } from './jobs.schema.js'
```
  Replace the whole `ghostCondition` function with the live-derivation version:
```ts
// Ghost-days derived live in SQL (now - COALESCE(lastActivityAt, createdAt))/day,
// so the filter matches the dashboard's derive-live behavior. The stored
// jobs.ghostDays column is never used for display — it is the cron's anchor only.
const ghostDaysExpr = sql`floor(extract(epoch from (now() - coalesce(${jobs.lastActivityAt}, ${jobs.createdAt}))) / 86400)`

function ghostCondition(filter: JobQueryInput['ghostFilter']): SQL | undefined {
  switch (filter) {
    case 'active':
      return sql`${ghostDaysExpr} <= ${GHOST_STALE_DAYS}`
    case 'stale':
      return sql`${ghostDaysExpr} > ${GHOST_STALE_DAYS} and ${ghostDaysExpr} <= ${GHOST_GHOST_DAYS}`
    case 'ghost':
      return sql`${ghostDaysExpr} > ${GHOST_GHOST_DAYS}`
    default:
      return undefined
  }
}
```
  Leave the `jobsRepository` export object unchanged (no cron helpers here).

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run test -- src/modules/jobs/jobs.repository.test.ts` (or via container) then `cd backend-express && npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/modules/jobs/jobs.repository.ts backend-express/src/modules/jobs/jobs.repository.test.ts
git commit -m "fix(backend-express): derive ghostFilter live in SQL"
```

---

### Task 13: `node-cron` dependency

**Files:**
- Modify: `backend-express/package.json`

- [ ] **Step 1: Add the dependency** — in `backend-express/package.json` add `"node-cron": "^3.0.3"` to `dependencies` (alphabetical, after `jsonwebtoken`) and `"@types/node-cron": "^3.0.11"` to `devDependencies` (after `@types/jsonwebtoken`). The relevant `dependencies` excerpt becomes:
```json
    "jsonwebtoken": "^9.0.3",
    "node-cron": "^3.0.3",
    "pg": "^8.13.1",
```
  and the `devDependencies` excerpt becomes:
```json
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node-cron": "^3.0.11",
    "@types/node": "^20.17.0",
```

- [ ] **Step 2: Install in the container** — node modules are an anonymous volume, so rebuild + renew them (this is the `--renew-anon-volumes` recreate the CLAUDE.md workflow calls for after adding npm deps):
```bash
cd /home/weloin/Projects/job-vault
docker compose up -d --build --force-recreate --renew-anon-volumes
```
  Then confirm the package resolves: `docker compose exec backend-express node -e "require('node-cron'); console.log('node-cron ok')"`.

- [ ] **Step 3: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/package.json backend-express/package-lock.json
git commit -m "chore(backend-express): add node-cron dependency"
```

---

### Task 14: Scheduler repository (system-wide, all-users, real-DB integration)

**Files:**
- Create: `backend-express/src/scheduler/scheduler.repository.ts`
- Create: `backend-express/src/scheduler/scheduler.repository.test.ts`

> The cron is **intentionally system-wide** — it sweeps every user's jobs, unlike the user-scoped request paths in `jobsRepository`. To keep that boundary explicit (and to avoid overloading `jobsRepository` with an unscoped accessor), the cron gets its own repository here. `findAllNonArchivedJobs()` selects across ALL users; `setJobGhostDays(id, ghostDays)` updates by primary key (no user scope, since the cron owns the row by id).

- [ ] **Step 1: Write the failing test** — `backend-express/src/scheduler/scheduler.repository.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { schedulerRepository } from './scheduler.repository.js'

const EMAIL_A = `sched-repo-a-${Date.now()}@example.com`
const EMAIL_B = `sched-repo-b-${Date.now()}@example.com`
let userA: string
let userB: string
let activeAId: string
let activeBId: string
let archivedId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)

  const a = (await getDb().insert(users).values({ name: 'A', email: EMAIL_A, passwordHash: 'h' }).returning())[0]
  const b = (await getDb().insert(users).values({ name: 'B', email: EMAIL_B, passwordHash: 'h' }).returning())[0]
  if (!a || !b) throw new Error('failed to seed users')
  userA = a.id
  userB = b.id

  const activeA = (
    await getDb()
      .insert(jobs)
      .values({ userId: userA, title: 'Active A', company: 'Aco', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() })
      .returning()
  )[0]
  const activeB = (
    await getDb()
      .insert(jobs)
      .values({ userId: userB, title: 'Active B', company: 'Bco', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date() })
      .returning()
  )[0]
  const archived = (
    await getDb()
      .insert(jobs)
      .values({ userId: userA, title: 'Archived A', company: 'Aco', status: 'ARCHIVED', kanbanOrder: 2, lastActivityAt: new Date() })
      .returning()
  )[0]
  if (!activeA || !activeB || !archived) throw new Error('failed to seed jobs')
  activeAId = activeA.id
  activeBId = activeB.id
  archivedId = archived.id
})

afterAll(async () => {
  await getDb().delete(jobs).where(inArray(jobs.userId, [userA, userB]))
  await getDb().delete(users).where(inArray(users.id, [userA, userB]))
  await closeDb()
})

describe('schedulerRepository (real DB)', () => {
  it('findAllNonArchivedJobs returns non-ARCHIVED jobs across ALL users', async () => {
    const rows = await schedulerRepository.findAllNonArchivedJobs()
    const ids = rows.map((j) => j.id)
    expect(ids).toContain(activeAId)
    expect(ids).toContain(activeBId) // crosses the user boundary on purpose
    expect(ids).not.toContain(archivedId)
    expect(rows.every((j) => j.status !== 'ARCHIVED')).toBe(true)
  })

  it('setJobGhostDays persists the anchor by id', async () => {
    await schedulerRepository.setJobGhostDays(activeAId, 9)
    const row = (await getDb().select().from(jobs).where(eq(jobs.id, activeAId)))[0]
    expect(row?.ghostDays).toBe(9)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run test -- src/scheduler/scheduler.repository.test.ts` (or via container). Expect: cannot resolve `./scheduler.repository.js`.

- [ ] **Step 3: Implement** — `backend-express/src/scheduler/scheduler.repository.ts`:
```ts
import { eq, ne } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { jobs, type JobRow } from '@/db/schema/jobs.js'

// System-wide accessors for the daily ghost cron. The cron is intentionally NOT
// user-scoped (it sweeps every user's jobs), unlike the user-scoped request paths
// in jobsRepository. Keeping these here makes that boundary explicit and avoids
// overloading the user-scoped repository with an unscoped query.
async function findAllNonArchivedJobs(): Promise<JobRow[]> {
  return getDb().select().from(jobs).where(ne(jobs.status, 'ARCHIVED'))
}

async function setJobGhostDays(id: string, ghostDays: number): Promise<void> {
  await getDb().update(jobs).set({ ghostDays }).where(eq(jobs.id, id))
}

export const schedulerRepository = {
  findAllNonArchivedJobs,
  setJobGhostDays,
}
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run test -- src/scheduler/scheduler.repository.test.ts` (or via container) then `cd backend-express && npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/scheduler/scheduler.repository.ts backend-express/src/scheduler/scheduler.repository.test.ts
git commit -m "feat(backend-express): add system-wide scheduler repository"
```

---

### Task 15: Reminder sweep (pure function)

**Files:**
- Create: `backend-express/src/scheduler/reminder-sweep.ts`
- Create: `backend-express/src/scheduler/reminder-sweep.test.ts`

- [ ] **Step 1: Write the failing test** — `backend-express/src/scheduler/reminder-sweep.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/modules/reminders/reminders.repository.js', () => ({
  remindersRepository: { findDue: vi.fn(), markCompleted: vi.fn() },
}))
vi.mock('@/modules/notifications/notifications.service.js', () => ({
  notificationsService: { create: vi.fn() },
}))

import { remindersRepository } from '@/modules/reminders/reminders.repository.js'
import { notificationsService } from '@/modules/notifications/notifications.service.js'
import { sweepDueReminders } from './reminder-sweep.js'
import type { ReminderRow } from '@/db/schema/reminders.js'

const repo = vi.mocked(remindersRepository)
const notifications = vi.mocked(notificationsService)

function fakeReminder(over: Partial<ReminderRow> = {}): ReminderRow {
  return {
    id: 'r1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    message: 'Ping recruiter', remindAt: new Date('2000-01-01T00:00:00Z'), isCompleted: false, ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('sweepDueReminders', () => {
  it('creates a REMINDER notification per due reminder and marks them completed', async () => {
    repo.findDue.mockResolvedValue([
      fakeReminder({ id: 'r1', userId: 'u1', jobId: 'j1', message: 'A' }),
      fakeReminder({ id: 'r2', userId: 'u2', jobId: 'j2', message: 'B' }),
    ])
    notifications.create.mockResolvedValue({} as never)
    const now = new Date('2026-06-20T00:00:00Z')

    const count = await sweepDueReminders(now)

    expect(count).toBe(2)
    expect(repo.findDue).toHaveBeenCalledWith(now)
    expect(notifications.create).toHaveBeenCalledWith({ userId: 'u1', message: 'A', type: 'REMINDER', relatedJobId: 'j1' })
    expect(notifications.create).toHaveBeenCalledWith({ userId: 'u2', message: 'B', type: 'REMINDER', relatedJobId: 'j2' })
    expect(repo.markCompleted).toHaveBeenCalledWith(['r1', 'r2'])
  })

  it('is a no-op when nothing is due', async () => {
    repo.findDue.mockResolvedValue([])
    const count = await sweepDueReminders(new Date())
    expect(count).toBe(0)
    expect(notifications.create).not.toHaveBeenCalled()
    expect(repo.markCompleted).not.toHaveBeenCalled()
  })

  it('queries with the exact UTC instant it is given (now passed straight to findDue)', async () => {
    // The sweep is pure: it forwards the injected `now` to findDue unchanged, so the
    // due-boundary comparison happens on the stored UTC timestamp (see the
    // repository's UTC-boundary findDue test). Here we prove the contract that the
    // boundary instant is the one passed in — not Date.now() or a local-adjusted value.
    repo.findDue.mockResolvedValue([])
    const boundary = new Date('2026-06-20T00:00:00.000Z')
    await sweepDueReminders(boundary)
    expect(repo.findDue).toHaveBeenCalledWith(boundary)
    expect(repo.findDue.mock.calls[0]?.[0]?.toISOString()).toBe('2026-06-20T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/scheduler/reminder-sweep.test.ts`. Expect: cannot resolve `./reminder-sweep.js`.

- [ ] **Step 3: Implement** — `backend-express/src/scheduler/reminder-sweep.ts`:
```ts
import { remindersRepository } from '@/modules/reminders/reminders.repository.js'
import { notificationsService } from '@/modules/notifications/notifications.service.js'

/**
 * Turns every past-due, not-completed reminder into a REMINDER notification and
 * marks it completed (so it never re-fires). `now` is injected for testability and
 * is forwarded unchanged to findDue, which compares it against the stored UTC
 * remindAt. Returns the number of reminders swept.
 */
export async function sweepDueReminders(now: Date): Promise<number> {
  const due = await remindersRepository.findDue(now)
  if (due.length === 0) return 0

  for (const reminder of due) {
    await notificationsService.create({
      userId: reminder.userId,
      message: reminder.message,
      type: 'REMINDER',
      relatedJobId: reminder.jobId,
    })
  }
  await remindersRepository.markCompleted(due.map((r) => r.id))
  return due.length
}
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/scheduler/reminder-sweep.test.ts`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/scheduler/reminder-sweep.ts backend-express/src/scheduler/reminder-sweep.test.ts
git commit -m "feat(backend-express): add reminder sweep function"
```

---

### Task 16: Ghost sweep (pure function, crossing detection)

**Files:**
- Create: `backend-express/src/scheduler/ghost-sweep.ts`
- Create: `backend-express/src/scheduler/ghost-sweep.test.ts`

> Design (load-bearing): crossing detection uses **two independent `if` statements** — one for the 7-day threshold, one for the 14-day threshold. A job that jumps from `prev <= 7` to `next > 14` in a single run therefore fires **both** alerts (legacy parity). Each threshold re-fires only on the run that first crosses it, because the persisted `ghostDays` anchor advances past the threshold afterward.

- [ ] **Step 1: Write the failing test** — `backend-express/src/scheduler/ghost-sweep.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./scheduler.repository.js', () => ({
  schedulerRepository: { findAllNonArchivedJobs: vi.fn(), setJobGhostDays: vi.fn() },
}))
vi.mock('@/modules/notifications/notifications.service.js', () => ({
  notificationsService: { create: vi.fn() },
}))

import { schedulerRepository } from './scheduler.repository.js'
import { notificationsService } from '@/modules/notifications/notifications.service.js'
import { sweepGhostAlerts } from './ghost-sweep.js'
import type { JobRow } from '@/db/schema/jobs.js'

const jobs = vi.mocked(schedulerRepository)
const notifications = vi.mocked(notificationsService)
const day = 86_400_000

function fakeJob(over: Partial<JobRow> = {}): JobRow {
  return {
    id: 'j1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', title: 'SWE', company: 'Acme',
    location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'APPLIED',
    kanbanOrder: 1, lastActivityAt: null, ghostDays: 0, notes: null, ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('sweepGhostAlerts', () => {
  it('fires the 7-day alert once when crossing prev<=7 -> 7<new<=14', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: 7, lastActivityAt: new Date(now.getTime() - 8 * day) }),
    ])
    notifications.create.mockResolvedValue({} as never)

    const fired = await sweepGhostAlerts(now)

    expect(fired).toBe(1)
    expect(notifications.create).toHaveBeenCalledTimes(1)
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'u1',
      message: 'Acme - SWE has been inactive for 8 days',
      type: 'GHOST_ALERT',
      relatedJobId: 'j1',
    })
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 8)
  })

  it('does NOT re-fire the 7-day alert when prev=8 -> new=9', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', ghostDays: 8, lastActivityAt: new Date(now.getTime() - 9 * day) }),
    ])
    const fired = await sweepGhostAlerts(now)
    expect(fired).toBe(0)
    expect(notifications.create).not.toHaveBeenCalled()
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 9)
  })

  it('fires the 14-day alert once when crossing prev<=14 -> new>14 (already past 7)', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: 14, lastActivityAt: new Date(now.getTime() - 15 * day) }),
    ])
    notifications.create.mockResolvedValue({} as never)

    const fired = await sweepGhostAlerts(now)

    expect(fired).toBe(1)
    expect(notifications.create).toHaveBeenCalledTimes(1)
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'u1',
      message: 'Ghost alert: Acme - SWE - no activity for 15 days',
      type: 'GHOST_ALERT',
      relatedJobId: 'j1',
    })
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 15)
  })

  it('fires BOTH alerts in a single run when a job jumps prev<=7 -> new>14 (double crossing)', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: 3, lastActivityAt: new Date(now.getTime() - 20 * day) }),
    ])
    notifications.create.mockResolvedValue({} as never)

    const fired = await sweepGhostAlerts(now)

    // Two independent thresholds crossed in one run -> two notifications.
    expect(fired).toBe(2)
    expect(notifications.create).toHaveBeenCalledTimes(2)
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'u1',
      message: 'Acme - SWE has been inactive for 20 days',
      type: 'GHOST_ALERT',
      relatedJobId: 'j1',
    })
    expect(notifications.create).toHaveBeenCalledWith({
      userId: 'u1',
      message: 'Ghost alert: Acme - SWE - no activity for 20 days',
      type: 'GHOST_ALERT',
      relatedJobId: 'j1',
    })
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 20)
  })

  it('persists ghostDays without firing when no threshold is crossed', async () => {
    const now = new Date('2026-06-20T00:00:00Z')
    jobs.findAllNonArchivedJobs.mockResolvedValue([
      fakeJob({ id: 'j1', ghostDays: 2, lastActivityAt: new Date(now.getTime() - 3 * day) }),
    ])
    const fired = await sweepGhostAlerts(now)
    expect(fired).toBe(0)
    expect(notifications.create).not.toHaveBeenCalled()
    expect(jobs.setJobGhostDays).toHaveBeenCalledWith('j1', 3)
  })

  it('fires the 7-day alert exactly once across two consecutive daily runs (dedup)', async () => {
    // Day 1: a job at lastActivity = 8 days before "now", with the stored anchor
    // still at its day-0 value (0). It crosses 7 -> one alert, and the new anchor (8)
    // is persisted. We feed that persisted anchor back in for Day 2 (one day later,
    // now 9 days inactive): prev=8 > 7 means NO re-fire.
    const day1Now = new Date('2026-06-20T00:00:00Z')
    const lastActivity = new Date(day1Now.getTime() - 8 * day) // 8 days before day1

    jobs.findAllNonArchivedJobs.mockResolvedValueOnce([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: 0, lastActivityAt: lastActivity }),
    ])
    notifications.create.mockResolvedValue({} as never)

    const firedDay1 = await sweepGhostAlerts(day1Now)
    expect(firedDay1).toBe(1)
    // capture the anchor the sweep persisted on day 1
    const persistedDay1 = jobs.setJobGhostDays.mock.calls.at(-1)?.[1]
    expect(persistedDay1).toBe(8)

    // Day 2: one day later, same lastActivity (now 9 days stale), anchor fed back in.
    const day2Now = new Date(day1Now.getTime() + day)
    jobs.findAllNonArchivedJobs.mockResolvedValueOnce([
      fakeJob({ id: 'j1', userId: 'u1', company: 'Acme', title: 'SWE', ghostDays: persistedDay1 as number, lastActivityAt: lastActivity }),
    ])

    const firedDay2 = await sweepGhostAlerts(day2Now)
    expect(firedDay2).toBe(0)

    // Across both runs the 7-day alert fired exactly once total.
    expect(notifications.create).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/scheduler/ghost-sweep.test.ts`. Expect: cannot resolve `./ghost-sweep.js`.

- [ ] **Step 3: Implement** — `backend-express/src/scheduler/ghost-sweep.ts` (final, complete; no stub, no afterthought note):
```ts
import { schedulerRepository } from './scheduler.repository.js'
import { notificationsService } from '@/modules/notifications/notifications.service.js'
import { GHOST_STALE_DAYS, GHOST_GHOST_DAYS, deriveGhostDays } from '@/shared/ghost.js'

/**
 * Daily ghost sweep across ALL users' non-ARCHIVED jobs (system-wide via the
 * scheduler repository — deliberately not user-scoped, unlike request paths).
 *
 * For each job it compares the stored `ghostDays` (the previous-run anchor) with
 * the freshly derived value and fires a GHOST_ALERT once per threshold crossing
 * (prev <= T && next > T). The 7-day and 14-day checks are TWO INDEPENDENT ifs, so
 * a job that jumps from prev<=7 straight past 14 in one run fires BOTH alerts
 * (legacy parity). The new anchor is then persisted so each threshold never
 * re-fires on a later run. `now` is injected for testability. Returns the number
 * of alerts fired.
 */
export async function sweepGhostAlerts(now: Date): Promise<number> {
  const jobs = await schedulerRepository.findAllNonArchivedJobs()
  let fired = 0

  for (const job of jobs) {
    const prev = job.ghostDays
    const next = deriveGhostDays({ lastActivityAt: job.lastActivityAt, createdAt: job.createdAt }, now.getTime())

    if (prev <= GHOST_STALE_DAYS && next > GHOST_STALE_DAYS) {
      await notificationsService.create({
        userId: job.userId,
        message: `${job.company} - ${job.title} has been inactive for ${next} days`,
        type: 'GHOST_ALERT',
        relatedJobId: job.id,
      })
      fired += 1
    }

    if (prev <= GHOST_GHOST_DAYS && next > GHOST_GHOST_DAYS) {
      await notificationsService.create({
        userId: job.userId,
        message: `Ghost alert: ${job.company} - ${job.title} - no activity for ${next} days`,
        type: 'GHOST_ALERT',
        relatedJobId: job.id,
      })
      fired += 1
    }

    await schedulerRepository.setJobGhostDays(job.id, next)
  }

  return fired
}
```

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/scheduler/ghost-sweep.test.ts` then `cd backend-express && npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/scheduler/ghost-sweep.ts backend-express/src/scheduler/ghost-sweep.test.ts
git commit -m "feat(backend-express): add ghost-alert sweep with crossing detection"
```

---

### Task 17: Scheduler cron wiring + `ENABLE_SCHEDULER` env + lifecycle

**Files:**
- Create: `backend-express/src/scheduler/scheduler.ts`
- Modify: `backend-express/src/config/env.ts`
- Modify: `backend-express/src/config/env.test.ts`
- Modify: `backend-express/src/index.ts`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Write the failing test** — `backend-express/src/config/env.test.ts` is an **existing** file (it already holds the `parseEnv` + `getEnv` suites — do NOT recreate or replace it). **Append** a new `describe('ENABLE_SCHEDULER', ...)` block after the existing `getEnv` block. The anchor is the file's final closing line:
  - Anchor (the last existing line of the file):
    ```ts
    })
    ```
  - Insert this block immediately after that final `})` so it sits at the top level alongside the existing `describe` blocks:
    ```ts

    describe('ENABLE_SCHEDULER', () => {
      const base = {
        CORS_ORIGINS: 'http://localhost:8080',
        DATABASE_URL: 'postgres://x:x@x:5432/x',
        JWT_SECRET: 'a'.repeat(32),
      }

      it('defaults to false when absent', () => {
        expect(parseEnv(base).ENABLE_SCHEDULER).toBe(false)
      })
      it('parses the string "true" -> true', () => {
        expect(parseEnv({ ...base, ENABLE_SCHEDULER: 'true' }).ENABLE_SCHEDULER).toBe(true)
      })
      it('parses the string "1" -> true', () => {
        expect(parseEnv({ ...base, ENABLE_SCHEDULER: '1' }).ENABLE_SCHEDULER).toBe(true)
      })
      it('parses the string "false" -> false (NOT a footgun-coerced true)', () => {
        expect(parseEnv({ ...base, ENABLE_SCHEDULER: 'false' }).ENABLE_SCHEDULER).toBe(false)
      })
    })
    ```
  > `describe`, `it`, `expect`, and `parseEnv` are already imported at the top of the existing file — no import changes are needed.

- [ ] **Step 2: Run it, expect FAIL** — `cd backend-express && npm run test -- src/config/env.test.ts`. Expect the new `ENABLE_SCHEDULER` cases to fail (`ENABLE_SCHEDULER` is `undefined`); the existing `parseEnv`/`getEnv` cases still pass.

- [ ] **Step 3a: Add the env var (SAFE boolean parse)** — in `backend-express/src/config/env.ts`, add this field to the `z.object({ ... })` immediately after the `LOG_LEVEL` line. Do **not** use `z.coerce.boolean()` (it coerces the string `'false'` to `true`); use the safe string transform:
```ts
  // Safe boolean parse: z.coerce.boolean() would coerce the string 'false' to
  // TRUE. Treat only 'true'/'1' as true; anything else (incl. absent) is false.
  ENABLE_SCHEDULER: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
```

- [ ] **Step 3b: Implement the scheduler** — `backend-express/src/scheduler/scheduler.ts`:
```ts
import cron, { type ScheduledTask } from 'node-cron'
import { logger } from '@/shared/logger.js'
import { sweepDueReminders } from './reminder-sweep.js'
import { sweepGhostAlerts } from './ghost-sweep.js'

let tasks: ScheduledTask[] = []

export function startScheduler(): ScheduledTask[] {
  const reminderTask = cron.schedule('*/5 * * * *', () => {
    void (async () => {
      try {
        const swept = await sweepDueReminders(new Date())
        if (swept > 0) logger.info({ swept }, 'reminder sweep fired notifications')
      } catch (err) {
        logger.error({ err }, 'reminder sweep failed')
      }
    })()
  })

  const ghostTask = cron.schedule('0 0 * * *', () => {
    void (async () => {
      try {
        const fired = await sweepGhostAlerts(new Date())
        if (fired > 0) logger.info({ fired }, 'ghost sweep fired alerts')
      } catch (err) {
        logger.error({ err }, 'ghost sweep failed')
      }
    })()
  })

  tasks = [reminderTask, ghostTask]
  logger.info('scheduler started')
  return tasks
}

export function stopScheduler(): void {
  for (const task of tasks) task.stop()
  tasks = []
}
```

- [ ] **Step 3c: Wire the lifecycle in `index.ts`** — replace `backend-express/src/index.ts` entirely:
```ts
import 'dotenv/config'
import { createApp } from './app.js'
import { getEnv } from './config/env.js'
import { logger } from './shared/logger.js'
import { closeDb } from './db/client.js'
import { startScheduler, stopScheduler } from './scheduler/scheduler.js'

const env = getEnv()
const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'backend-express started')
})

// Started only after listen() (never inside createApp), so supertest/vitest never
// spin live timers. Gated on ENABLE_SCHEDULER and off in test.
if (env.ENABLE_SCHEDULER && env.NODE_ENV !== 'test') {
  startScheduler()
}

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  stopScheduler()
  const forceExit = setTimeout(() => {
    logger.error('forced exit after 10s')
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  server.close(async (err) => {
    if (err) logger.error({ err }, 'server close failed')
    try {
      await closeDb()
    } catch (closeErr) {
      logger.error({ err: closeErr }, 'db close failed')
    }
    process.exit(err ? 1 : 0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection')
})
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException')
  shutdown('uncaughtException')
})
```

- [ ] **Step 3d: Enable in Docker** — in `docker-compose.yml`, add the `ENABLE_SCHEDULER` line to the `backend-express` service `environment:` block. The block currently ends with `LOG_LEVEL` then `CHOKIDAR_USEPOLLING`; anchor the edit on the existing `CHOKIDAR_USEPOLLING` line. Change:
```yaml
      LOG_LEVEL: ${LOG_LEVEL:-info}
      CHOKIDAR_USEPOLLING: "true"
```
  to:
```yaml
      LOG_LEVEL: ${LOG_LEVEL:-info}
      ENABLE_SCHEDULER: ${ENABLE_SCHEDULER:-true}
      CHOKIDAR_USEPOLLING: "true"
```
  > After this change (combined with the node-cron dependency from Task 13), recreate the stack with `docker compose up -d --build --force-recreate --renew-anon-volumes` so the new dep + env land in the container.

- [ ] **Step 4: Run it, expect PASS** — `cd backend-express && npm run test -- src/config/env.test.ts` (all four new `ENABLE_SCHEDULER` cases pass **and** the prior `parseEnv`/`getEnv` cases still pass) then `cd backend-express && npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add backend-express/src/scheduler/scheduler.ts backend-express/src/config/env.ts backend-express/src/config/env.test.ts backend-express/src/index.ts docker-compose.yml
git commit -m "feat(backend-express): wire node-cron scheduler into the server lifecycle"
```

---

### Task 18: Backend full gate

**Files:** (none — verification only)

- [ ] **Step 1: Typecheck + lint** — `cd backend-express && npm run typecheck && npm run lint`. Both must pass.

- [ ] **Step 2: Full test suite (Docker DB up for the integration tests)** — `cd /home/weloin/Projects/job-vault && docker compose up -d` then `cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run test` (or run the whole suite inside the container: `docker compose exec backend-express npm run test`). Expect all green.

- [ ] **Step 3: Commit** (only if lint produced auto-fixable formatting changes; otherwise skip)
```bash
cd /home/weloin/Projects/job-vault
git add -A backend-express
git commit -m "chore(backend-express): slice 4b lint/format pass" || echo "nothing to commit"
```

---

### Task 19: Frontend types + query keys

**Files:**
- Create: `frontend-next/src/types/notification.ts`
- Create: `frontend-next/src/types/reminder.ts`
- Modify: `frontend-next/src/lib/query-keys.ts`

- [ ] **Step 1: Implement the types** — `frontend-next/src/types/notification.ts`:
```ts
export type NotificationType = 'GHOST_ALERT' | 'REMINDER' | 'STATUS_CHANGE' | 'GENERAL'

export interface Notification {
  id: string
  userId: string
  message: string
  type: NotificationType
  isRead: boolean
  relatedJobId: string | null
  createdAt: string
}
```
  And `frontend-next/src/types/reminder.ts`:
```ts
export interface Reminder {
  id: string
  jobId: string
  userId: string
  message: string
  remindAt: string
  isCompleted: boolean
  createdAt: string
}
```

- [ ] **Step 2: Extend the query keys** — `frontend-next/src/lib/query-keys.ts` becomes (canonical cross-slice names; `NOTIFICATIONS_KEY` is a single param-less key — the bell derives unread client-side — and `remindersKey(jobId)` is per-job):
```ts
export const JOBS_KEY = ['jobs'] as const
export const jobKey = (id: string) => ['jobs', id] as const
export const DASHBOARD_KANBAN_KEY = ['dashboard', 'kanban'] as const
export const DASHBOARD_STATS_KEY = ['dashboard', 'stats'] as const
export const NOTIFICATIONS_KEY = ['notifications'] as const
export const remindersKey = (jobId: string) => ['reminders', jobId] as const
```

- [ ] **Step 3: Typecheck** — `cd frontend-next && npm run typecheck`.

- [ ] **Step 4: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add frontend-next/src/types/notification.ts frontend-next/src/types/reminder.ts frontend-next/src/lib/query-keys.ts
git commit -m "feat(frontend-next): add notification + reminder types and query keys"
```

---

### Task 20: `use-notifications` hook

**Files:**
- Create: `frontend-next/src/hooks/use-notifications.ts`
- Create: `frontend-next/src/hooks/use-notifications.test.tsx`

- [ ] **Step 1: Write the failing test** — `frontend-next/src/hooks/use-notifications.test.tsx`:
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
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from './use-notifications'
import { NOTIFICATIONS_KEY } from '@/lib/query-keys'

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
  return { Wrapper, invalidate }
}

beforeEach(() => vi.clearAllMocks())

describe('useNotifications', () => {
  it('fetches /api/notifications (whole list, no unreadOnly param)', async () => {
    api.get.mockResolvedValue([{ id: 'n1', message: 'hi', isRead: false }])
    const { result } = renderHook(() => useNotifications(), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.id).toBe('n1'))
    expect(api.get).toHaveBeenCalledWith('/api/notifications')
  })
})

describe('useMarkNotificationRead', () => {
  it('patches /api/notifications/:id/read and invalidates the list', async () => {
    api.patch.mockResolvedValue({ id: 'n1', isRead: true })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: Wrapper })
    result.current.mutate('n1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/notifications/n1/read')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTIFICATIONS_KEY })
  })
})

describe('useMarkAllNotificationsRead', () => {
  it('patches /api/notifications/read-all and invalidates the list', async () => {
    api.patch.mockResolvedValue({ updated: 3 })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: Wrapper })
    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/notifications/read-all')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTIFICATIONS_KEY })
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd frontend-next && npm run test -- src/hooks/use-notifications.test.tsx`. Expect: cannot resolve `./use-notifications`.

- [ ] **Step 3: Implement** — `frontend-next/src/hooks/use-notifications.ts` (fetches the whole list with NO `unreadOnly` param from the client; the bell derives unread client-side. Event-driven liveness: refetch-on-focus + `staleTime: 0`, NO `refetchInterval` — real-time push lands in Slice 4c):
```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { NOTIFICATIONS_KEY } from '@/lib/query-keys'
import type { Notification } from '@/types/notification'

// Event-driven liveness: refetch on window focus + invalidate-on-mutation. No
// refetchInterval — real-time push lands in Slice 4c. The whole list is fetched
// (no unreadOnly query param); the bell derives the unread count client-side.
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => apiClient.get<Notification[]>('/api/notifications'),
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<Notification>(`/api/notifications/${id}/read`),
    onMutate: (id) => {
      const previous = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY)
      if (previous) {
        qc.setQueryData<Notification[]>(
          NOTIFICATIONS_KEY,
          previous.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        )
      }
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(NOTIFICATIONS_KEY, context.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.patch<{ updated: number }>('/api/notifications/read-all'),
    onMutate: () => {
      const previous = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY)
      if (previous) {
        qc.setQueryData<Notification[]>(
          NOTIFICATIONS_KEY,
          previous.map((n) => ({ ...n, isRead: true })),
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(NOTIFICATIONS_KEY, context.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    },
  })
}
```

- [ ] **Step 4: Run it, expect PASS** — `cd frontend-next && npm run test -- src/hooks/use-notifications.test.tsx`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add frontend-next/src/hooks/use-notifications.ts frontend-next/src/hooks/use-notifications.test.tsx
git commit -m "feat(frontend-next): add useNotifications hooks"
```

---

### Task 21: `use-reminders` hook

**Files:**
- Create: `frontend-next/src/hooks/use-reminders.ts`
- Create: `frontend-next/src/hooks/use-reminders.test.tsx`

- [ ] **Step 1: Write the failing test** — `frontend-next/src/hooks/use-reminders.test.tsx`:
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
import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from './use-reminders'
import { remindersKey } from '@/lib/query-keys'

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
  return { Wrapper, invalidate }
}

beforeEach(() => vi.clearAllMocks())

describe('useReminders', () => {
  it('fetches /api/jobs/:jobId/reminders', async () => {
    api.get.mockResolvedValue([{ id: 'r1', message: 'Ping' }])
    const { result } = renderHook(() => useReminders('j1'), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.id).toBe('r1'))
    expect(api.get).toHaveBeenCalledWith('/api/jobs/j1/reminders')
  })
})

describe('useCreateReminder', () => {
  it('posts to /api/jobs/:jobId/reminders and invalidates the list', async () => {
    api.post.mockResolvedValue({ id: 'r1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useCreateReminder('j1'), { wrapper: Wrapper })
    result.current.mutate({ message: 'Ping', remindAt: '2026-07-01T00:00:00Z' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/reminders', { message: 'Ping', remindAt: '2026-07-01T00:00:00Z' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: remindersKey('j1') })
  })
})

describe('useUpdateReminder', () => {
  it('patches /api/reminders/:id and invalidates the list', async () => {
    api.patch.mockResolvedValue({ id: 'r1', isCompleted: true })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useUpdateReminder('j1'), { wrapper: Wrapper })
    result.current.mutate({ id: 'r1', patch: { isCompleted: true } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/reminders/r1', { isCompleted: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: remindersKey('j1') })
  })
})

describe('useDeleteReminder', () => {
  it('deletes /api/reminders/:id and invalidates the list', async () => {
    api.delete.mockResolvedValue({ id: 'r1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useDeleteReminder('j1'), { wrapper: Wrapper })
    result.current.mutate('r1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/reminders/r1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: remindersKey('j1') })
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd frontend-next && npm run test -- src/hooks/use-reminders.test.tsx`. Expect: cannot resolve `./use-reminders`.

- [ ] **Step 3: Implement** — `frontend-next/src/hooks/use-reminders.ts`:
```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { remindersKey } from '@/lib/query-keys'
import type { Reminder } from '@/types/reminder'

export interface CreateReminderValues {
  message: string
  remindAt: string
}

export interface UpdateReminderValues {
  message?: string
  remindAt?: string
  isCompleted?: boolean
}

export function useReminders(jobId: string) {
  return useQuery({
    queryKey: remindersKey(jobId),
    queryFn: () => apiClient.get<Reminder[]>(`/api/jobs/${jobId}/reminders`),
  })
}

export function useCreateReminder(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateReminderValues) =>
      apiClient.post<Reminder>(`/api/jobs/${jobId}/reminders`, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKey(jobId) })
    },
  })
}

export function useUpdateReminder(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateReminderValues }) =>
      apiClient.patch<Reminder>(`/api/reminders/${id}`, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKey(jobId) })
    },
  })
}

export function useDeleteReminder(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ id: string }>(`/api/reminders/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKey(jobId) })
    },
  })
}
```

- [ ] **Step 4: Run it, expect PASS** — `cd frontend-next && npm run test -- src/hooks/use-reminders.test.tsx`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add frontend-next/src/hooks/use-reminders.ts frontend-next/src/hooks/use-reminders.test.tsx
git commit -m "feat(frontend-next): add useReminders hooks"
```

---

### Task 22: `Popover` UI primitive

**Files:**
- Create: `frontend-next/src/components/ui/popover.tsx`

- [ ] **Step 1: Implement** (no separate test — it is a thin Radix wrapper exercised by `NotificationBell`'s tests in Task 23) — `frontend-next/src/components/ui/popover.tsx`:
```tsx
'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

export const Popover = DialogPrimitive.Root
export const PopoverTrigger = DialogPrimitive.Trigger
export const PopoverClose = DialogPrimitive.Close
export const PopoverTitle = DialogPrimitive.Title

function PopoverOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      // Radix portals to <body>, outside [data-theme-scope="app"]; re-apply the
      // scope so the theme tokens resolve inside the popover.
      data-theme-scope="app"
      className={cn('fixed inset-0 z-40', className)}
      {...props}
    />
  )
}

// A lightweight popover built on the dialog primitive: anchored top-right (under
// the header bell) rather than centered. Behavior (focus trap, escape, outside
// click) comes from Radix; presentation is ours.
export function PopoverContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <PopoverOverlay />
      <DialogPrimitive.Content
        data-theme-scope="app"
        className={cn(
          'fixed right-4 top-16 z-50 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
```

- [ ] **Step 2: Typecheck** — `cd frontend-next && npm run typecheck`.

- [ ] **Step 3: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add frontend-next/src/components/ui/popover.tsx
git commit -m "feat(frontend-next): add Popover UI primitive"
```

---

### Task 23: `NotificationItem` + `NotificationPopover` + `NotificationBell`

**Files:**
- Create: `frontend-next/src/components/notifications/notification-item.tsx`
- Create: `frontend-next/src/components/notifications/notification-item.test.tsx`
- Create: `frontend-next/src/components/notifications/notification-popover.tsx`
- Create: `frontend-next/src/components/notifications/notification-bell.tsx`
- Create: `frontend-next/src/components/notifications/notification-bell.test.tsx`

- [ ] **Step 1: Write the failing tests** — `frontend-next/src/components/notifications/notification-item.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Notification } from '@/types/notification'
import { NotificationItem } from './notification-item'

function fake(over: Partial<Notification> = {}): Notification {
  return {
    id: 'n1', userId: 'u1', message: 'Ping recruiter', type: 'REMINDER',
    isRead: false, relatedJobId: 'j1', createdAt: new Date().toISOString(), ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('NotificationItem', () => {
  it('renders the message', () => {
    render(<NotificationItem notification={fake()} onSelect={vi.fn()} />)
    expect(screen.getByText('Ping recruiter')).toBeInTheDocument()
  })

  it('calls onSelect with the notification when clicked', async () => {
    const onSelect = vi.fn()
    const n = fake()
    render(<NotificationItem notification={n} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(n)
  })

  it('marks unread visually via the data attribute', () => {
    render(<NotificationItem notification={fake({ isRead: false })} onSelect={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('data-unread', 'true')
  })
})
```
  And `frontend-next/src/components/notifications/notification-bell.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => new URLSearchParams(''),
}))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { NotificationBell } from './notification-bell'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('NotificationBell', () => {
  it('hides the badge when there are no unread notifications', async () => {
    api.get.mockResolvedValue([{ id: 'n1', message: 'x', type: 'REMINDER', isRead: true, relatedJobId: null, userId: 'u1', createdAt: '' }])
    render(<NotificationBell />, { wrapper })
    await screen.findByRole('button', { name: /notifications/i })
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
  })

  it('shows the unread count, capped at 99+', async () => {
    api.get.mockResolvedValue(
      Array.from({ length: 150 }, (_, i) => ({
        id: `n${i}`, message: 'x', type: 'REMINDER', isRead: false, relatedJobId: null, userId: 'u1', createdAt: '',
      })),
    )
    render(<NotificationBell />, { wrapper })
    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('99+')
  })
})
```

- [ ] **Step 2: Run them, expect FAIL** — `cd frontend-next && npm run test -- src/components/notifications/notification-item.test.tsx src/components/notifications/notification-bell.test.tsx`. Expect: cannot resolve the component modules.

- [ ] **Step 3a: Implement `notification-item.tsx`**:
```tsx
'use client'

import { Ghost, Bell, ArrowRightLeft, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/notification'

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  GHOST_ALERT: Ghost,
  REMINDER: Bell,
  STATUS_CHANGE: ArrowRightLeft,
  GENERAL: Info,
}

export function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification
  onSelect: (notification: Notification) => void
}) {
  const Icon = TYPE_ICON[notification.type]
  return (
    <button
      type="button"
      data-unread={notification.isRead ? 'false' : 'true'}
      onClick={() => onSelect(notification)}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent',
        notification.isRead ? 'text-muted-foreground' : 'text-foreground',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className={cn('text-sm leading-snug', notification.isRead ? 'font-normal' : 'font-medium')}>
        {notification.message}
      </span>
    </button>
  )
}
```

- [ ] **Step 3b: Implement `notification-popover.tsx`**:
```tsx
'use client'

import { Button } from '@/components/ui/button'
import { PopoverContent, PopoverTitle } from '@/components/ui/popover'
import { NotificationItem } from './notification-item'
import type { Notification } from '@/types/notification'

export function NotificationPopover({
  notifications,
  hasUnread,
  onSelect,
  onMarkAllRead,
}: {
  notifications: Notification[]
  hasUnread: boolean
  onSelect: (notification: Notification) => void
  onMarkAllRead: () => void
}) {
  return (
    <PopoverContent>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <PopoverTitle className="text-sm font-semibold">Notifications</PopoverTitle>
        {hasUnread ? (
          <Button type="button" variant="ghost" size="sm" onClick={onMarkAllRead}>
            Mark all read
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          notifications.map((n) => <NotificationItem key={n.id} notification={n} onSelect={onSelect} />)
        )}
      </div>
    </PopoverContent>
  )
}
```

- [ ] **Step 3c: Implement `notification-bell.tsx`** (derives the unread count client-side from the fetched list):
```tsx
'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications'
import { NotificationPopover } from './notification-popover'
import type { Notification } from '@/types/notification'

export function NotificationBell() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const [open, setOpen] = useState(false)

  // Unread is derived client-side from the fetched list (no /unread-count endpoint).
  const unread = notifications.filter((n) => !n.isRead).length
  const badge = unread > 99 ? '99+' : String(unread)

  function handleSelect(notification: Notification) {
    if (!notification.isRead) markRead.mutate(notification.id)
    setOpen(false)
    if (notification.relatedJobId) {
      const params = new URLSearchParams(searchParams)
      params.set('job', notification.relatedJobId)
      router.push(`${pathname}?${params.toString()}`)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 ? (
            <span
              data-testid="notification-badge"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-medium leading-none text-primary-foreground tabular-nums"
            >
              {badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <NotificationPopover
        notifications={notifications}
        hasUnread={unread > 0}
        onSelect={handleSelect}
        onMarkAllRead={() => markAllRead.mutate()}
      />
    </Popover>
  )
}
```

- [ ] **Step 4: Run them, expect PASS** — `cd frontend-next && npm run test -- src/components/notifications/notification-item.test.tsx src/components/notifications/notification-bell.test.tsx`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add frontend-next/src/components/notifications
git commit -m "feat(frontend-next): add notification bell + popover + item"
```

---

### Task 24: Reminder UI — `ReminderForm`, `ReminderItem`, `ReminderList`, `RemindersSection`

**Files:**
- Create: `frontend-next/src/components/jobs/reminders/reminder-form.tsx`
- Create: `frontend-next/src/components/jobs/reminders/reminder-form.test.tsx`
- Create: `frontend-next/src/components/jobs/reminders/reminder-item.tsx`
- Create: `frontend-next/src/components/jobs/reminders/reminder-item.test.tsx`
- Create: `frontend-next/src/components/jobs/reminders/reminder-list.tsx`
- Create: `frontend-next/src/components/jobs/reminders/reminders-section.tsx`

- [ ] **Step 1: Write the failing tests** — `frontend-next/src/components/jobs/reminders/reminder-form.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReminderForm } from './reminder-form'

beforeEach(() => vi.clearAllMocks())

describe('ReminderForm', () => {
  it('submits the message + remindAt and clears the message', async () => {
    const onSubmit = vi.fn()
    render(<ReminderForm onSubmit={onSubmit} isPending={false} />)
    await userEvent.type(screen.getByLabelText(/reminder/i), 'Ping recruiter')
    const dt = screen.getByLabelText(/when/i)
    await userEvent.type(dt, '2026-07-01T09:00')
    await userEvent.click(screen.getByRole('button', { name: /add reminder/i }))
    expect(onSubmit).toHaveBeenCalledWith({ message: 'Ping recruiter', remindAt: new Date('2026-07-01T09:00').toISOString() })
  })

  it('does not submit an empty message', async () => {
    const onSubmit = vi.fn()
    render(<ReminderForm onSubmit={onSubmit} isPending={false} />)
    await userEvent.type(screen.getByLabelText(/when/i), '2026-07-01T09:00')
    await userEvent.click(screen.getByRole('button', { name: /add reminder/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
```
  `frontend-next/src/components/jobs/reminders/reminder-item.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Reminder } from '@/types/reminder'
import { ReminderItem } from './reminder-item'

function fake(over: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r1', jobId: 'j1', userId: 'u1', message: 'Ping recruiter',
    remindAt: new Date('2099-01-01T00:00:00Z').toISOString(), isCompleted: false,
    createdAt: new Date().toISOString(), ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('ReminderItem', () => {
  it('renders the message', () => {
    render(<ReminderItem reminder={fake()} onToggleComplete={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Ping recruiter')).toBeInTheDocument()
  })

  it('marks overdue past-due, not-completed reminders', () => {
    render(<ReminderItem reminder={fake({ remindAt: new Date('2000-01-01T00:00:00Z').toISOString() })} onToggleComplete={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('reminder-item')).toHaveAttribute('data-overdue', 'true')
  })

  it('calls onToggleComplete and onDelete', async () => {
    const onToggleComplete = vi.fn()
    const onDelete = vi.fn()
    render(<ReminderItem reminder={fake()} onToggleComplete={onToggleComplete} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /complete/i }))
    expect(onToggleComplete).toHaveBeenCalledWith(fake())
    await userEvent.click(screen.getByRole('button', { name: /delete reminder/i }))
    expect(onDelete).toHaveBeenCalledWith('r1')
  })
})
```

- [ ] **Step 2: Run them, expect FAIL** — `cd frontend-next && npm run test -- src/components/jobs/reminders/reminder-form.test.tsx src/components/jobs/reminders/reminder-item.test.tsx`. Expect: cannot resolve the modules.

- [ ] **Step 3a: Implement `reminder-form.tsx`**:
```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ReminderFormValues {
  message: string
  remindAt: string
}

export function ReminderForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (values: ReminderFormValues) => void
  isPending: boolean
}) {
  const [message, setMessage] = useState('')
  const [when, setWhen] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!message.trim() || !when) return
    onSubmit({ message: message.trim(), remindAt: new Date(when).toISOString() })
    setMessage('')
    setWhen('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1.5">
        <Label htmlFor="reminder-message">Reminder</Label>
        <Input
          id="reminder-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ping the recruiter"
          maxLength={500}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reminder-when">When</Label>
        <Input id="reminder-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <Button type="submit" size="sm" disabled={isPending || !message.trim() || !when}>
        Add reminder
      </Button>
    </form>
  )
}
```

- [ ] **Step 3b: Implement `reminder-item.tsx`**:
```tsx
'use client'

import { Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Reminder } from '@/types/reminder'

export function ReminderItem({
  reminder,
  onToggleComplete,
  onDelete,
}: {
  reminder: Reminder
  onToggleComplete: (reminder: Reminder) => void
  onDelete: (id: string) => void
}) {
  const overdue = !reminder.isCompleted && new Date(reminder.remindAt).getTime() < Date.now()
  const due = new Date(reminder.remindAt)

  return (
    <div
      data-testid="reminder-item"
      data-overdue={overdue ? 'true' : 'false'}
      className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
    >
      <div className="min-w-0 space-y-0.5">
        <p className={cn('text-sm leading-snug', reminder.isCompleted && 'text-muted-foreground line-through')}>
          {reminder.message}
        </p>
        <p className={cn('font-mono text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}>
          {due.toLocaleString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={reminder.isCompleted ? 'Mark incomplete' : 'Complete'}
          onClick={() => onToggleComplete(reminder)}
        >
          <Check className={cn('size-4', reminder.isCompleted && 'text-primary')} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete reminder"
          onClick={() => onDelete(reminder.id)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3c: Implement `reminder-list.tsx`**:
```tsx
'use client'

import { ReminderItem } from './reminder-item'
import type { Reminder } from '@/types/reminder'

export function ReminderList({
  reminders,
  onToggleComplete,
  onDelete,
}: {
  reminders: Reminder[]
  onToggleComplete: (reminder: Reminder) => void
  onDelete: (id: string) => void
}) {
  if (reminders.length === 0) {
    return <p className="text-sm text-muted-foreground">No reminders yet.</p>
  }
  return (
    <div className="space-y-2">
      {reminders.map((reminder) => (
        <ReminderItem
          key={reminder.id}
          reminder={reminder}
          onToggleComplete={onToggleComplete}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3d: Implement `reminders-section.tsx`**:
```tsx
'use client'

import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from '@/hooks/use-reminders'
import { ReminderList } from './reminder-list'
import { ReminderForm, type ReminderFormValues } from './reminder-form'
import type { Reminder } from '@/types/reminder'

export function RemindersSection({ jobId }: { jobId: string }) {
  const { data: reminders = [] } = useReminders(jobId)
  const create = useCreateReminder(jobId)
  const update = useUpdateReminder(jobId)
  const remove = useDeleteReminder(jobId)

  function handleSubmit(values: ReminderFormValues) {
    create.mutate(values)
  }

  function handleToggleComplete(reminder: Reminder) {
    update.mutate({ id: reminder.id, patch: { isCompleted: !reminder.isCompleted } })
  }

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">Reminders</h3>
      <ReminderList reminders={reminders} onToggleComplete={handleToggleComplete} onDelete={(id) => remove.mutate(id)} />
      <ReminderForm onSubmit={handleSubmit} isPending={create.isPending} />
    </section>
  )
}
```

- [ ] **Step 4: Run them, expect PASS** — `cd frontend-next && npm run test -- src/components/jobs/reminders/reminder-form.test.tsx src/components/jobs/reminders/reminder-item.test.tsx` then `cd frontend-next && npm run typecheck`.

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add frontend-next/src/components/jobs/reminders
git commit -m "feat(frontend-next): add reminders section, list, item and form"
```

---

### Task 25: Wire `RemindersSection` into `JobDrawer` + `NotificationBell` into headers

**Files:**
- Modify: `frontend-next/src/components/jobs/job-drawer.tsx`
- Modify: `frontend-next/src/components/jobs/jobs-workspace.tsx`
- Modify: `frontend-next/src/components/dashboard/dashboard-overview.tsx`

- [ ] **Step 1: Write the failing test** — replace `frontend-next/src/components/jobs/job-drawer.test.tsx` with this body (keeps the existing close-on-escape test and adds the Reminders-heading test):
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
  apiClient: { get: vi.fn().mockResolvedValue({ id: 'j1', title: 'Role', company: 'Acme', status: 'APPLIED', ghostDays: 0, notes: null, snapshotMarkdown: null, sourceUrl: null, location: null, salaryRange: null }), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
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

  it('renders the Reminders section for the open job', async () => {
    render(<JobDrawer jobId="j1" />, { wrapper })
    expect(await screen.findByRole('heading', { name: /reminders/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `cd frontend-next && npm run test -- src/components/jobs/job-drawer.test.tsx`. Expect: the Reminders heading is not found.

- [ ] **Step 3a: Wire `RemindersSection` in `job-drawer.tsx`** — add the import and render it below the snapshot. The file becomes:
```tsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useJob } from '@/hooks/use-jobs'
import { JobDetails } from './job-details'
import { JobSnapshot } from './job-snapshot'
import { RemindersSection } from './reminders/reminders-section'

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
              <div className="border-t border-border pt-5">
                <RemindersSection jobId={job.id} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3b: Wire `NotificationBell` in `jobs-workspace.tsx`** — add the import and render the bell first in the actions region:
  - Add import near the other component imports:
    ```tsx
    import { NotificationBell } from '@/components/notifications/notification-bell'
    ```
  - Replace the `actions` JSX with:
    ```tsx
      const actions = (
        <>
          <NotificationBell />
          <SegmentedControl value={view} onValueChange={setView} options={VIEW_OPTIONS} aria-label="Switch view" />
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add job
          </Button>
        </>
      )
    ```

- [ ] **Step 3c: Wire `NotificationBell` in `dashboard-overview.tsx`** — add the import and pass it as the header `actions`. The file becomes:
```tsx
'use client'

import { useStats } from '@/hooks/use-dashboard'
import { PageHeader } from '@/components/layout/app/page-header'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { DashboardStats } from './dashboard-stats'
import type { DashboardStats as Stats } from '@/types/dashboard'

export function DashboardOverview({ initialStats }: { initialStats: Stats }) {
  const { data } = useStats(initialStats)
  const stats = data ?? initialStats

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Dashboard" description="Your job search at a glance." actions={<NotificationBell />} />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <DashboardStats stats={stats} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the affected tests, expect PASS** — `cd frontend-next && npm run test -- src/components/jobs/job-drawer.test.tsx src/components/jobs/jobs-workspace.test.tsx src/components/dashboard/dashboard-overview.test.tsx` then `cd frontend-next && npm run typecheck`. (If `jobs-workspace.test.tsx` / `dashboard-overview.test.tsx` lack an `apiClient` mock and now break because the bell calls `apiClient.get`, add `vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn().mockResolvedValue([]), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class ApiError extends Error {} }))` to the top of whichever file fails — mirror the existing mock idiom — and re-run.)

- [ ] **Step 5: Commit**
```bash
cd /home/weloin/Projects/job-vault
git add frontend-next/src/components/jobs/job-drawer.tsx frontend-next/src/components/jobs/job-drawer.test.tsx frontend-next/src/components/jobs/jobs-workspace.tsx frontend-next/src/components/dashboard/dashboard-overview.tsx
git commit -m "feat(frontend-next): wire notification bell into headers + reminders into the job drawer"
```

---

### Task 26: Verification (both apps + Docker smoke test)

**Files:** (none — verification only)

- [ ] **Step 1: Backend gate** — `cd backend-express && npm run typecheck && npm run lint`. With the Docker DB up: `cd /home/weloin/Projects/job-vault && docker compose up -d` then `cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run test` (or `docker compose exec backend-express npm run test`). Expect all green.

- [ ] **Step 2: Frontend gate** — `cd frontend-next && npm run typecheck && npm run lint && npm run test`. Then verify the production build (the dev container owns `.next`, so build in a throwaway image): `docker build --target production ./frontend-next`. Expect a successful build.

- [ ] **Step 3: Docker smoke — reminder → notification** — bring up the full stack with the scheduler on:
```bash
cd /home/weloin/Projects/job-vault
docker compose up -d --build --force-recreate --renew-anon-volumes
```
  Then, against the running stack (app at `http://localhost:8080`, API direct at `http://localhost:3100`):
  1. Register/log in (use the app UI or `curl` the auth endpoints), grab the `accessToken` cookie, and create a job via `POST /api/jobs`.
  2. Create a reminder with a **past** `remindAt`: `curl -s -X POST http://localhost:3100/api/jobs/<jobId>/reminders -H 'Content-Type: application/json' -b "accessToken=<token>" -d '{"message":"Smoke test","remindAt":"2000-01-01T00:00:00Z"}'`.
  3. Trigger the sweep without waiting 5 minutes: `docker compose exec backend-express npx tsx -e "import { sweepDueReminders } from './src/scheduler/reminder-sweep.js'; sweepDueReminders(new Date()).then((n) => { console.log('swept', n); process.exit(0) })"`.
  4. Confirm a REMINDER notification exists: `curl -s http://localhost:3100/api/notifications -b "accessToken=<token>"` shows `{"message":"Smoke test","type":"REMINDER",...}`, and the bell badge shows `1` in the UI.

- [ ] **Step 4: Docker smoke — ghost filter fix** — create a job with an old `lastActivityAt`, then confirm the previously-broken filter now returns it:
  1. `curl -s -X POST http://localhost:3100/api/jobs ...` to create a job, then seed an old activity via SQL: `docker compose exec postgres psql -U postgres -d jobvault -c "UPDATE jobs SET last_activity_at = now() - interval '30 days' WHERE id = '<jobId>';"`.
  2. `curl -s "http://localhost:3100/api/jobs?ghostFilter=ghost" -b "accessToken=<token>"` returns that job (before this slice it returned `[]`).

- [ ] **Step 5: Update progress + commit** — record Slice 4b as done in `progress.md` (mirror the existing slice entries), then:
```bash
cd /home/weloin/Projects/job-vault
git add progress.md
git commit -m "docs(progress): record Slice 4b reminders + notifications + scheduler"
```
