# Slice 6a — Personas + Gemini Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the AI foundation (Gemini wrapper + `GET /api/ai/status`) and the **Personas** feature end-to-end — a user can create up to `MAX_PERSONAS` role-focused background profiles, each AI-structured from pasted text / free text / fields into a shared `ResumeContent` shape, then view/edit/rename/delete them on `/app/personas`.

**Architecture:** Follows the existing layered backend (`router → controller → service → repository → schema`) and the Next App-Router frontend (Server Component page → `'use client'` workspace + TanStack Query hooks). The `ResumeContent` Zod schema is **shared** (backend `src/shared/`, frontend `src/types/`) and is the single source of truth reused by résumés in 6b. The reusable **`ResumeContentEditor`** is built here (personas need editing per the spec's 6a exit criteria) and reused for résumés in 6b. Gemini is seam-mocked in all automated tests; a real key is used only for the manual smoke.

**Tech Stack:** Express 5 · Drizzle · Zod · Vitest · Supertest · `@google/genai` (new) · Next.js 15 · React 19 · TanStack Query v5 · React Hook Form + Zod · RTL.

**Spec:** `docs/superpowers/specs/2026-06-05-slice-6-ai-resume-cover-letter-design.md` (§§2,3,5,6,7,8,10). **Branch:** `slice-6-ai-resume-cover-letter` (already checked out).

> **Conventions reminder (do not deviate):** every import uses the `.js` extension (NodeNext). Responses use `res.status(n).json({ data })`. Errors throw `AppError(code, message)`. `req.user.id` is the user id. Repository queries are `userId`-scoped with `and(eq(...))`. Frontend: no inline styled markup — every styled element is a component; reuse `src/components/ui/*`. Commit per task; **no `git push`; no "Claude" in commit messages.**

---

## File structure (created/modified in this plan)

**Backend (`backend-express/`)**
- Modify `src/config/env.ts` — add `GEMINI_API_KEY?`, `GEMINI_MODEL` (default), `AI_RATE_LIMIT_PER_HOUR` (default 10), `MAX_PERSONAS` (default 5).
- Modify `src/shared/errors.ts` — add `SERVICE_UNAVAILABLE` → 503.
- Create `src/shared/resume-content.schema.ts` — shared `ResumeContentSchema` + `ResumeContent` type.
- Create `src/modules/ai/gemini.service.ts` — `isAiEnabled`, `generateText`, `generateStructured`.
- Create `src/modules/ai/ai.prompts.ts` — `buildStructurePrompt`.
- Create `src/modules/ai/ai.controller.ts`, `src/modules/ai/ai.router.ts` — `GET /api/ai/status`.
- Create `src/db/schema/personas.ts` + modify `src/db/schema/index.ts`; generate migration `0004_*`.
- Create `src/modules/personas/personas.schema.ts`, `.repository.ts`, `.service.ts`, `.controller.ts`, `.router.ts` (+ co-located tests).
- Modify `src/shared/api-router.ts` — mount `/ai` and `/personas`.
- Modify `package.json` — add `@google/genai`.

**Frontend (`frontend-next/`)**
- Create `src/types/resume.ts`, `src/types/persona.ts`.
- Create `src/schemas/persona.ts`.
- Modify `src/lib/query-keys.ts` — add `PERSONAS_KEY`, `personaKey`, `AI_STATUS_KEY`.
- Create `src/hooks/use-ai-status.ts`, `src/hooks/use-personas.ts`.
- Create `src/components/resume/resume-content-editor.tsx` (reusable structured editor).
- Create `src/components/personas/create-persona-wizard.tsx`, `persona-list.tsx`, `personas-workspace.tsx`.
- Create `src/app/app/personas/page.tsx`.
- Modify `src/components/layout/app/sidebar-nav.tsx` — add Personas nav item.

---

## BACKEND

### Task 1: Env vars for AI + personas

**Files:** Modify `backend-express/src/config/env.ts` · Test `backend-express/src/config/env.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

Create/append `backend-express/src/config/env.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseEnv } from './env.js'

const BASE = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  CORS_ORIGINS: 'http://localhost:8080',
  JWT_SECRET: 'a'.repeat(32),
}

describe('parseEnv AI/persona settings', () => {
  it('defaults model, rate limit and persona cap; AI key is optional', () => {
    const env = parseEnv(BASE)
    expect(env.GEMINI_API_KEY).toBeUndefined()
    expect(env.GEMINI_MODEL).toBe('gemini-2.0-flash')
    expect(env.AI_RATE_LIMIT_PER_HOUR).toBe(10)
    expect(env.MAX_PERSONAS).toBe(5)
  })

  it('reads overrides', () => {
    const env = parseEnv({ ...BASE, GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-2.5-flash', AI_RATE_LIMIT_PER_HOUR: '3', MAX_PERSONAS: '8' })
    expect(env.GEMINI_API_KEY).toBe('k')
    expect(env.GEMINI_MODEL).toBe('gemini-2.5-flash')
    expect(env.AI_RATE_LIMIT_PER_HOUR).toBe(3)
    expect(env.MAX_PERSONAS).toBe(8)
  })
})
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd backend-express && npx vitest run src/config/env.test.ts`
Expected: FAIL (`GEMINI_MODEL` undefined / property missing).

- [ ] **Step 3: Implement** — in `env.ts`, inside `envSchema = z.object({ … })`, the `GEMINI_API_KEY: z.string().optional(),` line already exists; add the three new lines next to it:

```typescript
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  AI_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(10),
  MAX_PERSONAS: z.coerce.number().int().positive().default(5),
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/config/env.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/config/env.ts backend-express/src/config/env.test.ts
git commit -m "feat(slice-6a): env vars for Gemini model, AI rate limit, persona cap"
```

---

### Task 2: `SERVICE_UNAVAILABLE` (503) error code

**Files:** Modify `backend-express/src/shared/errors.ts` · Test `backend-express/src/shared/errors.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { AppError, httpStatusForCode } from './errors.js'

describe('AppError SERVICE_UNAVAILABLE', () => {
  it('maps to 503', () => {
    expect(httpStatusForCode('SERVICE_UNAVAILABLE')).toBe(503)
  })
  it('constructs with the code', () => {
    expect(new AppError('SERVICE_UNAVAILABLE', 'off').code).toBe('SERVICE_UNAVAILABLE')
  })
})
```

- [ ] **Step 2: Run it, verify it fails** — Run: `npx vitest run src/shared/errors.test.ts` → FAIL (type/code unknown).

- [ ] **Step 3: Implement** — in `errors.ts` add `SERVICE_UNAVAILABLE` to the `AppErrorCode` union and `STATUS_BY_CODE`:

```typescript
export type AppErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
}
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/shared/errors.ts backend-express/src/shared/errors.test.ts
git commit -m "feat(slice-6a): add SERVICE_UNAVAILABLE (503) error code"
```

---

### Task 3: Add `@google/genai` dependency + shared `ResumeContent` schema

**Files:** Modify `backend-express/package.json` · Create `backend-express/src/shared/resume-content.schema.ts` · Test `backend-express/src/shared/resume-content.schema.test.ts`

- [ ] **Step 1: Add the dependency**

Run: `cd backend-express && npm install @google/genai@^1.41.0`
(Confirms `@google/genai` lands in `dependencies`. This is the same package the legacy `backend/` used.)

- [ ] **Step 2: Write the failing test**

`backend-express/src/shared/resume-content.schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ResumeContentSchema } from './resume-content.schema.js'

