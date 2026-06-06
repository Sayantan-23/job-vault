# Slice 6c — Cover Letters + JobDrawer Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Generate per-job **Markdown cover letters** from a Persona via Gemini (edit + live preview + **Copy / Download PDF**), extend the hourly AI rate limit to count résumés **and** cover letters together, and finally wire generation **in-context** into the JobDrawer — a **Cover letter** section plus a **Résumé** launcher that deep-links the 6b workspace with the job preselected. Completes Slice 6.

**Architecture:** Mirrors 6a/6b. Cover letters are plain Markdown (the AI writes prose; `react-markdown` — already a dep — renders the preview; a tiny `@react-pdf/renderer` paragraph doc renders the PDF). The DB-derived rate limit's `ai-usage.repository` is extended to sum both generation tables. The 6b résumé workspace gains an optional `?job=` so the JobDrawer can launch a job-tailored résumé.

**Tech Stack:** Express 5 · Drizzle · Zod · Vitest · Supertest · `@google/genai` · Next.js 15 · React 19 · TanStack Query v5 · `react-markdown` · `@react-pdf/renderer` · RTL.

**Spec:** `docs/superpowers/specs/2026-06-05-slice-6-ai-resume-cover-letter-design.md` (§§2.4, 5, 6, 7, 8). **Branch:** `slice-6-ai-resume-cover-letter` (continues after 6b).

> **Conventions:** backend imports end in `.js`; `res.status(n).json({ data })`; `AppError`; repos `userId`-scoped. Frontend reuses `src/components/ui/*`, no inline styled markup, `'use client'` on interactive leaves, react-pdf via `next/dynamic` `ssr:false`. Gemini mocked in all automated tests. Commit per task; **no `git push`; no "Claude" in commit messages.**

---

## File structure
**Backend:** `src/db/schema/cover-letters.ts` (+ barrel, migration `0006`); `src/modules/cover-letters/{cover-letters.schema,cover-letters.repository,cover-letters.service,cover-letters.controller,cover-letters.router}.ts` (+ tests); modify `src/modules/ai/ai.prompts.ts` (+ `buildCoverLetterPrompt`), `src/modules/ai/ai-usage.repository.ts` (count cover_letters too), `src/shared/api-router.ts`.
**Frontend:** `src/types/cover-letter.ts`; `src/lib/query-keys.ts`; `src/hooks/use-cover-letters.ts`; `src/components/resume/cover-letter-document.tsx`, `download-cover-letter-pdf-button.tsx`, `cover-letter-editor.tsx`; `src/components/jobs/cover-letter/cover-letter-section.tsx`, `src/components/jobs/resume/resume-launcher.tsx`; modify `src/components/resume/resume-workspace.tsx`, `resumes-page-client.tsx`, `src/components/jobs/job-drawer.tsx`.

---

## BACKEND

### Task 1: `cover_letters` table + migration `0006`

**Files:** Create `backend-express/src/db/schema/cover-letters.ts` · Modify `src/db/schema/index.ts` · Generate `0006_*.sql`

- [ ] **Step 1: Implement** — `cover-letters.ts`:

```typescript
import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'
import { personas } from './personas.js'

export const coverLetters = pgTable(
  'cover_letters',
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
    personaId: uuid('persona_id').references(() => personas.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }),
    instructions: text('instructions'),
    bodyMarkdown: text('body_markdown').notNull(),
  },
  (t) => [index('idx_cover_letters_user_id').on(t.userId), index('idx_cover_letters_job_id').on(t.jobId)],
)

export type CoverLetterRow = typeof coverLetters.$inferSelect
export type NewCoverLetterRow = typeof coverLetters.$inferInsert
```

- [ ] **Step 2: Barrel** — append to `src/db/schema/index.ts`: `export * from './cover-letters.js'`
- [ ] **Step 3: Generate** — `cd backend-express && npm run db:generate` → `0006_*.sql` (cover_letters: user/job cascade, persona set-null, 2 indexes). Inspect.
- [ ] **Step 4: Apply** — `DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run db:migrate`.
- [ ] **Step 5: Commit**

```bash
git add backend-express/src/db/schema/cover-letters.ts backend-express/src/db/schema/index.ts backend-express/src/db/migrations/
git commit -m "feat(slice-6c): cover_letters table + migration 0006"
```

---

### Task 2: Cover-letter Zod schemas

**Files:** Create `backend-express/src/modules/cover-letters/cover-letters.schema.ts` · Test `…/cover-letters.schema.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { GenerateCoverLetterSchema, UpdateCoverLetterSchema } from './cover-letters.schema.js'

const UUID = '11111111-1111-1111-1111-111111111111'
describe('GenerateCoverLetterSchema', () => {
  it('requires jobId + personaId; instructions optional', () => {
    expect(GenerateCoverLetterSchema.safeParse({ jobId: UUID, personaId: UUID }).success).toBe(true)
    expect(GenerateCoverLetterSchema.safeParse({ jobId: UUID }).success).toBe(false)
    expect(GenerateCoverLetterSchema.safeParse({ jobId: 'x', personaId: UUID }).success).toBe(false)
  })
})
describe('UpdateCoverLetterSchema', () => {
  it('accepts a body edit; rejects empty', () => {
    expect(UpdateCoverLetterSchema.safeParse({ bodyMarkdown: 'Dear…' }).success).toBe(true)
    expect(UpdateCoverLetterSchema.safeParse({}).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/modules/cover-letters/cover-letters.schema.test.ts`
- [ ] **Step 3: Implement** — `cover-letters.schema.ts`:

