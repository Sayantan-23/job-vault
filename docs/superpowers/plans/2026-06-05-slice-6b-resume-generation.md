# Slice 6b — Résumé Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a tailored, ATS-clean résumé from a Persona (persona-only **or** persona + a specific job) via Gemini, store it as structured `ResumeContent` JSON, and let the user **preview** (client-side react-pdf), **lightly edit**, and export — **Copy LaTeX · Open in Overleaf · Download PDF** — all with **no file storage and no backend rendering toolchain**.

**Architecture:** `ResumeContent` (the shared schema from 6a) is the single source of truth. From it the backend derives a `.tex` string (pure function, golden-tested against the user's template, with LaTeX-escaping + `**bold**`→`\textbf`), and the frontend renders the **same data** through a `@react-pdf/renderer` `ResumeDocument` for both the live preview and the one-click PDF. Generation reuses the 6a Gemini wrapper (`generateStructured` → Zod-validated). A **DB-derived rate limit** (count generations in the trailing hour) lands here. The reusable `ResumeContentEditor` (built in 6a, Experience only) is **extended** to the full schema.

**Tech Stack:** Express 5 · Drizzle · Zod · Vitest · Supertest · `@google/genai` · **`@react-pdf/renderer` (new)** · Next.js 15 · React 19 · TanStack Query v5 · RTL.

**Spec:** `docs/superpowers/specs/2026-06-05-slice-6-ai-resume-cover-letter-design.md` (§§3,4,5,6,7,8). **Branch:** `slice-6-ai-resume-cover-letter` (continues after 6a).

> **Conventions (do not deviate):** backend imports end in `.js` (NodeNext); responses are `res.status(n).json({ data })`; throw `AppError(code, msg)`; repository queries are `userId`-scoped. Frontend reuses `src/components/ui/*`, no inline styled markup, `'use client'` only on interactive leaves. Gemini is **mocked in all automated tests**; the real key is for the manual smoke only. Commit per task; **no `git push`; no "Claude" in commit messages.**

> **UX decision (flagged for review):** persona-only résumé generation is reached from `/app/personas` via a **"Generate résumé"** button on each persona card that links to a dedicated workspace route **`/app/resumes?persona=<id>`** (optionally `&job=<id>`). This realizes the spec's "persona-only generation lives on /app/personas" while giving the preview+editor enough room. The in-context **JobDrawer** résumé tab is **6c**.

---

## File structure

**Backend (`backend-express/`)**
- Create `src/db/schema/generated-resumes.ts`; modify `src/db/schema/index.ts`; migration `0005_*`.
- Create `src/modules/resumes/resumes.schema.ts`, `resume-tex.ts`, `resumes.repository.ts`, `resumes.service.ts`, `resumes.controller.ts`, `resumes.router.ts` (+ tests).
- Create `src/modules/ai/ai-usage.repository.ts`, `src/modules/ai/ai.rate-limit.ts` (+ tests).
- Modify `src/modules/ai/ai.prompts.ts` — add `buildResumePrompt`.
- Modify `src/shared/api-router.ts` — mount `/resumes`.

**Frontend (`frontend-next/`)**
- Modify `package.json` — add `@react-pdf/renderer`.
- Modify `src/types/resume.ts` — add `GeneratedResume`; `src/lib/query-keys.ts` — résumé keys.
- Create `src/lib/resume-markup.ts` (shared `splitBold`).
- Create `src/components/resume/resume-document.tsx` (react-pdf), `resume-preview.tsx`, `resume-output-bar.tsx`.
- Modify `src/components/resume/resume-content-editor.tsx` — extend to full schema.
- Create `src/hooks/use-resumes.ts`.
- Create `src/components/resume/generate-resume-bar.tsx`, `src/components/resume/resume-workspace.tsx`, `src/app/app/resumes/page.tsx`.
- Modify `src/components/personas/persona-list.tsx` — add "Generate résumé" link.

---

## BACKEND

### Task 1: `generated_resumes` table + migration `0005`

**Files:** Create `backend-express/src/db/schema/generated-resumes.ts` · Modify `src/db/schema/index.ts` · Generate `src/db/migrations/0005_*.sql`

- [ ] **Step 1: Implement schema** — `backend-express/src/db/schema/generated-resumes.ts`:

```typescript
import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { personas } from './personas.js'
import { jobs } from './jobs.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

export const generatedResumes = pgTable(
  'generated_resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    personaId: uuid('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }),
    instructions: text('instructions'),
    content: jsonb('content').$type<ResumeContent>().notNull(),
  },
  (t) => [
    index('idx_generated_resumes_user_id').on(t.userId),
    index('idx_generated_resumes_job_id').on(t.jobId),
  ],
)

export type GeneratedResumeRow = typeof generatedResumes.$inferSelect
export type NewGeneratedResumeRow = typeof generatedResumes.$inferInsert
```

- [ ] **Step 2: Barrel** — append to `src/db/schema/index.ts`: `export * from './generated-resumes.js'`

- [ ] **Step 3: Generate migration** — Run: `cd backend-express && npm run db:generate` → new `0005_*.sql` creating `generated_resumes` (FKs: user/persona cascade, job set-null). Inspect it.

- [ ] **Step 4: Apply** (Postgres up on 5433) — Run: `DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run db:migrate` → applies `0005`.

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/db/schema/generated-resumes.ts backend-express/src/db/schema/index.ts backend-express/src/db/migrations/
git commit -m "feat(slice-6b): generated_resumes table + migration 0005"
```

---

### Task 2: Résumé Zod schemas

**Files:** Create `backend-express/src/modules/resumes/resumes.schema.ts` · Test `…/resumes.schema.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { GenerateResumeSchema, UpdateResumeSchema } from './resumes.schema.js'

describe('GenerateResumeSchema', () => {
  it('requires a personaId; jobId/instructions optional', () => {
    expect(GenerateResumeSchema.safeParse({ personaId: '11111111-1111-1111-1111-111111111111' }).success).toBe(true)
    expect(GenerateResumeSchema.safeParse({}).success).toBe(false)
    expect(GenerateResumeSchema.safeParse({ personaId: 'not-a-uuid' }).success).toBe(false)
  })
})
describe('UpdateResumeSchema', () => {
  it('accepts a content-only edit; rejects empty', () => {
    expect(UpdateResumeSchema.safeParse({ content: { basics: { name: 'A' } } }).success).toBe(true)
    expect(UpdateResumeSchema.safeParse({}).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/modules/resumes/resumes.schema.test.ts`

- [ ] **Step 3: Implement** — `resumes.schema.ts`:

```typescript
import { z } from 'zod'
import { ResumeContentSchema } from '@/shared/resume-content.schema.js'

export const GenerateResumeSchema = z.object({
  personaId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  instructions: z.string().max(2000).optional(),
})

export const UpdateResumeSchema = z
  .object({
    title: z.string().max(200).optional(),
    content: ResumeContentSchema.optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, { message: 'Nothing to update' })

export const ResumeQuerySchema = z.object({ jobId: z.string().uuid().optional() })

export type GenerateResumeInput = z.infer<typeof GenerateResumeSchema>
export type UpdateResumeInput = z.infer<typeof UpdateResumeSchema>
export type ResumeQuery = z.infer<typeof ResumeQuerySchema>
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/resumes/resumes.schema.ts backend-express/src/modules/resumes/resumes.schema.test.ts
git commit -m "feat(slice-6b): résumé Zod schemas (generate/update/query)"
```

---

### Task 3: `.tex` deriver (golden-tested)

**Files:** Create `backend-express/src/modules/resumes/resume-tex.ts` · Test `…/resume-tex.test.ts`

This pure function reproduces the user's template (`example_resume.tex`) with the dynamic content filled in. **LaTeX-escape** every interpolated user string, then expand `**bold**` → `\textbf{…}`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { renderResumeTex } from './resume-tex.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const CONTENT: ResumeContent = {
  basics: { name: 'Kartick Sadhu', email: 'k@example.com', phone: '+91 1', location: 'Kolkata', links: [{ label: 'GitHub', url: 'github.com/x' }] },
  summary: 'Backend engineer with **2 years** & strong CI/CD.',
  experience: [{ company: 'Weloin', title: 'SWE', date: 'Jan 2024 - present', bullets: ['Built **CI/CD** for 100% uptime'] }],
  projects: [{ name: 'MaxFlow', tagline: 'Workflow SaaS', bullets: ['NATS JetStream'] }],
  skills: [{ category: 'Languages', items: ['TypeScript', 'Java'] }],
  education: [{ degree: 'MCA', institution: 'Brainware University', period: '2022-2024' }],
}

describe('renderResumeTex', () => {
  const tex = renderResumeTex(CONTENT)
  it('emits a complete, compilable document skeleton', () => {
    expect(tex).toContain('\\documentclass[a4paper,10pt]{article}')
    expect(tex).toContain('\\begin{document}')
    expect(tex).toContain('\\end{document}')
    expect(tex).toContain('\\pagestyle{empty}')
  })
  it('renders name, sections and entries', () => {
    expect(tex).toContain('Kartick Sadhu')
    expect(tex).toContain('\\section{Professional Summary}')
    expect(tex).toContain('\\section{Experience}')
    expect(tex).toContain('\\textbf{Weloin}')
    expect(tex).toContain('Jan 2024 - present')
    expect(tex).toContain('\\section{Projects}')
    expect(tex).toContain('\\textit{Workflow SaaS}')
    expect(tex).toContain('\\section{Skills}')
    expect(tex).toContain('\\textbf{Languages:} TypeScript, Java')
    expect(tex).toContain('\\section{Education}')
    expect(tex).toContain('\\textbf{MCA,} Brainware University (2022-2024)')
  })
  it('LaTeX-escapes special chars and expands **bold**', () => {
    expect(tex).toContain('Backend engineer with \\textbf{2 years} \\& strong CI/CD.')
    expect(tex).toContain('Built \\textbf{CI/CD} for 100\\% uptime')
  })
  it('links use \\href and email is a mailto', () => {
    expect(tex).toContain('\\href{mailto:k@example.com}{k@example.com}')
    expect(tex).toContain('\\href{https://github.com/x}{github.com/x}')
  })
  it('omits empty sections', () => {
    const tex2 = renderResumeTex({ ...CONTENT, projects: [], skills: [], education: [] })
    expect(tex2).not.toContain('\\section{Projects}')
    expect(tex2).not.toContain('\\section{Skills}')
    expect(tex2).not.toContain('\\section{Education}')
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — `resume-tex.ts`:

```typescript
import type { ResumeContent } from '@/shared/resume-content.schema.js'

/** Escape LaTeX special characters in plain user text. */
export function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

/** Escape, then expand **bold** markup into \textbf{...}. Assumes balanced **. */
export function richText(s: string): string {
  return s
    .split('**')
    .map((seg, i) => (i % 2 === 1 ? `\\textbf{${escapeLatex(seg)}}` : escapeLatex(seg)))
    .join('')
}

function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const PREAMBLE = `\\documentclass[a4paper,10pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[scaled=0.92]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[top=0.4in, bottom=0.4in, left=0.5in, right=0.5in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\definecolor{ruleblue}{HTML}{2B6CB0}
\\definecolor{linkblue}{HTML}{0645AD}
\\hypersetup{colorlinks=true, linkcolor=linkblue, urlcolor=linkblue, pdftitle={Resume}}
\\titleformat{\\section}{\\vspace{-10pt}\\raggedright\\large\\bfseries\\color{black}}{}{0em}{}[\\color{ruleblue}\\titlerule\\vspace{-4pt}]
\\newcommand{\\resumeName}[1]{\\noindent{\\centering \\huge\\bfseries #1 \\par}}
`

const ITEMIZE_OPEN = '\\begin{itemize}[leftmargin=1em, label={\\textbullet}, itemsep=1pt, parsep=0pt, topsep=2pt]'

function bullets(items: string[]): string {
  if (items.length === 0) return ''
  return [ITEMIZE_OPEN, ...items.map((b) => `    \\item ${richText(b)}`), '\\end{itemize}'].join('\n')
}

export function renderResumeTex(content: ResumeContent): string {
  const { basics } = content
  const out: string[] = [PREAMBLE, '\\begin{document}', '\\pagestyle{empty}', '']

  out.push(`\\resumeName{${escapeLatex(basics.name)}}`, '\\vspace{2pt}', '')

  // Contact line: phone | mailto-email | location | links…
  const contact: string[] = []
  if (basics.phone) contact.push(escapeLatex(basics.phone))
  if (basics.email) contact.push(`\\href{mailto:${basics.email}}{${escapeLatex(basics.email)}}`)
  if (basics.location) contact.push(escapeLatex(basics.location))
  for (const l of basics.links) contact.push(`\\href{${ensureHttp(l.url)}}{${escapeLatex(l.url)}}`)
  if (contact.length) {
    out.push(`{\\centering \\small ${contact.join(' \\hspace{6pt}|\\hspace{6pt} ')} \\par}`, '\\vspace{8pt}', '')
  }

  if (content.summary.trim()) {
    out.push('\\section{Professional Summary}', richText(content.summary), '')
  }

  if (content.experience.length) {
    out.push('\\section{Experience}', '')
    for (const e of content.experience) {
      out.push(`\\noindent\\textbf{${escapeLatex(e.company)}} \\hfill ${escapeLatex(e.date)} \\\\`)
      out.push(escapeLatex(e.title))
      const b = bullets(e.bullets)
      if (b) out.push(b)
      out.push('')
    }
  }

  if (content.projects.length) {
    out.push('\\section{Projects}', '')
    for (const p of content.projects) {
      const right = p.tagline ? ` \\hfill \\textit{${escapeLatex(p.tagline)}}` : ''
      out.push(`\\noindent\\textbf{${escapeLatex(p.name)}}${right} \\\\`)
      if (p.url) out.push(`\\href{${ensureHttp(p.url)}}{${escapeLatex(p.url)}}`)
      const b = bullets(p.bullets)
      if (b) out.push(b)
      out.push('')
    }
  }

  if (content.skills.length) {
    out.push('\\section{Skills}', '\\vspace{2pt}')
    for (const s of content.skills) {
      out.push(`\\noindent\\textbf{${escapeLatex(s.category)}:} ${s.items.map(escapeLatex).join(', ')} \\\\`)
    }
    out.push('')
  }

  if (content.education.length) {
    out.push('\\section{Education}', '')
    for (const e of content.education) {
      const period = e.period ? ` (${escapeLatex(e.period)})` : ''
      out.push(`\\noindent\\textbf{${escapeLatex(e.degree)},} ${escapeLatex(e.institution)}${period} \\\\`)
    }
    out.push('')
  }

  out.push('\\end{document}', '')
  return out.join('\n')
}
```

- [ ] **Step 4: Run → PASS.** (If an assertion fails, fix the deriver — the test encodes the contract, do not weaken it.)

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/resumes/resume-tex.ts backend-express/src/modules/resumes/resume-tex.test.ts
git commit -m "feat(slice-6b): .tex deriver (LaTeX-escape + **bold**, golden-tested vs template)"
```

---

### Task 4: Résumé generation prompt

**Files:** Modify `backend-express/src/modules/ai/ai.prompts.ts` · Test `…/ai.prompts.test.ts` (append)

- [ ] **Step 1: Failing test** — append to `ai.prompts.test.ts`:

```typescript
import { buildResumePrompt } from './ai.prompts.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const BG: ResumeContent = { basics: { name: 'A', links: [] }, summary: 's', experience: [], projects: [], skills: [], education: [] }

describe('buildResumePrompt', () => {
  it('embeds the background and asks for the ResumeContent JSON', () => {
    const p = buildResumePrompt(BG, null)
    expect(p).toContain('"name":"A"')
    expect(p).toMatch(/JSON/i)
    expect(p).toMatch(/double asterisks/i)
  })
  it('includes the job when tailoring, and instructions', () => {
    const p = buildResumePrompt(BG, { title: 'Backend Engineer', company: 'Acme', snapshot: 'Go + k8s' }, 'emphasize leadership')
    expect(p).toContain('Backend Engineer')
    expect(p).toContain('Acme')
    expect(p).toContain('Go + k8s')
    expect(p).toContain('emphasize leadership')
  })
  it('never invents facts (guardrail present)', () => {
    expect(buildResumePrompt(BG, null)).toMatch(/do not invent|truthful/i)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — append to `ai.prompts.ts` (reuse the existing `SCHEMA_GUIDE`; import `ResumeContent`):

```typescript
import type { ResumeContent } from '@/shared/resume-content.schema.js'

export function buildResumePrompt(
  background: ResumeContent,
  job: { title: string; company: string; snapshot?: string | null } | null,
  instructions?: string,
): string {
  const parts: string[] = [
    'You are an expert résumé writer. Produce a polished, ATS-clean résumé as structured JSON from the candidate background below.',
    SCHEMA_GUIDE,
    `CANDIDATE BACKGROUND (authoritative facts):\n${JSON.stringify(background)}`,
  ]
  if (job) {
    parts.push(
      `TAILOR FOR THIS JOB — reorder and emphasize the most relevant experience, projects, skills, and keywords:\nTitle: ${job.title}\nCompany: ${job.company}${job.snapshot ? `\nDescription:\n${job.snapshot}` : ''}`,
    )
  }
  if (instructions) parts.push(`EXTRA INSTRUCTIONS:\n${instructions}`)
  parts.push('Stay truthful to the background — do not invent employers, titles, dates, or degrees. Reword and prioritize for impact only.')
  return parts.join('\n\n')
}
```

> Note: `ai.prompts.ts` already imports `PersonaInputs`; add the `ResumeContent` import at the top with the others.

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/ai/ai.prompts.ts backend-express/src/modules/ai/ai.prompts.test.ts
git commit -m "feat(slice-6b): résumé generation prompt (persona + optional job + instructions)"
```

---

### Task 5: DB-derived rate limit

**Files:** Create `backend-express/src/modules/ai/ai-usage.repository.ts`, `…/ai.rate-limit.ts` · Test `…/ai.rate-limit.test.ts`

- [ ] **Step 1: Failing test** — `ai.rate-limit.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./ai-usage.repository.js', () => ({ aiUsageRepository: { countRecentGenerations: vi.fn() } }))
import { aiUsageRepository } from './ai-usage.repository.js'
import { assertWithinRateLimit } from './ai.rate-limit.js'

const usage = vi.mocked(aiUsageRepository)
beforeEach(() => {
  vi.clearAllMocks()
  process.env['DATABASE_URL'] = 'postgres://u:p@localhost:5432/db'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['AI_RATE_LIMIT_PER_HOUR'] = '2'
})

describe('assertWithinRateLimit', () => {
  it('passes under the limit', async () => {
    usage.countRecentGenerations.mockResolvedValue(1)
    await expect(assertWithinRateLimit('u1')).resolves.toBeUndefined()
  })
  it('throws RATE_LIMITED at/over the limit', async () => {
    usage.countRecentGenerations.mockResolvedValue(2)
    await expect(assertWithinRateLimit('u1')).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — `ai-usage.repository.ts`:

```typescript
import { and, eq, gte, count } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'

// Counts a user's AI generations since `since`. 6b counts résumés; 6c will also
// add cover_letters here so the hourly limit is shared across both.
async function countRecentGenerations(userId: string, since: Date): Promise<number> {
  const rows = await getDb()
    .select({ value: count() })
    .from(generatedResumes)
    .where(and(eq(generatedResumes.userId, userId), gte(generatedResumes.createdAt, since)))
  return rows[0]?.value ?? 0
}

export const aiUsageRepository = { countRecentGenerations }
```

`ai.rate-limit.ts`:

```typescript
import { getEnv } from '@/config/env.js'
import { AppError } from '@/shared/errors.js'
import { aiUsageRepository } from './ai-usage.repository.js'

export async function assertWithinRateLimit(userId: string): Promise<void> {
  const limit = getEnv().AI_RATE_LIMIT_PER_HOUR
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const used = await aiUsageRepository.countRecentGenerations(userId, since)
  if (used >= limit) {
    throw new AppError('RATE_LIMITED', `AI generation limit reached (${limit}/hour). Please try again later.`)
  }
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/ai/ai-usage.repository.ts backend-express/src/modules/ai/ai.rate-limit.ts backend-express/src/modules/ai/ai.rate-limit.test.ts
git commit -m "feat(slice-6b): DB-derived hourly AI rate limit"
```

---

### Task 6: Résumés repository (real-DB tested)

**Files:** Create `backend-express/src/modules/resumes/resumes.repository.ts` · Test `…/resumes.repository.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { personas } from '@/db/schema/personas.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'
import { resumesRepository } from './resumes.repository.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const EMAIL = `resumes-repo-${Date.now()}@example.com`
let userId: string
let personaId: string
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  userId = (await getDb().insert(users).values({ name: 'R', email: EMAIL, passwordHash: 'h' }).returning())[0]!.id
  personaId = (await getDb().insert(personas).values({ userId, name: 'Backend', data: C }).returning())[0]!.id
})
afterAll(async () => {
  await getDb().delete(generatedResumes).where(eq(generatedResumes.userId, userId))
  await getDb().delete(personas).where(eq(personas.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('resumesRepository (real DB)', () => {
  it('creates, lists, finds, updates and removes (user-scoped)', async () => {
    const r = await resumesRepository.create({ userId, personaId, jobId: null, title: 'T', instructions: null, content: C })
    expect(r.title).toBe('T')
    expect(await resumesRepository.listForUser(userId)).toHaveLength(1)
    expect(await resumesRepository.findById(userId, r.id)).not.toBeNull()
    expect(await resumesRepository.findById('other', r.id)).toBeNull()
    const u = await resumesRepository.update(userId, r.id, { title: 'T2' })
    expect(u?.title).toBe('T2')
    expect(await resumesRepository.remove(userId, r.id)).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL** (needs Docker Postgres + migration `0005`).

- [ ] **Step 3: Implement** — `resumes.repository.ts`:

```typescript
import { and, eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { generatedResumes, type GeneratedResumeRow, type NewGeneratedResumeRow } from '@/db/schema/generated-resumes.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

async function create(values: NewGeneratedResumeRow): Promise<GeneratedResumeRow> {
  const rows = await getDb().insert(generatedResumes).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function listForUser(userId: string, jobId?: string): Promise<GeneratedResumeRow[]> {
  const where = jobId
    ? and(eq(generatedResumes.userId, userId), eq(generatedResumes.jobId, jobId))
    : eq(generatedResumes.userId, userId)
  return getDb().select().from(generatedResumes).where(where).orderBy(desc(generatedResumes.createdAt))
}

async function findById(userId: string, id: string): Promise<GeneratedResumeRow | null> {
  const rows = await getDb()
    .select()
    .from(generatedResumes)
    .where(and(eq(generatedResumes.id, id), eq(generatedResumes.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(
  userId: string,
  id: string,
  patch: { title?: string; content?: ResumeContent },
): Promise<GeneratedResumeRow | null> {
  const set: Partial<NewGeneratedResumeRow> = { updatedAt: new Date() }
  if (patch.title !== undefined) set.title = patch.title
  if (patch.content !== undefined) set.content = patch.content
  const rows = await getDb()
    .update(generatedResumes)
    .set(set)
    .where(and(eq(generatedResumes.id, id), eq(generatedResumes.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(generatedResumes)
    .where(and(eq(generatedResumes.id, id), eq(generatedResumes.userId, userId)))
    .returning({ id: generatedResumes.id })
  return rows.length > 0
}

export const resumesRepository = { create, listForUser, findById, update, remove }
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/resumes/resumes.repository.ts backend-express/src/modules/resumes/resumes.repository.test.ts
git commit -m "feat(slice-6b): résumés repository (user-scoped CRUD + job filter)"
```

---

### Task 7: Résumés service

**Files:** Create `backend-express/src/modules/resumes/resumes.service.ts` · Test `…/resumes.service.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./resumes.repository.js', () => ({
  resumesRepository: { create: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled: vi.fn(() => true), generateStructured: vi.fn() } }))
vi.mock('@/modules/ai/ai.rate-limit.js', () => ({ assertWithinRateLimit: vi.fn() }))

import { resumesRepository } from './resumes.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { resumesService } from './resumes.service.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const repo = vi.mocked(resumesRepository)
const personas = vi.mocked(personasRepository)
const jobs = vi.mocked(jobsRepository)
const ai = vi.mocked(geminiService)
const rl = vi.mocked(assertWithinRateLimit)
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const persona = { id: 'p1', userId: 'u1', name: 'Backend', data: C, rawInput: null, createdAt: new Date(), updatedAt: new Date() }
const resumeRow = { id: 'res1', userId: 'u1', personaId: 'p1', jobId: null, title: 'Backend', instructions: null, content: C, createdAt: new Date(), updatedAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
  ai.isAiEnabled.mockReturnValue(true)
  rl.mockResolvedValue(undefined)
})

describe('resumesService.generate', () => {
  it('503s when AI disabled', async () => {
    ai.isAiEnabled.mockReturnValue(false)
    await expect(resumesService.generate('u1', { personaId: 'p1' })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })
  it('NOT_FOUND when the persona is not owned', async () => {
    personas.findById.mockResolvedValue(null)
    await expect(resumesService.generate('u1', { personaId: 'pX' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('NOT_FOUND when a jobId is given but not owned', async () => {
    personas.findById.mockResolvedValue(persona)
    jobs.findById.mockResolvedValue(null)
    await expect(resumesService.generate('u1', { personaId: 'p1', jobId: 'jX' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('persona-only: rate-limits, generates, saves with persona-name title', async () => {
    personas.findById.mockResolvedValue(persona)
    ai.generateStructured.mockResolvedValue(C)
    repo.create.mockResolvedValue(resumeRow)
    const out = await resumesService.generate('u1', { personaId: 'p1' })
    expect(rl).toHaveBeenCalledWith('u1')
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', personaId: 'p1', jobId: null, title: 'Backend', content: C }))
    expect(out.id).toBe('res1')
  })
})

describe('resumesService.getTex', () => {
  it('derives .tex from a saved résumé', async () => {
    repo.findById.mockResolvedValue(resumeRow)
    const tex = await resumesService.getTex('u1', 'res1')
    expect(tex).toContain('\\documentclass')
  })
  it('NOT_FOUND on a missing résumé', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(resumesService.getTex('u1', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — `resumes.service.ts`:

```typescript
import { AppError } from '@/shared/errors.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { buildResumePrompt } from '@/modules/ai/ai.prompts.js'
import { ResumeContentSchema } from '@/shared/resume-content.schema.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { resumesRepository } from './resumes.repository.js'
import { renderResumeTex } from './resume-tex.js'
import type { GeneratedResumeRow } from '@/db/schema/generated-resumes.js'
import type { GenerateResumeInput, UpdateResumeInput } from './resumes.schema.js'

async function generate(userId: string, input: GenerateResumeInput): Promise<GeneratedResumeRow> {
  if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')
  await assertWithinRateLimit(userId)

  const persona = await personasRepository.findById(userId, input.personaId)
  if (!persona) throw new AppError('NOT_FOUND', 'Persona not found')

  let job: { title: string; company: string; snapshot?: string | null } | null = null
  let jobId: string | null = null
  if (input.jobId) {
    const j = await jobsRepository.findById(userId, input.jobId)
    if (!j) throw new AppError('NOT_FOUND', 'Job not found')
    job = { title: j.title, company: j.company, snapshot: j.snapshotMarkdown }
    jobId = j.id
  }

  const content = await geminiService.generateStructured(
    buildResumePrompt(persona.data, job, input.instructions),
    ResumeContentSchema,
  )
  const title = job ? `${job.title} — ${job.company}` : persona.name
  return resumesRepository.create({
    userId,
    personaId: input.personaId,
    jobId,
    title,
    instructions: input.instructions ?? null,
    content,
  })
}

async function list(userId: string, jobId?: string): Promise<GeneratedResumeRow[]> {
  return resumesRepository.listForUser(userId, jobId)
}

async function get(userId: string, id: string): Promise<GeneratedResumeRow> {
  const r = await resumesRepository.findById(userId, id)
  if (!r) throw new AppError('NOT_FOUND', 'Résumé not found')
  return r
}

async function getTex(userId: string, id: string): Promise<string> {
  const r = await get(userId, id)
  return renderResumeTex(r.content)
}

async function update(userId: string, id: string, input: UpdateResumeInput): Promise<GeneratedResumeRow> {
  const patch: { title?: string; content?: GeneratedResumeRow['content'] } = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.content !== undefined) patch.content = input.content
  const updated = await resumesRepository.update(userId, id, patch)
  if (!updated) throw new AppError('NOT_FOUND', 'Résumé not found')
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await resumesRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Résumé not found')
  return { id }
}

export const resumesService = { generate, list, get, getTex, update, remove }
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/resumes/resumes.service.ts backend-express/src/modules/resumes/resumes.service.test.ts
git commit -m "feat(slice-6b): résumés service (generate [rate-limited, ownership] + CRUD + getTex)"
```

---

### Task 8: Résumés controller + router + wiring

**Files:** Create `…/resumes.controller.ts`, `…/resumes.router.ts` · Modify `src/shared/api-router.ts` · Test `…/resumes.router.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { GeneratedResumeRow } from '@/db/schema/generated-resumes.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

vi.mock('./resumes.repository.js', () => ({
  resumesRepository: { create: vi.fn(), listForUser: vi.fn(), findById: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled: vi.fn(() => true), generateStructured: vi.fn() } }))
vi.mock('@/modules/ai/ai-usage.repository.js', () => ({ aiUsageRepository: { countRecentGenerations: vi.fn().mockResolvedValue(0) } }))

import { resumesRepository } from './resumes.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'

const repo = vi.mocked(resumesRepository)
const personas = vi.mocked(personasRepository)
const ai = vi.mocked(geminiService)
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
function row(over: Partial<GeneratedResumeRow> = {}): GeneratedResumeRow {
  return { id: 'res1', userId: 'u1', personaId: 'p1', jobId: null, title: 'Backend', instructions: null, content: C, createdAt: new Date(), updatedAt: new Date(), ...over }
}
const persona = { id: 'p1', userId: 'u1', name: 'Backend', data: C, rawInput: null, createdAt: new Date(), updatedAt: new Date() }
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

describe('resumes routes', () => {
  it('401 without cookie', async () => { expect((await request(app).get('/api/resumes')).status).toBe(401) })
  it('generates (201)', async () => {
    personas.findById.mockResolvedValue(persona)
    ai.generateStructured.mockResolvedValue(C)
    repo.create.mockResolvedValue(row())
    const res = await request(app).post('/api/resumes').set('Cookie', [cookie]).send({ personaId: '11111111-1111-1111-1111-111111111111' })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('res1')
  })
  it('400 on a missing personaId', async () => {
    const res = await request(app).post('/api/resumes').set('Cookie', [cookie]).send({})
    expect(res.status).toBe(400)
  })
  it('lists', async () => {
    repo.listForUser.mockResolvedValue([row()])
    const res = await request(app).get('/api/resumes').set('Cookie', [cookie])
    expect(res.status).toBe(200); expect(res.body.data).toHaveLength(1)
  })
  it('gets the .tex', async () => {
    repo.findById.mockResolvedValue(row())
    const res = await request(app).get('/api/resumes/res1/tex').set('Cookie', [cookie])
    expect(res.status).toBe(200); expect(res.body.data.tex).toContain('\\documentclass')
  })
  it('patches', async () => {
    repo.update.mockResolvedValue(row({ title: 'X' }))
    const res = await request(app).patch('/api/resumes/res1').set('Cookie', [cookie]).send({ title: 'X' })
    expect(res.status).toBe(200); expect(res.body.data.title).toBe('X')
  })
  it('404 patching missing', async () => {
    repo.update.mockResolvedValue(null)
    const res = await request(app).patch('/api/resumes/x').set('Cookie', [cookie]).send({ title: 'X' })
    expect(res.status).toBe(404)
  })
  it('deletes (204)', async () => {
    repo.remove.mockResolvedValue(true)
    expect((await request(app).delete('/api/resumes/res1').set('Cookie', [cookie])).status).toBe(204)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement controller** — `resumes.controller.ts`:

```typescript
import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { resumesService } from './resumes.service.js'
import type { GenerateResumeInput, UpdateResumeInput, ResumeQuery } from './resumes.schema.js'

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
  const r = await resumesService.generate(requireUserId(req), req.body as GenerateResumeInput)
  res.status(201).json({ data: r })
}
async function list(req: Request, res: Response): Promise<void> {
  const { jobId } = req.query as ResumeQuery
  res.status(200).json({ data: await resumesService.list(requireUserId(req), jobId) })
}
async function get(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await resumesService.get(requireUserId(req), paramValue(req, 'id')) })
}
async function tex(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: { tex: await resumesService.getTex(requireUserId(req), paramValue(req, 'id')) } })
}
async function update(req: Request, res: Response): Promise<void> {
  const r = await resumesService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdateResumeInput)
  res.status(200).json({ data: r })
}
async function remove(req: Request, res: Response): Promise<void> {
  await resumesService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(204).end()
}

export const resumesController = { generate, list, get, tex, update, remove }
```

`resumes.router.ts`:

```typescript
import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { resumesController } from './resumes.controller.js'
import { GenerateResumeSchema, UpdateResumeSchema, ResumeQuerySchema } from './resumes.schema.js'

const router = Router()
router.use(authMiddleware)
router.post('/', validate(GenerateResumeSchema), asyncHandler(resumesController.generate))
router.get('/', validate(ResumeQuerySchema, 'query'), asyncHandler(resumesController.list))
router.get('/:id/tex', asyncHandler(resumesController.tex))
router.get('/:id', asyncHandler(resumesController.get))
router.patch('/:id', validate(UpdateResumeSchema), asyncHandler(resumesController.update))
router.delete('/:id', asyncHandler(resumesController.remove))

export { router as resumesRouter }
```

Modify `src/shared/api-router.ts` — import + mount:

```typescript
import { resumesRouter } from '@/modules/resumes/resumes.router.js'
// …
router.use('/resumes', resumesRouter)
```

> Route order: `/:id/tex` is declared **before** `/:id` so the literal `tex` segment is matched first.

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add backend-express/src/modules/resumes/resumes.controller.ts backend-express/src/modules/resumes/resumes.router.ts backend-express/src/shared/api-router.ts backend-express/src/modules/resumes/resumes.router.test.ts
git commit -m "feat(slice-6b): résumés controller + router under /api/resumes"
```

---

### Task 9: Backend gate

- [ ] **Step 1:** Run `cd backend-express && npm run typecheck && npm run lint && npm run test` (Postgres up). All green; fix failures.
- [ ] **Step 2:** `git add -A backend-express && git commit -m "chore(slice-6b): backend gate green" || echo "nothing to commit"`

---

## FRONTEND

### Task 10: `@react-pdf/renderer` + types + query keys + shared markup

**Files:** Modify `frontend-next/package.json` · `src/types/resume.ts` · `src/lib/query-keys.ts` · Create `src/lib/resume-markup.ts` (+ test)

- [ ] **Step 1: Install** — Run: `cd frontend-next && npm install @react-pdf/renderer@^4.0.0`

- [ ] **Step 2: Types** — append to `src/types/resume.ts`:

```typescript
export interface GeneratedResume {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  personaId: string
  jobId: string | null
  title: string | null
  instructions: string | null
  content: ResumeContent
}
```

- [ ] **Step 3: Query keys** — append to `src/lib/query-keys.ts`:

```typescript
export const RESUMES_KEY = ['resumes'] as const
export const resumeKey = (id: string) => ['resumes', id] as const
export const resumesByJobKey = (jobId: string) => ['resumes', 'job', jobId] as const
```

- [ ] **Step 4: Failing test** — `src/lib/resume-markup.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { splitBold } from './resume-markup'

describe('splitBold', () => {
  it('splits **bold** runs', () => {
    expect(splitBold('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ])
  })
  it('returns a single plain run when no markup', () => {
    expect(splitBold('plain')).toEqual([{ text: 'plain', bold: false }])
  })
})
```

- [ ] **Step 5: Run → FAIL.** `npx vitest run src/lib/resume-markup.test.ts`

- [ ] **Step 6: Implement** — `src/lib/resume-markup.ts`:

```typescript
export interface TextRun {
  text: string
  bold: boolean
}

/** Split text into runs on **bold** markup (assumes balanced **). */
export function splitBold(s: string): TextRun[] {
  return s
    .split('**')
    .map((text, i) => ({ text, bold: i % 2 === 1 }))
    .filter((r) => r.text.length > 0)
}
```

- [ ] **Step 7: Run → PASS.**

- [ ] **Step 8: Commit**

```bash
git add frontend-next/package.json frontend-next/package-lock.json frontend-next/src/types/resume.ts frontend-next/src/lib/query-keys.ts frontend-next/src/lib/resume-markup.ts frontend-next/src/lib/resume-markup.test.ts
git commit -m "feat(slice-6b): @react-pdf/renderer dep + résumé types/keys + splitBold helper"
```

---

### Task 11: `ResumeDocument` (react-pdf)

**Files:** Create `frontend-next/src/components/resume/resume-document.tsx` · Test `…/resume-document.test.tsx`

react-pdf components don't render to the DOM, so the test asserts the component is a function and that a representative element tree builds without throwing (plus `splitBold` covers the bold logic).

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import type { ResumeContent } from '@/types/resume'
import { ResumeDocument } from './resume-document'

const C: ResumeContent = {
  basics: { name: 'Kartick', email: 'k@x.com', links: [{ label: 'GitHub', url: 'github.com/x' }] },
  summary: 'Backend **engineer**.',
  experience: [{ company: 'Weloin', title: 'SWE', date: '2024', bullets: ['Built **CI/CD**'] }],
  projects: [{ name: 'MaxFlow', tagline: 'SaaS', bullets: ['NATS'] }],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  education: [{ degree: 'MCA', institution: 'Brainware', period: '2022-2024' }],
}

describe('ResumeDocument', () => {
  it('is a component that builds an element tree without throwing', () => {
    expect(typeof ResumeDocument).toBe('function')
    expect(() => createElement(ResumeDocument, { content: C })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — `resume-document.tsx`. Uses react-pdf's built-in `Helvetica`/`Helvetica-Bold` (no font registration). Mirrors the `.tex`: centered name, contact line, blue section rules, entries, `**bold**` runs.

```tsx
import { Document, Page, View, Text, Link, StyleSheet } from '@react-pdf/renderer'
import type { ResumeContent } from '@/types/resume'
import { splitBold } from '@/lib/resume-markup'

const RULE = '#2B6CB0'
const s = StyleSheet.create({
  page: { paddingVertical: 29, paddingHorizontal: 36, fontFamily: 'Helvetica', fontSize: 9.5, color: '#000', lineHeight: 1.3 },
  name: { fontFamily: 'Helvetica-Bold', fontSize: 22, textAlign: 'center' },
  contact: { textAlign: 'center', fontSize: 8.5, marginTop: 3, marginBottom: 8, color: '#222' },
  link: { color: '#0645AD', textDecoration: 'none' },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginTop: 8, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: RULE },
  para: { marginTop: 3 },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  title: { marginTop: 1 },
  bullet: { flexDirection: 'row', marginTop: 1, paddingLeft: 4 },
  bulletDot: { width: 8 },
  bulletText: { flex: 1 },
  skillLine: { marginTop: 2 },
})

function Rich({ text, base }: { text: string; base?: object }) {
  return (
    <Text style={base}>
      {splitBold(text).map((run, i) => (
        <Text key={i} style={run.bold ? s.bold : undefined}>
          {run.text}
        </Text>
      ))}
    </Text>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((b, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <View style={s.bulletText}>
            <Rich text={b} />
          </View>
        </View>
      ))}
    </View>
  )
}

export function ResumeDocument({ content }: { content: ResumeContent }) {
  const { basics } = content
  const contact: React.ReactNode[] = []
  const push = (node: React.ReactNode) => {
    if (contact.length) contact.push(<Text key={`sep${contact.length}`}>{'  |  '}</Text>)
    contact.push(node)
  }
  if (basics.phone) push(<Text key="phone">{basics.phone}</Text>)
  if (basics.email) push(<Link key="email" style={s.link} src={`mailto:${basics.email}`}>{basics.email}</Link>)
  if (basics.location) push(<Text key="loc">{basics.location}</Text>)
  basics.links.forEach((l, i) =>
    push(<Link key={`l${i}`} style={s.link} src={/^https?:\/\//i.test(l.url) ? l.url : `https://${l.url}`}>{l.url}</Link>),
  )

  return (
    <Document title="Resume">
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{basics.name}</Text>
        {contact.length > 0 && <Text style={s.contact}>{contact}</Text>}

        {content.summary.trim() !== '' && (
          <View>
            <Text style={s.sectionTitle}>Professional Summary</Text>
            <Rich text={content.summary} base={s.para} />
          </View>
        )}

        {content.experience.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Experience</Text>
            {content.experience.map((e, i) => (
              <View key={i}>
                <View style={s.entryHead}>
                  <Text style={s.bold}>{e.company}</Text>
                  <Text>{e.date}</Text>
                </View>
                <Text style={s.title}>{e.title}</Text>
                <Bullets items={e.bullets} />
              </View>
            ))}
          </View>
        )}

        {content.projects.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Projects</Text>
            {content.projects.map((p, i) => (
              <View key={i}>
                <View style={s.entryHead}>
                  <Text style={s.bold}>{p.name}</Text>
                  {p.tagline ? <Text style={s.italic}>{p.tagline}</Text> : <Text />}
                </View>
                <Bullets items={p.bullets} />
              </View>
            ))}
          </View>
        )}

        {content.skills.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Skills</Text>
            {content.skills.map((g, i) => (
              <Text key={i} style={s.skillLine}>
                <Text style={s.bold}>{g.category}: </Text>
                {g.items.join(', ')}
              </Text>
            ))}
          </View>
        )}

        {content.education.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Education</Text>
            {content.education.map((e, i) => (
              <Text key={i} style={s.skillLine}>
                <Text style={s.bold}>{e.degree}, </Text>
                {e.institution}
                {e.period ? ` (${e.period})` : ''}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
```

> If vitest can't resolve `@react-pdf/renderer` in jsdom, add `import 'react'` types only — the test just builds the element, it does not render a PDF. Do **not** add a heavy `pdf()` call in the test.

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/resume/resume-document.tsx frontend-next/src/components/resume/resume-document.test.tsx
git commit -m "feat(slice-6b): react-pdf ResumeDocument (mirrors the .tex template)"
```

---

### Task 12: Extend `ResumeContentEditor` to the full schema

**Files:** Modify `frontend-next/src/components/resume/resume-content-editor.tsx` · Modify `…/resume-content-editor.test.tsx`

Add **Projects** (name/tagline/url + bullets, add/remove bullet, remove entry), **Skills** (category + comma items, remove group), **Education** (degree/institution/period, remove entry), and **Basics links**, mirroring the existing Experience section's controlled-update pattern.

- [ ] **Step 1: Add failing tests** — append to `resume-content-editor.test.tsx` (reuse the `DATA`/`lastChange` already in the file; ensure `DATA` has a project, a skill group and an education entry — extend the fixture if needed):

```typescript
  it('edits a skill group category', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText(/skill group 1 category/i), 'X')
    const next = lastChange(onChange)
    expect(next.skills[0]!.category.length).toBeGreaterThan(DATA.skills[0]!.category.length)
  })

  it('removes a project entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /remove project 1/i }))
    expect(lastChange(onChange).projects).toHaveLength(DATA.projects.length - 1)
  })

  it('removes an education entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /remove education 1/i }))
    expect(lastChange(onChange).education).toHaveLength(DATA.education.length - 1)
  })
```

If the test file's `DATA` lacks projects/skills/education, update it to include one of each (e.g. `projects: [{ name: 'MaxFlow', tagline: 'SaaS', bullets: ['NATS'] }]`, `skills: [{ category: 'Languages', items: ['TypeScript'] }]`, `education: [{ degree: 'MCA', institution: 'Brainware', period: '2022-2024' }]`).

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — extend the component. Inside `ResumeContentEditor`, after the Experience `<section>`, add Projects, Skills, Education sections using the same controlled helpers. Add these section helpers + JSX (mirrors Experience):

```tsx
  // ---- Projects ----
  const setProject = (i: number, partial: Partial<ResumeContent['projects'][number]>) =>
    patch({ projects: value.projects.map((p, idx) => (idx === i ? { ...p, ...partial } : p)) })
  const addProjectBullet = (i: number) => setProject(i, { bullets: [...value.projects[i]!.bullets, ''] })
  const setProjectBullet = (i: number, b: number, text: string) =>
    setProject(i, { bullets: value.projects[i]!.bullets.map((x, idx) => (idx === b ? text : x)) })
  const removeProjectBullet = (i: number, b: number) =>
    setProject(i, { bullets: value.projects[i]!.bullets.filter((_, idx) => idx !== b) })
  const removeProject = (i: number) => patch({ projects: value.projects.filter((_, idx) => idx !== i) })

  // ---- Skills ----
  const setSkill = (i: number, partial: Partial<ResumeContent['skills'][number]>) =>
    patch({ skills: value.skills.map((g, idx) => (idx === i ? { ...g, ...partial } : g)) })
  const removeSkill = (i: number) => patch({ skills: value.skills.filter((_, idx) => idx !== i) })

  // ---- Education ----
  const setEducation = (i: number, partial: Partial<ResumeContent['education'][number]>) =>
    patch({ education: value.education.map((e, idx) => (idx === i ? { ...e, ...partial } : e)) })
  const removeEducation = (i: number) => patch({ education: value.education.filter((_, idx) => idx !== i) })
```

JSX appended after the Experience section (before the closing `</div>`):

```tsx
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Projects</h3>
        {value.projects.map((p, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input aria-label={`Project ${i + 1} name`} value={p.name} onChange={(e) => setProject(i, { name: e.target.value })} />
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove project ${i + 1}`} onClick={() => removeProject(i)}>Remove</Button>
            </div>
            <Input aria-label={`Project ${i + 1} tagline`} value={p.tagline ?? ''} onChange={(e) => setProject(i, { tagline: e.target.value })} />
            <ul className="space-y-1">
              {p.bullets.map((b, bi) => (
                <li key={bi} className="flex items-center gap-2">
                  <Input aria-label={`Project ${i + 1} bullet ${bi + 1}`} value={b} onChange={(e) => setProjectBullet(i, bi, e.target.value)} />
                  <Button type="button" variant="ghost" size="sm" aria-label={`Remove project ${i + 1} bullet ${bi + 1}`} onClick={() => removeProjectBullet(i, bi)}>✕</Button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" size="sm" onClick={() => addProjectBullet(i)}>Add bullet</Button>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Skills</h3>
        {value.skills.map((g, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input aria-label={`Skill group ${i + 1} category`} value={g.category} onChange={(e) => setSkill(i, { category: e.target.value })} />
            <Input
              aria-label={`Skill group ${i + 1} items`}
              value={g.items.join(', ')}
              onChange={(e) => setSkill(i, { items: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
            />
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove skill group ${i + 1}`} onClick={() => removeSkill(i)}>Remove</Button>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Education</h3>
        {value.education.map((e, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input aria-label={`Education ${i + 1} degree`} value={e.degree} onChange={(ev) => setEducation(i, { degree: ev.target.value })} />
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove education ${i + 1}`} onClick={() => removeEducation(i)}>Remove</Button>
            </div>
            <Input aria-label={`Education ${i + 1} institution`} value={e.institution} onChange={(ev) => setEducation(i, { institution: ev.target.value })} />
            <Input aria-label={`Education ${i + 1} period`} value={e.period ?? ''} onChange={(ev) => setEducation(i, { period: ev.target.value })} />
          </div>
        ))}
      </section>
```

- [ ] **Step 4: Run → PASS** (full editor test file).

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/resume/resume-content-editor.tsx frontend-next/src/components/resume/resume-content-editor.test.tsx
git commit -m "feat(slice-6b): extend ResumeContentEditor to projects/skills/education"
```

---

### Task 13: `useResumes` hooks

**Files:** Create `frontend-next/src/hooks/use-resumes.ts` · Test `…/use-resumes.test.tsx`

- [ ] **Step 1: Failing test**

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
import { useResumes, useGenerateResume, useUpdateResume, useDeleteResume } from './use-resumes'
import { RESUMES_KEY } from '@/lib/query-keys'

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

describe('use-resumes', () => {
  it('lists (optionally by job)', async () => {
    api.get.mockResolvedValue([{ id: 'res1' }])
    const { result } = renderHook(() => useResumes('job1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/resumes?jobId=job1')
  })
  it('generate posts and invalidates', async () => {
    api.post.mockResolvedValue({ id: 'res1' })
    const { W, invalidate } = spied()
    const { result } = renderHook(() => useGenerateResume(), { wrapper: W })
    result.current.mutate({ personaId: 'p1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/resumes', { personaId: 'p1' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: RESUMES_KEY })
  })
  it('update patches by id', async () => {
    api.patch.mockResolvedValue({ id: 'res1' })
    const { result } = renderHook(() => useUpdateResume('res1'), { wrapper })
    result.current.mutate({ title: 'X' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/resumes/res1', { title: 'X' })
  })
  it('delete by id', async () => {
    api.delete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteResume(), { wrapper })
    result.current.mutate('res1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/resumes/res1')
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — `use-resumes.ts`:

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { RESUMES_KEY, resumesByJobKey } from '@/lib/query-keys'
import type { GeneratedResume, ResumeContent } from '@/types/resume'

interface GenerateBody {
  personaId: string
  jobId?: string
  instructions?: string
}

export function useResumes(jobId?: string, initialData?: GeneratedResume[]) {
  return useQuery({
    queryKey: jobId ? resumesByJobKey(jobId) : RESUMES_KEY,
    queryFn: () => apiClient.get<GeneratedResume[]>(`/api/resumes${jobId ? `?jobId=${jobId}` : ''}`),
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}

export function useGenerateResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: GenerateBody) => apiClient.post<GeneratedResume>('/api/resumes', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RESUMES_KEY }),
  })
}

export function useUpdateResume(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { title?: string; content?: ResumeContent }) =>
      apiClient.patch<GeneratedResume>(`/api/resumes/${id}`, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RESUMES_KEY }),
  })
}

export function useDeleteResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/resumes/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RESUMES_KEY }),
  })
}

export function fetchResumeTex(id: string): Promise<{ tex: string }> {
  return apiClient.get<{ tex: string }>(`/api/resumes/${id}/tex`)
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/hooks/use-resumes.ts frontend-next/src/hooks/use-resumes.test.tsx
git commit -m "feat(slice-6b): useResumes hooks (generate/list/update/delete + tex)"
```

---

### Task 14: Output bar (Copy LaTeX · Open in Overleaf · Download PDF) + preview

**Files:** Create `frontend-next/src/components/resume/resume-preview.tsx`, `…/resume-output-bar.tsx` · Test `…/resume-output-bar.test.tsx`

- [ ] **Step 1: Failing test** (the bar; PDFViewer is not unit-tested)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/hooks/use-resumes', () => ({ fetchResumeTex: vi.fn() }))
import { fetchResumeTex } from '@/hooks/use-resumes'
import { ResumeOutputBar } from './resume-output-bar'

const writeText = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(navigator, { clipboard: { writeText } })
})

describe('ResumeOutputBar', () => {
  it('copies the derived .tex to the clipboard', async () => {
    vi.mocked(fetchResumeTex).mockResolvedValue({ tex: '\\documentclass...' })
    render(<ResumeOutputBar resumeId="res1" />)
    await userEvent.click(screen.getByRole('button', { name: /copy latex/i }))
    await waitFor(() => expect(fetchResumeTex).toHaveBeenCalledWith('res1'))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('\\documentclass...'))
  })
  it('renders an Open in Overleaf control', () => {
    render(<ResumeOutputBar resumeId="res1" />)
    expect(screen.getByRole('button', { name: /open in overleaf/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — `resume-output-bar.tsx`. Overleaf opens via a programmatic form POST of the `.tex` (`snip` param) to `https://www.overleaf.com/docs`. PDF download is handled by the workspace via react-pdf's `PDFDownloadLink` (Task 15); this bar covers Copy + Overleaf.

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetchResumeTex } from '@/hooks/use-resumes'

export function ResumeOutputBar({ resumeId }: { resumeId: string }) {
  const [busy, setBusy] = useState<'copy' | 'overleaf' | null>(null)

  const copy = async () => {
    setBusy('copy')
    try {
      const { tex } = await fetchResumeTex(resumeId)
      await navigator.clipboard.writeText(tex)
    } finally {
      setBusy(null)
    }
  }

  const overleaf = async () => {
    setBusy('overleaf')
    try {
      const { tex } = await fetchResumeTex(resumeId)
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = 'https://www.overleaf.com/docs'
      form.target = '_blank'
      const field = document.createElement('input')
      field.type = 'hidden'
      field.name = 'snip'
      field.value = tex
      form.appendChild(field)
      document.body.appendChild(form)
      form.submit()
      form.remove()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={copy}>
        {busy === 'copy' ? 'Copying…' : 'Copy LaTeX'}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={overleaf}>
        {busy === 'overleaf' ? 'Opening…' : 'Open in Overleaf'}
      </Button>
    </div>
  )
}
```

`resume-preview.tsx` (client-only PDF preview; not unit-tested):

```tsx
'use client'

import dynamic from 'next/dynamic'
import type { ResumeContent } from '@/types/resume'
import { ResumeDocument } from './resume-document'

// PDFViewer touches browser APIs; load client-only.
const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFViewer), { ssr: false })

export function ResumePreview({ content }: { content: ResumeContent }) {
  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-border">
      <PDFViewer width="100%" height="100%" showToolbar={false}>
        <ResumeDocument content={content} />
      </PDFViewer>
    </div>
  )
}
```

- [ ] **Step 4: Run → PASS** (the output-bar test).

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/resume/resume-preview.tsx frontend-next/src/components/resume/resume-output-bar.tsx frontend-next/src/components/resume/resume-output-bar.test.tsx
git commit -m "feat(slice-6b): résumé preview (react-pdf) + output bar (Copy LaTeX / Overleaf)"
```

---

### Task 15: Generate bar + workspace + `/app/resumes` page + persona link

**Files:** Create `…/generate-resume-bar.tsx`, `…/resume-workspace.tsx`, `src/app/app/resumes/page.tsx` · Modify `src/components/personas/persona-list.tsx` · Test `…/resume-workspace.test.tsx`

The workspace: a generate bar (persona preselected from `?persona=`, optional instructions) → on success, show the live preview + structured editor + download/copy/Overleaf. `DownloadPdfButton` uses react-pdf's `PDFDownloadLink`.

- [ ] **Step 1: Failing test** (workspace generate flow; preview/PDF are client-only and not asserted)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Persona } from '@/types/persona'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
// react-pdf is browser-only; stub the preview + download to keep the test in jsdom.
vi.mock('./resume-preview', () => ({ ResumePreview: () => <div data-testid="preview" /> }))
vi.mock('./download-pdf-button', () => ({ DownloadPdfButton: () => <button>Download PDF</button> }))

import { apiClient } from '@/lib/api-client'
import { ResumeWorkspace } from './resume-workspace'

const api = vi.mocked(apiClient)
const C = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const PERSONA: Persona = { id: 'p1', userId: 'u1', name: 'Backend', data: C, rawInput: null, createdAt: '', updatedAt: '' }
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('ResumeWorkspace', () => {
  it('generates a résumé for the selected persona and shows the preview', async () => {
    api.post.mockResolvedValue({ id: 'res1', personaId: 'p1', jobId: null, title: 'Backend', instructions: null, content: C, userId: 'u1', createdAt: '', updatedAt: '' })
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /generate résumé|generate resume/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/resumes', { personaId: 'p1' }))
    expect(await screen.findByTestId('preview')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement.** `generate-resume-bar.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Persona } from '@/types/persona'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Props {
  personas: Persona[]
  personaId: string
  onPersonaChange: (id: string) => void
  onGenerate: (instructions: string) => void
  isPending: boolean
}

export function GenerateResumeBar({ personas, personaId, onPersonaChange, onGenerate, isPending }: Props) {
  const [instructions, setInstructions] = useState('')
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="gr-persona">Persona</Label>
        <Select id="gr-persona" value={personaId} onChange={(e) => onPersonaChange(e.target.value)}>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="gr-instructions">Instructions (optional)</Label>
        <Textarea id="gr-instructions" rows={2} placeholder="e.g. emphasize leadership; keep to one page" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>
      <Button type="button" disabled={isPending || !personaId} onClick={() => onGenerate(instructions)}>
        {isPending ? 'Generating…' : 'Generate résumé'}
      </Button>
    </div>
  )
}
```

`download-pdf-button.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import type { ResumeContent } from '@/types/resume'
import { ResumeDocument } from './resume-document'

const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink), { ssr: false })

export function DownloadPdfButton({ content, fileName }: { content: ResumeContent; fileName: string }) {
  return (
    <PDFDownloadLink
      document={<ResumeDocument content={content} />}
      fileName={fileName}
      className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
    >
      {({ loading }) => (loading ? 'Preparing…' : 'Download PDF')}
    </PDFDownloadLink>
  )
}
```

`resume-workspace.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Persona } from '@/types/persona'
import type { GeneratedResume, ResumeContent } from '@/types/resume'
import { useGenerateResume, useUpdateResume } from '@/hooks/use-resumes'
import { GenerateResumeBar } from './generate-resume-bar'
import { ResumePreview } from './resume-preview'
import { ResumeContentEditor } from './resume-content-editor'
import { ResumeOutputBar } from './resume-output-bar'
import { DownloadPdfButton } from './download-pdf-button'
import { Button } from '@/components/ui/button'

interface Props {
  personas: Persona[]
  initialPersonaId: string
}

export function ResumeWorkspace({ personas, initialPersonaId }: Props) {
  const [personaId, setPersonaId] = useState(initialPersonaId || personas[0]?.id || '')
  const [resume, setResume] = useState<GeneratedResume | null>(null)
  const [content, setContent] = useState<ResumeContent | null>(null)
  const generate = useGenerateResume()
  const save = useUpdateResume(resume?.id ?? '')

  const onGenerate = (instructions: string) => {
    generate.mutate(
      { personaId, ...(instructions.trim() ? { instructions: instructions.trim() } : {}) },
      {
        onSuccess: (r) => {
          setResume(r)
          setContent(r.content)
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="font-serif text-2xl tracking-tight">Generate résumé</h1>
      <GenerateResumeBar personas={personas} personaId={personaId} onPersonaChange={setPersonaId} onGenerate={onGenerate} isPending={generate.isPending} />
      {generate.error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{generate.error.message}</p>
      ) : null}

      {resume && content ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ResumeOutputBar resumeId={resume.id} />
              <DownloadPdfButton content={content} fileName={`${(resume.title ?? 'resume').replace(/\s+/g, '-')}.pdf`} />
              <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate({ content })}>
                {save.isPending ? 'Saving…' : 'Save edits'}
              </Button>
            </div>
            <ResumeContentEditor value={content} onChange={setContent} />
          </div>
          <ResumePreview content={content} />
        </div>
      ) : null}
    </div>
  )
}
```

`src/app/app/resumes/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { ResumesPageClient } from '@/components/resume/resumes-page-client'
import type { Persona } from '@/types/persona'

export const metadata: Metadata = { title: 'Résumés' }

export default async function ResumesPage() {
  let personas: Persona[] = []
  try {
    personas = await apiServer.get<Persona[]>('/api/personas')
  } catch {
    personas = []
  }
  return (
    <Suspense fallback={null}>
      <ResumesPageClient personas={personas} />
    </Suspense>
  )
}
```

`src/components/resume/resumes-page-client.tsx` (reads `?persona=`):

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import type { Persona } from '@/types/persona'
import { ResumeWorkspace } from './resume-workspace'

export function ResumesPageClient({ personas }: { personas: Persona[] }) {
  const sp = useSearchParams()
  const initial = sp.get('persona') ?? ''
  if (personas.length === 0) {
    return <p className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">Create a persona first, then come back to generate a résumé.</p>
  }
  return <ResumeWorkspace personas={personas} initialPersonaId={initial} />
}
```

Modify `src/components/personas/persona-list.tsx` — add a "Generate résumé" link per persona (next to Delete). Add `import Link from 'next/link'` and inside each `<li>`'s action area:

```tsx
            <Link
              href={`/app/resumes?persona=${p.id}`}
              className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              Generate résumé
            </Link>
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/resume/generate-resume-bar.tsx frontend-next/src/components/resume/download-pdf-button.tsx frontend-next/src/components/resume/resume-workspace.tsx frontend-next/src/components/resume/resumes-page-client.tsx frontend-next/src/app/app/resumes/page.tsx frontend-next/src/components/personas/persona-list.tsx frontend-next/src/components/resume/resume-workspace.test.tsx
git commit -m "feat(slice-6b): résumé workspace + /app/resumes page + persona generate link"
```

---

### Task 16: Frontend gate

- [ ] **Step 1:** Run `cd frontend-next && npm run typecheck && npm run lint && npm run test`. All green; fix failures. For `npm run build`, if it fails **only** on a stale/root-owned `.next`, verify instead via `docker build --target production ./frontend-next` (per CLAUDE.md). Watch for react-pdf SSR issues — `ResumePreview`/`DownloadPdfButton` use `next/dynamic` with `ssr: false`, so the build must not try to SSR them.
- [ ] **Step 2:** `git add -A frontend-next && git commit -m "chore(slice-6b): frontend gate green" || echo "nothing to commit"`

---

### Task 17: Manual smoke (Docker, real key — Gemini 3.5 Flash)

- [ ] **Step 1:** Frontend deps changed (`@react-pdf/renderer`), so recreate: `docker compose up -d --build --force-recreate --renew-anon-volumes frontend-next` (and `backend-express` if needed). Confirm health.
- [ ] **Step 2:** Via `:8080`: log in → **Personas** → on a persona click **Generate résumé** → on `/app/resumes` pick the persona → **Generate** → confirm the **live PDF preview** renders, the structured **editor** reflects the content, **Copy LaTeX** copies a `\documentclass…` doc, **Download PDF** downloads, **Open in Overleaf** opens with the doc, and an edit + **Save edits** persists.
- [ ] **Step 3:** Generate with a **job** (once 6c wires the drawer, or by appending `&job=<id>` to the URL) → title becomes "`<job> — <company>`".
- [ ] **Step 4:** Trigger the rate limit by setting `AI_RATE_LIMIT_PER_HOUR=1` and generating twice → second returns 429 `RATE_LIMITED`.

---

## Self-Review

**Spec coverage (§ → task):** §3 `ResumeContent` reuse → T2,T3,T6; §4a `.tex` deriver → T3; §4b react-pdf preview/PDF → T11,T14,T15; §4c Overleaf → T14; §5 `generated_resumes` + migration → T1; §6 generation prompt + Gemini + rate limit → T4,T5,T7; §7 endpoints (`POST/GET/GET :id/GET :id/tex/PATCH/DELETE /api/resumes`) → T8; §8 `/app/resumes` workspace + editor + outputs + persona entry → T12,T14,T15.

**Placeholder scan:** none — every step has real code/commands. **Type consistency:** `GeneratedResume`/`GeneratedResumeRow` fields match across BE/FE; `splitBold` shape consistent FE/BE-tex; hook bodies match controller contracts (`POST /api/resumes`, `GET ?jobId=`, `GET /:id/tex` → `{ tex }`, `PATCH`, `DELETE`); `ResumeContentEditor` controlled `value/onChange` reused by the workspace.

**Known boundaries (intentional):** react-pdf renders to PDF, not the DOM — `ResumeDocument`/preview/download are covered by `splitBold` unit tests + an element-build smoke + the live manual smoke (no `pdf()` in CI). The Overleaf `snip` POST and clipboard are covered via the output-bar test (clipboard mocked); the actual new-tab POST is exercised in the manual smoke. Drag-reorder is still out (6a decision). Rate limit counts résumés only until 6c adds cover_letters to `ai-usage.repository`.