describe('ResumeContentSchema', () => {
  it('parses a full résumé and defaults empty arrays', () => {
    const parsed = ResumeContentSchema.parse({
      basics: { name: 'Kartick Sadhu', email: 'k@example.com', links: [{ label: 'GitHub', url: 'github.com/x' }] },
      summary: 'Backend engineer.',
      experience: [{ company: 'Weloin', title: 'SWE', date: 'Jan 2024 - present', bullets: ['Built **CI/CD**'] }],
      projects: [{ name: 'MaxFlow', tagline: 'Workflow SaaS', bullets: ['NATS JetStream'] }],
      skills: [{ category: 'Languages', items: ['TypeScript'] }],
      education: [{ degree: 'MCA', institution: 'Brainware', period: '2022-2024' }],
    })
    expect(parsed.basics.name).toBe('Kartick Sadhu')
    expect(parsed.basics.links).toHaveLength(1)
    expect(parsed.experience[0]?.bullets[0]).toContain('**CI/CD**')
  })

  it('defaults missing collections so a name-only payload is valid', () => {
    const parsed = ResumeContentSchema.parse({ basics: { name: 'A' } })
    expect(parsed.summary).toBe('')
    expect(parsed.experience).toEqual([])
    expect(parsed.basics.links).toEqual([])
  })

  it('rejects a missing name', () => {
    expect(ResumeContentSchema.safeParse({ basics: {} }).success).toBe(false)
  })
})
```

- [ ] **Step 3: Run it, verify it fails** — Run: `npx vitest run src/shared/resume-content.schema.test.ts` → FAIL (module missing).

- [ ] **Step 4: Implement** — `backend-express/src/shared/resume-content.schema.ts`:

```typescript
import { z } from 'zod'

export const ResumeLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
})

export const ResumeBasicsSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  location: z.string().optional(),
  links: z.array(ResumeLinkSchema).default([]),
})

export const ResumeExperienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  date: z.string().min(1),
  bullets: z.array(z.string()).default([]),
})

export const ResumeProjectSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional(),
  url: z.string().optional(),
  bullets: z.array(z.string()).default([]),
})

export const ResumeSkillGroupSchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string()).default([]),
})

export const ResumeEducationSchema = z.object({
  degree: z.string().min(1),
  institution: z.string().min(1),
  period: z.string().optional(),
})

export const ResumeContentSchema = z.object({
  basics: ResumeBasicsSchema,
  summary: z.string().default(''),
  experience: z.array(ResumeExperienceSchema).default([]),
  projects: z.array(ResumeProjectSchema).default([]),
  skills: z.array(ResumeSkillGroupSchema).default([]),
  education: z.array(ResumeEducationSchema).default([]),
})

export type ResumeContent = z.infer<typeof ResumeContentSchema>
```

- [ ] **Step 5: Run it, verify it passes** → PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-express/package.json backend-express/package-lock.json backend-express/src/shared/resume-content.schema.ts backend-express/src/shared/resume-content.schema.test.ts
git commit -m "feat(slice-6a): add @google/genai + shared ResumeContent schema"
```

---

### Task 4: Gemini wrapper service

**Files:** Create `backend-express/src/modules/ai/gemini.service.ts` · Test `backend-express/src/modules/ai/gemini.service.test.ts`

> The `@google/genai` SDK is mocked, so no network calls. **Live-smoke note:** confirm the response accessor against the installed version — the legacy `backend/` scraper used `response.text()`; if the installed version exposes a `.text` getter, adjust the single accessor line. Tests pin the mock to `.text` (getter) per current `@google/genai`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

const generateContent = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({ models: { generateContent } })),
}))

function loadEnv(overrides: Record<string, string> = {}) {
  process.env['DATABASE_URL'] = 'postgres://u:p@localhost:5432/db'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['GEMINI_MODEL'] = 'gemini-2.0-flash'
  for (const [k, v] of Object.entries(overrides)) process.env[k] = v
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  delete process.env['GEMINI_API_KEY']
})

describe('geminiService', () => {
  it('isAiEnabled reflects the key presence', async () => {
    loadEnv()
    const off = await import('./gemini.service.js')
    expect(off.geminiService.isAiEnabled()).toBe(false)
  })

  it('generateStructured parses + validates JSON output', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockResolvedValue({ text: '{"value":42}' })
    const { geminiService } = await import('./gemini.service.js')
    const out = await geminiService.generateStructured('prompt', z.object({ value: z.number() }))
    expect(out).toEqual({ value: 42 })
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.0-flash', config: { responseMimeType: 'application/json' } }),
    )
  })

  it('throws VALIDATION_ERROR on malformed JSON', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockResolvedValue({ text: 'not json' })
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateStructured('p', z.object({ value: z.number() }))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws SERVICE_UNAVAILABLE when disabled', async () => {
    loadEnv()
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateText('p')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL (module missing).

- [ ] **Step 3: Implement** — `backend-express/src/modules/ai/gemini.service.ts`:

```typescript
import { GoogleGenAI } from '@google/genai'
import type { z } from 'zod'
import { getEnv } from '@/config/env.js'
import { AppError } from '@/shared/errors.js'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  const key = getEnv().GEMINI_API_KEY
  if (!key) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')
  if (!client) client = new GoogleGenAI({ apiKey: key })
  return client
}

function isAiEnabled(): boolean {
  return Boolean(getEnv().GEMINI_API_KEY)
}

async function generateText(prompt: string): Promise<string> {
  const res = await getClient().models.generateContent({ model: getEnv().GEMINI_MODEL, contents: prompt })
  const text = res.text
  if (!text) throw new AppError('INTERNAL_ERROR', 'AI returned an empty response')
  return text
}

async function generateStructured<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  const res = await getClient().models.generateContent({
    model: getEnv().GEMINI_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  })
  let parsed: unknown
  try {
    parsed = JSON.parse(res.text ?? '')
  } catch {
    throw new AppError('VALIDATION_ERROR', 'AI returned malformed JSON')
  }
  const result = schema.safeParse(parsed)
  if (!result.success) throw new AppError('VALIDATION_ERROR', 'AI output did not match the expected shape')
  return result.data
}

export const geminiService = { isAiEnabled, generateText, generateStructured }
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/ai/gemini.service.ts backend-express/src/modules/ai/gemini.service.test.ts
git commit -m "feat(slice-6a): Gemini wrapper (isAiEnabled, generateText, generateStructured)"
```

---

### Task 5: Structure prompt builder

**Files:** Create `backend-express/src/modules/ai/ai.prompts.ts` · Test `backend-express/src/modules/ai/ai.prompts.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { buildStructurePrompt } from './ai.prompts.js'

describe('buildStructurePrompt', () => {
  it('embeds all provided inputs and asks for the ResumeContent JSON shape', () => {
    const p = buildStructurePrompt({ freeText: 'I led teams', pastedResume: 'RESUME TEXT', fields: { basics: { name: 'Kartick', links: [] } } })
    expect(p).toContain('RESUME TEXT')
    expect(p).toContain('I led teams')
    expect(p).toContain('Kartick')
    // schema guidance
    expect(p).toMatch(/basics/)
    expect(p).toMatch(/experience/)
    expect(p).toMatch(/\*\*bold\*\*|bold/i)
    expect(p).toMatch(/JSON/i)
  })

  it('omits absent sections gracefully', () => {
    const p = buildStructurePrompt({ freeText: 'only free text' })
    expect(p).toContain('only free text')
    expect(p).not.toContain('PASTED RESUME')
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL.

- [ ] **Step 3: Implement** — `backend-express/src/modules/ai/ai.prompts.ts`:

```typescript
import type { PersonaInputs } from '@/modules/personas/personas.schema.js'

const SCHEMA_GUIDE = `Return ONLY a JSON object with this exact shape (omit unknown optional fields, never invent facts):
{
  "basics": { "name": string, "phone"?: string, "email"?: string, "location"?: string, "links": [{ "label": string, "url": string }] },
  "summary": string,
  "experience": [{ "company": string, "title": string, "date": string, "bullets": string[] }],
  "projects": [{ "name": string, "tagline"?: string, "url"?: string, "bullets": string[] }],
  "skills": [{ "category": string, "items": string[] }],
  "education": [{ "degree": string, "institution": string, "period"?: string }]
}
In bullet and summary text, wrap the most impactful 1-3 phrases in **double asterisks** for emphasis. Keep bullets achievement-oriented and concise. Do not include markdown fences.`

export function buildStructurePrompt(inputs: PersonaInputs): string {
  const parts: string[] = [
    'You are a résumé parser. Convert the candidate background below into structured JSON.',
    SCHEMA_GUIDE,
  ]
  if (inputs.pastedResume) parts.push(`PASTED RESUME:\n${inputs.pastedResume}`)
  if (inputs.freeText) parts.push(`ADDITIONAL NOTES:\n${inputs.freeText}`)
  if (inputs.fields) parts.push(`KNOWN FIELDS (authoritative, prefer these):\n${JSON.stringify(inputs.fields)}`)
  return parts.join('\n\n')
}
```

- [ ] **Step 4: Run it, verify it passes** → PASS. (Defines a dependency on `PersonaInputs` from Task 8 — implement Task 8's schema first if running strictly in order, or stub the type import; the canonical order is Task 8 then Task 5. If you hit a missing-type error, jump to Task 8, then return.)

> **Ordering note:** `ai.prompts.ts` imports `PersonaInputs` from `personas.schema.ts` (Task 8). If executing top-to-bottom, do **Task 8 before Task 5's Step 3**. The plan keeps AI tasks grouped for readability; the type dependency points forward.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/ai/ai.prompts.ts backend-express/src/modules/ai/ai.prompts.test.ts
git commit -m "feat(slice-6a): structure prompt builder for persona AI"
```

---

### Task 6: `GET /api/ai/status`

**Files:** Create `backend-express/src/modules/ai/ai.controller.ts`, `src/modules/ai/ai.router.ts` · Modify `src/shared/api-router.ts` · Test `src/modules/ai/ai.router.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

let app: Express

beforeAll(async () => {
  process.env['NODE_ENV'] = 'test'
  process.env['PORT'] = '3000'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
  process.env['LOG_LEVEL'] = 'silent'
  process.env['MAX_PERSONAS'] = '5'
  delete process.env['GEMINI_API_KEY']
  app = (await import('@/app.js')).createApp()
})

describe('GET /api/ai/status', () => {
  it('reports disabled with the persona cap when no key is set', async () => {
    const res = await request(app).get('/api/ai/status')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ enabled: false, maxPersonas: 5 })
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL (404).

- [ ] **Step 3: Implement controller** — `backend-express/src/modules/ai/ai.controller.ts`:

```typescript
import type { Request, Response } from 'express'
import { getEnv } from '@/config/env.js'
import { geminiService } from './gemini.service.js'

async function status(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: { enabled: geminiService.isAiEnabled(), maxPersonas: getEnv().MAX_PERSONAS } })
}