```typescript
import { z } from 'zod'

export const GenerateCoverLetterSchema = z.object({
  jobId: z.string().uuid(),
  personaId: z.string().uuid(),
  instructions: z.string().max(2000).optional(),
})

export const UpdateCoverLetterSchema = z
  .object({
    title: z.string().max(200).optional(),
    bodyMarkdown: z.string().min(1).optional(),
  })
  .refine((v) => v.title !== undefined || v.bodyMarkdown !== undefined, { message: 'Nothing to update' })

export const CoverLetterQuerySchema = z.object({ jobId: z.string().uuid().optional() })

export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterSchema>
export type UpdateCoverLetterInput = z.infer<typeof UpdateCoverLetterSchema>
export type CoverLetterQuery = z.infer<typeof CoverLetterQuerySchema>
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/cover-letters/cover-letters.schema.ts backend-express/src/modules/cover-letters/cover-letters.schema.test.ts
git commit -m "feat(slice-6c): cover-letter Zod schemas"
```

---

### Task 3: Cover-letter generation prompt

**Files:** Modify `backend-express/src/modules/ai/ai.prompts.ts` · Test `…/ai.prompts.test.ts` (append)

- [ ] **Step 1: Failing test** — append:

```typescript
import { buildCoverLetterPrompt } from './ai.prompts.js'

describe('buildCoverLetterPrompt', () => {
  const bg: ResumeContent = { basics: { name: 'A', links: [] }, summary: 's', experience: [], projects: [], skills: [], education: [] }
  it('asks for a Markdown letter tailored to the job, no invention', () => {
    const p = buildCoverLetterPrompt(bg, { title: 'Backend Engineer', company: 'Acme', snapshot: 'Go' }, 'be concise')
    expect(p).toMatch(/markdown/i)
    expect(p).toContain('Backend Engineer')
    expect(p).toContain('Acme')
    expect(p).toContain('Go')
    expect(p).toContain('be concise')
    expect(p).toMatch(/do not invent|truthful/i)
    expect(p).toContain('"name":"A"')
  })
})
```

(The file already imports `ResumeContent` from 6b.)

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — append to `ai.prompts.ts`:

```typescript
export function buildCoverLetterPrompt(
  background: ResumeContent,
  job: { title: string; company: string; snapshot?: string | null },
  instructions?: string,
): string {
  const parts: string[] = [
    'Write a concise, professional cover letter in Markdown for the job below, drawing on the candidate background. 3-4 short first-person paragraphs, specific and truthful — do not invent facts. Output ONLY the letter body in Markdown (no preamble, no code fences).',
    `JOB:\nTitle: ${job.title}\nCompany: ${job.company}${job.snapshot ? `\nDescription:\n${job.snapshot}` : ''}`,
    `CANDIDATE BACKGROUND (authoritative facts):\n${JSON.stringify(background)}`,
  ]
  if (instructions) parts.push(`EXTRA INSTRUCTIONS:\n${instructions}`)
  return parts.join('\n\n')
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/ai/ai.prompts.ts backend-express/src/modules/ai/ai.prompts.test.ts
git commit -m "feat(slice-6c): cover-letter generation prompt (Markdown, per job)"
```

---

### Task 4: Extend the rate-limit usage count to include cover letters

**Files:** Modify `backend-express/src/modules/ai/ai-usage.repository.ts` · Test `…/ai-usage.repository.test.ts` (create, real-DB)

The hourly limit is **shared** across résumés + cover letters, so the count must sum both tables.

- [ ] **Step 1: Failing test** — `ai-usage.repository.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { personas } from '@/db/schema/personas.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'
import { coverLetters } from '@/db/schema/cover-letters.js'
import { aiUsageRepository } from './ai-usage.repository.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const EMAIL = `ai-usage-${Date.now()}@example.com`
let userId: string, jobId: string, personaId: string
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  userId = (await getDb().insert(users).values({ name: 'U', email: EMAIL, passwordHash: 'h' }).returning())[0]!.id
  jobId = (await getDb().insert(jobs).values({ userId, title: 'T', company: 'C', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() }).returning())[0]!.id
  personaId = (await getDb().insert(personas).values({ userId, name: 'P', data: C }).returning())[0]!.id
})
afterAll(async () => {
  await getDb().delete(coverLetters).where(eq(coverLetters.userId, userId))
  await getDb().delete(generatedResumes).where(eq(generatedResumes.userId, userId))
  await getDb().delete(personas).where(eq(personas.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('aiUsageRepository.countRecentGenerations (real DB)', () => {
  it('sums résumés + cover letters since the cutoff', async () => {
    const since = new Date(Date.now() - 60 * 60 * 1000)
    await getDb().insert(generatedResumes).values({ userId, personaId, jobId: null, content: C })
    await getDb().insert(coverLetters).values({ userId, jobId, personaId, bodyMarkdown: 'Dear…' })
    expect(await aiUsageRepository.countRecentGenerations(userId, since)).toBe(2)
    expect(await aiUsageRepository.countRecentGenerations(userId, new Date(Date.now() + 60_000))).toBe(0)
  })
})
```

- [ ] **Step 2: Run → FAIL** (needs Docker Postgres + migration `0006`).
- [ ] **Step 3: Implement** — replace `ai-usage.repository.ts`:

```typescript
import { and, eq, gte, count } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'
import { coverLetters } from '@/db/schema/cover-letters.js'

// Sums a user's AI generations (résumés + cover letters) since `since` so the
// hourly rate limit is shared across both.
async function countRecentGenerations(userId: string, since: Date): Promise<number> {
  const [r] = await getDb()
    .select({ value: count() })
    .from(generatedResumes)
    .where(and(eq(generatedResumes.userId, userId), gte(generatedResumes.createdAt, since)))
  const [c] = await getDb()
    .select({ value: count() })
    .from(coverLetters)
    .where(and(eq(coverLetters.userId, userId), gte(coverLetters.createdAt, since)))
  return (r?.value ?? 0) + (c?.value ?? 0)
}

export const aiUsageRepository = { countRecentGenerations }
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/ai/ai-usage.repository.ts backend-express/src/modules/ai/ai-usage.repository.test.ts
git commit -m "feat(slice-6c): rate-limit count now sums résumés + cover letters"
```

