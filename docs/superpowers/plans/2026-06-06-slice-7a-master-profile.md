# Slice 7a — Master Profile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the user master profile end-to-end — a rich, structured `ProfileContent` schema, a `user_profiles` table, a `GET/PUT /api/profile` module, and a `/app/profile` page with a full structured editor — without touching personas (those change in Slice 7b).

**Architecture:** Mirrors the existing layered backend module pattern (`router → controller → service → repository → schema`) and the frontend controlled-editor pattern (`ResumeContentEditor`-style `value`/`onChange`). `ProfileContent` is a new shared Zod schema, deliberately lenient at rest (nullable dates, optional ids) so future AI-parsed and legacy data always validate; the backend assigns ids via `ensureIds()` on every write, and a frontend `validateProfileContent()` enforces requiredness before save.

**Tech Stack:** Backend — Express 5, Drizzle ORM, Zod, Vitest (+ real Postgres for repository tests). Frontend — Next.js 15 App Router, React 19, TanStack Query v5, Tailwind v4, Vitest + React Testing Library.

**Reference:** `docs/superpowers/specs/2026-06-06-personas-profile-redesign-design.md` (§4 data model, §5 backend, §6 frontend, §9 testing).

**Conventions to honor (verified against the codebase):**
- All backend relative imports end in `.js` (NodeNext ESM).
- Backend module files: `<feature>.{router,controller,service,repository,schema}.ts` + co-located `.test.ts`.
- Success envelope `{ data }`; errors thrown as `new AppError(code, message)`.
- Frontend: `'use client'` only on interactive leaves; UI primitives in `src/components/ui/`; every styled element is its own component (no inline styled markup); `cn()` from `@/lib/utils`; query keys in `src/lib/query-keys.ts`; client fetches via `@/lib/api-client`, Server Components via `@/lib/api-server`.
- Run a single backend test: `cd backend-express && npm test -- <path>`. Frontend: `cd frontend-next && npm test -- <path>`.
- Repository tests need Postgres up (`docker compose up -d postgres`) and `DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault`.

---

## Phase A — Backend

### Task A1: `ProfileContent` schema + `ensureIds` + `emptyProfileContent`

**Files:**
- Create: `backend-express/src/shared/profile-content.schema.ts`
- Test: `backend-express/src/shared/profile-content.schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend-express/src/shared/profile-content.schema.test.ts
import { describe, it, expect } from 'vitest'
import {
  ProfileContentSchema,
  ensureIds,
  emptyProfileContent,
  type ProfileContent,
} from './profile-content.schema.js'

describe('ProfileContentSchema', () => {
  it('accepts a minimal profile and applies array defaults', () => {
    const parsed = ProfileContentSchema.parse({ basics: { name: 'Ada' } })
    expect(parsed.summary).toBe('')
    expect(parsed.experience).toEqual([])
    expect(parsed.basics.links).toEqual([])
  })

  it('accepts partial / AI-shaped data: nullable dates and missing ids', () => {
    const parsed = ProfileContentSchema.parse({
      basics: { name: 'Ada' },
      experience: [{ company: 'X', role: 'SWE' }], // no startDate, no id, no current
      education: [{ degree: 'BS', institution: 'MIT' }],
    })
    expect(parsed.experience[0]?.startDate).toBeNull()
    expect(parsed.experience[0]?.current).toBe(false)
    expect(parsed.experience[0]?.id).toBeUndefined()
  })

  it('accepts a year-only date (month null) and a full date', () => {
    const parsed = ProfileContentSchema.parse({
      basics: { name: 'Ada' },
      experience: [{ company: 'X', role: 'SWE', startDate: { year: 2022 }, endDate: { month: 6, year: 2024 } }],
    })
    expect(parsed.experience[0]?.startDate).toEqual({ month: null, year: 2022 })
    expect(parsed.experience[0]?.endDate).toEqual({ month: 6, year: 2024 })
  })

  it('rejects a required entry field (empty company)', () => {
    expect(() => ProfileContentSchema.parse({ basics: { name: 'Ada' }, experience: [{ company: '', role: 'SWE' }] })).toThrow()
  })

  it('rejects an invalid month', () => {
    expect(() =>
      ProfileContentSchema.parse({ basics: { name: 'Ada' }, experience: [{ company: 'X', role: 'SWE', startDate: { month: 13, year: 2022 } }] }),
    ).toThrow()
  })
})

describe('ensureIds', () => {
  it('assigns ids to every entry and link missing one, leaving existing ids', () => {
    const input: ProfileContent = ProfileContentSchema.parse({
      basics: { name: 'Ada', links: [{ label: 'GH', url: 'gh' }, { id: 'keep', label: 'LI', url: 'li' }] },
      experience: [{ company: 'X', role: 'SWE' }],
      projects: [{ name: 'P', links: [{ label: 'Demo', url: 'd' }] }],
      skills: [{ category: 'Skills', items: ['ts'] }],
      education: [{ degree: 'BS', institution: 'MIT' }],
    })
    const out = ensureIds(input)
    expect(out.basics.links[0]?.id).toBeTruthy()
    expect(out.basics.links[1]?.id).toBe('keep')
    expect(out.experience[0]?.id).toBeTruthy()
    expect(out.projects[0]?.id).toBeTruthy()
    expect(out.projects[0]?.links[0]?.id).toBeTruthy()
    expect(out.skills[0]?.id).toBeTruthy()
    expect(out.education[0]?.id).toBeTruthy()
  })
})

describe('emptyProfileContent', () => {
  it('returns an empty profile shell', () => {
    const e = emptyProfileContent()
    expect(e.basics.name).toBe('')
    expect(e.experience).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npm test -- src/shared/profile-content.schema.test.ts`
Expected: FAIL — cannot resolve `./profile-content.schema.js`.

- [ ] **Step 3: Write the schema**

```ts
// backend-express/src/shared/profile-content.schema.ts
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export const MonthYearSchema = z.object({
  month: z.number().int().min(1).max(12).nullable().default(null),
  year: z.number().int().min(1900).max(2100),
})

export const ProfileLinkSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  url: z.string().min(1),
})

export const ProfileBasicsSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(ProfileLinkSchema).default([]),
})

export const EmploymentTypeSchema = z.enum([
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
  'self-employed',
])

export const ProfileExperienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1),
  role: z.string().min(1),
  employmentType: EmploymentTypeSchema.optional(),
  location: z.string().optional(),
  startDate: MonthYearSchema.nullable().default(null),
  endDate: MonthYearSchema.nullable().default(null),
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
})

export const ProfileProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  role: z.string().optional(),
  description: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
  links: z.array(ProfileLinkSchema).default([]),
  startDate: MonthYearSchema.nullable().default(null),
  endDate: MonthYearSchema.nullable().default(null),
  inProgress: z.boolean().default(false),
})

export const ProfileSkillGroupSchema = z.object({
  id: z.string().optional(),
  category: z.string().default('Skills'),
  items: z.array(z.string()).default([]),
})

export const ProfileEducationSchema = z.object({
  id: z.string().optional(),
  degree: z.string().min(1),
  institution: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  location: z.string().optional(),
  startDate: MonthYearSchema.nullable().default(null),
  endDate: MonthYearSchema.nullable().default(null),
  current: z.boolean().default(false),
  grade: z.string().optional(),
  bullets: z.array(z.string()).default([]),
})

export const ProfileContentSchema = z.object({
  basics: ProfileBasicsSchema,
  summary: z.string().default(''),
  experience: z.array(ProfileExperienceSchema).default([]),
  projects: z.array(ProfileProjectSchema).default([]),
  skills: z.array(ProfileSkillGroupSchema).default([]),
  education: z.array(ProfileEducationSchema).default([]),
})

export type MonthYear = z.infer<typeof MonthYearSchema>
export type ProfileLink = z.infer<typeof ProfileLinkSchema>
export type ProfileExperience = z.infer<typeof ProfileExperienceSchema>
export type ProfileProject = z.infer<typeof ProfileProjectSchema>
export type ProfileSkillGroup = z.infer<typeof ProfileSkillGroupSchema>
export type ProfileEducation = z.infer<typeof ProfileEducationSchema>
export type ProfileContent = z.infer<typeof ProfileContentSchema>

// Assign a stable id to every entry/link that lacks one. The AI and legacy
// rows never carry ids; the editor relies on them. Pure — returns a new object.
export function ensureIds(content: ProfileContent): ProfileContent {
  const withId = <T extends { id?: string }>(x: T): T => (x.id ? x : { ...x, id: randomUUID() })
  return {
    ...content,
    basics: { ...content.basics, links: content.basics.links.map(withId) },
    experience: content.experience.map(withId),
    projects: content.projects.map((p) => ({ ...withId(p), links: p.links.map(withId) })),
    skills: content.skills.map(withId),
    education: content.education.map(withId),
  }
}

// A fresh, empty profile shell returned by GET when none is saved yet (not persisted).
export function emptyProfileContent(): ProfileContent {
  return { basics: { name: '', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend-express && npm test -- src/shared/profile-content.schema.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/shared/profile-content.schema.ts backend-express/src/shared/profile-content.schema.test.ts
git commit -m "feat(slice-7a): ProfileContent schema + ensureIds"
```