export const aiController = { status }
```

`backend-express/src/modules/ai/ai.router.ts`:

```typescript
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { aiController } from './ai.controller.js'

const router = Router()
router.get('/status', asyncHandler(aiController.status))

export { router as aiRouter }
```

Modify `src/shared/api-router.ts` — add the import and mount (status is intentionally **public**, no auth, so the UI can probe before any guarded call):

```typescript
import { aiRouter } from '@/modules/ai/ai.router.js'
// …
router.use('/ai', aiRouter)
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/ai/ai.controller.ts backend-express/src/modules/ai/ai.router.ts backend-express/src/shared/api-router.ts backend-express/src/modules/ai/ai.router.test.ts
git commit -m "feat(slice-6a): GET /api/ai/status (enabled + maxPersonas)"
```

---

### Task 7: `personas` table + migration `0004`

**Files:** Create `backend-express/src/db/schema/personas.ts` · Modify `src/db/schema/index.ts` · Generate `src/db/migrations/0004_*.sql`

- [ ] **Step 1: Implement the schema** — `backend-express/src/db/schema/personas.ts`:

```typescript
import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

export const personas = pgTable(
  'personas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    data: jsonb('data').$type<ResumeContent>().notNull(),
    rawInput: text('raw_input'),
  },
  (t) => [index('idx_personas_user_id').on(t.userId)],
)

export type PersonaRow = typeof personas.$inferSelect
export type NewPersonaRow = typeof personas.$inferInsert
```

- [ ] **Step 2: Add to the barrel** — in `src/db/schema/index.ts` append: `export * from './personas.js'`

- [ ] **Step 3: Generate the migration**

Run: `cd backend-express && npm run db:generate`
Expected: a new `src/db/migrations/0004_*.sql` creating `personas`. Inspect it: `personas` table, FK to `users` `ON DELETE CASCADE`, `data jsonb NOT NULL`, index on `user_id`.

- [ ] **Step 4: Apply + verify** (Docker Postgres must be up: `docker compose up -d postgres`)

Run: `npm run db:migrate`
Expected: applies `0004` cleanly. (Repository tests in Task 9 further verify.)

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/db/schema/personas.ts backend-express/src/db/schema/index.ts backend-express/src/db/migrations/
git commit -m "feat(slice-6a): personas table + migration 0004"
```

---

### Task 8: Personas Zod schemas

**Files:** Create `backend-express/src/modules/personas/personas.schema.ts` · Test `backend-express/src/modules/personas/personas.schema.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { CreatePersonaSchema, UpdatePersonaSchema } from './personas.schema.js'

describe('CreatePersonaSchema', () => {
  it('accepts a name + pasted resume', () => {
    expect(CreatePersonaSchema.safeParse({ name: 'Backend', inputs: { pastedResume: 'text' } }).success).toBe(true)
  })
  it('rejects empty inputs', () => {
    expect(CreatePersonaSchema.safeParse({ name: 'Backend', inputs: {} }).success).toBe(false)
  })
  it('rejects an empty name', () => {
    expect(CreatePersonaSchema.safeParse({ name: '', inputs: { freeText: 'x' } }).success).toBe(false)
  })
})

describe('UpdatePersonaSchema', () => {
  it('accepts a data-only edit', () => {
    expect(UpdatePersonaSchema.safeParse({ data: { basics: { name: 'A' } } }).success).toBe(true)
  })
  it('rejects an empty patch', () => {
    expect(UpdatePersonaSchema.safeParse({}).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL.

- [ ] **Step 3: Implement** — `backend-express/src/modules/personas/personas.schema.ts`:

```typescript
import { z } from 'zod'
import { ResumeContentSchema } from '@/shared/resume-content.schema.js'

export const PersonaInputsSchema = z
  .object({
    freeText: z.string().max(20000).optional(),
    pastedResume: z.string().max(50000).optional(),
    fields: ResumeContentSchema.partial().optional(),
  })
  .refine((v) => Boolean(v.freeText || v.pastedResume || v.fields), {
    message: 'Provide a pasted résumé, free text, or fields',
  })

export const CreatePersonaSchema = z.object({
  name: z.string().min(1).max(100),
  inputs: PersonaInputsSchema,
})

export const UpdatePersonaSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    data: ResumeContentSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.data !== undefined, { message: 'Nothing to update' })