---

### Task 5: Cover-letters repository (real-DB tested)

**Files:** Create `backend-express/src/modules/cover-letters/cover-letters.repository.ts` · Test `…/cover-letters.repository.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { coverLetters } from '@/db/schema/cover-letters.js'
import { coverLettersRepository } from './cover-letters.repository.js'

const EMAIL = `cl-repo-${Date.now()}@example.com`
let userId: string, jobId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  userId = (await getDb().insert(users).values({ name: 'U', email: EMAIL, passwordHash: 'h' }).returning())[0]!.id
  jobId = (await getDb().insert(jobs).values({ userId, title: 'T', company: 'C', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() }).returning())[0]!.id
})
afterAll(async () => {
  await getDb().delete(coverLetters).where(eq(coverLetters.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('coverLettersRepository (real DB)', () => {
  it('creates, lists by job, finds, updates and removes (user-scoped)', async () => {
    const cl = await coverLettersRepository.create({ userId, jobId, personaId: null, title: 'T', instructions: null, bodyMarkdown: 'Dear hiring manager' })
    expect(cl.bodyMarkdown).toContain('Dear')
    expect(await coverLettersRepository.listForUser(userId, jobId)).toHaveLength(1)
    expect(await coverLettersRepository.findById(userId, cl.id)).not.toBeNull()
    expect(await coverLettersRepository.findById('other', cl.id)).toBeNull()
    const u = await coverLettersRepository.update(userId, cl.id, { bodyMarkdown: 'Updated' })
    expect(u?.bodyMarkdown).toBe('Updated')
    expect(await coverLettersRepository.remove(userId, cl.id)).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `cover-letters.repository.ts`:

```typescript
import { and, eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { coverLetters, type CoverLetterRow, type NewCoverLetterRow } from '@/db/schema/cover-letters.js'

async function create(values: NewCoverLetterRow): Promise<CoverLetterRow> {
  const rows = await getDb().insert(coverLetters).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function listForUser(userId: string, jobId?: string): Promise<CoverLetterRow[]> {
  const where = jobId
    ? and(eq(coverLetters.userId, userId), eq(coverLetters.jobId, jobId))
    : eq(coverLetters.userId, userId)
  return getDb().select().from(coverLetters).where(where).orderBy(desc(coverLetters.createdAt))
}

async function findById(userId: string, id: string): Promise<CoverLetterRow | null> {
  const rows = await getDb()
    .select()
    .from(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(
  userId: string,
  id: string,
  patch: { title?: string; bodyMarkdown?: string },
): Promise<CoverLetterRow | null> {
  const set: Partial<NewCoverLetterRow> = { updatedAt: new Date() }
  if (patch.title !== undefined) set.title = patch.title
  if (patch.bodyMarkdown !== undefined) set.bodyMarkdown = patch.bodyMarkdown
  const rows = await getDb()
    .update(coverLetters)
    .set(set)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .returning({ id: coverLetters.id })
  return rows.length > 0
}

export const coverLettersRepository = { create, listForUser, findById, update, remove }
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/cover-letters/cover-letters.repository.ts backend-express/src/modules/cover-letters/cover-letters.repository.test.ts
git commit -m "feat(slice-6c): cover-letters repository (user-scoped CRUD + job filter)"
```

---

### Task 6: Cover-letters service

**Files:** Create `backend-express/src/modules/cover-letters/cover-letters.service.ts` · Test `…/cover-letters.service.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./cover-letters.repository.js', () => ({
  coverLettersRepository: { create: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled: vi.fn(() => true), generateText: vi.fn() } }))
vi.mock('@/modules/ai/ai.rate-limit.js', () => ({ assertWithinRateLimit: vi.fn() }))

import { coverLettersRepository } from './cover-letters.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { coverLettersService } from './cover-letters.service.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const repo = vi.mocked(coverLettersRepository)
const personas = vi.mocked(personasRepository)
const jobs = vi.mocked(jobsRepository)
const ai = vi.mocked(geminiService)
const rl = vi.mocked(assertWithinRateLimit)
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const persona = { id: 'p1', userId: 'u1', name: 'Backend', data: C, rawInput: null, createdAt: new Date(), updatedAt: new Date() }
const job = { id: 'j1', userId: 'u1', title: 'SWE', company: 'Acme', location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: 'Go', status: 'APPLIED' as const, kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null, createdAt: new Date(), updatedAt: new Date() }
const row = { id: 'cl1', userId: 'u1', jobId: 'j1', personaId: 'p1', title: 'Acme', instructions: null, bodyMarkdown: 'Dear…', createdAt: new Date(), updatedAt: new Date() }

beforeEach(() => { vi.clearAllMocks(); ai.isAiEnabled.mockReturnValue(true); rl.mockResolvedValue(undefined) })

describe('coverLettersService.generate', () => {
  it('503 when AI disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    await expect(coverLettersService.generate('u1', { jobId: 'j1', personaId: 'p1' })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })
  it('NOT_FOUND when job not owned (and does NOT spend rate limit)', async () => {
    jobs.findById.mockResolvedValue(null)
    await expect(coverLettersService.generate('u1', { jobId: 'jX', personaId: 'p1' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(rl).not.toHaveBeenCalled()
  })
  it('NOT_FOUND when persona not owned', async () => {
    jobs.findById.mockResolvedValue(job)
    personas.findById.mockResolvedValue(null)
    await expect(coverLettersService.generate('u1', { jobId: 'j1', personaId: 'pX' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('rate-limits after ownership, generates markdown, saves', async () => {
    jobs.findById.mockResolvedValue(job)
    personas.findById.mockResolvedValue(persona)
    ai.generateText.mockResolvedValue('Dear hiring manager,\n\nI am excited…')
    repo.create.mockResolvedValue(row)
    const out = await coverLettersService.generate('u1', { jobId: 'j1', personaId: 'p1' })
    expect(rl).toHaveBeenCalledWith('u1')
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', jobId: 'j1', personaId: 'p1', bodyMarkdown: expect.stringContaining('Dear') }))
    expect(out.id).toBe('cl1')
  })
})

describe('coverLettersService CRUD', () => {
  it('NOT_FOUND on missing get/update/remove', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(coverLettersService.get('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    repo.update.mockResolvedValue(null)
    await expect(coverLettersService.update('u1', 'x', { title: 'Z' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    repo.remove.mockResolvedValue(false)
    await expect(coverLettersService.remove('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `cover-letters.service.ts`:

```typescript
import { AppError } from '@/shared/errors.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { buildCoverLetterPrompt } from '@/modules/ai/ai.prompts.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { coverLettersRepository } from './cover-letters.repository.js'
import type { CoverLetterRow } from '@/db/schema/cover-letters.js'
import type { GenerateCoverLetterInput, UpdateCoverLetterInput } from './cover-letters.schema.js'

async function generate(userId: string, input: GenerateCoverLetterInput): Promise<CoverLetterRow> {
  if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')

  const job = await jobsRepository.findById(userId, input.jobId)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
  const persona = await personasRepository.findById(userId, input.personaId)
  if (!persona) throw new AppError('NOT_FOUND', 'Persona not found')

  // Spend the shared hourly budget only after ownership is confirmed.
  await assertWithinRateLimit(userId)

  const bodyMarkdown = await geminiService.generateText(
    buildCoverLetterPrompt(persona.data, { title: job.title, company: job.company, snapshot: job.snapshotMarkdown }, input.instructions),
  )
  return coverLettersRepository.create({
    userId,
    jobId: input.jobId,
    personaId: input.personaId,
    title: `${job.company} — cover letter`,
    instructions: input.instructions ?? null,
    bodyMarkdown,
  })
}

async function list(userId: string, jobId?: string): Promise<CoverLetterRow[]> {
  return coverLettersRepository.listForUser(userId, jobId)
}

async function get(userId: string, id: string): Promise<CoverLetterRow> {
  const cl = await coverLettersRepository.findById(userId, id)
  if (!cl) throw new AppError('NOT_FOUND', 'Cover letter not found')
  return cl
}

async function update(userId: string, id: string, input: UpdateCoverLetterInput): Promise<CoverLetterRow> {
  const patch: { title?: string; bodyMarkdown?: string } = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.bodyMarkdown !== undefined) patch.bodyMarkdown = input.bodyMarkdown
  const updated = await coverLettersRepository.update(userId, id, patch)
  if (!updated) throw new AppError('NOT_FOUND', 'Cover letter not found')
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await coverLettersRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Cover letter not found')
  return { id }
}

export const coverLettersService = { generate, list, get, update, remove }
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/cover-letters/cover-letters.service.ts backend-express/src/modules/cover-letters/cover-letters.service.test.ts
git commit -m "feat(slice-6c): cover-letters service (generate [ownership, rate-limited] + CRUD)"
```

---

### Task 7: Cover-letters controller + router + wiring

**Files:** Create `…/cover-letters.controller.ts`, `…/cover-letters.router.ts` · Modify `src/shared/api-router.ts` · Test `…/cover-letters.router.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { CoverLetterRow } from '@/db/schema/cover-letters.js'

vi.mock('./cover-letters.repository.js', () => ({
  coverLettersRepository: { create: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled: vi.fn(() => true), generateText: vi.fn() } }))
vi.mock('@/modules/ai/ai-usage.repository.js', () => ({ aiUsageRepository: { countRecentGenerations: vi.fn().mockResolvedValue(0) } }))

import { coverLettersRepository } from './cover-letters.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'

const repo = vi.mocked(coverLettersRepository)
const personas = vi.mocked(personasRepository)
const jobs = vi.mocked(jobsRepository)
const ai = vi.mocked(geminiService)
const UUID = '11111111-1111-1111-1111-111111111111'
function row(over: Partial<CoverLetterRow> = {}): CoverLetterRow {
  return { id: 'cl1', userId: 'u1', jobId: 'j1', personaId: 'p1', title: 'Acme', instructions: null, bodyMarkdown: 'Dear…', createdAt: new Date(), updatedAt: new Date(), ...over }
}
const persona = { id: 'p1', userId: 'u1', name: 'B', data: { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }, rawInput: null, createdAt: new Date(), updatedAt: new Date() }
const job = { id: 'j1', userId: 'u1', title: 'SWE', company: 'Acme', location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null, status: 'APPLIED' as const, kanbanOrder: 1, lastActivityAt: new Date(), ghostDays: 0, notes: null, createdAt: new Date(), updatedAt: new Date() }
let app: Express
let cookie: string

beforeAll(async () => {
  process.env['NODE_ENV'] = 'test'; process.env['PORT'] = '3000'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'; process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32); process.env['JWT_ACCESS_EXPIRY'] = '15m'; process.env['JWT_REFRESH_EXPIRY'] = '7d'
  process.env['LOG_LEVEL'] = 'silent'; process.env['AI_RATE_LIMIT_PER_HOUR'] = '10'
  app = (await import('@/app.js')).createApp()
  const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
  cookie = `accessToken=${signAccessToken({ id: 'u1', email: 'a@b.c' })}`
})
beforeEach(() => { vi.clearAllMocks(); ai.isAiEnabled.mockReturnValue(true) })

describe('cover-letters routes', () => {
  it('401 without cookie', async () => { expect((await request(app).get('/api/cover-letters')).status).toBe(401) })
  it('generates (201)', async () => {
    jobs.findById.mockResolvedValue(job); personas.findById.mockResolvedValue(persona)
    ai.generateText.mockResolvedValue('Dear hiring manager')
    repo.create.mockResolvedValue(row())
    const res = await request(app).post('/api/cover-letters').set('Cookie', [cookie]).send({ jobId: UUID, personaId: UUID })
    expect(res.status).toBe(201); expect(res.body.data.id).toBe('cl1')
  })
  it('400 on missing personaId', async () => {
    const res = await request(app).post('/api/cover-letters').set('Cookie', [cookie]).send({ jobId: UUID })
    expect(res.status).toBe(400)
  })
  it('lists by job', async () => {
    repo.listForUser.mockResolvedValue([row()])
    const res = await request(app).get('/api/cover-letters?jobId=' + UUID).set('Cookie', [cookie])
    expect(res.status).toBe(200); expect(res.body.data).toHaveLength(1)
  })
  it('patches', async () => {
    repo.update.mockResolvedValue(row({ bodyMarkdown: 'Edited' }))
    const res = await request(app).patch('/api/cover-letters/cl1').set('Cookie', [cookie]).send({ bodyMarkdown: 'Edited' })
    expect(res.status).toBe(200); expect(res.body.data.bodyMarkdown).toBe('Edited')
  })
  it('404 patching missing', async () => {
    repo.update.mockResolvedValue(null)
    const res = await request(app).patch('/api/cover-letters/x').set('Cookie', [cookie]).send({ bodyMarkdown: 'E' })
    expect(res.status).toBe(404)
  })
  it('deletes (204)', async () => {
    repo.remove.mockResolvedValue(true)
    expect((await request(app).delete('/api/cover-letters/cl1').set('Cookie', [cookie])).status).toBe(204)
  })
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement controller** — `cover-letters.controller.ts`:

```typescript
import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { coverLettersService } from './cover-letters.service.js'
import type { GenerateCoverLetterInput, UpdateCoverLetterInput, CoverLetterQuery } from './cover-letters.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}
function paramValue(req: Request, key: string): string {
  const v = req.params[key]
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
}

async function generate(req: Request, res: Response): Promise<void> {
  const cl = await coverLettersService.generate(requireUserId(req), req.body as GenerateCoverLetterInput)
  res.status(201).json({ data: cl })
}
async function list(req: Request, res: Response): Promise<void> {
  const { jobId } = req.query as CoverLetterQuery
  res.status(200).json({ data: await coverLettersService.list(requireUserId(req), jobId) })
}
async function get(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await coverLettersService.get(requireUserId(req), paramValue(req, 'id')) })
}
async function update(req: Request, res: Response): Promise<void> {
  const cl = await coverLettersService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdateCoverLetterInput)
  res.status(200).json({ data: cl })
}
async function remove(req: Request, res: Response): Promise<void> {
  await coverLettersService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(204).end()
}

export const coverLettersController = { generate, list, get, update, remove }
```

`cover-letters.router.ts`:

```typescript
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { coverLettersController } from './cover-letters.controller.js'
import { GenerateCoverLetterSchema, UpdateCoverLetterSchema, CoverLetterQuerySchema } from './cover-letters.schema.js'

const router = Router()
router.use(authMiddleware)
router.post('/', validate(GenerateCoverLetterSchema), asyncHandler(coverLettersController.generate))
router.get('/', validate(CoverLetterQuerySchema, 'query'), asyncHandler(coverLettersController.list))
router.get('/:id', asyncHandler(coverLettersController.get))
router.patch('/:id', validate(UpdateCoverLetterSchema), asyncHandler(coverLettersController.update))
router.delete('/:id', asyncHandler(coverLettersController.remove))

export { router as coverLettersRouter }
```

Modify `src/shared/api-router.ts` — import + mount:

```typescript
import { coverLettersRouter } from '@/modules/cover-letters/cover-letters.router.js'
// …
router.use('/cover-letters', coverLettersRouter)
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/cover-letters/cover-letters.controller.ts backend-express/src/modules/cover-letters/cover-letters.router.ts backend-express/src/shared/api-router.ts backend-express/src/modules/cover-letters/cover-letters.router.test.ts
git commit -m "feat(slice-6c): cover-letters controller + router under /api/cover-letters"
```

---

### Task 8: Backend gate

- [ ] **Step 1:** `cd backend-express && npm run typecheck && npm run lint && npm run test` (Postgres up). All green; fix failures.
- [ ] **Step 2:** `git add -A backend-express && git commit -m "chore(slice-6c): backend gate green" || echo "nothing to commit"`

---

## FRONTEND

### Task 9: CoverLetter type + query keys

**Files:** Create `frontend-next/src/types/cover-letter.ts` · Modify `src/lib/query-keys.ts`

- [ ] **Step 1: Types** — `cover-letter.ts`:

```typescript
export interface CoverLetter {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  jobId: string
  personaId: string | null
  title: string | null
  instructions: string | null
  bodyMarkdown: string
}
```

- [ ] **Step 2: Keys** — append to `src/lib/query-keys.ts`:

```typescript
export const COVER_LETTERS_KEY = ['cover-letters'] as const
export const coverLettersByJobKey = (jobId: string) => ['cover-letters', 'job', jobId] as const
```

- [ ] **Step 3: Typecheck** — `cd frontend-next && npm run typecheck` → green.
- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/types/cover-letter.ts frontend-next/src/lib/query-keys.ts
git commit -m "feat(slice-6c): CoverLetter type + query keys"
```

---

### Task 10: `useCoverLetters` hooks

**Files:** Create `frontend-next/src/hooks/use-cover-letters.ts` · Test `…/use-cover-letters.test.tsx`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
import { apiClient } from '@/lib/api-client'
import { useCoverLetters, useGenerateCoverLetter, useUpdateCoverLetter, useDeleteCoverLetter } from './use-cover-letters'
import { COVER_LETTERS_KEY } from '@/lib/query-keys'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
function spied() {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(c, 'invalidateQueries')
  const W = ({ children }: { children: ReactNode }) => <QueryClientProvider client={c}>{children}</QueryClientProvider>
  return { W, invalidate }
}
beforeEach(() => vi.clearAllMocks())

describe('use-cover-letters', () => {
  it('lists by job', async () => {
    api.get.mockResolvedValue([{ id: 'cl1' }])
    const { result } = renderHook(() => useCoverLetters('j1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/cover-letters?jobId=j1')
  })
  it('generate posts and invalidates', async () => {
    api.post.mockResolvedValue({ id: 'cl1' })
    const { W, invalidate } = spied()
    const { result } = renderHook(() => useGenerateCoverLetter(), { wrapper: W })
    result.current.mutate({ jobId: 'j1', personaId: 'p1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/cover-letters', { jobId: 'j1', personaId: 'p1' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: COVER_LETTERS_KEY })
  })
  it('update + delete by id', async () => {
    api.patch.mockResolvedValue({ id: 'cl1' }); api.delete.mockResolvedValue(undefined)
    const up = renderHook(() => useUpdateCoverLetter('cl1'), { wrapper })
    up.result.current.mutate({ bodyMarkdown: 'X' })
    await waitFor(() => expect(up.result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/cover-letters/cl1', { bodyMarkdown: 'X' })
    const del = renderHook(() => useDeleteCoverLetter(), { wrapper })
    del.result.current.mutate('cl1')
    await waitFor(() => expect(del.result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/cover-letters/cl1')
  })
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `use-cover-letters.ts`:

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { COVER_LETTERS_KEY, coverLettersByJobKey } from '@/lib/query-keys'
import type { CoverLetter } from '@/types/cover-letter'

interface GenerateBody {
  jobId: string
  personaId: string
  instructions?: string
}

export function useCoverLetters(jobId: string) {
  return useQuery({
    queryKey: coverLettersByJobKey(jobId),
    queryFn: () => apiClient.get<CoverLetter[]>(`/api/cover-letters?jobId=${jobId}`),
    enabled: Boolean(jobId),
    refetchOnMount: 'always',
  })
}

export function useGenerateCoverLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: GenerateBody) => apiClient.post<CoverLetter>('/api/cover-letters', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVER_LETTERS_KEY }),
  })
}

export function useUpdateCoverLetter(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { title?: string; bodyMarkdown?: string }) =>
      apiClient.patch<CoverLetter>(`/api/cover-letters/${id}`, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVER_LETTERS_KEY }),
  })
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/cover-letters/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVER_LETTERS_KEY }),
  })
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/hooks/use-cover-letters.ts frontend-next/src/hooks/use-cover-letters.test.tsx
git commit -m "feat(slice-6c): useCoverLetters hooks"
```

---

### Task 11: Cover-letter PDF doc + editor

**Files:** Create `frontend-next/src/components/resume/cover-letter-document.tsx`, `…/download-cover-letter-pdf-button.tsx`, `…/cover-letter-editor.tsx` · Test `…/cover-letter-editor.test.tsx`

- [ ] **Step 1: Failing test** (editor — textarea edits + Copy; react-markdown preview + react-pdf not asserted)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoverLetterEditor } from './cover-letter-editor'

const writeText = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

describe('CoverLetterEditor', () => {
  it('edits the body and emits onChange', async () => {
    const onChange = vi.fn()
    render(<CoverLetterEditor value="Dear" onChange={onChange} fileName="cl.pdf" />)
    await userEvent.type(screen.getByLabelText(/cover letter body/i), '!')
    expect(onChange).toHaveBeenCalled()
  })
  it('copies the body text', async () => {
    render(<CoverLetterEditor value="Dear hiring manager" onChange={vi.fn()} fileName="cl.pdf" />)
    await userEvent.click(screen.getByRole('button', { name: /copy text/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Dear hiring manager'))
  })
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.** `cover-letter-document.tsx` (react-pdf; splits the body into paragraphs):

```tsx
'use client'

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 56, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5, color: '#111' },
  para: { marginBottom: 10 },
})

// Strip light markdown so the PDF reads as clean prose.
function toParagraphs(body: string): string[] {
  return body
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)
}

export function CoverLetterDocument({ body }: { body: string }) {
  return (
    <Document title="Cover letter">
      <Page size="A4" style={s.page}>
        <View>
          {toParagraphs(body).map((p, i) => (
            <Text key={i} style={s.para}>
              {p}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  )
}
```

`download-cover-letter-pdf-button.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { CoverLetterDocument } from './cover-letter-document'

const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink), { ssr: false })

export function DownloadCoverLetterPdfButton({ body, fileName }: { body: string; fileName: string }) {
  return (
    <PDFDownloadLink
      document={<CoverLetterDocument body={body} />}
      fileName={fileName}
      className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
    >
      {({ loading }) => (loading ? 'Preparing…' : 'Download PDF')}
    </PDFDownloadLink>
  )
}
```

`cover-letter-editor.tsx` (textarea + live Markdown preview via `react-markdown`, already a dep + Copy + Download PDF):

```tsx
'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DownloadCoverLetterPdfButton } from './download-cover-letter-pdf-button'

interface Props {
  value: string
  onChange: (next: string) => void
  fileName: string
}

export function CoverLetterEditor({ value, onChange, fileName }: Props) {
  const [showPreview, setShowPreview] = useState(false)
  const copy = () => void navigator.clipboard.writeText(value)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>Copy text</Button>
        <DownloadCoverLetterPdfButton body={value} fileName={fileName} />
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>
      {showPreview ? (
        <div className="prose prose-sm max-w-none rounded-lg border border-border p-3 text-sm">
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="cl-body" className="sr-only">Cover letter body</Label>
          <Textarea id="cl-body" rows={14} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/resume/cover-letter-document.tsx frontend-next/src/components/resume/download-cover-letter-pdf-button.tsx frontend-next/src/components/resume/cover-letter-editor.tsx frontend-next/src/components/resume/cover-letter-editor.test.tsx
git commit -m "feat(slice-6c): cover-letter editor (markdown preview) + PDF doc"
```

---

### Task 12: Job-tailored résumé — extend the workspace for `?job=`

**Files:** Modify `frontend-next/src/components/resume/resume-workspace.tsx`, `…/resumes-page-client.tsx` · Test `…/resume-workspace.test.tsx` (append)

- [ ] **Step 1: Add a failing test** — append to `resume-workspace.test.tsx`:

```typescript
  it('includes jobId in the generate call when given', async () => {
    api.post.mockResolvedValue({ id: 'res1', personaId: 'p1', jobId: 'job1', title: 'SWE — Acme', instructions: null, content: C, userId: 'u1', createdAt: '', updatedAt: '' })
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" initialJobId="job1" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /generate résumé|generate resume/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/resumes', { personaId: 'p1', jobId: 'job1' }))
  })
```

- [ ] **Step 2: Run → FAIL** (prop `initialJobId` not supported).
- [ ] **Step 3: Implement** — in `resume-workspace.tsx`, add the optional prop + thread `jobId` into generate, and show a tailoring note:

Change the `Props` interface and component signature:

```tsx
interface Props {
  personas: Persona[]
  initialPersonaId: string
  initialJobId?: string
}

export function ResumeWorkspace({ personas, initialPersonaId, initialJobId }: Props) {
  const [personaId, setPersonaId] = useState(initialPersonaId || personas[0]?.id || '')
  const [resume, setResume] = useState<GeneratedResume | null>(null)
  const [content, setContent] = useState<ResumeContent | null>(null)
  const generate = useGenerateResume()
  const save = useUpdateResume(resume?.id ?? '')

  const onGenerate = (instructions: string) => {
    generate.mutate(
      {
        personaId,
        ...(initialJobId ? { jobId: initialJobId } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      },
      { onSuccess: (r) => { setResume(r); setContent(r.content) } },
    )
  }
```

And under the `<h1>`, add the tailoring note:

```tsx
      <h1 className="font-serif text-2xl tracking-tight">Generate résumé</h1>
      {initialJobId ? (
        <p className="text-sm text-muted-foreground">Tailoring this résumé to the selected job.</p>
      ) : null}
```

In `resumes-page-client.tsx`, read `?job=` and pass it:

```tsx
export function ResumesPageClient({ personas }: { personas: Persona[] }) {
  const sp = useSearchParams()
  const initial = sp.get('persona') ?? ''
  const job = sp.get('job') ?? ''
  if (personas.length === 0) {
    return <p className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">Create a persona first, then come back to generate a résumé.</p>
  }
  return <ResumeWorkspace personas={personas} initialPersonaId={initial} {...(job ? { initialJobId: job } : {})} />
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/resume/resume-workspace.tsx frontend-next/src/components/resume/resumes-page-client.tsx frontend-next/src/components/resume/resume-workspace.test.tsx
git commit -m "feat(slice-6c): job-tailored résumé via ?job= in the workspace"
```

---

### Task 13: JobDrawer — Résumé launcher + Cover-letter section

**Files:** Create `frontend-next/src/components/jobs/resume/resume-launcher.tsx`, `…/jobs/cover-letter/cover-letter-section.tsx` · Modify `src/components/jobs/job-drawer.tsx` · Test `…/cover-letter-section.test.tsx`

- [ ] **Step 1: Failing test** (the cover-letter section: AI gating, generate flow)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
// react-pdf download is browser-only — stub it.
vi.mock('@/components/resume/download-cover-letter-pdf-button', () => ({ DownloadCoverLetterPdfButton: () => <button>Download PDF</button> }))

import { apiClient } from '@/lib/api-client'
import { CoverLetterSection } from './cover-letter-section'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('CoverLetterSection', () => {
  it('disables generate + shows a notice when AI is not configured', async () => {
    api.get.mockImplementation((path: string) =>
      path.startsWith('/api/ai/status') ? Promise.resolve({ enabled: false, maxPersonas: 5 }) : Promise.resolve([]),
    )
    render(<CoverLetterSection jobId="j1" />, { wrapper })
    expect(await screen.findByText(/not configured/i)).toBeInTheDocument()
  })
  it('generates a cover letter from the selected persona', async () => {
    api.get.mockImplementation((path: string) => {
      if (path.startsWith('/api/ai/status')) return Promise.resolve({ enabled: true, maxPersonas: 5 })
      if (path.startsWith('/api/personas')) return Promise.resolve([{ id: 'p1', name: 'Backend', userId: 'u1', data: {}, rawInput: null, createdAt: '', updatedAt: '' }])
      return Promise.resolve([]) // cover letters
    })
    api.post.mockResolvedValue({ id: 'cl1', jobId: 'j1', personaId: 'p1', title: 'Acme', instructions: null, bodyMarkdown: 'Dear hiring manager', userId: 'u1', createdAt: '', updatedAt: '' })
    render(<CoverLetterSection jobId="j1" />, { wrapper })
    await screen.findByRole('button', { name: /generate cover letter/i })
    await userEvent.click(screen.getByRole('button', { name: /generate cover letter/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/cover-letters', { jobId: 'j1', personaId: 'p1' }))
    expect(await screen.findByRole('button', { name: /copy text/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.** `resume/resume-launcher.tsx`:

```tsx
'use client'

import Link from 'next/link'

export function ResumeLauncher({ jobId }: { jobId: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Résumé</h3>
      <p className="text-sm text-muted-foreground">Generate a résumé tailored to this job.</p>
      <Link
        href={`/app/resumes?job=${jobId}`}
        className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
      >
        Generate tailored résumé →
      </Link>
    </div>
  )
}
```

`cover-letter/cover-letter-section.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import type { CoverLetter } from '@/types/cover-letter'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { usePersonas } from '@/hooks/use-personas'
import { useAiStatus } from '@/hooks/use-ai-status'
import { useCoverLetters, useGenerateCoverLetter, useUpdateCoverLetter } from '@/hooks/use-cover-letters'
import { CoverLetterEditor } from '@/components/resume/cover-letter-editor'

export function CoverLetterSection({ jobId }: { jobId: string }) {
  const { data: status } = useAiStatus()
  const { data: personas = [] } = usePersonas()
  const { data: existing = [] } = useCoverLetters(jobId)
  const generate = useGenerateCoverLetter()

  const [personaId, setPersonaId] = useState('')
  const [instructions, setInstructions] = useState('')
  const [active, setActive] = useState<CoverLetter | null>(null)
  const [body, setBody] = useState('')
  const save = useUpdateCoverLetter(active?.id ?? '')

  useEffect(() => {
    if (!personaId && personas[0]) setPersonaId(personas[0].id)
  }, [personas, personaId])
  useEffect(() => {
    if (!active && existing[0]) {
      setActive(existing[0])
      setBody(existing[0].bodyMarkdown)
    }
  }, [existing, active])

  const aiEnabled = status?.enabled ?? false

  const onGenerate = () => {
    generate.mutate(
      { jobId, personaId, ...(instructions.trim() ? { instructions: instructions.trim() } : {}) },
      { onSuccess: (cl) => { setActive(cl); setBody(cl.bodyMarkdown) } },
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Cover letter</h3>
      {!aiEnabled ? (
        <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          AI features are not configured.
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="cl-persona">Persona</Label>
            <Select id="cl-persona" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <Textarea rows={2} placeholder="Instructions (optional)" value={instructions} onChange={(e) => setInstructions(e.target.value)} aria-label="Cover letter instructions" />
          <Button type="button" disabled={generate.isPending || !personaId} onClick={onGenerate}>
            {generate.isPending ? 'Generating…' : 'Generate cover letter'}
          </Button>
          {generate.error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{generate.error.message}</p>
          ) : null}

          {active ? (
            <div className="space-y-2 border-t border-border pt-3">
              <CoverLetterEditor value={body} onChange={setBody} fileName={`${(active.title ?? 'cover-letter').replace(/\s+/g, '-')}.pdf`} />
              <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate({ bodyMarkdown: body })}>
                {save.isPending ? 'Saving…' : 'Save edits'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
```

Modify `job-drawer.tsx` — add imports and the two sections after `RemindersSection`:

```tsx
import { ResumeLauncher } from './resume/resume-launcher'
import { CoverLetterSection } from './cover-letter/cover-letter-section'
// …inside the fragment, after the RemindersSection block:
              <div className="border-t border-border pt-5">
                <ResumeLauncher jobId={job.id} />
              </div>
              <div className="border-t border-border pt-5">
                <CoverLetterSection jobId={job.id} />
              </div>
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/jobs/resume/resume-launcher.tsx frontend-next/src/components/jobs/cover-letter/cover-letter-section.tsx frontend-next/src/components/jobs/job-drawer.tsx frontend-next/src/components/jobs/cover-letter/cover-letter-section.test.tsx
git commit -m "feat(slice-6c): JobDrawer résumé launcher + cover-letter section"
```

---

### Task 14: Frontend gate

- [ ] **Step 1:** `cd frontend-next && npm run typecheck && npm run lint && npm run test`. All green; fix failures. For `npm run build`, if it fails only on a stale/root-owned `.next`, verify via `docker build --target production ./frontend-next` (per CLAUDE.md). react-pdf stays client-only (the cover-letter download uses `next/dynamic ssr:false`; `transpilePackages` already set).
- [ ] **Step 2:** `git add -A frontend-next && git commit -m "chore(slice-6c): frontend gate green" || echo "nothing to commit"`

---

### Task 15: Manual smoke (Docker, real key)

- [ ] **Step 1:** No new frontend deps in 6c — no container recreate needed (backend hot-reloads; migration `0006` auto-applies on backend restart, or apply via host). Confirm health.
- [ ] **Step 2:** Via `:8080`: open a **job** → JobDrawer shows **Résumé** (launcher → `/app/resumes?job=…`) and **Cover letter** sections. Pick a persona → **Generate cover letter** → confirm Markdown body renders, **Preview** toggles react-markdown, **Copy text** + **Download PDF** work, an edit + **Save edits** persists.
- [ ] **Step 3:** Click the résumé launcher → workspace shows "Tailoring this résumé to the selected job"; generate → title `<job> — <company>`.
- [ ] **Step 4:** Set `AI_RATE_LIMIT_PER_HOUR=1`; generate a résumé then a cover letter → the **second** returns 429 (shared budget).

---

## Self-Review

**Spec coverage:** §2.4 per-job Markdown cover letters → T1–T7,T11,T13; §5 `cover_letters` table → T1; §6 cover-letter prompt + Gemini text + shared rate limit → T3,T4,T6; §7 `POST/GET ?jobId=/GET :id/PATCH/DELETE /api/cover-letters` → T7; §8 `CoverLetterEditor` + JobDrawer Résumé+Cover-letter tabs → T11,T12,T13.

**Placeholder scan:** none. **Type consistency:** `CoverLetter` ↔ `CoverLetterRow` parity; hook bodies match controller contracts; `assertWithinRateLimit` unchanged (the count repo it calls now sums both tables); `ResumeWorkspace` `initialJobId` threads into the generate body. **Known boundaries:** react-pdf cover-letter doc/download covered by editor unit tests (Copy + onChange) + the live smoke (no `pdf()` in CI); the JobDrawer "Résumé" is a launcher into the 6b workspace (deep-link with `?job=`) rather than an embedded preview, since the drawer is narrow — a deliberate UX choice. Rate-limit reorder (after ownership) matches the 6b fix.
