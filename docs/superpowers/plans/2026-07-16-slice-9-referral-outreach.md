# Referral Outreach Tracking (Slice 9) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-job referral outreach tracking — who the user contacted, whether they replied, and the outcome — with a JobDrawer "Outreach" section and count badges on the jobs list + kanban cards.

**Architecture:** New `job_contacts` table (migration `0012`) + a standard `contacts` backend module mirroring the reminders module's dual-router pattern (`/jobs/:jobId/contacts` + `/contacts/:id`). The service emits AUTO timeline events via `timelineService.addAutoEntry`. Aggregate counts merge into `GET /api/jobs` and `GET /api/dashboard/kanban` responses at the service layer via one grouped query (`contactsRepository.countsForJobs`) — existing repository queries untouched. Frontend mirrors the reminders hook/section stack plus a shared `OutreachBadge`.

**Tech Stack:** Express 5 + Drizzle + Zod + Vitest (backend, NodeNext — imports use `.js`); Next.js 15 + React 19 + TanStack Query v5 + RTL (frontend).

**Spec:** `docs/superpowers/specs/2026-07-16-referral-outreach-tracking-design.md`

**Conventions that apply to every task:**
- Backend imports use `.js` suffixes (NodeNext). Path alias `@/` = `src/`.
- Success envelope `{ data }`; errors via `AppError(code, message)`.
- Run backend commands from `backend-express/`, frontend from `frontend-next/`. Repository tests need the Docker Postgres up (`docker compose up -d` at repo root; tests default to `postgres://postgres:postgres@localhost:5433/jobvault`).
- Commit after each task. Plain commit messages, no Claude attribution, never push.

---

### Task 1: `job_contacts` Drizzle schema + migration 0012

**Files:**
- Create: `backend-express/src/db/schema/job-contacts.ts`
- Modify: `backend-express/src/db/schema/index.ts` (add re-export)
- Generated: `backend-express/src/db/migrations/0012_*.sql`

- [ ] **Step 1: Write the schema file**

```ts
// backend-express/src/db/schema/job-contacts.ts
import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'

// Single source of truth for both the Postgres enums and the Zod request
// schemas (imported by contacts.schema.ts) — same pattern as JOB_STATUSES.
export const CONTACT_CHANNELS = ['EMAIL', 'LINKEDIN', 'OTHER'] as const
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]
export const contactChannelEnum = pgEnum('contact_channel', CONTACT_CHANNELS)

export const CONTACT_STATUSES = ['NO_RESPONSE', 'HEARD_BACK', 'REFERRED', 'DECLINED'] as const
export type ContactStatus = (typeof CONTACT_STATUSES)[number]
export const contactStatusEnum = pgEnum('contact_status', CONTACT_STATUSES)

export const jobContacts = pgTable(
  'job_contacts',
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
    // Free text: name, email, LinkedIn URL, or any combo. The app never sends
    // email, so no machine ever needs a parsed address — one field suffices.
    contact: varchar('contact', { length: 500 }).notNull(),
    channel: contactChannelEnum('channel'),
    status: contactStatusEnum('status').notNull().default('NO_RESPONSE'),
    // Editable so outreach can be logged retroactively.
    reachedOutAt: timestamp('reached_out_at', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes'),
  },
  (t) => [
    index('idx_job_contacts_user_id').on(t.userId),
    index('idx_job_contacts_job_id').on(t.jobId),
  ],
)

export type JobContactRow = typeof jobContacts.$inferSelect
export type NewJobContactRow = typeof jobContacts.$inferInsert
```

- [ ] **Step 2: Re-export from the schema index**

In `backend-express/src/db/schema/index.ts`, add (alongside the existing re-exports):

```ts
export * from './job-contacts.js'
```

- [ ] **Step 3: Generate the migration**

Run: `cd backend-express && npm run db:generate`
Expected: a new `src/db/migrations/0012_<slug>.sql` containing `CREATE TYPE "public"."contact_channel"`, `CREATE TYPE "public"."contact_status"`, `CREATE TABLE "job_contacts"` with both FKs `ON DELETE cascade`, and both indexes.

- [ ] **Step 4: Typecheck**

Run: `cd backend-express && npm run typecheck`
Expected: clean.

- [ ] **Step 5: Apply the migration against the dev DB**

Run: `docker compose up -d` (repo root, if not already up), then `cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run db:migrate`
Expected: migration applies without error.

- [ ] **Step 6: Commit**

```bash
git add backend-express/src/db/schema/job-contacts.ts backend-express/src/db/schema/index.ts backend-express/src/db/migrations/
git commit -m "feat(db): job_contacts table for referral outreach (migration 0012)"
```

---

### Task 2: Zod request schemas

**Files:**
- Create: `backend-express/src/modules/contacts/contacts.schema.ts`
- Test: `backend-express/src/modules/contacts/contacts.schema.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// backend-express/src/modules/contacts/contacts.schema.test.ts
import { describe, it, expect } from 'vitest'
import { CreateContactSchema, UpdateContactSchema } from './contacts.schema.js'

describe('CreateContactSchema', () => {
  it('accepts a minimal payload and trims contact', () => {
    const parsed = CreateContactSchema.parse({ contact: '  Priya — priya@acme.com  ' })
    expect(parsed.contact).toBe('Priya — priya@acme.com')
    expect(parsed.channel).toBeUndefined()
  })

  it('accepts channel, reachedOutAt and notes', () => {
    const parsed = CreateContactSchema.parse({
      contact: 'linkedin.com/in/priya',
      channel: 'LINKEDIN',
      reachedOutAt: '2026-07-01T00:00:00Z',
      notes: 'Met at conference',
    })
    expect(parsed.channel).toBe('LINKEDIN')
    expect(parsed.reachedOutAt).toEqual(new Date('2026-07-01T00:00:00Z'))
  })

  it('rejects empty contact, unknown channel, and >500 chars', () => {
    expect(CreateContactSchema.safeParse({ contact: '   ' }).success).toBe(false)
    expect(CreateContactSchema.safeParse({ contact: 'x', channel: 'PHONE' }).success).toBe(false)
    expect(CreateContactSchema.safeParse({ contact: 'x'.repeat(501) }).success).toBe(false)
  })

  it('does not accept status on create', () => {
    const parsed = CreateContactSchema.parse({ contact: 'x', status: 'REFERRED' })
    expect('status' in parsed).toBe(false)
  })
})

describe('UpdateContactSchema', () => {
  it('accepts a partial patch', () => {
    const parsed = UpdateContactSchema.parse({ status: 'HEARD_BACK' })
    expect(parsed.status).toBe('HEARD_BACK')
  })

  it('allows clearing channel and notes with null', () => {
    const parsed = UpdateContactSchema.parse({ channel: null, notes: null })
    expect(parsed.channel).toBeNull()
    expect(parsed.notes).toBeNull()
  })

  it('rejects an empty patch and an unknown status', () => {
    expect(UpdateContactSchema.safeParse({}).success).toBe(false)
    expect(UpdateContactSchema.safeParse({ status: 'MAYBE' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend-express && npx vitest run src/modules/contacts/contacts.schema.test.ts`
Expected: FAIL — cannot resolve `./contacts.schema.js`.

- [ ] **Step 3: Write the schema**