---

### Task A2: `user_profiles` table + migration `0007`

**Files:**
- Create: `backend-express/src/db/schema/user-profiles.ts`
- Modify: `backend-express/src/db/schema/index.ts` (add one re-export)
- Generated: `backend-express/src/db/migrations/0007_*.sql` + `meta/_journal.json` (auto)
- Test: `backend-express/src/db/schema/user-profiles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend-express/src/db/schema/user-profiles.test.ts
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { userProfiles } from './user-profiles.js'

describe('user_profiles table', () => {
  it('has the expected columns', () => {
    const cols = getTableConfig(userProfiles).columns.map((c) => c.name)
    expect(cols).toEqual(expect.arrayContaining(['id', 'user_id', 'content', 'created_at', 'updated_at']))
  })

  it('user_id is unique (one profile per user)', () => {
    const userId = getTableConfig(userProfiles).columns.find((c) => c.name === 'user_id')
    expect(userId?.isUnique).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npm test -- src/db/schema/user-profiles.test.ts`
Expected: FAIL — cannot resolve `./user-profiles.js`.

- [ ] **Step 3: Write the table + export it from the barrel**

```ts
// backend-express/src/db/schema/user-profiles.ts
import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: jsonb('content').$type<ProfileContent>().notNull(),
})

export type UserProfileRow = typeof userProfiles.$inferSelect
export type NewUserProfileRow = typeof userProfiles.$inferInsert
```

Add to `backend-express/src/db/schema/index.ts` (after the `personas` line):

```ts
export * from './user-profiles.js'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend-express && npm test -- src/db/schema/user-profiles.test.ts`
Expected: PASS.

- [ ] **Step 5: Generate the migration**

Ensure Postgres is up and `DATABASE_URL` is set, then:

```bash
cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run db:generate
```

Expected: a new `src/db/migrations/0007_<auto-name>.sql` containing `CREATE TABLE "user_profiles"` with a unique constraint on `user_id` and an FK to `users`, and a new entry (idx 7) appended to `meta/_journal.json`. **Do not hand-edit or rename the migration.** Then apply it:

```bash
cd backend-express && DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run db:migrate
```

- [ ] **Step 6: Commit**

```bash
git add backend-express/src/db/schema/user-profiles.ts backend-express/src/db/schema/user-profiles.test.ts backend-express/src/db/schema/index.ts backend-express/src/db/migrations
git commit -m "feat(slice-7a): user_profiles table + migration 0007"
```

---

### Task A3: profile repository (real-DB test)

**Files:**
- Create: `backend-express/src/modules/profile/profile.repository.ts`
- Test: `backend-express/src/modules/profile/profile.repository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend-express/src/modules/profile/profile.repository.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { inArray } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { ProfileContentSchema } from '@/shared/profile-content.schema.js'
import { profileRepository } from './profile.repository.js'

const EMAIL = `profile-repo-${Date.now()}@example.com`
let userId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const u = (await getDb().insert(users).values({ name: 'P', email: EMAIL, passwordHash: 'h' }).returning())[0]
  if (!u) throw new Error('failed to seed user')
  userId = u.id
})

afterAll(async () => {
  await getDb().delete(users).where(inArray(users.id, [userId])) // cascade removes the profile
  await closeDb()
})

describe('profileRepository (real DB)', () => {
  it('returns null before any profile is saved', async () => {
    expect(await profileRepository.findByUserId(userId)).toBeNull()
  })

  it('upserts: inserts then updates the same row', async () => {
    const first = ProfileContentSchema.parse({ basics: { name: 'Ada' }, summary: 'first' })
    const a = await profileRepository.upsert(userId, first)
    expect(a.content.summary).toBe('first')

    const second = ProfileContentSchema.parse({ basics: { name: 'Ada' }, summary: 'second' })
    const b = await profileRepository.upsert(userId, second)
    expect(b.id).toBe(a.id) // same row
    expect(b.content.summary).toBe('second')

    const found = await profileRepository.findByUserId(userId)
    expect(found?.content.summary).toBe('second')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npm test -- src/modules/profile/profile.repository.test.ts`
Expected: FAIL — cannot resolve `./profile.repository.js`.

- [ ] **Step 3: Write the repository**

```ts
// backend-express/src/modules/profile/profile.repository.ts
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { userProfiles, type UserProfileRow } from '@/db/schema/user-profiles.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

async function findByUserId(userId: string): Promise<UserProfileRow | null> {
  const rows = await getDb().select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1)
  return rows[0] ?? null
}

async function upsert(userId: string, content: ProfileContent): Promise<UserProfileRow> {
  const rows = await getDb()
    .insert(userProfiles)
    .values({ userId, content })
    .onConflictDoUpdate({ target: userProfiles.userId, set: { content, updatedAt: new Date() } })
    .returning()
  const row = rows[0]
  if (!row) throw new Error('upsert returned no row')
  return row
}

export const profileRepository = { findByUserId, upsert }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend-express && npm test -- src/modules/profile/profile.repository.test.ts`
Expected: PASS (requires Postgres up + migration `0007` applied).

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/profile/profile.repository.ts backend-express/src/modules/profile/profile.repository.test.ts
git commit -m "feat(slice-7a): profile repository (findByUserId + upsert)"
```

---

### Task A4: profile schema + service (mocked-repo test)

**Files:**
- Create: `backend-express/src/modules/profile/profile.schema.ts`
- Create: `backend-express/src/modules/profile/profile.service.ts`
- Test: `backend-express/src/modules/profile/profile.service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend-express/src/modules/profile/profile.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./profile.repository.js', () => ({
  profileRepository: { findByUserId: vi.fn(), upsert: vi.fn() },
}))

import { profileRepository } from './profile.repository.js'
import { profileService } from './profile.service.js'
import { ProfileContentSchema, type ProfileContent } from '@/shared/profile-content.schema.js'
import type { UserProfileRow } from '@/db/schema/user-profiles.js'

const repo = vi.mocked(profileRepository)
const CONTENT: ProfileContent = ProfileContentSchema.parse({ basics: { name: 'Ada' }, summary: 'hi' })
function row(content: ProfileContent): UserProfileRow {
  return { id: 'pr1', userId: 'u1', content, createdAt: new Date(), updatedAt: new Date() }
}

beforeEach(() => vi.clearAllMocks())

describe('profileService.getForUser', () => {
  it('returns the saved content when a row exists', async () => {
    repo.findByUserId.mockResolvedValue(row(CONTENT))
    expect(await profileService.getForUser('u1')).toEqual(CONTENT)
  })
  it('returns an empty profile (not persisted) when none exists', async () => {
    repo.findByUserId.mockResolvedValue(null)
    const out = await profileService.getForUser('u1')
    expect(out.basics.name).toBe('')
    expect(repo.upsert).not.toHaveBeenCalled()
  })
})