export type PersonaInputs = z.infer<typeof PersonaInputsSchema>
export type CreatePersonaInput = z.infer<typeof CreatePersonaSchema>
export type UpdatePersonaInput = z.infer<typeof UpdatePersonaSchema>
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/personas/personas.schema.ts backend-express/src/modules/personas/personas.schema.test.ts
git commit -m "feat(slice-6a): persona Zod schemas (create/update/inputs)"
```

---

### Task 9: Personas repository (real-DB tested)

**Files:** Create `backend-express/src/modules/personas/personas.repository.ts` · Test `backend-express/src/modules/personas/personas.repository.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { personas } from '@/db/schema/personas.js'
import { personasRepository } from './personas.repository.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const EMAIL = `personas-repo-${Date.now()}@example.com`
let userId: string
const DATA: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb().insert(users).values({ name: 'P', email: EMAIL, passwordHash: 'h' }).returning()
  userId = rows[0]!.id
})

afterAll(async () => {
  await getDb().delete(personas).where(eq(personas.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('personasRepository (real DB)', () => {
  it('creates, counts, lists, finds, updates and removes user-scoped', async () => {
    const created = await personasRepository.create({ userId, name: 'Backend', data: DATA, rawInput: 'raw' })
    expect(created.name).toBe('Backend')
    expect(await personasRepository.countForUser(userId)).toBe(1)

    const list = await personasRepository.listForUser(userId)
    expect(list).toHaveLength(1)

    const found = await personasRepository.findById(userId, created.id)
    expect(found?.id).toBe(created.id)
    expect(await personasRepository.findById('someone-else', created.id)).toBeNull()

    const updated = await personasRepository.update(userId, created.id, { name: 'Full-stack' })
    expect(updated?.name).toBe('Full-stack')

    expect(await personasRepository.remove(userId, created.id)).toBe(true)
    expect(await personasRepository.countForUser(userId)).toBe(0)
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL (module missing). (Requires Docker Postgres on `5433` — `docker compose up -d postgres`.)

- [ ] **Step 3: Implement** — `backend-express/src/modules/personas/personas.repository.ts`:

```typescript
import { and, eq, desc, count } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { personas, type PersonaRow, type NewPersonaRow } from '@/db/schema/personas.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

async function create(values: NewPersonaRow): Promise<PersonaRow> {
  const rows = await getDb().insert(personas).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function countForUser(userId: string): Promise<number> {
  const rows = await getDb().select({ value: count() }).from(personas).where(eq(personas.userId, userId))
  return rows[0]?.value ?? 0
}

async function listForUser(userId: string): Promise<PersonaRow[]> {
  return getDb().select().from(personas).where(eq(personas.userId, userId)).orderBy(desc(personas.createdAt))
}

async function findById(userId: string, id: string): Promise<PersonaRow | null> {
  const rows = await getDb()
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(
  userId: string,
  id: string,
  patch: { name?: string; data?: ResumeContent },
): Promise<PersonaRow | null> {
  const set: Partial<NewPersonaRow> = { updatedAt: new Date() }
  if (patch.name !== undefined) set.name = patch.name
  if (patch.data !== undefined) set.data = patch.data
  const rows = await getDb()
    .update(personas)
    .set(set)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)))
    .returning({ id: personas.id })
  return rows.length > 0
}

export const personasRepository = { create, countForUser, listForUser, findById, update, remove }
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/personas/personas.repository.ts backend-express/src/modules/personas/personas.repository.test.ts
git commit -m "feat(slice-6a): personas repository (user-scoped CRUD + count)"
```

---

### Task 10: Personas service (cap + AI-structure)

**Files:** Create `backend-express/src/modules/personas/personas.service.ts` · Test `backend-express/src/modules/personas/personas.service.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./personas.repository.js', () => ({
  personasRepository: {
    create: vi.fn(), countForUser: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn(),
  },
}))
vi.mock('@/modules/ai/gemini.service.js', () => ({
  geminiService: { isAiEnabled: vi.fn(), generateStructured: vi.fn(), generateText: vi.fn() },
}))

import { personasRepository } from './personas.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { personasService } from './personas.service.js'
import type { PersonaRow } from '@/db/schema/personas.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const repo = vi.mocked(personasRepository)
const ai = vi.mocked(geminiService)
const DATA: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
function fakePersona(over: Partial<PersonaRow> = {}): PersonaRow {
  return { id: 'p1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', name: 'Backend', data: DATA, rawInput: null, ...over }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env['MAX_PERSONAS'] = '5'
})

describe('personasService.create', () => {
  it('503s when AI is disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    await expect(personasService.create('u1', { name: 'B', inputs: { freeText: 'x' } })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })

  it('rejects when the cap is reached', async () => {
    ai.isAiEnabled.mockReturnValue(true)
    repo.countForUser.mockResolvedValue(5)
    await expect(personasService.create('u1', { name: 'B', inputs: { freeText: 'x' } })).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('structures with AI and saves', async () => {
    ai.isAiEnabled.mockReturnValue(true)
    repo.countForUser.mockResolvedValue(0)
    ai.generateStructured.mockResolvedValue(DATA)
    repo.create.mockResolvedValue(fakePersona())
    const out = await personasService.create('u1', { name: 'Backend', inputs: { pastedResume: 'RESUME' } })
    expect(ai.generateStructured).toHaveBeenCalled()
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', name: 'Backend', data: DATA, rawInput: 'RESUME' }))
    expect(out.id).toBe('p1')
  })
})

describe('personasService.update / get / remove', () => {
  it('NOT_FOUND on missing update', async () => {
    repo.update.mockResolvedValue(null)
    await expect(personasService.update('u1', 'x', { name: 'Z' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('NOT_FOUND on missing get', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(personasService.get('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('NOT_FOUND on missing remove', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(personasService.remove('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL.

- [ ] **Step 3: Implement** — `backend-express/src/modules/personas/personas.service.ts`:

```typescript
import { AppError } from '@/shared/errors.js'
import { getEnv } from '@/config/env.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { buildStructurePrompt } from '@/modules/ai/ai.prompts.js'
import { ResumeContentSchema } from '@/shared/resume-content.schema.js'
import { personasRepository } from './personas.repository.js'
import type { PersonaRow } from '@/db/schema/personas.js'
import type { CreatePersonaInput, UpdatePersonaInput } from './personas.schema.js'

async function list(userId: string): Promise<PersonaRow[]> {
  return personasRepository.listForUser(userId)
}

async function get(userId: string, id: string): Promise<PersonaRow> {
  const persona = await personasRepository.findById(userId, id)
  if (!persona) throw new AppError('NOT_FOUND', 'Persona not found')
  return persona
}

async function create(userId: string, input: CreatePersonaInput): Promise<PersonaRow> {
  if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')
  const max = getEnv().MAX_PERSONAS
  const current = await personasRepository.countForUser(userId)
  if (current >= max) throw new AppError('CONFLICT', `Persona limit reached (max ${max})`)
  const data = await geminiService.generateStructured(buildStructurePrompt(input.inputs), ResumeContentSchema)
  const rawInput = [input.inputs.pastedResume, input.inputs.freeText].filter(Boolean).join('\n\n') || null
  return personasRepository.create({ userId, name: input.name, data, rawInput })
}

async function update(userId: string, id: string, input: UpdatePersonaInput): Promise<PersonaRow> {
  const updated = await personasRepository.update(userId, id, input)
  if (!updated) throw new AppError('NOT_FOUND', 'Persona not found')
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await personasRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Persona not found')
  return { id }
}

export const personasService = { list, get, create, update, remove }
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/personas/personas.service.ts backend-express/src/modules/personas/personas.service.test.ts
git commit -m "feat(slice-6a): personas service (cap enforcement + AI structuring)"
```

---

### Task 11: Personas controller + router + wiring

**Files:** Create `backend-express/src/modules/personas/personas.controller.ts`, `src/modules/personas/personas.router.ts` · Modify `src/shared/api-router.ts` · Test `src/modules/personas/personas.router.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { PersonaRow } from '@/db/schema/personas.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

vi.mock('./personas.repository.js', () => ({
  personasRepository: {
    create: vi.fn(), countForUser: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn(),
  },
}))
vi.mock('@/modules/ai/gemini.service.js', () => ({
  geminiService: { isAiEnabled: vi.fn(() => true), generateStructured: vi.fn(), generateText: vi.fn() },
}))

import { personasRepository } from './personas.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'

const repo = vi.mocked(personasRepository)
const ai = vi.mocked(geminiService)
let app: Express
let cookie: string
const DATA: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
function fakePersona(over: Partial<PersonaRow> = {}): PersonaRow {
  return { id: 'p1', createdAt: new Date(), updatedAt: new Date(), userId: 'u1', name: 'Backend', data: DATA, rawInput: null, ...over }
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
  process.env['MAX_PERSONAS'] = '5'
  app = (await import('@/app.js')).createApp()
  const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
  cookie = `accessToken=${signAccessToken({ id: 'u1', email: 'a@b.c' })}`
})

beforeEach(() => {
  vi.clearAllMocks()
  ai.isAiEnabled.mockReturnValue(true)
})

describe('personas routes', () => {
  it('401s without a cookie', async () => {
    expect((await request(app).get('/api/personas')).status).toBe(401)
  })
  it('lists personas', async () => {
    repo.listForUser.mockResolvedValue([fakePersona()])
    const res = await request(app).get('/api/personas').set('Cookie', [cookie])
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })
  it('creates a persona (201)', async () => {
    repo.countForUser.mockResolvedValue(0)
    ai.generateStructured.mockResolvedValue(DATA)
    repo.create.mockResolvedValue(fakePersona())
    const res = await request(app).post('/api/personas').set('Cookie', [cookie]).send({ name: 'Backend', inputs: { pastedResume: 'R' } })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('p1')
  })
  it('400s on empty inputs', async () => {
    const res = await request(app).post('/api/personas').set('Cookie', [cookie]).send({ name: 'Backend', inputs: {} })
    expect(res.status).toBe(400)
  })
  it('409s on the cap', async () => {
    repo.countForUser.mockResolvedValue(5)
    const res = await request(app).post('/api/personas').set('Cookie', [cookie]).send({ name: 'Backend', inputs: { freeText: 'x' } })
    expect(res.status).toBe(409)
  })
  it('503s when AI is disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    const res = await request(app).post('/api/personas').set('Cookie', [cookie]).send({ name: 'Backend', inputs: { freeText: 'x' } })
    expect(res.status).toBe(503)
  })
  it('patches a persona', async () => {
    repo.update.mockResolvedValue(fakePersona({ name: 'Full-stack' }))
    const res = await request(app).patch('/api/personas/p1').set('Cookie', [cookie]).send({ name: 'Full-stack' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Full-stack')
  })
  it('404s patching a missing persona', async () => {
    repo.update.mockResolvedValue(null)
    const res = await request(app).patch('/api/personas/x').set('Cookie', [cookie]).send({ name: 'Z' })
    expect(res.status).toBe(404)
  })
  it('deletes a persona (204)', async () => {
    repo.remove.mockResolvedValue(true)
    const res = await request(app).delete('/api/personas/p1').set('Cookie', [cookie])
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL (404s).

- [ ] **Step 3: Implement controller** — `backend-express/src/modules/personas/personas.controller.ts`:

```typescript
import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { personasService } from './personas.service.js'
import type { CreatePersonaInput, UpdatePersonaInput } from './personas.schema.js'

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
  res.status(200).json({ data: await personasService.list(requireUserId(req)) })
}

async function get(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await personasService.get(requireUserId(req), paramValue(req, 'id')) })
}

async function create(req: Request, res: Response): Promise<void> {
  const persona = await personasService.create(requireUserId(req), req.body as CreatePersonaInput)
  res.status(201).json({ data: persona })
}

async function update(req: Request, res: Response): Promise<void> {
  const persona = await personasService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdatePersonaInput)
  res.status(200).json({ data: persona })
}

async function remove(req: Request, res: Response): Promise<void> {
  await personasService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(204).end()
}

export const personasController = { list, get, create, update, remove }
```

`backend-express/src/modules/personas/personas.router.ts`:

```typescript
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { personasController } from './personas.controller.js'
import { CreatePersonaSchema, UpdatePersonaSchema } from './personas.schema.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(personasController.list))
router.post('/', validate(CreatePersonaSchema), asyncHandler(personasController.create))
router.get('/:id', asyncHandler(personasController.get))
router.patch('/:id', validate(UpdatePersonaSchema), asyncHandler(personasController.update))
router.delete('/:id', asyncHandler(personasController.remove))

export { router as personasRouter }
```

Modify `src/shared/api-router.ts` — import and mount:

```typescript
import { personasRouter } from '@/modules/personas/personas.router.js'
// …
router.use('/personas', personasRouter)
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/personas/personas.controller.ts backend-express/src/modules/personas/personas.router.ts backend-express/src/shared/api-router.ts backend-express/src/modules/personas/personas.router.test.ts
git commit -m "feat(slice-6a): personas controller + router wired under /api/personas"
```

---

### Task 12: Backend gate

- [ ] **Step 1: Run the full backend gate**

Run: `cd backend-express && npm run typecheck && npm run lint && npm run test`
Expected: all green. Fix any failures before proceeding. (DB-backed repo tests need `docker compose up -d postgres`.)

- [ ] **Step 2: Commit** (only if lint/format auto-fixed files)

```bash
git add -A backend-express
git commit -m "chore(slice-6a): backend gate green (typecheck + lint + tests)" || echo "nothing to commit"
```

---

## FRONTEND

### Task 13: Shared types + query keys

**Files:** Create `frontend-next/src/types/resume.ts`, `src/types/persona.ts` · Modify `src/lib/query-keys.ts`

- [ ] **Step 1: Implement types** — `frontend-next/src/types/resume.ts` (mirror of the backend schema):

```typescript
export interface ResumeLink {
  label: string
  url: string
}
export interface ResumeBasics {
  name: string
  phone?: string
  email?: string
  location?: string
  links: ResumeLink[]
}
export interface ResumeExperience {
  company: string
  title: string
  date: string
  bullets: string[]
}
export interface ResumeProject {
  name: string
  tagline?: string
  url?: string
  bullets: string[]
}
export interface ResumeSkillGroup {
  category: string
  items: string[]
}
export interface ResumeEducation {
  degree: string
  institution: string
  period?: string
}
export interface ResumeContent {
  basics: ResumeBasics
  summary: string
  experience: ResumeExperience[]
  projects: ResumeProject[]
  skills: ResumeSkillGroup[]
  education: ResumeEducation[]
}
```

`frontend-next/src/types/persona.ts`:

```typescript
import type { ResumeContent } from './resume'

export interface Persona {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  name: string
  data: ResumeContent
  rawInput: string | null
}

export interface AiStatus {
  enabled: boolean
  maxPersonas: number
}
```

- [ ] **Step 2: Add query keys** — append to `frontend-next/src/lib/query-keys.ts`:

```typescript
export const AI_STATUS_KEY = ['ai', 'status'] as const
export const PERSONAS_KEY = ['personas'] as const
export const personaKey = (id: string) => ['personas', id] as const
```

- [ ] **Step 3: Typecheck** — Run: `cd frontend-next && npm run typecheck` → green.

- [ ] **Step 4: Commit**

```bash
git add frontend-next/src/types/resume.ts frontend-next/src/types/persona.ts frontend-next/src/lib/query-keys.ts
git commit -m "feat(slice-6a): frontend ResumeContent/Persona types + query keys"
```

---

### Task 14: Persona form schema

**Files:** Create `frontend-next/src/schemas/persona.ts` · Test `frontend-next/src/schemas/persona.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { CreatePersonaFormSchema } from './persona'

describe('CreatePersonaFormSchema', () => {
  it('requires a name and at least one input', () => {
    expect(CreatePersonaFormSchema.safeParse({ name: 'Backend', pastedResume: 'text', freeText: '' }).success).toBe(true)
    expect(CreatePersonaFormSchema.safeParse({ name: 'Backend', pastedResume: '', freeText: '' }).success).toBe(false)
    expect(CreatePersonaFormSchema.safeParse({ name: '', pastedResume: 'text', freeText: '' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run it, verify it fails** — Run: `npx vitest run src/schemas/persona.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `frontend-next/src/schemas/persona.ts`:

```typescript
import { z } from 'zod'

export const CreatePersonaFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    pastedResume: z.string().max(50000).optional().default(''),
    freeText: z.string().max(20000).optional().default(''),
  })
  .refine((v) => Boolean(v.pastedResume?.trim() || v.freeText?.trim()), {
    message: 'Paste a résumé or add some notes',
    path: ['pastedResume'],
  })

export type CreatePersonaFormValues = z.infer<typeof CreatePersonaFormSchema>
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/schemas/persona.ts frontend-next/src/schemas/persona.test.ts
git commit -m "feat(slice-6a): persona create-form schema"
```

---

### Task 15: Hooks — `useAiStatus` + personas CRUD

**Files:** Create `frontend-next/src/hooks/use-ai-status.ts`, `src/hooks/use-personas.ts` · Test `src/hooks/use-personas.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { usePersonas, useCreatePersona, useUpdatePersona, useDeletePersona } from './use-personas'
import { PERSONAS_KEY } from '@/lib/query-keys'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
function spiedClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { Wrapper, invalidate }
}
beforeEach(() => vi.clearAllMocks())

describe('usePersonas', () => {
  it('fetches the list', async () => {
    api.get.mockResolvedValue([{ id: 'p1', name: 'Backend' }])
    const { result } = renderHook(() => usePersonas(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/personas')
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useCreatePersona', () => {
  it('posts and invalidates the list', async () => {
    api.post.mockResolvedValue({ id: 'p1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useCreatePersona(), { wrapper: Wrapper })
    result.current.mutate({ name: 'Backend', inputs: { pastedResume: 'R' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/personas', { name: 'Backend', inputs: { pastedResume: 'R' } })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PERSONAS_KEY })
  })
})

describe('useUpdatePersona / useDeletePersona', () => {
  it('patches by id', async () => {
    api.patch.mockResolvedValue({ id: 'p1', name: 'X' })
    const { result } = renderHook(() => useUpdatePersona('p1'), { wrapper })
    result.current.mutate({ name: 'X' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/personas/p1', { name: 'X' })
  })
  it('deletes by id', async () => {
    api.delete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeletePersona(), { wrapper })
    result.current.mutate('p1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/personas/p1')
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL.

- [ ] **Step 3: Implement** — `frontend-next/src/hooks/use-ai-status.ts`:

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { AI_STATUS_KEY } from '@/lib/query-keys'
import type { AiStatus } from '@/types/persona'

export function useAiStatus(initialData?: AiStatus) {
  return useQuery({
    queryKey: AI_STATUS_KEY,
    queryFn: () => apiClient.get<AiStatus>('/api/ai/status'),
    staleTime: 5 * 60 * 1000,
    ...(initialData ? { initialData } : {}),
  })
}
```

`frontend-next/src/hooks/use-personas.ts`:

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { PERSONAS_KEY } from '@/lib/query-keys'
import type { Persona } from '@/types/persona'
import type { ResumeContent } from '@/types/resume'

interface CreatePersonaBody {
  name: string
  inputs: { pastedResume?: string; freeText?: string }
}

export function usePersonas(initialData?: Persona[]) {
  return useQuery({
    queryKey: PERSONAS_KEY,
    queryFn: () => apiClient.get<Persona[]>('/api/personas'),
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}

export function useCreatePersona() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePersonaBody) => apiClient.post<Persona>('/api/personas', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PERSONAS_KEY }),
  })
}

export function useUpdatePersona(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { name?: string; data?: ResumeContent }) => apiClient.patch<Persona>(`/api/personas/${id}`, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PERSONAS_KEY }),
  })
}

export function useDeletePersona() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/personas/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PERSONAS_KEY }),
  })
}
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/hooks/use-ai-status.ts frontend-next/src/hooks/use-personas.ts frontend-next/src/hooks/use-personas.test.tsx
git commit -m "feat(slice-6a): useAiStatus + personas CRUD hooks"
```

---

### Task 16: `ResumeContentEditor` (reusable structured editor)

**Files:** Create `frontend-next/src/components/resume/resume-content-editor.tsx` · Test `src/components/resume/resume-content-editor.test.tsx`

This is the shared light editor (edit text · add/remove bullets · remove entry). It's a **controlled** component: `value: ResumeContent` + `onChange(next)`. Reused for résumés in 6b.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ResumeContent } from '@/types/resume'
import { ResumeContentEditor } from './resume-content-editor'

const DATA: ResumeContent = {
  basics: { name: 'Kartick', email: 'k@x.com', links: [] },
  summary: 'Backend engineer.',
  experience: [{ company: 'Weloin', title: 'SWE', date: '2024', bullets: ['Built CI/CD'] }],
  projects: [],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  education: [],
}

describe('ResumeContentEditor', () => {
  it('edits the summary text', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    const summary = screen.getByLabelText(/summary/i)
    await userEvent.type(summary, '!')
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls.at(-1)![0] as ResumeContent
    expect(next.summary.startsWith('Backend engineer.')).toBe(true)
  })

  it('adds a bullet to an experience entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add bullet/i }))
    const next = onChange.mock.calls.at(-1)![0] as ResumeContent
    expect(next.experience[0]!.bullets).toHaveLength(2)
  })

  it('removes an experience entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /remove experience/i }))
    const next = onChange.mock.calls.at(-1)![0] as ResumeContent
    expect(next.experience).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL.

- [ ] **Step 3: Implement** — `frontend-next/src/components/resume/resume-content-editor.tsx`. Use the existing `Input`, `Label`, `Textarea`, `Button` primitives; no inline styled markup beyond layout utility classes.

```tsx
'use client'