```ts
// backend-express/src/modules/contacts/contacts.schema.ts
import { z } from 'zod'
import { CONTACT_CHANNELS, CONTACT_STATUSES } from '@/db/schema/job-contacts.js'

export const CreateContactSchema = z.object({
  contact: z.string().trim().min(1).max(500),
  channel: z.enum(CONTACT_CHANNELS).optional(),
  reachedOutAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
})

export const UpdateContactSchema = z
  .object({
    contact: z.string().trim().min(1).max(500),
    channel: z.enum(CONTACT_CHANNELS).nullable(),
    status: z.enum(CONTACT_STATUSES),
    reachedOutAt: z.coerce.date(),
    notes: z.string().max(2000).nullable(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Patch must not be empty' })

export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend-express && npx vitest run src/modules/contacts/contacts.schema.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/contacts/
git commit -m "feat(contacts): zod schemas for outreach create/update"
```

---

### Task 3: Repository (+ real-Postgres tests)

**Files:**
- Create: `backend-express/src/modules/contacts/contacts.repository.ts`
- Test: `backend-express/src/modules/contacts/contacts.repository.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// backend-express/src/modules/contacts/contacts.repository.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { jobContacts } from '@/db/schema/job-contacts.js'
import { contactsRepository } from './contacts.repository.js'

const EMAIL = `contacts-repo-${Date.now()}@example.com`
let userId: string
let jobId: string
let otherJobId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb().insert(users).values({ name: 'Con', email: EMAIL, passwordHash: 'h' }).returning()
  const user = userRows[0]
  if (!user) throw new Error('failed to seed user')
  userId = user.id
  const jobRows = await getDb()
    .insert(jobs)
    .values([
      { userId, title: 'Role A', company: 'Acme', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() },
      { userId, title: 'Role B', company: 'Bcme', status: 'APPLIED', kanbanOrder: 2, lastActivityAt: new Date() },
    ])
    .returning()
  if (jobRows.length !== 2) throw new Error('failed to seed jobs')
  jobId = jobRows[0]!.id
  otherJobId = jobRows[1]!.id
})

afterAll(async () => {
  await getDb().delete(jobContacts).where(eq(jobContacts.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('contactsRepository (real DB)', () => {
  it('creates with defaults and lists newest-outreach-first', async () => {
    const older = await contactsRepository.create({
      userId, jobId, contact: 'Older', reachedOutAt: new Date('2026-07-01T00:00:00Z'),
    })
    expect(older.status).toBe('NO_RESPONSE')
    expect(older.channel).toBeNull()
    await contactsRepository.create({
      userId, jobId, contact: 'Newer', reachedOutAt: new Date('2026-07-10T00:00:00Z'),
    })
    const rows = await contactsRepository.listForJob(userId, jobId)
    expect(rows.map((r) => r.contact)).toEqual(['Newer', 'Older'])
  })

  it('finds, updates and deletes scoped to the owner', async () => {
    const created = await contactsRepository.create({ userId, jobId, contact: 'Edit me', channel: 'EMAIL' })
    expect((await contactsRepository.findById(userId, created.id))?.contact).toBe('Edit me')
    expect(await contactsRepository.findById('00000000-0000-0000-0000-000000000000', created.id)).toBeNull()

    const updated = await contactsRepository.update(userId, created.id, { status: 'HEARD_BACK', channel: null })
    expect(updated?.status).toBe('HEARD_BACK')
    expect(updated?.channel).toBeNull()

    expect(await contactsRepository.remove(userId, created.id)).toBe(true)
    expect(await contactsRepository.findById(userId, created.id)).toBeNull()
    expect(await contactsRepository.remove(userId, created.id)).toBe(false)
  })

  it('countsForJobs returns totals and reply counts per job, empty map for no ids', async () => {
    // jobId already has 2 NO_RESPONSE contacts from the first test.
    const c = await contactsRepository.create({ userId, jobId: otherJobId, contact: 'R1' })
    await contactsRepository.update(userId, c.id, { status: 'REFERRED' })
    await contactsRepository.create({ userId, jobId: otherJobId, contact: 'R2' })

    const counts = await contactsRepository.countsForJobs(userId, [jobId, otherJobId])
    expect(counts.get(jobId)).toEqual({ outreachCount: 2, outreachReplies: 0 })
    expect(counts.get(otherJobId)).toEqual({ outreachCount: 2, outreachReplies: 1 })

    expect((await contactsRepository.countsForJobs(userId, [])).size).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend-express && npx vitest run src/modules/contacts/contacts.repository.test.ts`
Expected: FAIL — cannot resolve `./contacts.repository.js`.

- [ ] **Step 3: Write the repository**

```ts
// backend-express/src/modules/contacts/contacts.repository.ts
import { and, eq, desc, count, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { jobContacts, type JobContactRow, type NewJobContactRow } from '@/db/schema/job-contacts.js'
import type { UpdateContactInput } from './contacts.schema.js'

export interface OutreachCounts {
  outreachCount: number
  outreachReplies: number
}

async function create(values: NewJobContactRow): Promise<JobContactRow> {
  const rows = await getDb().insert(jobContacts).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function listForJob(userId: string, jobId: string): Promise<JobContactRow[]> {
  return getDb()
    .select()
    .from(jobContacts)
    .where(and(eq(jobContacts.userId, userId), eq(jobContacts.jobId, jobId)))
    .orderBy(desc(jobContacts.reachedOutAt))
}

async function findById(userId: string, id: string): Promise<JobContactRow | null> {
  const rows = await getDb()
    .select()
    .from(jobContacts)
    .where(and(eq(jobContacts.id, id), eq(jobContacts.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(userId: string, id: string, patch: UpdateContactInput): Promise<JobContactRow | null> {
  const set: Partial<NewJobContactRow> = { updatedAt: new Date() }
  if (patch.contact !== undefined) set.contact = patch.contact
  if (patch.channel !== undefined) set.channel = patch.channel
  if (patch.status !== undefined) set.status = patch.status
  if (patch.reachedOutAt !== undefined) set.reachedOutAt = patch.reachedOutAt
  if (patch.notes !== undefined) set.notes = patch.notes

  const rows = await getDb()
    .update(jobContacts)
    .set(set)
    .where(and(eq(jobContacts.id, id), eq(jobContacts.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(jobContacts)
    .where(and(eq(jobContacts.id, id), eq(jobContacts.userId, userId)))
    .returning({ id: jobContacts.id })
  return rows.length > 0
}

// One grouped query powering the list/board outreach badges. Any status other
// than NO_RESPONSE implies the person replied (heard back / referred / declined).
async function countsForJobs(userId: string, jobIds: string[]): Promise<Map<string, OutreachCounts>> {
  if (jobIds.length === 0) return new Map()
  const rows = await getDb()
    .select({
      jobId: jobContacts.jobId,
      total: count(),
      replies: count(sql`case when ${jobContacts.status} <> 'NO_RESPONSE' then 1 end`),
    })
    .from(jobContacts)
    .where(and(eq(jobContacts.userId, userId), inArray(jobContacts.jobId, jobIds)))
    .groupBy(jobContacts.jobId)
  return new Map(rows.map((r) => [r.jobId, { outreachCount: r.total, outreachReplies: r.replies }]))
}

export const contactsRepository = { create, listForJob, findById, update, remove, countsForJobs }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend-express && npx vitest run src/modules/contacts/contacts.repository.test.ts`
Expected: PASS. (Needs Docker Postgres up and migration 0012 applied — Task 1 Step 5.)

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/contacts/
git commit -m "feat(contacts): repository with owner-scoped CRUD and per-job counts"
```

---

### Task 4: Service (+ timeline-emission tests)

**Files:**
- Create: `backend-express/src/modules/contacts/contacts.service.ts`
- Test: `backend-express/src/modules/contacts/contacts.service.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// backend-express/src/modules/contacts/contacts.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./contacts.repository.js', () => ({
  contactsRepository: {
    create: vi.fn(),
    listForJob: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    countsForJobs: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: { findById: vi.fn() },
}))
vi.mock('@/modules/timeline/timeline.service.js', () => ({
  timelineService: { addAutoEntry: vi.fn() },
}))