describe('profileService.update', () => {
  it('assigns ids then upserts, returning the stored content', async () => {
    const incoming = ProfileContentSchema.parse({
      basics: { name: 'Ada', links: [{ label: 'GH', url: 'gh' }] },
      experience: [{ company: 'X', role: 'SWE' }],
    })
    repo.upsert.mockImplementation(async (_uid, content) => row(content))
    const out = await profileService.update('u1', incoming)
    const upserted = repo.upsert.mock.calls[0]?.[1] as ProfileContent
    expect(upserted.basics.links[0]?.id).toBeTruthy() // ensureIds ran
    expect(upserted.experience[0]?.id).toBeTruthy()
    expect(out.experience[0]?.id).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npm test -- src/modules/profile/profile.service.test.ts`
Expected: FAIL — cannot resolve `./profile.service.js`.

- [ ] **Step 3: Write the schema + service**

```ts
// backend-express/src/modules/profile/profile.schema.ts
import { z } from 'zod'
import { ProfileContentSchema } from '@/shared/profile-content.schema.js'

export const UpdateProfileSchema = z.object({
  content: ProfileContentSchema,
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
```

```ts
// backend-express/src/modules/profile/profile.service.ts
import { ensureIds, emptyProfileContent, type ProfileContent } from '@/shared/profile-content.schema.js'
import { profileRepository } from './profile.repository.js'

async function getForUser(userId: string): Promise<ProfileContent> {
  const row = await profileRepository.findByUserId(userId)
  return row ? row.content : emptyProfileContent()
}

async function update(userId: string, content: ProfileContent): Promise<ProfileContent> {
  const row = await profileRepository.upsert(userId, ensureIds(content))
  return row.content
}

export const profileService = { getForUser, update }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend-express && npm test -- src/modules/profile/profile.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/profile/profile.schema.ts backend-express/src/modules/profile/profile.service.ts backend-express/src/modules/profile/profile.service.test.ts
git commit -m "feat(slice-7a): profile service + update schema (ensureIds on write)"
```

---

### Task A5: profile controller + router + mount (supertest)

**Files:**
- Create: `backend-express/src/modules/profile/profile.controller.ts`
- Create: `backend-express/src/modules/profile/profile.router.ts`
- Modify: `backend-express/src/shared/api-router.ts` (import + mount `/profile`)
- Test: `backend-express/src/modules/profile/profile.router.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend-express/src/modules/profile/profile.router.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { ProfileContentSchema, type ProfileContent } from '@/shared/profile-content.schema.js'

vi.mock('./profile.repository.js', () => ({
  profileRepository: { findByUserId: vi.fn(), upsert: vi.fn() },
}))

import { profileRepository } from './profile.repository.js'

const repo = vi.mocked(profileRepository)
let app: Express
let cookie: string
const CONTENT: ProfileContent = ProfileContentSchema.parse({ basics: { name: 'Ada' }, summary: 'hi' })

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

describe('profile routes', () => {
  it('401s without a cookie', async () => {
    expect((await request(app).get('/api/profile')).status).toBe(401)
  })
  it('GET returns an empty profile when none saved', async () => {
    repo.findByUserId.mockResolvedValue(null)
    const res = await request(app).get('/api/profile').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data.basics.name).toBe('')
  })
  it('GET returns saved content', async () => {
    repo.findByUserId.mockResolvedValue({ id: 'pr1', userId: 'u1', content: CONTENT, createdAt: new Date(), updatedAt: new Date() })
    const res = await request(app).get('/api/profile').set('Cookie', [cookie])
    expect(res.body.data.summary).toBe('hi')
  })
  it('PUT validates and upserts (200)', async () => {
    repo.upsert.mockImplementation(async (_uid, content) => ({ id: 'pr1', userId: 'u1', content, createdAt: new Date(), updatedAt: new Date() }))
    const res = await request(app).put('/api/profile').set('Cookie', [cookie]).send({ content: CONTENT })
    expect(res.status).toBe(200)
    expect(res.body.data.basics.name).toBe('Ada')
  })
  it('PUT 400s on an invalid body (missing basics.name)', async () => {
    const res = await request(app).put('/api/profile').set('Cookie', [cookie]).send({ content: { basics: {} } })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npm test -- src/modules/profile/profile.router.test.ts`
Expected: FAIL — cannot resolve `./profile.controller.js` / route not mounted.

- [ ] **Step 3: Write the controller + router and mount it**

```ts
// backend-express/src/modules/profile/profile.controller.ts
import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { profileService } from './profile.service.js'
import type { UpdateProfileInput } from './profile.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

async function get(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await profileService.getForUser(requireUserId(req)) })
}

async function put(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateProfileInput
  res.status(200).json({ data: await profileService.update(requireUserId(req), body.content) })
}

export const profileController = { get, put }
```

```ts
// backend-express/src/modules/profile/profile.router.ts
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { profileController } from './profile.controller.js'
import { UpdateProfileSchema } from './profile.schema.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(profileController.get))
router.put('/', validate(UpdateProfileSchema), asyncHandler(profileController.put))

export { router as profileRouter }
```

In `backend-express/src/shared/api-router.ts`, add the import (near the other module imports):

```ts
import { profileRouter } from '@/modules/profile/profile.router.js'
```

and the mount (next to `router.use('/personas', personasRouter)`):

```ts
router.use('/profile', profileRouter)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend-express && npm test -- src/modules/profile/profile.router.test.ts`
Expected: PASS.

- [ ] **Step 5: Backend gates + commit**

```bash
cd backend-express && npm run typecheck && npm run lint && npm test
git add backend-express/src/modules/profile/profile.controller.ts backend-express/src/modules/profile/profile.router.ts backend-express/src/modules/profile/profile.router.test.ts backend-express/src/shared/api-router.ts
git commit -m "feat(slice-7a): profile controller + router, mount GET/PUT /api/profile"
```

---

## Phase B — Frontend

### Task B1: profile types + factories + `validateProfileContent`

**Files:**
- Create: `frontend-next/src/types/profile.ts`
- Create: `frontend-next/src/lib/profile.ts`
- Test: `frontend-next/src/lib/profile.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend-next/src/lib/profile.test.ts
import { describe, it, expect } from 'vitest'
import { emptyProfileContent, newExperience, newEducation, newProject, newSkillGroup, newLink, validateProfileContent } from './profile'

describe('profile factories', () => {
  it('emptyProfileContent has empty sections and a blank name', () => {
    const e = emptyProfileContent()
    expect(e.basics.name).toBe('')
    expect(e.experience).toEqual([])
  })
  it('factories produce unique ids', () => {
    expect(newExperience().id).not.toBe(newExperience().id)
    expect(newLink().id).toBeTruthy()
    expect(newProject().id).toBeTruthy()
    expect(newSkillGroup().category).toBe('Skills')
    expect(newEducation().id).toBeTruthy()
  })
})

describe('validateProfileContent', () => {
  it('passes for a complete profile', () => {
    const c = emptyProfileContent()
    c.basics.name = 'Ada'
    c.experience = [{ ...newExperience(), company: 'X', role: 'SWE', startDate: { month: 1, year: 2022 }, current: true }]
    c.education = [{ ...newEducation(), degree: 'BS', institution: 'MIT', startDate: { month: null, year: 2018 }, endDate: { month: null, year: 2022 } }]
    expect(validateProfileContent(c)).toEqual([])
  })
  it('flags a blank name', () => {
    expect(validateProfileContent(emptyProfileContent())).toContain('Your name is required')
  })
  it('flags experience missing company/role/start date', () => {
    const c = emptyProfileContent()
    c.basics.name = 'Ada'
    c.experience = [newExperience()]
    const errs = validateProfileContent(c)
    expect(errs.some((e) => e.includes('Experience 1'))).toBe(true)
  })
  it('requires an experience end date unless current', () => {
    const c = emptyProfileContent()
    c.basics.name = 'Ada'
    c.experience = [{ ...newExperience(), company: 'X', role: 'SWE', startDate: { month: 1, year: 2022 }, current: false, endDate: null }]
    expect(validateProfileContent(c).some((e) => e.includes('end date'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/lib/profile.test.ts`
Expected: FAIL — cannot resolve `./profile`.

- [ ] **Step 3: Write the types + factories + validator**

```ts
// frontend-next/src/types/profile.ts
// Mirror of backend ProfileContent (kept in sync manually, like types/resume.ts).
export interface MonthYear {
  month: number | null
  year: number
}
export interface ProfileLink {
  id?: string
  label: string
  url: string
}
export interface ProfileBasics {
  name: string
  email?: string
  phone?: string
  location?: string
  links: ProfileLink[]
}
export type EmploymentType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'freelance'
  | 'internship'
  | 'self-employed'
export interface ProfileExperience {
  id?: string
  company: string
  role: string
  employmentType?: EmploymentType
  location?: string
  startDate: MonthYear | null
  endDate: MonthYear | null
  current: boolean
  bullets: string[]
}
export interface ProfileProject {
  id?: string
  name: string
  role?: string
  description?: string
  technologies: string[]
  bullets: string[]
  links: ProfileLink[]
  startDate: MonthYear | null
  endDate: MonthYear | null
  inProgress: boolean
}
export interface ProfileSkillGroup {
  id?: string
  category: string
  items: string[]
}
export interface ProfileEducation {
  id?: string
  degree: string
  institution: string
  fieldOfStudy?: string
  location?: string
  startDate: MonthYear | null
  endDate: MonthYear | null
  current: boolean
  grade?: string
  bullets: string[]
}
export interface ProfileContent {
  basics: ProfileBasics
  summary: string
  experience: ProfileExperience[]
  projects: ProfileProject[]
  skills: ProfileSkillGroup[]
  education: ProfileEducation[]
}
```

```ts
// frontend-next/src/lib/profile.ts
import type {
  ProfileContent,
  ProfileExperience,
  ProfileProject,
  ProfileSkillGroup,
  ProfileEducation,
  ProfileLink,
} from '@/types/profile'

export const newId = (): string => crypto.randomUUID()

export const emptyProfileContent = (): ProfileContent => ({
  basics: { name: '', email: '', phone: '', location: '', links: [] },
  summary: '',
  experience: [],
  projects: [],
  skills: [],
  education: [],
})

export const newLink = (): ProfileLink => ({ id: newId(), label: '', url: '' })
export const newExperience = (): ProfileExperience => ({
  id: newId(),
  company: '',
  role: '',
  startDate: null,
  endDate: null,
  current: false,
  bullets: [],
})
export const newProject = (): ProfileProject => ({
  id: newId(),
  name: '',
  technologies: [],
  bullets: [],
  links: [],
  startDate: null,
  endDate: null,
  inProgress: false,
})
export const newSkillGroup = (): ProfileSkillGroup => ({ id: newId(), category: 'Skills', items: [] })
export const newEducation = (): ProfileEducation => ({
  id: newId(),
  degree: '',
  institution: '',
  startDate: null,
  endDate: null,
  current: false,
  bullets: [],
})

// Mirrors the backend's min(1) requirements plus form-level date requiredness
// (experience: start + end-unless-current; education: start + end-unless-current).
export function validateProfileContent(c: ProfileContent): string[] {
  const errors: string[] = []
  if (!c.basics.name.trim()) errors.push('Your name is required')

  c.experience.forEach((e, i) => {
    const tag = `Experience ${i + 1}`
    if (!e.company.trim()) errors.push(`${tag}: company is required`)
    if (!e.role.trim()) errors.push(`${tag}: role is required`)
    if (!e.startDate?.year) errors.push(`${tag}: start date is required`)
    if (!e.current && !e.endDate?.year) errors.push(`${tag}: end date is required (or mark “current”)`)
  })

  c.education.forEach((e, i) => {
    const tag = `Education ${i + 1}`
    if (!e.degree.trim()) errors.push(`${tag}: degree is required`)
    if (!e.institution.trim()) errors.push(`${tag}: institution is required`)
    if (!e.startDate?.year) errors.push(`${tag}: start date is required`)
    if (!e.current && !e.endDate?.year) errors.push(`${tag}: end date is required (or mark “current”)`)
  })

  c.projects.forEach((p, i) => {
    if (!p.name.trim()) errors.push(`Project ${i + 1}: name is required`)
  })

  return errors
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/lib/profile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/types/profile.ts frontend-next/src/lib/profile.ts frontend-next/src/lib/profile.test.ts
git commit -m "feat(slice-7a): frontend profile types, factories, validator"
```

---

### Task B2: `PROFILE_KEY` + `useProfile`/`useUpdateProfile` hooks

**Files:**
- Modify: `frontend-next/src/lib/query-keys.ts` (add `PROFILE_KEY`)
- Create: `frontend-next/src/hooks/use-profile.ts`
- Test: `frontend-next/src/hooks/use-profile.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/hooks/use-profile.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ProfileContent } from '@/types/profile'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useProfile, useUpdateProfile } from './use-profile'

const api = vi.mocked(apiClient)
const CONTENT: ProfileContent = { basics: { name: 'Ada', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useProfile', () => {
  it('fetches GET /api/profile', async () => {
    api.get.mockResolvedValue(CONTENT)
    const { result } = renderHook(() => useProfile(), { wrapper })
    await waitFor(() => expect(result.current.data?.basics.name).toBe('Ada'))
    expect(api.get).toHaveBeenCalledWith('/api/profile')
  })
})

describe('useUpdateProfile', () => {
  it('PUTs { content }', async () => {
    api.put.mockResolvedValue(CONTENT)
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync(CONTENT)
    })
    expect(api.put).toHaveBeenCalledWith('/api/profile', { content: CONTENT })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/hooks/use-profile.test.tsx`
Expected: FAIL — cannot resolve `./use-profile`.

- [ ] **Step 3: Add the key + write the hooks**

Append to `frontend-next/src/lib/query-keys.ts`:

```ts
export const PROFILE_KEY = ['profile'] as const
```

```ts
// frontend-next/src/hooks/use-profile.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { PROFILE_KEY } from '@/lib/query-keys'
import type { ProfileContent } from '@/types/profile'

export function useProfile(initialData?: ProfileContent) {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => apiClient.get<ProfileContent>('/api/profile'),
    staleTime: 30_000,
    ...(initialData ? { initialData } : {}),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: ProfileContent) => apiClient.put<ProfileContent>('/api/profile', { content }),
    onSuccess: (data) => qc.setQueryData(PROFILE_KEY, data),
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/hooks/use-profile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/lib/query-keys.ts frontend-next/src/hooks/use-profile.ts frontend-next/src/hooks/use-profile.test.tsx
git commit -m "feat(slice-7a): useProfile/useUpdateProfile hooks + PROFILE_KEY"
```

---

### Task B3: `MonthYearPicker` primitive

**Files:**
- Create: `frontend-next/src/components/profile/month-year-picker.tsx`
- Test: `frontend-next/src/components/profile/month-year-picker.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/month-year-picker.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthYearPicker } from './month-year-picker'

describe('MonthYearPicker', () => {
  it('renders empty selects for a null value', () => {
    render(<MonthYearPicker value={null} onChange={vi.fn()} ariaPrefix="Start" />)
    expect((screen.getByLabelText('Start year') as HTMLSelectElement).value).toBe('')
  })
  it('emits a value with year when a year is chosen', async () => {
    const onChange = vi.fn()
    render(<MonthYearPicker value={null} onChange={onChange} ariaPrefix="Start" />)
    await userEvent.selectOptions(screen.getByLabelText('Start year'), '2022')
    expect(onChange).toHaveBeenCalledWith({ month: null, year: 2022 })
  })
  it('emits null when the year is cleared', async () => {
    const onChange = vi.fn()
    render(<MonthYearPicker value={{ month: 3, year: 2022 }} onChange={onChange} ariaPrefix="Start" />)
    await userEvent.selectOptions(screen.getByLabelText('Start year'), '')
    expect(onChange).toHaveBeenCalledWith(null)
  })
  it('updates the month while keeping the year', async () => {
    const onChange = vi.fn()
    render(<MonthYearPicker value={{ month: null, year: 2022 }} onChange={onChange} ariaPrefix="Start" />)
    await userEvent.selectOptions(screen.getByLabelText('Start month'), '5')
    expect(onChange).toHaveBeenCalledWith({ month: 5, year: 2022 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/month-year-picker.test.tsx`
Expected: FAIL — cannot resolve `./month-year-picker`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/month-year-picker.tsx
'use client'

import { Select } from '@/components/ui/select'
import type { MonthYear } from '@/types/profile'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => CURRENT_YEAR - i)

interface Props {
  value: MonthYear | null
  onChange: (next: MonthYear | null) => void
  ariaPrefix: string
  disabled?: boolean
}

export function MonthYearPicker({ value, onChange, ariaPrefix, disabled }: Props) {
  const setYear = (raw: string) => {
    if (!raw) return onChange(null)
    onChange({ month: value?.month ?? null, year: Number(raw) })
  }
  const setMonth = (raw: string) => {
    if (!value) return // a month is meaningless without a year
    onChange({ ...value, month: raw ? Number(raw) : null })
  }

  return (
    <div className="flex gap-2">
      <Select
        aria-label={`${ariaPrefix} month`}
        value={value?.month ?? ''}
        onChange={(e) => setMonth(e.target.value)}
        disabled={disabled || !value}
        className="w-28"
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </Select>
      <Select
        aria-label={`${ariaPrefix} year`}
        value={value?.year ?? ''}
        onChange={(e) => setYear(e.target.value)}
        disabled={disabled}
        className="w-28"
      >
        <option value="">Year</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/month-year-picker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/month-year-picker.tsx frontend-next/src/components/profile/month-year-picker.test.tsx
git commit -m "feat(slice-7a): MonthYearPicker primitive"
```

---

### Task B4: `ChipInput` primitive

**Files:**
- Create: `frontend-next/src/components/profile/chip-input.tsx`
- Test: `frontend-next/src/components/profile/chip-input.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/chip-input.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipInput } from './chip-input'

describe('ChipInput', () => {
  it('renders existing chips', () => {
    render(<ChipInput value={['React', 'Node']} onChange={vi.fn()} ariaLabel="Technologies" />)
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Node')).toBeInTheDocument()
  })
  it('adds a chip on Enter', async () => {
    const onChange = vi.fn()
    render(<ChipInput value={['React']} onChange={onChange} ariaLabel="Technologies" />)
    await userEvent.type(screen.getByLabelText('Technologies'), 'Postgres{Enter}')
    expect(onChange).toHaveBeenCalledWith(['React', 'Postgres'])
  })
  it('does not add blank or duplicate chips', async () => {
    const onChange = vi.fn()
    render(<ChipInput value={['React']} onChange={onChange} ariaLabel="Technologies" />)
    await userEvent.type(screen.getByLabelText('Technologies'), '   {Enter}')
    await userEvent.type(screen.getByLabelText('Technologies'), 'React{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })
  it('removes a chip via its remove button', async () => {
    const onChange = vi.fn()
    render(<ChipInput value={['React', 'Node']} onChange={onChange} ariaLabel="Technologies" />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove React' }))
    expect(onChange).toHaveBeenCalledWith(['Node'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/chip-input.test.tsx`
Expected: FAIL — cannot resolve `./chip-input`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/chip-input.tsx
'use client'

import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  ariaLabel: string
  placeholder?: string
}

export function ChipInput({ value, onChange, ariaLabel, placeholder = 'Type and press Enter' }: Props) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const trimmed = draft.trim()
    if (!trimmed || value.includes(trimmed)) {
      setDraft('')
      return
    }
    onChange([...value, trimmed])
    setDraft('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }
  const remove = (chip: string) => onChange(value.filter((c) => c !== chip))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground"
          >
            {chip}
            <button
              type="button"
              aria-label={`Remove ${chip}`}
              onClick={() => remove(chip)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <Input
        aria-label={ariaLabel}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/chip-input.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/chip-input.tsx frontend-next/src/components/profile/chip-input.test.tsx
git commit -m "feat(slice-7a): ChipInput primitive"
```

---

### Task B5: `BulletListEditor` primitive

**Files:**
- Create: `frontend-next/src/components/profile/bullet-list-editor.tsx`
- Test: `frontend-next/src/components/profile/bullet-list-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/bullet-list-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulletListEditor } from './bullet-list-editor'

describe('BulletListEditor', () => {
  it('renders one textarea per bullet', () => {
    render(<BulletListEditor value={['a', 'b']} onChange={vi.fn()} ariaPrefix="Bullet" />)
    expect(screen.getByLabelText('Bullet 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Bullet 2')).toBeInTheDocument()
  })
  it('adds a bullet', async () => {
    const onChange = vi.fn()
    render(<BulletListEditor value={['a']} onChange={onChange} ariaPrefix="Bullet" />)
    await userEvent.click(screen.getByRole('button', { name: /add bullet/i }))
    expect(onChange).toHaveBeenCalledWith(['a', ''])
  })
  it('edits a bullet', async () => {
    const onChange = vi.fn()
    render(<BulletListEditor value={['a']} onChange={onChange} ariaPrefix="Bullet" />)
    await userEvent.type(screen.getByLabelText('Bullet 1'), 'X')
    expect(onChange).toHaveBeenCalledWith(['aX'])
  })
  it('removes a bullet', async () => {
    const onChange = vi.fn()
    render(<BulletListEditor value={['a', 'b']} onChange={onChange} ariaPrefix="Bullet" />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove bullet 1' }))
    expect(onChange).toHaveBeenCalledWith(['b'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/bullet-list-editor.test.tsx`
Expected: FAIL — cannot resolve `./bullet-list-editor`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/bullet-list-editor.tsx
'use client'

import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  ariaPrefix: string
}

export function BulletListEditor({ value, onChange, ariaPrefix }: Props) {
  const setAt = (i: number, text: string) => onChange(value.map((b, idx) => (idx === i ? text : b)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, ''])

  return (
    <div className="space-y-2">
      {value.map((bullet, i) => (
        <div key={i} className="flex items-start gap-2">
          <Textarea
            aria-label={`${ariaPrefix} ${i + 1}`}
            value={bullet}
            rows={2}
            onChange={(e) => setAt(i, e.target.value)}
          />
          <Button type="button" variant="ghost" size="sm" aria-label={`Remove bullet ${i + 1}`} onClick={() => remove(i)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add bullet
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/bullet-list-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/bullet-list-editor.tsx frontend-next/src/components/profile/bullet-list-editor.test.tsx
git commit -m "feat(slice-7a): BulletListEditor primitive"
```

---

### Task B6: `LinksEditor` primitive

**Files:**
- Create: `frontend-next/src/components/profile/links-editor.tsx`
- Test: `frontend-next/src/components/profile/links-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/links-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinksEditor } from './links-editor'
import type { ProfileLink } from '@/types/profile'

const LINKS: ProfileLink[] = [{ id: 'l1', label: 'GitHub', url: 'gh.com' }]

describe('LinksEditor', () => {
  it('renders existing link rows', () => {
    render(<LinksEditor value={LINKS} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Link 1 label') as HTMLInputElement).value).toBe('GitHub')
    expect((screen.getByLabelText('Link 1 url') as HTMLInputElement).value).toBe('gh.com')
  })
  it('adds a link row with an id', async () => {
    const onChange = vi.fn()
    render(<LinksEditor value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add link/i }))
    const next = onChange.mock.calls[0]?.[0] as ProfileLink[]
    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBeTruthy()
  })
  it('edits a link label', async () => {
    const onChange = vi.fn()
    render(<LinksEditor value={LINKS} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Link 1 label'), '!')
    expect(onChange).toHaveBeenCalledWith([{ id: 'l1', label: 'GitHub!', url: 'gh.com' }])
  })
  it('removes a link', async () => {
    const onChange = vi.fn()
    render(<LinksEditor value={LINKS} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove link 1' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/links-editor.test.tsx`
Expected: FAIL — cannot resolve `./links-editor`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/links-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { newLink } from '@/lib/profile'
import type { ProfileLink } from '@/types/profile'

interface Props {
  value: ProfileLink[]
  onChange: (next: ProfileLink[]) => void
}

export function LinksEditor({ value, onChange }: Props) {
  const setAt = (i: number, partial: Partial<ProfileLink>) =>
    onChange(value.map((l, idx) => (idx === i ? { ...l, ...partial } : l)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newLink()])

  return (
    <div className="space-y-2">
      {value.map((link, i) => (
        <div key={link.id ?? i} className="flex items-center gap-2">
          <Input
            aria-label={`Link ${i + 1} label`}
            placeholder="Label (e.g. GitHub)"
            value={link.label}
            onChange={(e) => setAt(i, { label: e.target.value })}
            className="w-40"
          />
          <Input
            aria-label={`Link ${i + 1} url`}
            placeholder="https://…"
            value={link.url}
            onChange={(e) => setAt(i, { url: e.target.value })}
          />
          <Button type="button" variant="ghost" size="sm" aria-label={`Remove link ${i + 1}`} onClick={() => remove(i)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add link
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/links-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/links-editor.tsx frontend-next/src/components/profile/links-editor.test.tsx
git commit -m "feat(slice-7a): LinksEditor primitive"
```

---

### Task B7: `ProfileBasicsEditor`

**Files:**
- Create: `frontend-next/src/components/profile/profile-basics-editor.tsx`
- Test: `frontend-next/src/components/profile/profile-basics-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/profile-basics-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileBasicsEditor } from './profile-basics-editor'
import type { ProfileBasics } from '@/types/profile'

const BASICS: ProfileBasics = { name: 'Ada', email: 'a@x.com', phone: '', location: '', links: [] }

describe('ProfileBasicsEditor', () => {
  it('renders the name and email', () => {
    render(<ProfileBasicsEditor value={BASICS} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Ada')
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('a@x.com')
  })
  it('edits the name', async () => {
    const onChange = vi.fn()
    render(<ProfileBasicsEditor value={BASICS} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Full name'), '!')
    expect(onChange).toHaveBeenCalledWith({ ...BASICS, name: 'Ada!' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/profile-basics-editor.test.tsx`
Expected: FAIL — cannot resolve `./profile-basics-editor`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/profile-basics-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LinksEditor } from './links-editor'
import type { ProfileBasics } from '@/types/profile'

interface Props {
  value: ProfileBasics
  onChange: (next: ProfileBasics) => void
}

export function ProfileBasicsEditor({ value, onChange }: Props) {
  const set = (partial: Partial<ProfileBasics>) => onChange({ ...value, ...partial })

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pb-name">Full name</Label>
          <Input id="pb-name" aria-label="Full name" value={value.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pb-email">Email</Label>
          <Input id="pb-email" aria-label="Email" value={value.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pb-phone">Phone</Label>
          <Input id="pb-phone" aria-label="Phone" value={value.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pb-location">Location</Label>
          <Input
            id="pb-location"
            aria-label="Location"
            placeholder="City, State"
            value={value.location ?? ''}
            onChange={(e) => set({ location: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Links</Label>
        <LinksEditor value={value.links} onChange={(links) => set({ links })} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/profile-basics-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/profile-basics-editor.tsx frontend-next/src/components/profile/profile-basics-editor.test.tsx
git commit -m "feat(slice-7a): ProfileBasicsEditor"
```

---

### Task B8: `ProfileExperienceEditor`

**Files:**
- Create: `frontend-next/src/components/profile/profile-experience-editor.tsx`
- Test: `frontend-next/src/components/profile/profile-experience-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/profile-experience-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileExperienceEditor } from './profile-experience-editor'
import { newExperience } from '@/lib/profile'
import type { ProfileExperience } from '@/types/profile'

const EXP: ProfileExperience = { ...newExperience(), company: 'Acme', role: 'SWE' }

describe('ProfileExperienceEditor', () => {
  it('renders each entry with its company', () => {
    render(<ProfileExperienceEditor value={[EXP]} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Experience 1 company') as HTMLInputElement).value).toBe('Acme')
  })
  it('adds an entry', async () => {
    const onChange = vi.fn()
    render(<ProfileExperienceEditor value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add experience/i }))
    expect((onChange.mock.calls[0]?.[0] as ProfileExperience[]).length).toBe(1)
  })
  it('toggling “current” clears the end date', async () => {
    const onChange = vi.fn()
    const withEnd: ProfileExperience = { ...EXP, endDate: { month: 1, year: 2024 }, current: false }
    render(<ProfileExperienceEditor value={[withEnd]} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Experience 1 currently working here'))
    const next = onChange.mock.calls[0]?.[0] as ProfileExperience[]
    expect(next[0]?.current).toBe(true)
    expect(next[0]?.endDate).toBeNull()
  })
  it('removes an entry', async () => {
    const onChange = vi.fn()
    render(<ProfileExperienceEditor value={[EXP]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove experience 1' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/profile-experience-editor.test.tsx`
Expected: FAIL — cannot resolve `./profile-experience-editor`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/profile-experience-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MonthYearPicker } from './month-year-picker'
import { BulletListEditor } from './bullet-list-editor'
import { newExperience } from '@/lib/profile'
import type { ProfileExperience } from '@/types/profile'

interface Props {
  value: ProfileExperience[]
  onChange: (next: ProfileExperience[]) => void
}

export function ProfileExperienceEditor({ value, onChange }: Props) {
  const setAt = (i: number, partial: Partial<ProfileExperience>) =>
    onChange(value.map((e, idx) => (idx === i ? { ...e, ...partial } : e)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newExperience()])

  return (
    <div className="space-y-4">
      {value.map((exp, i) => (
        <div key={exp.id ?? i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Experience {i + 1}</h4>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove experience ${i + 1}`} onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label={`Experience ${i + 1} company`}
              placeholder="Company"
              value={exp.company}
              onChange={(e) => setAt(i, { company: e.target.value })}
            />
            <Input
              aria-label={`Experience ${i + 1} role`}
              placeholder="Role"
              value={exp.role}
              onChange={(e) => setAt(i, { role: e.target.value })}
            />
            <Input
              aria-label={`Experience ${i + 1} location`}
              placeholder="Location"
              value={exp.location ?? ''}
              onChange={(e) => setAt(i, { location: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <MonthYearPicker
                value={exp.startDate}
                ariaPrefix={`Experience ${i + 1} start`}
                onChange={(startDate) => setAt(i, { startDate })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <MonthYearPicker
                value={exp.endDate}
                disabled={exp.current}
                ariaPrefix={`Experience ${i + 1} end`}
                onChange={(endDate) => setAt(i, { endDate })}
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                aria-label={`Experience ${i + 1} currently working here`}
                checked={exp.current}
                onChange={(e) => setAt(i, { current: e.target.checked, endDate: e.target.checked ? null : exp.endDate })}
              />
              I currently work here
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Highlights</Label>
            <BulletListEditor
              value={exp.bullets}
              ariaPrefix={`Experience ${i + 1} bullet`}
              onChange={(bullets) => setAt(i, { bullets })}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add experience
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/profile-experience-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/profile-experience-editor.tsx frontend-next/src/components/profile/profile-experience-editor.test.tsx
git commit -m "feat(slice-7a): ProfileExperienceEditor"
```

---

### Task B9: `ProfileProjectsEditor`

**Files:**
- Create: `frontend-next/src/components/profile/profile-projects-editor.tsx`
- Test: `frontend-next/src/components/profile/profile-projects-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/profile-projects-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileProjectsEditor } from './profile-projects-editor'
import { newProject } from '@/lib/profile'
import type { ProfileProject } from '@/types/profile'

const PROJ: ProfileProject = { ...newProject(), name: 'MaxFlow', technologies: ['NATS'] }

describe('ProfileProjectsEditor', () => {
  it('renders the project name and a technology chip', () => {
    render(<ProfileProjectsEditor value={[PROJ]} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Project 1 name') as HTMLInputElement).value).toBe('MaxFlow')
    expect(screen.getByText('NATS')).toBeInTheDocument()
  })
  it('adds a project', async () => {
    const onChange = vi.fn()
    render(<ProfileProjectsEditor value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add project/i }))
    expect((onChange.mock.calls[0]?.[0] as ProfileProject[]).length).toBe(1)
  })
  it('adds a technology chip', async () => {
    const onChange = vi.fn()
    render(<ProfileProjectsEditor value={[PROJ]} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Project 1 technologies'), 'Go{Enter}')
    const next = onChange.mock.calls[0]?.[0] as ProfileProject[]
    expect(next[0]?.technologies).toEqual(['NATS', 'Go'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/profile-projects-editor.test.tsx`
Expected: FAIL — cannot resolve `./profile-projects-editor`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/profile-projects-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ChipInput } from './chip-input'
import { BulletListEditor } from './bullet-list-editor'
import { LinksEditor } from './links-editor'
import { newProject } from '@/lib/profile'
import type { ProfileProject } from '@/types/profile'

interface Props {
  value: ProfileProject[]
  onChange: (next: ProfileProject[]) => void
}

export function ProfileProjectsEditor({ value, onChange }: Props) {
  const setAt = (i: number, partial: Partial<ProfileProject>) =>
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...partial } : p)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newProject()])

  return (
    <div className="space-y-4">
      {value.map((proj, i) => (
        <div key={proj.id ?? i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Project {i + 1}</h4>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove project ${i + 1}`} onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label={`Project ${i + 1} name`}
              placeholder="Project name"
              value={proj.name}
              onChange={(e) => setAt(i, { name: e.target.value })}
            />
            <Input
              aria-label={`Project ${i + 1} role`}
              placeholder="Your role (optional)"
              value={proj.role ?? ''}
              onChange={(e) => setAt(i, { role: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              aria-label={`Project ${i + 1} description`}
              rows={2}
              value={proj.description ?? ''}
              onChange={(e) => setAt(i, { description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Technologies</Label>
            <ChipInput
              value={proj.technologies}
              ariaLabel={`Project ${i + 1} technologies`}
              onChange={(technologies) => setAt(i, { technologies })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Highlights</Label>
            <BulletListEditor value={proj.bullets} ariaPrefix={`Project ${i + 1} bullet`} onChange={(bullets) => setAt(i, { bullets })} />
          </div>
          <div className="space-y-1.5">
            <Label>Links</Label>
            <LinksEditor value={proj.links} onChange={(links) => setAt(i, { links })} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add project
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/profile-projects-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/profile-projects-editor.tsx frontend-next/src/components/profile/profile-projects-editor.test.tsx
git commit -m "feat(slice-7a): ProfileProjectsEditor"
```

---

### Task B10: `ProfileSkillsEditor`

**Files:**
- Create: `frontend-next/src/components/profile/profile-skills-editor.tsx`
- Test: `frontend-next/src/components/profile/profile-skills-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/profile-skills-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileSkillsEditor } from './profile-skills-editor'
import { newSkillGroup } from '@/lib/profile'
import type { ProfileSkillGroup } from '@/types/profile'

const GROUP: ProfileSkillGroup = { ...newSkillGroup(), category: 'Languages', items: ['TypeScript'] }

describe('ProfileSkillsEditor', () => {
  it('renders a group with its category and an item chip', () => {
    render(<ProfileSkillsEditor value={[GROUP]} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Skill group 1 category') as HTMLInputElement).value).toBe('Languages')
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })
  it('adds a category group', async () => {
    const onChange = vi.fn()
    render(<ProfileSkillsEditor value={[GROUP]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add category/i }))
    expect((onChange.mock.calls[0]?.[0] as ProfileSkillGroup[]).length).toBe(2)
  })
  it('adds an item to a group', async () => {
    const onChange = vi.fn()
    render(<ProfileSkillsEditor value={[GROUP]} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Skill group 1 items'), 'Go{Enter}')
    const next = onChange.mock.calls[0]?.[0] as ProfileSkillGroup[]
    expect(next[0]?.items).toEqual(['TypeScript', 'Go'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/profile-skills-editor.test.tsx`
Expected: FAIL — cannot resolve `./profile-skills-editor`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/profile-skills-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChipInput } from './chip-input'
import { newSkillGroup } from '@/lib/profile'
import type { ProfileSkillGroup } from '@/types/profile'

interface Props {
  value: ProfileSkillGroup[]
  onChange: (next: ProfileSkillGroup[]) => void
}

export function ProfileSkillsEditor({ value, onChange }: Props) {
  const setAt = (i: number, partial: Partial<ProfileSkillGroup>) =>
    onChange(value.map((g, idx) => (idx === i ? { ...g, ...partial } : g)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newSkillGroup()])

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Add skills below. Leave the single default group for a flat list, or add categories (Languages, Frameworks…) to
        group them.
      </p>
      {value.map((group, i) => (
        <div key={group.id ?? i} className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Input
              aria-label={`Skill group ${i + 1} category`}
              placeholder="Category"
              value={group.category}
              onChange={(e) => setAt(i, { category: e.target.value })}
              className="w-48"
            />
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove skill group ${i + 1}`} onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
          <ChipInput
            value={group.items}
            ariaLabel={`Skill group ${i + 1} items`}
            placeholder="Add a skill and press Enter"
            onChange={(items) => setAt(i, { items })}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add category
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/profile-skills-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/profile-skills-editor.tsx frontend-next/src/components/profile/profile-skills-editor.test.tsx
git commit -m "feat(slice-7a): ProfileSkillsEditor"
```

---

### Task B11: `ProfileEducationEditor`

**Files:**
- Create: `frontend-next/src/components/profile/profile-education-editor.tsx`
- Test: `frontend-next/src/components/profile/profile-education-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/profile-education-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileEducationEditor } from './profile-education-editor'
import { newEducation } from '@/lib/profile'
import type { ProfileEducation } from '@/types/profile'

const EDU: ProfileEducation = { ...newEducation(), degree: 'BS', institution: 'MIT', grade: '3.9/4.0' }

describe('ProfileEducationEditor', () => {
  it('renders degree, institution, and grade', () => {
    render(<ProfileEducationEditor value={[EDU]} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Education 1 degree') as HTMLInputElement).value).toBe('BS')
    expect((screen.getByLabelText('Education 1 institution') as HTMLInputElement).value).toBe('MIT')
    expect((screen.getByLabelText('Education 1 grade') as HTMLInputElement).value).toBe('3.9/4.0')
  })
  it('adds an entry', async () => {
    const onChange = vi.fn()
    render(<ProfileEducationEditor value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add education/i }))
    expect((onChange.mock.calls[0]?.[0] as ProfileEducation[]).length).toBe(1)
  })
  it('removes an entry', async () => {
    const onChange = vi.fn()
    render(<ProfileEducationEditor value={[EDU]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove education 1' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/profile-education-editor.test.tsx`
Expected: FAIL — cannot resolve `./profile-education-editor`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/profile-education-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MonthYearPicker } from './month-year-picker'
import { newEducation } from '@/lib/profile'
import type { ProfileEducation } from '@/types/profile'

interface Props {
  value: ProfileEducation[]
  onChange: (next: ProfileEducation[]) => void
}

export function ProfileEducationEditor({ value, onChange }: Props) {
  const setAt = (i: number, partial: Partial<ProfileEducation>) =>
    onChange(value.map((e, idx) => (idx === i ? { ...e, ...partial } : e)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newEducation()])

  return (
    <div className="space-y-4">
      {value.map((edu, i) => (
        <div key={edu.id ?? i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Education {i + 1}</h4>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove education ${i + 1}`} onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label={`Education ${i + 1} degree`}
              placeholder="Degree (e.g. B.Tech)"
              value={edu.degree}
              onChange={(e) => setAt(i, { degree: e.target.value })}
            />
            <Input
              aria-label={`Education ${i + 1} institution`}
              placeholder="Institution"
              value={edu.institution}
              onChange={(e) => setAt(i, { institution: e.target.value })}
            />
            <Input
              aria-label={`Education ${i + 1} field of study`}
              placeholder="Field of study"
              value={edu.fieldOfStudy ?? ''}
              onChange={(e) => setAt(i, { fieldOfStudy: e.target.value })}
            />
            <Input
              aria-label={`Education ${i + 1} grade`}
              placeholder="Grade (e.g. 8.5/10 CGPA, 85%)"
              value={edu.grade ?? ''}
              onChange={(e) => setAt(i, { grade: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <MonthYearPicker value={edu.startDate} ariaPrefix={`Education ${i + 1} start`} onChange={(startDate) => setAt(i, { startDate })} />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <MonthYearPicker
                value={edu.endDate}
                disabled={edu.current}
                ariaPrefix={`Education ${i + 1} end`}
                onChange={(endDate) => setAt(i, { endDate })}
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                aria-label={`Education ${i + 1} currently studying`}
                checked={edu.current}
                onChange={(e) => setAt(i, { current: e.target.checked, endDate: e.target.checked ? null : edu.endDate })}
              />
              Currently studying
            </label>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add education
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/profile-education-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/profile-education-editor.tsx frontend-next/src/components/profile/profile-education-editor.test.tsx
git commit -m "feat(slice-7a): ProfileEducationEditor"
```

---

### Task B12: `ProfileEditor` (composition)

**Files:**
- Create: `frontend-next/src/components/profile/profile-editor.tsx`
- Test: `frontend-next/src/components/profile/profile-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/profile-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileEditor } from './profile-editor'
import { emptyProfileContent } from '@/lib/profile'

describe('ProfileEditor', () => {
  it('renders all six section headings', () => {
    render(<ProfileEditor value={emptyProfileContent()} onChange={vi.fn()} />)
    for (const h of ['Basics', 'Summary', 'Experience', 'Projects', 'Skills', 'Education']) {
      expect(screen.getByRole('heading', { name: h })).toBeInTheDocument()
    }
  })
  it('edits the summary', async () => {
    const onChange = vi.fn()
    render(<ProfileEditor value={emptyProfileContent()} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Professional summary'), 'X')
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls.at(-1)?.[0].summary).toBe('X')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/profile-editor.test.tsx`
Expected: FAIL — cannot resolve `./profile-editor`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/profile-editor.tsx
'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ProfileBasicsEditor } from './profile-basics-editor'
import { ProfileExperienceEditor } from './profile-experience-editor'
import { ProfileProjectsEditor } from './profile-projects-editor'
import { ProfileSkillsEditor } from './profile-skills-editor'
import { ProfileEducationEditor } from './profile-education-editor'
import type { ProfileContent } from '@/types/profile'

interface Props {
  value: ProfileContent
  onChange: (next: ProfileContent) => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function ProfileEditor({ value, onChange }: Props) {
  const patch = (partial: Partial<ProfileContent>) => onChange({ ...value, ...partial })

  return (
    <div className="space-y-10">
      <Section title="Basics">
        <ProfileBasicsEditor value={value.basics} onChange={(basics) => patch({ basics })} />
      </Section>
      <Section title="Summary">
        <div className="space-y-1.5">
          <Label htmlFor="pe-summary">Professional summary</Label>
          <Textarea
            id="pe-summary"
            aria-label="Professional summary"
            rows={4}
            value={value.summary}
            onChange={(e) => patch({ summary: e.target.value })}
          />
        </div>
      </Section>
      <Section title="Experience">
        <ProfileExperienceEditor value={value.experience} onChange={(experience) => patch({ experience })} />
      </Section>
      <Section title="Projects">
        <ProfileProjectsEditor value={value.projects} onChange={(projects) => patch({ projects })} />
      </Section>
      <Section title="Skills">
        <ProfileSkillsEditor value={value.skills} onChange={(skills) => patch({ skills })} />
      </Section>
      <Section title="Education">
        <ProfileEducationEditor value={value.education} onChange={(education) => patch({ education })} />
      </Section>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/profile-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/profile-editor.tsx frontend-next/src/components/profile/profile-editor.test.tsx
git commit -m "feat(slice-7a): ProfileEditor composition"
```

---

### Task B13: `ProfileWorkspace` (load + edit + save)

**Files:**
- Create: `frontend-next/src/components/profile/profile-workspace.tsx`
- Test: `frontend-next/src/components/profile/profile-workspace.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend-next/src/components/profile/profile-workspace.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ProfileContent } from '@/types/profile'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { ProfileWorkspace } from './profile-workspace'

const api = vi.mocked(apiClient)
const EMPTY: ProfileContent = { basics: { name: '', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('ProfileWorkspace', () => {
  it('disables Save until a name is entered, then saves', async () => {
    api.get.mockResolvedValue(EMPTY)
    api.put.mockImplementation(async (_p, body) => (body as { content: ProfileContent }).content)
    render(<ProfileWorkspace />, { wrapper })

    const save = await screen.findByRole('button', { name: /save/i })
    expect(save).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Full name'), 'Ada')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/profile', { content: expect.objectContaining({ basics: expect.objectContaining({ name: 'Ada' }) }) }))
  })

  it('surfaces validation errors and blocks save', async () => {
    api.get.mockResolvedValue({ ...EMPTY, basics: { name: 'Ada', links: [] }, experience: [{ company: '', role: '', startDate: null, endDate: null, current: false, bullets: [] }] })
    render(<ProfileWorkspace />, { wrapper })
    await userEvent.click(await screen.findByRole('button', { name: /save/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npm test -- src/components/profile/profile-workspace.test.tsx`
Expected: FAIL — cannot resolve `./profile-workspace`.

- [ ] **Step 3: Write the component**

```tsx
// frontend-next/src/components/profile/profile-workspace.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProfileEditor } from './profile-editor'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { emptyProfileContent, validateProfileContent } from '@/lib/profile'
import type { ProfileContent } from '@/types/profile'

export function ProfileWorkspace() {
  const { data } = useProfile()
  const update = useUpdateProfile()
  const [draft, setDraft] = useState<ProfileContent>(emptyProfileContent())
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (data) setDraft(data)
  }, [data])

  const save = () => {
    const found = validateProfileContent(draft)
    setErrors(found)
    if (found.length > 0) return
    update.mutate(draft)
  }

  const nameMissing = !draft.basics.name.trim()

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-background py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Your profile</h1>
          <p className="text-sm text-muted-foreground">Your master record — reused when you build personas.</p>
        </div>
        <div className="flex items-center gap-2">
          {update.isSuccess ? <span className="text-sm text-muted-foreground">Saved</span> : null}
          <Button type="button" onClick={save} disabled={update.isPending || nameMissing}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {errors.length > 0 ? (
        <div role="alert" className="my-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Please fix the following:</p>
          <ul className="mt-1 list-inside list-disc">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {update.error ? (
        <p role="alert" className="my-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {update.error.message}
        </p>
      ) : null}

      <div className="py-6">
        <ProfileEditor value={draft} onChange={setDraft} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npm test -- src/components/profile/profile-workspace.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/profile/profile-workspace.tsx frontend-next/src/components/profile/profile-workspace.test.tsx
git commit -m "feat(slice-7a): ProfileWorkspace (load/edit/validate/save)"
```

---

### Task B14: `/app/profile` page + nav entry

**Files:**
- Create: `frontend-next/src/app/app/profile/page.tsx`
- Modify: `frontend-next/src/components/layout/app/sidebar-nav.tsx` (add Profile link)

- [ ] **Step 1: Write the page (server component)**

```tsx
// frontend-next/src/app/app/profile/page.tsx
import type { Metadata } from 'next'
import { ProfileWorkspace } from '@/components/profile/profile-workspace'

export const metadata: Metadata = { title: 'Profile' }

export default function ProfilePage() {
  return (
    <div className="flex-1 overflow-y-auto px-6">
      <ProfileWorkspace />
    </div>
  )
}
```

- [ ] **Step 2: Add the nav entry**

In `frontend-next/src/components/layout/app/sidebar-nav.tsx`, import `UserRound` from `lucide-react` (add to the existing import) and add an entry to `NAV` between `personas` and `timeline`:

```tsx
import { LayoutDashboard, Briefcase, Users, UserRound, Clock, Settings } from 'lucide-react'
```

```tsx
  { href: '/app/personas', label: 'Personas', icon: Users },
  { href: '/app/profile', label: 'Profile', icon: UserRound },
  { href: '/app/timeline', label: 'Timeline', icon: Clock },
```

- [ ] **Step 3: Verify the build compiles and the route renders**

Run: `cd frontend-next && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/app/app/profile/page.tsx frontend-next/src/components/layout/app/sidebar-nav.tsx
git commit -m "feat(slice-7a): /app/profile page + sidebar nav entry"
```

---

### Task B15: Full gates, smoke test, progress.md

**Files:**
- Modify: `progress.md`

- [ ] **Step 1: Run the full frontend gate**

Run: `cd frontend-next && npm run typecheck && npm run lint && npm test && npm run build`
Expected: all PASS. (If a host `.next` permission error appears on build, verify via `docker build --target production ./frontend-next` per CLAUDE.md.)

- [ ] **Step 2: Run the full backend gate**

Run: `cd backend-express && npm run typecheck && npm run lint && npm test`
Expected: all PASS (Postgres up + migration `0007` applied for the repository test).

- [ ] **Step 3: Smoke test against the Docker stack**

```bash
docker compose up -d --build --force-recreate --renew-anon-volumes
```

Then in the browser at http://localhost:8080: log in → click **Profile** in the sidebar → fill name + add an experience (with month/year + "current"), a project (with technologies + links), skills, and education → **Save** → reload the page and confirm the data persisted. Confirm the API directly: `GET http://localhost:8080/api/profile` returns the saved `ProfileContent` with ids on every entry/link.

- [ ] **Step 4: Update progress.md**

Add a Slice 7a entry to `progress.md` summarizing: `ProfileContent` schema + `ensureIds`, `user_profiles` table (migration `0007`), `profile` module (`GET/PUT /api/profile`), and the `/app/profile` rich editor (reusable `MonthYearPicker`/`ChipInput`/`LinksEditor`/`BulletListEditor` primitives + per-section editors). Note that personas are unchanged (their migration to `ProfileContent` and the two creation modes are Slice 7b).

- [ ] **Step 5: Commit**

```bash
git add progress.md
git commit -m "docs(slice-7a): mark master profile foundation complete"
```

---

## Self-Review notes (already reconciled against the spec)

- **Spec coverage:** §4.1 schema → A1; §4.2 table → A2; §5.1 module → A3–A5; §6.1 primitives → B3–B6; §6.2 page/editor/hooks → B1–B2, B7–B14; §9 testing → every task's tests + B15 smoke. **Deviation from spec §10:** the persona up-converter / lazy normalization is moved to Slice 7b (7a does not touch personas, keeping it independently shippable). Update spec §10 accordingly when starting 7b.
- **Lenient-at-rest + `ensureIds`:** A1 tests cover missing-id and nullable-date acceptance; A4 verifies `ensureIds` runs on write.
- **Type consistency:** backend `ProfileContent` (Zod) and frontend `@/types/profile` interfaces are mirrors; factory/validator names (`emptyProfileContent`, `newExperience`, `validateProfileContent`) are used identically across B1, B8–B13.
- **No placeholders:** every step ships complete code and an exact run command with expected result.

## Not in this slice (Slice 7b)
Persona `data` retype to `ProfileContent`; `resumeContentToProfileContent` up-converter + lazy normalization + backfill; the two persona creation modes ("Build from profile" pickers + "Import a résumé" with `pdf-parse`/`multer`); AI structuring retarget to `ProfileContent`; persona editor swap to the rich editor.