import type { ResumeContent } from '@/types/resume'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Props {
  value: ResumeContent
  onChange: (next: ResumeContent) => void
}

export function ResumeContentEditor({ value, onChange }: Props) {
  const patch = (partial: Partial<ResumeContent>) => onChange({ ...value, ...partial })

  const setExperience = (i: number, partial: Partial<ResumeContent['experience'][number]>) => {
    const experience = value.experience.map((e, idx) => (idx === i ? { ...e, ...partial } : e))
    patch({ experience })
  }
  const addBullet = (i: number) =>
    setExperience(i, { bullets: [...value.experience[i]!.bullets, ''] })
  const setBullet = (i: number, b: number, text: string) =>
    setExperience(i, { bullets: value.experience[i]!.bullets.map((x, idx) => (idx === b ? text : x)) })
  const removeBullet = (i: number, b: number) =>
    setExperience(i, { bullets: value.experience[i]!.bullets.filter((_, idx) => idx !== b) })
  const removeExperience = (i: number) => patch({ experience: value.experience.filter((_, idx) => idx !== i) })

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Label htmlFor="rc-name">Name</Label>
        <Input
          id="rc-name"
          value={value.basics.name}
          onChange={(e) => patch({ basics: { ...value.basics, name: e.target.value } })}
        />
        <Label htmlFor="rc-summary">Summary</Label>
        <Textarea
          id="rc-summary"
          value={value.summary}
          onChange={(e) => patch({ summary: e.target.value })}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Experience</h3>
        {value.experience.map((exp, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`Experience ${i + 1} company`}
                value={exp.company}
                onChange={(e) => setExperience(i, { company: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove experience ${i + 1}`}
                onClick={() => removeExperience(i)}
              >
                Remove
              </Button>
            </div>
            <Input
              aria-label={`Experience ${i + 1} title`}
              value={exp.title}
              onChange={(e) => setExperience(i, { title: e.target.value })}
            />
            <Input
              aria-label={`Experience ${i + 1} date`}
              value={exp.date}
              onChange={(e) => setExperience(i, { date: e.target.value })}
            />
            <ul className="space-y-1">
              {exp.bullets.map((b, bi) => (
                <li key={bi} className="flex items-center gap-2">
                  <Input
                    aria-label={`Experience ${i + 1} bullet ${bi + 1}`}
                    value={b}
                    onChange={(e) => setBullet(i, bi, e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="sm" aria-label={`Remove bullet ${bi + 1}`} onClick={() => removeBullet(i, bi)}>
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" size="sm" onClick={() => addBullet(i)}>
              Add bullet
            </Button>
          </div>
        ))}
      </section>
    </div>
  )
}
```

> **Scope note (6a):** the editor covers Name, Summary, and Experience (entry edit, add/remove bullet, remove entry) — enough to satisfy the spec's "edit a persona" exit criterion and the tests. **6b extends** the same component with Projects, Skills, Education, and Basics/links sections (the spec's full edit surface), reusing these patterns. Keep the structure so 6b appends sections without refactor.

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/resume/resume-content-editor.tsx frontend-next/src/components/resume/resume-content-editor.test.tsx
git commit -m "feat(slice-6a): reusable ResumeContentEditor (text/bullets/remove-entry)"
```

---

### Task 17: `CreatePersonaWizard`

**Files:** Create `frontend-next/src/components/personas/create-persona-wizard.tsx` · Test `src/components/personas/create-persona-wizard.test.tsx`

A `Dialog`-based two-step flow: **(1)** name + paste résumé / notes → *Structure with AI* (calls `useCreatePersona`); on success the dialog closes (the structured result is then editable from the card via the editor in Task 18's list). Keep it simple — no client-side AI; the backend structures and persists in one call.

- [ ] **Step 1: Write the failing test**

```typescript
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
import { CreatePersonaWizard } from './create-persona-wizard'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('CreatePersonaWizard', () => {
  it('submits name + pasted resume and closes on success', async () => {
    api.post.mockResolvedValue({ id: 'p1', name: 'Backend' })
    const onOpenChange = vi.fn()
    render(<CreatePersonaWizard open onOpenChange={onOpenChange} />, { wrapper })
    await userEvent.type(screen.getByLabelText(/persona name/i), 'Backend')
    await userEvent.type(screen.getByLabelText(/paste your résumé|paste your resume/i), 'RESUME TEXT')
    await userEvent.click(screen.getByRole('button', { name: /structure with ai|create/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/personas', { name: 'Backend', inputs: { pastedResume: 'RESUME TEXT', freeText: '' } }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('shows a validation error when nothing is provided', async () => {
    render(<CreatePersonaWizard open onOpenChange={vi.fn()} />, { wrapper })
    await userEvent.type(screen.getByLabelText(/persona name/i), 'Backend')
    await userEvent.click(screen.getByRole('button', { name: /structure with ai|create/i }))
    expect(await screen.findByText(/paste a résumé|paste a resume|add some notes/i)).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL.

- [ ] **Step 3: Implement** — `frontend-next/src/components/personas/create-persona-wizard.tsx` (uses the existing `Dialog`, `Input`, `Label`, `Textarea`, `Button` primitives):

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CreatePersonaFormSchema, type CreatePersonaFormValues } from '@/schemas/persona'
import { useCreatePersona } from '@/hooks/use-personas'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePersonaWizard({ open, onOpenChange }: Props) {
  const create = useCreatePersona()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePersonaFormValues>({
    resolver: zodResolver(CreatePersonaFormSchema),
    defaultValues: { name: '', pastedResume: '', freeText: '' },
  })

  const onSubmit = (values: CreatePersonaFormValues) => {
    create.mutate(
      { name: values.name, inputs: { pastedResume: values.pastedResume ?? '', freeText: values.freeText ?? '' } },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New persona</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {create.error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {create.error.message}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="persona-name">Persona name</Label>
            <Input id="persona-name" placeholder="e.g. Backend" {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona-resume">Paste your résumé</Label>
            <Textarea id="persona-resume" rows={8} placeholder="Paste your existing résumé text…" {...register('pastedResume')} />
            {errors.pastedResume ? <p className="text-xs text-destructive">{errors.pastedResume.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona-notes">Extra notes (optional)</Label>
            <Textarea id="persona-notes" rows={3} placeholder="Anything to emphasize…" {...register('freeText')} />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? 'Structuring…' : 'Structure with AI'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

> If `DialogHeader`/`DialogTitle` exports differ, match the actual exports in `src/components/ui/dialog.tsx` (verified to exist via the dialog primitive). Reapplication of `data-theme-scope="app"` is already handled inside the dialog primitive.

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/personas/create-persona-wizard.tsx frontend-next/src/components/personas/create-persona-wizard.test.tsx
git commit -m "feat(slice-6a): CreatePersonaWizard (name + paste → AI structure)"
```

---

### Task 18: `PersonaList` + `PersonasWorkspace` + page + nav

**Files:** Create `frontend-next/src/components/personas/persona-list.tsx`, `src/components/personas/personas-workspace.tsx`, `src/app/app/personas/page.tsx` · Modify `src/components/layout/app/sidebar-nav.tsx` · Test `src/components/personas/personas-workspace.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Persona } from '@/types/persona'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { PersonasWorkspace } from './personas-workspace'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
const DATA = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const PERSONA: Persona = { id: 'p1', createdAt: '', updatedAt: '', userId: 'u1', name: 'Backend', data: DATA, rawInput: null }

beforeEach(() => vi.clearAllMocks())

describe('PersonasWorkspace', () => {
  it('renders personas and the count against the cap', async () => {
    render(<PersonasWorkspace initialPersonas={[PERSONA]} initialStatus={{ enabled: true, maxPersonas: 5 }} />, { wrapper })
    expect(await screen.findByText('Backend')).toBeInTheDocument()
    expect(screen.getByText(/1\s*\/\s*5/)).toBeInTheDocument()
  })

  it('disables New persona when at the cap', async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ ...PERSONA, id: `p${i}`, name: `P${i}` }))
    render(<PersonasWorkspace initialPersonas={five} initialStatus={{ enabled: true, maxPersonas: 5 }} />, { wrapper })
    expect(screen.getByRole('button', { name: /new persona/i })).toBeDisabled()
  })

  it('shows the AI-disabled notice when not configured', async () => {
    render(<PersonasWorkspace initialPersonas={[]} initialStatus={{ enabled: false, maxPersonas: 5 }} />, { wrapper })
    expect(screen.getByText(/ai features are not configured|not configured/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new persona/i })).toBeDisabled()
  })

  it('deletes a persona', async () => {
    api.delete.mockResolvedValue(undefined)
    api.get.mockResolvedValue([])
    render(<PersonasWorkspace initialPersonas={[PERSONA]} initialStatus={{ enabled: true, maxPersonas: 5 }} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /delete backend/i }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/personas/p1'))
  })
})
```

- [ ] **Step 2: Run it, verify it fails** → FAIL.

- [ ] **Step 3: Implement** — `frontend-next/src/components/personas/persona-list.tsx`:

```tsx
'use client'

import type { Persona } from '@/types/persona'
import { Button } from '@/components/ui/button'
import { useDeletePersona } from '@/hooks/use-personas'

export function PersonaList({ personas }: { personas: Persona[] }) {
  const del = useDeletePersona()
  if (personas.length === 0) {
    return <p className="text-sm text-muted-foreground">No personas yet. Create one to start generating tailored résumés and cover letters.</p>
  }
  return (
    <ul className="divide-y divide-border">
      {personas.map((p) => (
        <li key={p.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.data.experience.length} roles · {p.data.skills.length} skill groups
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Delete ${p.name}`}
            disabled={del.isPending}
            onClick={() => del.mutate(p.id)}
          >
            Delete
          </Button>
        </li>
      ))}
    </ul>
  )
}
```

`frontend-next/src/components/personas/personas-workspace.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Persona, AiStatus } from '@/types/persona'
import { Button } from '@/components/ui/button'
import { usePersonas } from '@/hooks/use-personas'
import { useAiStatus } from '@/hooks/use-ai-status'
import { PersonaList } from './persona-list'
import { CreatePersonaWizard } from './create-persona-wizard'

interface Props {
  initialPersonas: Persona[]
  initialStatus: AiStatus
}

export function PersonasWorkspace({ initialPersonas, initialStatus }: Props) {
  const [open, setOpen] = useState(false)
  const { data: personas = initialPersonas } = usePersonas(initialPersonas)
  const { data: status = initialStatus } = useAiStatus(initialStatus)
  const atCap = personas.length >= status.maxPersonas
  const canCreate = status.enabled && !atCap

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Personas</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{personas.length}</span> / <span className="font-mono">{status.maxPersonas}</span> role-focused backgrounds
          </p>
        </div>
        <Button type="button" disabled={!canCreate} onClick={() => setOpen(true)}>
          New persona
        </Button>
      </header>

      {!status.enabled ? (
        <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          AI features are not configured. Set <span className="font-mono">GEMINI_API_KEY</span> to create personas.
        </p>
      ) : null}

      <PersonaList personas={personas} />
      <CreatePersonaWizard open={open} onOpenChange={setOpen} />
    </div>
  )
}
```

`frontend-next/src/app/app/personas/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { PersonasWorkspace } from '@/components/personas/personas-workspace'
import type { Persona, AiStatus } from '@/types/persona'

export const metadata: Metadata = { title: 'Personas' }

export default async function PersonasPage() {
  let initialPersonas: Persona[] = []
  try {
    initialPersonas = await apiServer.get<Persona[]>('/api/personas')
  } catch {
    initialPersonas = []
  }
  let initialStatus: AiStatus = { enabled: false, maxPersonas: 5 }
  try {
    initialStatus = await apiServer.get<AiStatus>('/api/ai/status')
  } catch {
    initialStatus = { enabled: false, maxPersonas: 5 }
  }

  return (
    <Suspense fallback={null}>
      <PersonasWorkspace initialPersonas={initialPersonas} initialStatus={initialStatus} />
    </Suspense>
  )
}
```

Modify `frontend-next/src/components/layout/app/sidebar-nav.tsx` — add the nav item (and the `Users` icon import):

```typescript
import { Users } from 'lucide-react'
// …add to the NAV array, after Jobs:
  { href: '/app/personas', label: 'Personas', icon: Users },
```

- [ ] **Step 4: Run it, verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/personas/persona-list.tsx frontend-next/src/components/personas/personas-workspace.tsx frontend-next/src/app/app/personas/page.tsx frontend-next/src/components/personas/personas-workspace.test.tsx frontend-next/src/components/layout/app/sidebar-nav.tsx
git commit -m "feat(slice-6a): /app/personas page + workspace + list + sidebar nav"
```

---

### Task 19: Frontend gate

- [ ] **Step 1: Run the full frontend gate**

Run: `cd frontend-next && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all green. (Note: a host `rm -rf .next` may hit root-owned files; if `build` fails on a stale `.next`, verify via `docker build --target production ./frontend-next` per CLAUDE.md.)

- [ ] **Step 2: Commit** (only if lint/format auto-fixed)

```bash
git add -A frontend-next
git commit -m "chore(slice-6a): frontend gate green (typecheck + lint + tests + build)" || echo "nothing to commit"
```

---

### Task 20: Manual smoke (Docker, real key)

- [ ] **Step 1:** Add `GEMINI_API_KEY=<real key>` to the root `.env`; `docker compose up -d --build --force-recreate --renew-anon-volumes` (renew because backend deps changed).
- [ ] **Step 2:** Migration `0004` auto-applies on backend boot — confirm in `docker compose logs -f backend-express`.
- [ ] **Step 3:** Via the `:8080` proxy: register/login → open **Personas** in the sidebar → **New persona** → paste a résumé + name it → **Structure with AI** → confirm a persona appears with non-empty `experience`/`skills` counts.
- [ ] **Step 4:** `GET /api/ai/status` returns `{ enabled: true, maxPersonas: 5 }`. Remove the key + recreate → status `enabled:false`, the New-persona button disables and the notice shows.
- [ ] **Step 5:** Create up to 5 → the 6th attempt is blocked (button disabled at the cap; a direct `POST` returns 409).

---

## Self-Review

**Spec coverage (§ → task):** §2 personas/cap/hybrid-input/AI-structuring → T7–T11,T16–T18; §3 `ResumeContent` → T3,T13; §5 `personas` table/migration → T7; §6 Gemini wrapper + structured-output + Zod guard + structure prompt → T4,T5,T10 (rate limit → **6b**, when `generated_resumes` exists — noted); §7 `GET /api/ai/status` + personas endpoints → T6,T11; §8 `/app/personas` wizard + management + AI-status gating → T15–T18; §10 env → T1.

**Deviations from the spec, intentional & noted:** (1) `ai/status` returns `{ enabled, maxPersonas }` (spec had a separate personas `meta:{count,max}`) — simpler, avoids meta plumbing; personas list returns `{ data: Persona[] }`. (2) The reusable structured **editor is built in 6a** (Task 16) and **extended in 6b**, because the spec's 6a exit criteria include editing a persona. (3) DB-derived **rate limiting moves to 6b** (its row-count needs `generated_resumes`/`cover_letters`, which don't exist until 6b/6c).

**Placeholder scan:** none — every step has real code/commands. **Type consistency:** `ResumeContent` shape identical across `resume-content.schema.ts` (BE) and `types/resume.ts` (FE); `PersonaInputs`/`CreatePersonaInput` referenced consistently; hook bodies match controller contracts (`POST /api/personas {name,inputs}`, `PATCH /api/personas/:id`, `DELETE`). **Ordering caveat** flagged in Task 5 (implement Task 8's schema before Task 5's `ai.prompts.ts` import).