import { contactsRepository } from './contacts.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { timelineService } from '@/modules/timeline/timeline.service.js'
import { contactsService } from './contacts.service.js'
import type { JobContactRow } from '@/db/schema/job-contacts.js'
import type { JobRow } from '@/db/schema/jobs.js'

const repo = vi.mocked(contactsRepository)
const jobs = vi.mocked(jobsRepository)
const timeline = vi.mocked(timelineService)

function fakeContact(over: Partial<JobContactRow> = {}): JobContactRow {
  return {
    id: 'c1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    contact: 'Priya — priya@acme.com', channel: null, status: 'NO_RESPONSE',
    reachedOutAt: new Date('2026-07-01T00:00:00Z'), notes: null, ...over,
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

describe('contactsService.listForJob', () => {
  it('returns contacts when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.listForJob.mockResolvedValue([fakeContact()])
    expect(await contactsService.listForJob('u1', 'j1')).toHaveLength(1)
  })
  it('throws NOT_FOUND when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(contactsService.listForJob('u1', 'jX')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('contactsService.create', () => {
  it('creates under the owned job and emits a "Reached out" auto-event', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeContact({ channel: 'EMAIL' }))
    timeline.addAutoEntry.mockResolvedValue({} as never)
    const created = await contactsService.create('u1', 'j1', { contact: 'Priya — priya@acme.com', channel: 'EMAIL' })
    expect(created.id).toBe('c1')
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1',
      title: 'Reached out to Priya — priya@acme.com',
      description: 'Via email',
    })
  })
  it('omits the description when no channel is set', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeContact())
    timeline.addAutoEntry.mockResolvedValue({} as never)
    await contactsService.create('u1', 'j1', { contact: 'Priya — priya@acme.com' })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({
      userId: 'u1', jobId: 'j1', title: 'Reached out to Priya — priya@acme.com',
    })
  })
  it('swallows a timeline failure (create still succeeds)', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeContact())
    timeline.addAutoEntry.mockRejectedValue(new Error('boom'))
    const created = await contactsService.create('u1', 'j1', { contact: 'X' })
    expect(created.id).toBe('c1')
  })
  it('throws NOT_FOUND when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(contactsService.create('u1', 'jX', { contact: 'X' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('contactsService.update', () => {
  it.each([
    ['HEARD_BACK', 'Heard back from Priya — priya@acme.com'],
    ['REFERRED', 'Priya — priya@acme.com referred you'],
    ['DECLINED', 'Priya — priya@acme.com declined to refer'],
  ] as const)('emits an auto-event when status changes to %s', async (status, title) => {
    repo.findById.mockResolvedValue(fakeContact())
    repo.update.mockResolvedValue(fakeContact({ status }))
    timeline.addAutoEntry.mockResolvedValue({} as never)
    await contactsService.update('u1', 'c1', { status })
    expect(timeline.addAutoEntry).toHaveBeenCalledWith({ userId: 'u1', jobId: 'j1', title })
  })
  it('does not emit when status is unchanged', async () => {
    repo.findById.mockResolvedValue(fakeContact({ status: 'HEARD_BACK' }))
    repo.update.mockResolvedValue(fakeContact({ status: 'HEARD_BACK', notes: 'n' }))
    await contactsService.update('u1', 'c1', { status: 'HEARD_BACK', notes: 'n' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
  it('does not emit on a non-status patch', async () => {
    repo.findById.mockResolvedValue(fakeContact())
    repo.update.mockResolvedValue(fakeContact({ notes: 'n' }))
    await contactsService.update('u1', 'c1', { notes: 'n' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
  it('does not emit when reverting to NO_RESPONSE', async () => {
    repo.findById.mockResolvedValue(fakeContact({ status: 'HEARD_BACK' }))
    repo.update.mockResolvedValue(fakeContact({ status: 'NO_RESPONSE' }))
    await contactsService.update('u1', 'c1', { status: 'NO_RESPONSE' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
  it('throws NOT_FOUND when missing', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(contactsService.update('u1', 'cX', { notes: 'n' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('contactsService.remove', () => {
  it('returns the deleted id and emits no event', async () => {
    repo.remove.mockResolvedValue(true)
    expect(await contactsService.remove('u1', 'c1')).toEqual({ id: 'c1' })
    expect(timeline.addAutoEntry).not.toHaveBeenCalled()
  })
  it('throws NOT_FOUND when missing', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(contactsService.remove('u1', 'cX')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend-express && npx vitest run src/modules/contacts/contacts.service.test.ts`
Expected: FAIL — cannot resolve `./contacts.service.js`.

- [ ] **Step 3: Write the service**

```ts
// backend-express/src/modules/contacts/contacts.service.ts
import { AppError } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'
import { contactsRepository } from './contacts.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { timelineService } from '@/modules/timeline/timeline.service.js'
import type { JobContactRow, ContactChannel, ContactStatus } from '@/db/schema/job-contacts.js'
import type { CreateContactInput, UpdateContactInput } from './contacts.schema.js'

// Mirrors jobs.service: the timeline auto-event is a follow-on write after the
// contact mutation has committed — a failure is logged and swallowed, never
// rolling back the mutation.
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

async function assertJobOwned(userId: string, jobId: string): Promise<void> {
  const job = await jobsRepository.findById(userId, jobId)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
}

const CHANNEL_DESCRIPTIONS: Record<ContactChannel, string | undefined> = {
  EMAIL: 'Via email',
  LINKEDIN: 'Via LinkedIn',
  OTHER: undefined,
}

// NO_RESPONSE is the starting state, not an outcome — reverting to it emits nothing.
function statusEventTitle(status: ContactStatus, contact: string): string | null {
  switch (status) {
    case 'HEARD_BACK':
      return `Heard back from ${contact}`
    case 'REFERRED':
      return `${contact} referred you`
    case 'DECLINED':
      return `${contact} declined to refer`
    default:
      return null
  }
}

async function listForJob(userId: string, jobId: string): Promise<JobContactRow[]> {
  await assertJobOwned(userId, jobId)
  return contactsRepository.listForJob(userId, jobId)
}

async function create(userId: string, jobId: string, input: CreateContactInput): Promise<JobContactRow> {
  await assertJobOwned(userId, jobId)
  const row = await contactsRepository.create({
    userId,
    jobId,
    contact: input.contact,
    ...(input.channel !== undefined ? { channel: input.channel } : {}),
    ...(input.reachedOutAt !== undefined ? { reachedOutAt: input.reachedOutAt } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  })

  const description = row.channel ? CHANNEL_DESCRIPTIONS[row.channel] : undefined
  await emitAutoEntry({
    userId,
    jobId,
    title: `Reached out to ${row.contact}`,
    ...(description !== undefined ? { description } : {}),
  })
  return row
}

async function update(userId: string, id: string, input: UpdateContactInput): Promise<JobContactRow> {
  // Read the current row first so a status change can be detected after the
  // repo update (the repository stays pure — it never reads the prior row).
  const current = await contactsRepository.findById(userId, id)
  if (!current) throw new AppError('NOT_FOUND', 'Contact not found')

  const updated = await contactsRepository.update(userId, id, input)
  if (!updated) throw new AppError('NOT_FOUND', 'Contact not found')

  if (input.status !== undefined && input.status !== current.status) {
    const title = statusEventTitle(updated.status, updated.contact)
    if (title) await emitAutoEntry({ userId, jobId: updated.jobId, title })
  }
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await contactsRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Contact not found')
  return { id }
}

export const contactsService = { listForJob, create, update, remove }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend-express && npx vitest run src/modules/contacts/contacts.service.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/contacts/
git commit -m "feat(contacts): service with ownership checks and timeline auto-events"
```

---

### Task 5: Controller + routers + mount (+ router tests)

**Files:**
- Create: `backend-express/src/modules/contacts/contacts.controller.ts`
- Create: `backend-express/src/modules/contacts/contacts.router.ts`
- Modify: `backend-express/src/shared/api-router.ts`
- Test: `backend-express/src/modules/contacts/contacts.router.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// backend-express/src/modules/contacts/contacts.router.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { JobContactRow } from '@/db/schema/job-contacts.js'
import type { JobRow } from '@/db/schema/jobs.js'

vi.mock('./contacts.repository.js', () => ({
  contactsRepository: {
    create: vi.fn(),
    listForJob: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    countsForJobs: vi.fn(),
  },
}))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({
  jobsRepository: {
    findById: vi.fn(),
    nextKanbanOrder: vi.fn(),
    create: vi.fn(),
    findBySourceUrl: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('@/modules/timeline/timeline.service.js', () => ({
  timelineService: { addAutoEntry: vi.fn() },
}))

import { contactsRepository } from './contacts.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'

const repo = vi.mocked(contactsRepository)
const jobs = vi.mocked(jobsRepository)
let app: Express
let cookie: string

function fakeContact(over: Record<string, unknown> = {}): JobContactRow {
  return {
    id: 'c1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', jobId: 'j1',
    contact: 'Priya', channel: null, status: 'NO_RESPONSE',
    reachedOutAt: new Date('2026-07-01T00:00:00Z'), notes: null, ...over,
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

describe('GET /api/jobs/:jobId/contacts', () => {
  it('401s without a cookie', async () => {
    const res = await request(app).get('/api/jobs/j1/contacts')
    expect(res.status).toBe(401)
  })
  it('200s with the contacts list when the job is owned', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.listForJob.mockResolvedValue([fakeContact()])
    const res = await request(app).get('/api/jobs/j1/contacts').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })
  it('404s when the job is not owned', async () => {
    jobs.findById.mockResolvedValue(null)
    const res = await request(app).get('/api/jobs/jX/contacts').set('Cookie', [cookie])
    expect(res.status).toBe(404)
  })
})

describe('POST /api/jobs/:jobId/contacts', () => {
  it('201s and returns the created contact', async () => {
    jobs.findById.mockResolvedValue(fakeJob())
    repo.create.mockResolvedValue(fakeContact())
    const res = await request(app)
      .post('/api/jobs/j1/contacts')
      .set('Cookie', [cookie])
      .send({ contact: 'Priya', channel: 'EMAIL' })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('c1')
  })
  it('400s on an empty contact', async () => {
    const res = await request(app)
      .post('/api/jobs/j1/contacts')
      .set('Cookie', [cookie])
      .send({ contact: '  ' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/contacts/:id', () => {
  it('200s and returns the updated contact', async () => {
    repo.findById.mockResolvedValue(fakeContact())
    repo.update.mockResolvedValue(fakeContact({ status: 'HEARD_BACK' }))
    const res = await request(app).patch('/api/contacts/c1').set('Cookie', [cookie]).send({ status: 'HEARD_BACK' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('HEARD_BACK')
  })
  it('400s on an empty patch', async () => {
    const res = await request(app).patch('/api/contacts/c1').set('Cookie', [cookie]).send({})
    expect(res.status).toBe(400)
  })
  it('404s when missing', async () => {
    repo.findById.mockResolvedValue(null)
    const res = await request(app).patch('/api/contacts/cX').set('Cookie', [cookie]).send({ notes: 'x' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/contacts/:id', () => {
  it('200s with the deleted id', async () => {
    repo.remove.mockResolvedValue(true)
    const res = await request(app).delete('/api/contacts/c1').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id: 'c1' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend-express && npx vitest run src/modules/contacts/contacts.router.test.ts`
Expected: FAIL — cannot resolve `./contacts.controller.js` / routes 404.

- [ ] **Step 3: Write the controller**

```ts
// backend-express/src/modules/contacts/contacts.controller.ts
import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { contactsService } from './contacts.service.js'
import type { CreateContactInput, UpdateContactInput } from './contacts.schema.js'

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
  const rows = await contactsService.listForJob(requireUserId(req), paramValue(req, 'jobId'))
  res.status(200).json({ data: rows })
}

async function create(req: Request, res: Response): Promise<void> {
  const contact = await contactsService.create(
    requireUserId(req),
    paramValue(req, 'jobId'),
    req.body as CreateContactInput,
  )
  res.status(201).json({ data: contact })
}

async function update(req: Request, res: Response): Promise<void> {
  const contact = await contactsService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdateContactInput)
  res.status(200).json({ data: contact })
}

async function remove(req: Request, res: Response): Promise<void> {
  const result = await contactsService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(200).json({ data: result })
}

export const contactsController = { list, create, update, remove }
```

- [ ] **Step 4: Write the router**

```ts
// backend-express/src/modules/contacts/contacts.router.ts
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { contactsController } from './contacts.controller.js'
import { CreateContactSchema, UpdateContactSchema } from './contacts.schema.js'

// Mounted at '/jobs/:jobId/contacts' — mergeParams exposes :jobId to handlers.
const jobRouter = Router({ mergeParams: true })
jobRouter.use(authMiddleware)
jobRouter.get('/', asyncHandler(contactsController.list))
jobRouter.post('/', validate(CreateContactSchema), asyncHandler(contactsController.create))

// Mounted at '/contacts' — :id update/delete.
const idRouter = Router()
idRouter.use(authMiddleware)
idRouter.patch('/:id', validate(UpdateContactSchema), asyncHandler(contactsController.update))
idRouter.delete('/:id', asyncHandler(contactsController.remove))

export { jobRouter as contactsJobRouter, idRouter as contactsRouter }
```

- [ ] **Step 5: Mount in the api-router**

In `backend-express/src/shared/api-router.ts`, add the import:

```ts
import { contactsJobRouter, contactsRouter } from '@/modules/contacts/contacts.router.js'
```

and the mounts, directly under the reminders mounts (deep paths fall through `jobsRouter`'s single-segment `/:id`, same comment applies):

```ts
router.use('/jobs/:jobId/contacts', contactsJobRouter)
router.use('/contacts', contactsRouter)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend-express && npx vitest run src/modules/contacts/contacts.router.test.ts`
Expected: PASS (all).

- [ ] **Step 7: Full backend gate**

Run: `cd backend-express && npm run typecheck && npm run lint && npm run test`
Expected: all clean/green.

- [ ] **Step 8: Commit**

```bash
git add backend-express/src/modules/contacts/ backend-express/src/shared/api-router.ts
git commit -m "feat(contacts): controller, dual routers, api mount"
```

---

### Task 6: Outreach counts on jobs list + kanban board

**Files:**
- Modify: `backend-express/src/modules/jobs/jobs.service.ts` (list merges counts)
- Modify: `backend-express/src/modules/dashboard/dashboard.service.ts` (cards carry counts)
- Modify: `backend-express/src/modules/dashboard/dashboard.schema.ts` (KanbanCard type + response schema gains the two fields — inspect the file; if KanbanCard is a Zod schema add `outreachCount: z.number()` / `outreachReplies: z.number()`, if a TS interface add `outreachCount: number` / `outreachReplies: number`)
- Test: `backend-express/src/modules/jobs/jobs.service.test.ts` (extend existing `list` coverage)
- Test: `backend-express/src/modules/dashboard/dashboard.service.test.ts` (extend existing `getKanban` coverage)

- [ ] **Step 1: Write the failing tests**

In `backend-express/src/modules/jobs/jobs.service.test.ts`, the existing file already mocks `jobs.repository.js`. Add a mock for the contacts repository at the top alongside the existing `vi.mock` calls:

```ts
vi.mock('@/modules/contacts/contacts.repository.js', () => ({
  contactsRepository: { countsForJobs: vi.fn() },
}))
```

import it with the other imports:

```ts
import { contactsRepository } from '@/modules/contacts/contacts.repository.js'
const contacts = vi.mocked(contactsRepository)
```

then add to the `list` describe block (reuse the file's existing job fixture helper — adapt the fixture call if its name differs):

```ts
it('merges outreach counts into rows, defaulting to zero', async () => {
  const rowA = fakeJob({ id: 'a' })
  const rowB = fakeJob({ id: 'b' })
  repo.findAll.mockResolvedValue({ rows: [rowA, rowB], total: 2 })
  contacts.countsForJobs.mockResolvedValue(
    new Map([['a', { outreachCount: 3, outreachReplies: 1 }]]),
  )
  const result = await jobsService.list('u1', baseQuery)
  expect(contacts.countsForJobs).toHaveBeenCalledWith('u1', ['a', 'b'])
  expect(result.rows[0]).toMatchObject({ id: 'a', outreachCount: 3, outreachReplies: 1 })
  expect(result.rows[1]).toMatchObject({ id: 'b', outreachCount: 0, outreachReplies: 0 })
})
```

(`baseQuery` = whatever complete `JobQueryInput` fixture the file already uses for list tests; reuse it.)

In `backend-express/src/modules/dashboard/dashboard.service.test.ts`, add the same contacts-repository mock + import, and in the existing `getKanban` coverage add:

```ts
it('attaches outreach counts to cards, defaulting to zero', async () => {
  // seed two rows via the file's existing repository mock fixture
  contacts.countsForJobs.mockResolvedValue(
    new Map([['j1', { outreachCount: 2, outreachReplies: 2 }]]),
  )
  const board = await dashboardService.getKanban('u1', baseQuery)
  const cards = board.columns.flatMap((c) => c.jobs)
  expect(cards.find((c) => c.id === 'j1')).toMatchObject({ outreachCount: 2, outreachReplies: 2 })
  expect(cards.filter((c) => c.id !== 'j1').every((c) => c.outreachCount === 0)).toBe(true)
})
```

(Adapt fixture/mock names to what the file already uses — extend, don't restructure. If `getStats` tests construct cards, they need no changes: stats ignore outreach.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend-express && npx vitest run src/modules/jobs/jobs.service.test.ts src/modules/dashboard/dashboard.service.test.ts`
Expected: FAIL — `countsForJobs` never called / missing fields.

- [ ] **Step 3: Implement the merges**

`jobs.service.ts` — add imports:

```ts
import { contactsRepository, type OutreachCounts } from '@/modules/contacts/contacts.repository.js'
```

replace the `list` function:

```ts
const ZERO_OUTREACH: OutreachCounts = { outreachCount: 0, outreachReplies: 0 }

async function list(
  userId: string,
  query: JobQueryInput,
): Promise<{ rows: Array<JobRow & OutreachCounts>; total: number; page: number; limit: number }> {
  const { rows, total } = await jobsRepository.findAll(userId, query)
  // One grouped query powers the outreach badges — merged here so the
  // repository's paginated query stays untouched.
  const counts = await contactsRepository.countsForJobs(userId, rows.map((r) => r.id))
  const withCounts = rows.map((row) => ({ ...row, ...(counts.get(row.id) ?? ZERO_OUTREACH) }))
  return { rows: withCounts, total, page: query.page, limit: query.limit }
}
```

`dashboard.service.ts` — add the same import, extend `toCard` to take counts, and fetch them in `getKanban`:

```ts
import { contactsRepository, type OutreachCounts } from '@/modules/contacts/contacts.repository.js'

const ZERO_OUTREACH: OutreachCounts = { outreachCount: 0, outreachReplies: 0 }

function toCard(row: JobRow, ghostDays: number, outreach: OutreachCounts = ZERO_OUTREACH): KanbanCard {
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
    outreachCount: outreach.outreachCount,
    outreachReplies: outreach.outreachReplies,
  }
}
```

In `getKanban`, after `const rows = await dashboardRepository.findForUser(...)`:

```ts
  const counts = await contactsRepository.countsForJobs(userId, rows.map((r) => r.id))
  const now = Date.now()
  const cards = rows
    .map((row) => toCard(row, deriveGhostDays(row, now), counts.get(row.id) ?? ZERO_OUTREACH))
    .filter((card) => passesGhostFilter(card.ghostDays, query.ghostFilter))
```

`getStats` keeps calling `toCard(row, deriveGhostDays(row, now))` — the default fills zeros.

Extend the `KanbanCard` type in `dashboard.schema.ts` with `outreachCount` / `outreachReplies` (number) in whatever form the file uses (Zod schema or interface).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend-express && npx vitest run src/modules/jobs src/modules/dashboard`
Expected: PASS — new tests green, no existing test broken (repository tests need Docker Postgres up).

- [ ] **Step 5: Backend gate**

Run: `cd backend-express && npm run typecheck && npm run lint && npm run test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add backend-express/src/modules/jobs/ backend-express/src/modules/dashboard/
git commit -m "feat(jobs,dashboard): outreach counts on list rows and kanban cards"
```

---

### Task 7: Frontend types, query key, useContacts hooks

**Files:**
- Create: `frontend-next/src/types/contact.ts`
- Modify: `frontend-next/src/types/job.ts` (Job gains optional counts)
- Modify: `frontend-next/src/types/dashboard.ts` (KanbanCard gains optional counts)
- Modify: `frontend-next/src/lib/query-keys.ts` (contactsKey)
- Create: `frontend-next/src/hooks/use-contacts.ts`
- Test: `frontend-next/src/hooks/use-contacts.test.tsx`

- [ ] **Step 1: Write the types and query key**

```ts
// frontend-next/src/types/contact.ts
export const CONTACT_CHANNELS = ['EMAIL', 'LINKEDIN', 'OTHER'] as const
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]

export const CONTACT_STATUSES = ['NO_RESPONSE', 'HEARD_BACK', 'REFERRED', 'DECLINED'] as const
export type ContactStatus = (typeof CONTACT_STATUSES)[number]

export interface JobContact {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  jobId: string
  contact: string
  channel: ContactChannel | null
  status: ContactStatus
  reachedOutAt: string
  notes: string | null
}
```

In `frontend-next/src/types/job.ts`, add to the `Job` interface (after `notes`):

```ts
  // Outreach badge aggregates — present on GET /api/jobs list rows only
  // (the /:id detail response omits them).
  outreachCount?: number
  outreachReplies?: number
```

In `frontend-next/src/types/dashboard.ts`, add to `KanbanCard` (after `createdAt`):

```ts
  outreachCount?: number
  outreachReplies?: number
```

In `frontend-next/src/lib/query-keys.ts`, add next to `remindersKey`:

```ts
export const contactsKey = (jobId: string) => ['contacts', jobId] as const
```

- [ ] **Step 2: Write the failing hook tests**

```tsx
// frontend-next/src/hooks/use-contacts.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from './use-contacts'
import { contactsKey, JOBS_KEY, DASHBOARD_KANBAN_KEY } from '@/lib/query-keys'

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

describe('useContacts', () => {
  it('fetches /api/jobs/:jobId/contacts', async () => {
    api.get.mockResolvedValue([{ id: 'c1', contact: 'Priya' }])
    const { result } = renderHook(() => useContacts('j1'), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.id).toBe('c1'))
    expect(api.get).toHaveBeenCalledWith('/api/jobs/j1/contacts')
  })
})

describe('useCreateContact', () => {
  it('posts and invalidates contacts + jobs + kanban', async () => {
    api.post.mockResolvedValue({ id: 'c1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useCreateContact('j1'), { wrapper: Wrapper })
    result.current.mutate({ contact: 'Priya', channel: 'EMAIL' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/contacts', { contact: 'Priya', channel: 'EMAIL' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: contactsKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_KANBAN_KEY })
  })
})

describe('useUpdateContact', () => {
  it('patches /api/contacts/:id and invalidates contacts + jobs + kanban + timeline', async () => {
    api.patch.mockResolvedValue({ id: 'c1', status: 'HEARD_BACK' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useUpdateContact('j1'), { wrapper: Wrapper })
    result.current.mutate({ id: 'c1', patch: { status: 'HEARD_BACK' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/contacts/c1', { status: 'HEARD_BACK' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: contactsKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_KANBAN_KEY })
  })
})

describe('useDeleteContact', () => {
  it('deletes /api/contacts/:id and invalidates contacts + jobs + kanban', async () => {
    api.delete.mockResolvedValue({ id: 'c1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useDeleteContact('j1'), { wrapper: Wrapper })
    result.current.mutate('c1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/contacts/c1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: contactsKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend-next && npx vitest run src/hooks/use-contacts.test.tsx`
Expected: FAIL — cannot resolve `./use-contacts`.

- [ ] **Step 4: Write the hook**

```ts
// frontend-next/src/hooks/use-contacts.ts
'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { contactsKey, JOBS_KEY, DASHBOARD_KANBAN_KEY } from '@/lib/query-keys'
import type { JobContact, ContactChannel, ContactStatus } from '@/types/contact'

export interface CreateContactValues {
  contact: string
  channel?: ContactChannel
  reachedOutAt?: string
  notes?: string
}

export interface UpdateContactValues {
  contact?: string
  channel?: ContactChannel | null
  status?: ContactStatus
  reachedOutAt?: string
  notes?: string | null
}

// Contacts feed the list/board outreach badges, so every mutation refreshes
// the jobs + kanban caches alongside the drawer's contact list.
function invalidateContactCaches(qc: QueryClient, jobId: string): void {
  void qc.invalidateQueries({ queryKey: contactsKey(jobId) })
  void qc.invalidateQueries({ queryKey: JOBS_KEY })
  void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
}

export function useContacts(jobId: string) {
  return useQuery({
    queryKey: contactsKey(jobId),
    queryFn: () => apiClient.get<JobContact[]>(`/api/jobs/${jobId}/contacts`),
  })
}

export function useCreateContact(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateContactValues) =>
      apiClient.post<JobContact>(`/api/jobs/${jobId}/contacts`, values),
    onSuccess: () => invalidateContactCaches(qc, jobId),
  })
}

export function useUpdateContact(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateContactValues }) =>
      apiClient.patch<JobContact>(`/api/contacts/${id}`, patch),
    onSuccess: () => invalidateContactCaches(qc, jobId),
  })
}

export function useDeleteContact(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ id: string }>(`/api/contacts/${id}`),
    onSuccess: () => invalidateContactCaches(qc, jobId),
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend-next && npx vitest run src/hooks/use-contacts.test.tsx`
Expected: PASS (all).

- [ ] **Step 6: Commit**

```bash
git add frontend-next/src/types/ frontend-next/src/lib/query-keys.ts frontend-next/src/hooks/use-contacts.ts frontend-next/src/hooks/use-contacts.test.tsx
git commit -m "feat(outreach): contact types, query key, useContacts hooks"
```

---

### Task 8: OutreachStatusChip + OutreachBadge

**Files:**
- Create: `frontend-next/src/components/jobs/outreach/outreach-status-chip.tsx`
- Create: `frontend-next/src/components/jobs/outreach-badge.tsx`
- Test: `frontend-next/src/components/jobs/outreach/outreach-status-chip.test.tsx`
- Test: `frontend-next/src/components/jobs/outreach-badge.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// frontend-next/src/components/jobs/outreach/outreach-status-chip.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutreachStatusChip } from './outreach-status-chip'

describe('OutreachStatusChip', () => {
  it.each([
    ['NO_RESPONSE', 'No response'],
    ['HEARD_BACK', 'Heard back'],
    ['REFERRED', 'Referred'],
    ['DECLINED', 'Declined'],
  ] as const)('renders the %s label', (status, label) => {
    render(<OutreachStatusChip status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
```

```tsx
// frontend-next/src/components/jobs/outreach-badge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutreachBadge } from './outreach-badge'

describe('OutreachBadge', () => {
  it('renders nothing when count is 0 or undefined', () => {
    const { container } = render(<OutreachBadge variant="list" count={0} replies={0} />)
    expect(container).toBeEmptyDOMElement()
    const { container: c2 } = render(<OutreachBadge variant="card" />)
    expect(c2).toBeEmptyDOMElement()
  })

  it('list variant shows count and replies text', () => {
    render(<OutreachBadge variant="list" count={3} replies={1} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('· 1 replied')).toBeInTheDocument()
  })

  it('list variant omits replies text at zero replies', () => {
    render(<OutreachBadge variant="list" count={2} replies={0} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText(/replied/)).not.toBeInTheDocument()
  })

  it('card variant carries a tooltip and reply tint', () => {
    render(<OutreachBadge variant="card" count={3} replies={2} />)
    const badge = screen.getByTestId('outreach-badge')
    expect(badge).toHaveAttribute('title', '3 contacted · 2 replied')
    expect(badge.className).toContain('text-primary')
  })

  it('card variant stays muted with zero replies', () => {
    render(<OutreachBadge variant="card" count={3} replies={0} />)
    expect(screen.getByTestId('outreach-badge').className).not.toContain('text-primary')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-next && npx vitest run src/components/jobs/outreach src/components/jobs/outreach-badge.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the chip**

```tsx
// frontend-next/src/components/jobs/outreach/outreach-status-chip.tsx
import { cn } from '@/lib/utils'
import type { ContactStatus } from '@/types/contact'

const STATUS_META: Record<ContactStatus, { label: string; className: string }> = {
  NO_RESPONSE: { label: 'No response', className: 'bg-muted text-muted-foreground' },
  HEARD_BACK: { label: 'Heard back', className: 'bg-primary/10 text-primary' },
  REFERRED: { label: 'Referred', className: 'bg-primary text-primary-foreground' },
  DECLINED: { label: 'Declined', className: 'bg-muted text-muted-foreground opacity-70' },
}

export function OutreachStatusChip({ status }: { status: ContactStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      data-testid="outreach-status-chip"
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}
```

- [ ] **Step 4: Write the badge**

```tsx
// frontend-next/src/components/jobs/outreach-badge.tsx
import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

// Outreach aggregate badge shared by the jobs list rows and kanban cards.
// Renders nothing when the job has no outreach — no clutter on untouched jobs.
export function OutreachBadge({
  variant,
  count = 0,
  replies = 0,
}: {
  variant: 'list' | 'card'
  count?: number
  replies?: number
}) {
  if (count <= 0) return null

  if (variant === 'list') {
    return (
      <span
        data-testid="outreach-badge"
        className="flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground"
      >
        <Mail className="size-3.5" aria-hidden="true" />
        <span>{count}</span>
        {replies > 0 ? <span>{`· ${replies} replied`}</span> : null}
      </span>
    )
  }

  return (
    <span
      data-testid="outreach-badge"
      title={`${count} contacted · ${replies} replied`}
      className={cn(
        'flex items-center gap-1 font-mono text-[11px] tabular-nums',
        replies > 0 ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Mail className="size-3" aria-hidden="true" />
      <span>{count}</span>
    </span>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend-next && npx vitest run src/components/jobs/outreach src/components/jobs/outreach-badge.test.tsx`
Expected: PASS (all).

- [ ] **Step 6: Commit**

```bash
git add frontend-next/src/components/jobs/outreach/ frontend-next/src/components/jobs/outreach-badge.tsx frontend-next/src/components/jobs/outreach-badge.test.tsx
git commit -m "feat(outreach): status chip and shared outreach badge"
```

---

### Task 9: Outreach form, item, section + JobDrawer wiring

**Files:**
- Create: `frontend-next/src/components/jobs/outreach/outreach-form.tsx`
- Create: `frontend-next/src/components/jobs/outreach/outreach-item.tsx`
- Create: `frontend-next/src/components/jobs/outreach/outreach-section.tsx`
- Modify: `frontend-next/src/components/jobs/job-drawer.tsx` (new section between Reminders and Résumé)
- Test: `frontend-next/src/components/jobs/outreach/outreach-section.test.tsx`

- [ ] **Step 1: Write the failing section test**

```tsx
// frontend-next/src/components/jobs/outreach/outreach-section.test.tsx
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
import { OutreachSection } from './outreach-section'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const CONTACT = {
  id: 'c1', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z',
  userId: 'u1', jobId: 'j1', contact: 'Priya — priya@acme.com', channel: 'EMAIL',
  status: 'NO_RESPONSE', reachedOutAt: '2026-07-01T00:00:00Z', notes: null,
}

beforeEach(() => vi.clearAllMocks())

describe('OutreachSection', () => {
  it('shows the empty state when there are no contacts', async () => {
    api.get.mockResolvedValue([])
    render(<OutreachSection jobId="j1" />, { wrapper })
    expect(await screen.findByText(/No outreach yet/i)).toBeInTheDocument()
  })

  it('lists contacts with their status', async () => {
    api.get.mockResolvedValue([CONTACT])
    render(<OutreachSection jobId="j1" />, { wrapper })
    expect(await screen.findByText('Priya — priya@acme.com')).toBeInTheDocument()
    expect(screen.getByText('No response')).toBeInTheDocument()
  })

  it('creates a contact from the form', async () => {
    api.get.mockResolvedValue([])
    api.post.mockResolvedValue(CONTACT)
    const user = userEvent.setup()
    render(<OutreachSection jobId="j1" />, { wrapper })
    await user.type(await screen.findByLabelText(/Person/i), 'Priya — priya@acme.com')
    await user.selectOptions(screen.getByLabelText(/Channel/i), 'EMAIL')
    await user.click(screen.getByRole('button', { name: /Add contact/i }))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/contacts', {
        contact: 'Priya — priya@acme.com',
        channel: 'EMAIL',
      }),
    )
  })

  it('changes status through the row select', async () => {
    api.get.mockResolvedValue([CONTACT])
    api.patch.mockResolvedValue({ ...CONTACT, status: 'HEARD_BACK' })
    const user = userEvent.setup()
    render(<OutreachSection jobId="j1" />, { wrapper })
    await user.selectOptions(await screen.findByLabelText(/Status for Priya/i), 'HEARD_BACK')
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/contacts/c1', { status: 'HEARD_BACK' }))
  })

  it('deletes only after confirmation', async () => {
    api.get.mockResolvedValue([CONTACT])
    api.delete.mockResolvedValue({ id: 'c1' })
    const user = userEvent.setup()
    render(<OutreachSection jobId="j1" />, { wrapper })
    await user.click(await screen.findByRole('button', { name: /Delete contact/i }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/contacts/c1'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/jobs/outreach/outreach-section.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the form**

```tsx
// frontend-next/src/components/jobs/outreach/outreach-form.tsx
'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { JobContact, ContactChannel } from '@/types/contact'
import type { CreateContactValues } from '@/hooks/use-contacts'

const CHANNEL_LABELS: Record<ContactChannel, string> = {
  EMAIL: 'Email',
  LINKEDIN: 'LinkedIn',
  OTHER: 'Other',
}

export function OutreachForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: JobContact
  onSubmit: (values: CreateContactValues) => void
  onCancel?: () => void
  isPending: boolean
}) {
  const [contact, setContact] = useState(initial?.contact ?? '')
  const [channel, setChannel] = useState<ContactChannel | ''>(initial?.channel ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = contact.trim()
    if (!trimmed) return
    const values: CreateContactValues = { contact: trimmed }
    if (channel) values.channel = channel
    const trimmedNotes = notes.trim()
    if (trimmedNotes) values.notes = trimmedNotes
    onSubmit(values)
    if (!initial) {
      setContact('')
      setChannel('')
      setNotes('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1.5">
        <Label htmlFor="outreach-contact">Person</Label>
        <Input
          id="outreach-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Name, email, or LinkedIn"
          maxLength={500}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="outreach-channel">Channel (optional)</Label>
        <Select
          id="outreach-channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as ContactChannel | '')}
        >
          <option value="">—</option>
          {(Object.keys(CHANNEL_LABELS) as ContactChannel[]).map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="outreach-notes">Notes (optional)</Label>
        <Textarea
          id="outreach-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Met at the conference"
          rows={2}
          maxLength={2000}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending || !contact.trim()}>
          {initial ? 'Save' : 'Add contact'}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
```

(If the `Textarea` primitive's props differ, match its actual API — it exists at `src/components/ui/textarea.tsx`.)

- [ ] **Step 4: Write the item**

```tsx
// frontend-next/src/components/jobs/outreach/outreach-item.tsx
'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useConfirm } from '@/hooks/use-confirm'
import { shortDate } from '@/lib/relative-time'
import { OutreachStatusChip } from './outreach-status-chip'
import { CONTACT_STATUSES, type JobContact, type ContactStatus } from '@/types/contact'

const STATUS_LABELS: Record<ContactStatus, string> = {
  NO_RESPONSE: 'No response',
  HEARD_BACK: 'Heard back',
  REFERRED: 'Referred',
  DECLINED: 'Declined',
}

export function OutreachItem({
  contact,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  contact: JobContact
  onStatusChange: (contact: JobContact, status: ContactStatus) => void
  onEdit: (contact: JobContact) => void
  onDelete: (id: string) => void
}) {
  const { confirm, confirmDialog } = useConfirm()

  const onDeleteClick = async () => {
    if (
      await confirm({
        title: 'Delete contact?',
        description: contact.contact,
        confirmLabel: 'Delete',
        destructive: true,
      })
    ) {
      onDelete(contact.id)
    }
  }

  return (
    <div data-testid="outreach-item" className="space-y-2 rounded-lg border border-border px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm leading-snug">{contact.contact}</p>
          <p className="font-mono text-xs text-muted-foreground">
            Reached out {shortDate(contact.reachedOutAt)}
          </p>
          {contact.notes ? <p className="text-xs text-muted-foreground">{contact.notes}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <OutreachStatusChip status={contact.status} />
          <Button type="button" variant="ghost" size="icon" aria-label="Edit contact" onClick={() => onEdit(contact)}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Delete contact" onClick={onDeleteClick}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <Select
        aria-label={`Status for ${contact.contact}`}
        className="h-8 text-xs"
        value={contact.status}
        onChange={(e) => onStatusChange(contact, e.target.value as ContactStatus)}
      >
        {CONTACT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {confirmDialog}
    </div>
  )
}
```

- [ ] **Step 5: Write the section**

```tsx
// frontend-next/src/components/jobs/outreach/outreach-section.tsx
'use client'

import { useState } from 'react'
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '@/hooks/use-contacts'
import { OutreachItem } from './outreach-item'
import { OutreachForm } from './outreach-form'
import type { JobContact, ContactStatus } from '@/types/contact'
import type { CreateContactValues } from '@/hooks/use-contacts'

export function OutreachSection({ jobId }: { jobId: string }) {
  const { data: contacts = [] } = useContacts(jobId)
  const create = useCreateContact(jobId)
  const update = useUpdateContact(jobId)
  const remove = useDeleteContact(jobId)
  const [editing, setEditing] = useState<JobContact | null>(null)

  function handleStatusChange(contact: JobContact, status: ContactStatus) {
    if (status !== contact.status) update.mutate({ id: contact.id, patch: { status } })
  }

  function handleEditSubmit(values: CreateContactValues) {
    if (!editing) return
    update.mutate({
      id: editing.id,
      patch: { contact: values.contact, channel: values.channel ?? null, notes: values.notes ?? null },
    })
    setEditing(null)
  }

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">Outreach</h3>
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No outreach yet. Track who you&apos;ve contacted for a referral.
        </p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) =>
            editing?.id === contact.id ? (
              <OutreachForm
                key={contact.id}
                initial={editing}
                onSubmit={handleEditSubmit}
                onCancel={() => setEditing(null)}
                isPending={update.isPending}
              />
            ) : (
              <OutreachItem
                key={contact.id}
                contact={contact}
                onStatusChange={handleStatusChange}
                onEdit={setEditing}
                onDelete={(id) => remove.mutate(id)}
              />
            ),
          )}
        </div>
      )}
      {editing ? null : <OutreachForm onSubmit={(values) => create.mutate(values)} isPending={create.isPending} />}
    </section>
  )
}
```

- [ ] **Step 6: Wire into the JobDrawer**

In `frontend-next/src/components/jobs/job-drawer.tsx`, add the import:

```tsx
import { OutreachSection } from './outreach/outreach-section'
```

and insert between the Reminders and Résumé sections:

```tsx
              <div className="border-t border-border pt-5">
                <OutreachSection jobId={job.id} />
              </div>
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd frontend-next && npx vitest run src/components/jobs/outreach src/components/jobs/job-drawer.test.tsx`
Expected: PASS — section tests green, drawer tests unbroken (if the drawer test asserts a fixed section count/order, update it to include Outreach).

- [ ] **Step 8: Commit**

```bash
git add frontend-next/src/components/jobs/outreach/ frontend-next/src/components/jobs/job-drawer.tsx
git commit -m "feat(outreach): JobDrawer outreach section with add/edit/status/delete"
```

---

### Task 10: Badge slots on the jobs list + kanban card

**Files:**
- Modify: `frontend-next/src/components/jobs/job-list.tsx` (JobRow gains the badge)
- Modify: `frontend-next/src/components/kanban/kanban-card.tsx` (footer row gains the badge)
- Test: `frontend-next/src/components/jobs/job-list.test.tsx` (extend)
- Test: `frontend-next/src/components/kanban/kanban-card.test.tsx` (extend)

- [ ] **Step 1: Write the failing tests**

In `frontend-next/src/components/jobs/job-list.test.tsx`, add (reusing the file's existing job fixture — spread the counts over it):

```tsx
it('shows the outreach badge only for jobs with contacts', () => {
  renderList([
    fakeJob({ id: 'a', outreachCount: 3, outreachReplies: 1 }),
    fakeJob({ id: 'b' }),
  ])
  expect(screen.getAllByTestId('outreach-badge')).toHaveLength(1)
  expect(screen.getByText('· 1 replied')).toBeInTheDocument()
})
```

(`renderList`/`fakeJob` = the file's existing render helper + fixture; adapt names to what exists there.)

In `frontend-next/src/components/kanban/kanban-card.test.tsx`, add (again reusing the existing card fixture and render setup — the card needs the dnd-kit context the file already provides):

```tsx
it('shows the outreach badge when the card has contacts', () => {
  renderCard({ ...baseCard, outreachCount: 2, outreachReplies: 1 })
  const badge = screen.getByTestId('outreach-badge')
  expect(badge).toHaveAttribute('title', '2 contacted · 1 replied')
})

it('renders no badge at zero contacts', () => {
  renderCard(baseCard)
  expect(screen.queryByTestId('outreach-badge')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-next && npx vitest run src/components/jobs/job-list.test.tsx src/components/kanban/kanban-card.test.tsx`
Expected: FAIL — no badge rendered.

- [ ] **Step 3: Add the badge slots**

`job-list.tsx` — import:

```tsx
import { OutreachBadge } from './outreach-badge'
```

in `JobRow`, insert as the first child of the right-hand actions span (before `<StatusChip …/>`):

```tsx
          <OutreachBadge variant="list" count={job.outreachCount} replies={job.outreachReplies} />
```

`kanban-card.tsx` — import:

```tsx
import { OutreachBadge } from '@/components/jobs/outreach-badge'
```

replace the GhostMeter wrapper div:

```tsx
      <div className="mt-2 flex items-center justify-between gap-2">
        <GhostMeter days={card.ghostDays} />
        <OutreachBadge variant="card" count={card.outreachCount} replies={card.outreachReplies} />
      </div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-next && npx vitest run src/components/jobs/job-list.test.tsx src/components/kanban/kanban-card.test.tsx`
Expected: PASS (new + existing).

- [ ] **Step 5: Frontend gate**

Run: `cd frontend-next && npm run typecheck && npm run lint && npm run test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add frontend-next/src/components/jobs/job-list.tsx frontend-next/src/components/jobs/job-list.test.tsx frontend-next/src/components/kanban/
git commit -m "feat(outreach): count badges on jobs list rows and kanban cards"
```

---

### Task 11: Docs + full gates

**Files:**
- Modify: `docs/deferred-tasks.md` (three new entries)
- Modify: `progress.md` (Slice 9 entry)
- Modify: `CLAUDE.md` (Current State: add Slice 9 summary; update "Next")

- [ ] **Step 1: Record deferred work**

Append to `docs/deferred-tasks.md` (match the file's existing entry format):

- Outreach follow-up nudge sweep — "no reply in 7 days" notification via the existing cron ghost-sweep pattern; `job_contacts.status` + `reached_out_at` are query-ready.
- Referral email/message generation — alongside résumé/cover-letter generation; will reference a `contact_id` (like `cover_letters.job_id`).
- "Referrer ghosted you" filter in the jobs toolbar.

- [ ] **Step 2: Update progress.md and CLAUDE.md**

`progress.md`: add a Slice 9 (Referral outreach tracking) section in the established format — table + module + API + drawer section + badges, migration `0012`, spec/plan paths.
`CLAUDE.md`: append a Slice 9 summary to the Current State done-list and update the "Next" line.

- [ ] **Step 3: Full gates, both apps**

Run: `cd backend-express && npm run typecheck && npm run lint && npm run test`
Expected: green.
Run: `cd frontend-next && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: green; production build compiles. (If a host `.next` permission error appears, verify the build via `docker build --target production ./frontend-next` instead.)

- [ ] **Step 4: Commit**

```bash
git add docs/deferred-tasks.md progress.md CLAUDE.md
git commit -m "docs: record slice 9 outreach tracking + deferred follow-ups"
```

---

### Post-plan verification (overseer, not a coder task)

Live smoke against the Docker stack (create/edit/status/delete a contact via the UI; badge appears on list + board; timeline shows the auto-events) and a playwright-cli browser pass at 1440/390. Then merge decision goes back to the user.
