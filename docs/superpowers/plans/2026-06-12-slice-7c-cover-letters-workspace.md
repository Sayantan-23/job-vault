# Slice 7c — Cover Letters Workspace + Paste-a-JD + Résumé Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone **`/app/cover-letters` workspace** (library list + generate + edit) where the job context is either a **tracked job** (picker) or a **pasted description** (title + company + JD text) stored **on the letter** (`adhoc_job` jsonb, `job_id` nullable — migration `0009`), never materialized as a tracked job. Plus — per the 2026-06-12 résumé-IA survey (user-approved) — the **résumé library**: a list of past generations on `/app/resumes` (the backend `GET /api/resumes` + frontend hooks already exist, UI never consumed them) and **both** Résumés and Cover letters in the sidebar nav.

**Architecture:** Same layered backend module (only `cover-letters` changes: Zod XOR input, service branch, nullable FK + jsonb column) and the resumes-workspace frontend pattern (server-fetch + props, `'use client'` leaves). One shared **`DocumentList`** component renders both libraries — identical columns (title · job context · persona · date · delete), borderless aligned list per the user's Linear/Height preference. `buildCoverLetterPrompt`, rate limiting, `CoverLetterEditor`/PDF, the JobDrawer section, and the résumé generation pipeline are untouched.

**Reference:** `docs/superpowers/specs/2026-06-12-slice-7c-cover-letters-workspace-design.md` (§3–§9). Slice 7b plan (`2026-06-11-slice-7b-persona-redesign.md`) is the style template.

**Decisions filling small spec gaps (made 2026-06-12, user-approved where noted):**
1. **Sidebar gets BOTH entries** — the spec said "next to Résumés" but Résumés was never in the nav (launcher-only). Market survey (7 agents, 12+ tools: Teal, Huntr, Careerflow, Rezi, Resume.io, Kickresume, Enhancv, FlowCV, Jobscan, Simplify): a dedicated nav surface + persistent library is universal; launcher-only generate flows exist nowhere. **User approved folding the résumé library into 7c.** Nav order: Dashboard, Jobs, Personas, Résumés, Cover letters, Timeline.
2. **Résumé library is frontend-only** — `GET /api/resumes` (list), `DELETE /api/resumes/:id`, `useResumes()`, `useDeleteResume()` all shipped in 6b; no backend work.
3. **Shared `DocumentList`** in `src/components/documents/` — both libraries have the same shape: `{ title, context, personaName, createdAt }` rows + select + delete. Per-feature workspaces map their rows into it.
4. **Tracked-letter job context is joined client-side** via `useJobOptions()` (already fetched for the picker; limit 100); fallback `'—'`. The list API response stays unchanged except for carrying `adhocJob` (spec §5).
5. **Delete on rows in both libraries** (user approved) — endpoints + hooks exist; match the persona-card pattern: direct icon-button delete with `aria-label`, no confirm dialog (none exists in the app).
6. **Blank pasted description normalized away**: trimmed; omitted from the stored `adhocJob`; prompt `snapshot: null`. `description` bounded at 50_000 chars (spec); `title`/`company` at 255 (parity with `jobs` varchar lengths).
7. **DB CHECK for the XOR** attempted via drizzle `check()` (drizzle-orm 0.36 exports it): `(job_id IS NULL) <> (adhoc_job IS NULL)` — existing rows satisfy it (job_id set, adhoc_job null). Keep only if `db:generate` emits clean SQL; Zod + service enforce the invariant regardless (spec §4 says CHECK optional).
8. **Generated letter title clamped to 200 chars** (`.slice(0, 200)`) in both paths — `cover_letters.title` is varchar(200) and `${company} — cover letter` can exceed it with a long company (latent pre-existing overflow, fixed in passing).
9. **Library is browsable when AI is off or personas are empty** — only the generator gates (AI-off hint / "create a persona first" hint); past letters/résumés always render. The resumes page's early-return-on-no-personas moves into the workspace as a generator-only gate.
10. **No auto-select** in the libraries — the right pane shows a muted "Select a letter or generate a new one" hint until a row is clicked or a generation succeeds (library-first, unlike the JobDrawer section which auto-opens the latest).

**Conventions to honor (verified against the codebase):**
- Backend relative imports end in `.js` (NodeNext ESM); module files `<feature>.{router,controller,service,repository,schema}.ts` + co-located `.test.ts`; success envelope `{ data }`; `AppError(code, message)`; `validate(schema)`; `authMiddleware`; queries scoped by `userId`.
- Migrations via `npm run db:generate` (never hand-numbered); `drizzle.config.ts` already points at `src/db/schema/index.ts`.
- Frontend: `'use client'` only on interactive leaves; **every styled element is its own component**; `cn()` from `@/lib/utils`; query keys in `src/lib/query-keys.ts`; client fetch via `@/lib/api-client`, server via `@/lib/api-server`; dates via `shortDate` from `@/lib/relative-time`.
- Commit per task. Plain commit messages (`feat(slice-7c): …`), **no Claude attribution/trailers, never push**.
- Single backend test: `cd backend-express && npm test -- <path>`. Frontend: `cd frontend-next && npm test -- <path>`.
- Repository tests need Postgres (`docker compose up -d postgres`) + `DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault`.

---

## Phase A — Backend

### Task A1: `cover_letters` DDL — nullable `job_id` + `adhoc_job` jsonb (+ XOR CHECK) — migration `0009`

**Files:**
- Modify: `backend-express/src/db/schema/cover-letters.ts`
- Generated: `backend-express/src/db/migrations/0009_*.sql` (via `npm run db:generate`)
- Test: extend `backend-express/src/modules/cover-letters/cover-letters.repository.test.ts`

```ts
// cover-letters.ts additions
export interface AdhocJob {
  title: string
  company: string
  description?: string
}
// jobId: drop .notNull() (FK + onDelete: 'cascade' stay)
// new column:
adhocJob: jsonb('adhoc_job').$type<AdhocJob>(),
// table extras (3rd arg), alongside the two existing indexes:
check('cover_letters_job_xor', sql`(job_id IS NULL) <> (adhoc_job IS NULL)`)
```

- [ ] **Step 1: Write the failing repository test** — extend the existing real-DB test file: create an adhoc letter `{ userId, jobId: null, adhocJob: { title: 'Staff Eng', company: 'Acme', description: 'JD text' }, personaId: null, title: 'Acme — cover letter', instructions: null, bodyMarkdown: '…' }` → `findById` round-trips `adhocJob` intact and `jobId === null`; `listForUser(userId)` (no jobId filter) returns tracked + adhoc letters together; `listForUser(userId, jobId)` still returns only the tracked one. If the CHECK survives Step 3, also assert a raw both-null insert rejects (`await expect(getDb().insert(…)).rejects.toThrow()`).
- [ ] **Step 2: Run to verify FAIL** (column/type doesn't exist).
- [ ] **Step 3: Implement** — schema change above; `DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault npm run db:generate` → inspect `0009_*.sql` (expect `ALTER COLUMN "job_id" DROP NOT NULL`, `ADD COLUMN "adhoc_job" jsonb`, `ADD CONSTRAINT "cover_letters_job_xor" CHECK …`). If the CHECK isn't emitted cleanly, drop it from the schema and regenerate (decision 7). Then `npm run db:migrate`.
- [ ] **Step 4: Run to verify PASS** (repository test + existing module tests still green).
- [ ] **Step 5: Commit** `feat(slice-7c): cover_letters job_id nullable + adhoc_job jsonb (migration 0009)`

---

### Task A2: `GenerateCoverLetterSchema` — XOR of `jobId` / inline `job`

**Files:**
- Modify: `backend-express/src/modules/cover-letters/cover-letters.schema.ts`
- Test: extend `cover-letters.schema.test.ts`

```ts
export const AdhocJobInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  company: z.string().trim().min(1).max(255),
  description: z.string().max(50_000).optional(),
})

export const GenerateCoverLetterSchema = z
  .object({
    personaId: z.string().uuid(),
    instructions: z.string().max(2000).optional(),
    jobId: z.string().uuid().optional(),
    job: AdhocJobInputSchema.optional(),
  })
  .refine((v) => (v.jobId !== undefined) !== (v.job !== undefined), {
    message: 'Provide exactly one of jobId or job',
  })
```

- [ ] **Step 1: Write the failing tests** — `jobId`-only passes; `job`-only passes (with and without `description`); **both** fails; **neither** fails; `job` with empty/whitespace `title` or `company` fails; `description` over 50_000 fails; whitespace around title/company is trimmed in the parsed output; existing `instructions`/UUID cases still hold.
- [ ] **Step 2: FAIL** → **Step 3: Implement** → **Step 4: PASS** (schema test only — the service still compiles since `input.jobId` is now optional but unused-as-optional until A3; if typecheck breaks here, note it and proceed — A3 heals it).
- [ ] **Step 5: Commit** `feat(slice-7c): cover letter generate schema accepts jobId XOR inline job`

---

### Task A3: service adhoc branch + router validation

**Files:**
- Modify: `cover-letters.service.ts` (controller/router code unchanged — `validate` picks up the new schema)
- Test: extend `cover-letters.service.test.ts`, `cover-letters.router.test.ts`

`generate()` restructure (everything else in the module untouched):

```ts
if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', …)
const persona = await personasRepository.findById(userId, input.personaId)   // NOT_FOUND
let jobContext: { title: string; company: string; snapshot: string | null }
let jobId: string | null = null
let adhocJob: AdhocJob | null = null
if (input.jobId) {
  const job = await jobsRepository.findById(userId, input.jobId)             // NOT_FOUND
  jobContext = { title: job.title, company: job.company, snapshot: job.snapshotMarkdown }
  jobId = input.jobId
} else {
  const j = input.job!                                                       // schema guarantees presence
  const description = j.description?.trim() || undefined                     // decision 6
  adhocJob = { title: j.title, company: j.company, ...(description ? { description } : {}) }
  jobContext = { title: j.title, company: j.company, snapshot: description ?? null }
}
await assertWithinRateLimit(userId)                                          // still after ALL ownership checks
// …existing basics merge + generateText(buildCoverLetterPrompt(background, jobContext, instructions))
return coverLettersRepository.create({ userId, jobId, adhocJob, personaId, 
  title: `${jobContext.company} — cover letter`.slice(0, 200),               // decision 8
  instructions: input.instructions ?? null, bodyMarkdown })
```

- [ ] **Step 1: Write the failing service tests** —
  - adhoc path: `jobsRepository.findById` **never called**; created row gets `jobId: null` + the `adhocJob` object; title `'Acme — cover letter'`; prompt receives `{ title, company, snapshot: '<description>' }`.
  - adhoc with blank/whitespace description: stored `adhocJob` has **no** `description` key; prompt `snapshot: null`.
  - rate limit still runs **after** persona ownership (persona NOT_FOUND → `assertWithinRateLimit` not called) and **before** Gemini; basics merge still applies on the adhoc path (savedBasics override asserted).
  - tracked path unchanged: existing tests stay green (job ownership → NOT_FOUND, etc.).
  - title clamp: company of 300 chars → stored title length ≤ 200.
- [ ] **Step 2: Write the failing router tests** — 400 when **both** `jobId` and `job` sent; 400 when **neither**; 201 on a valid adhoc body (mocked repos/Gemini as in existing tests); existing tracked-path tests green.
- [ ] **Step 3: FAIL** → **Step 4: Implement** → **Step 5: PASS** (whole module + `npm run typecheck`).
- [ ] **Step 6: Commit** `feat(slice-7c): cover letter generation from a pasted JD (adhocJob persisted, no tracked job)`

---

## Phase B — Frontend

### Task B1: cover-letter types + hooks (`useAllCoverLetters`, extended generate body)

**Files:**
- Modify: `frontend-next/src/types/cover-letter.ts`, `src/hooks/use-cover-letters.ts`
- Test: extend `src/hooks/use-cover-letters.test.tsx` (create if missing)

- [ ] `types/cover-letter.ts`: `jobId: string | null`; new `adhocJob: AdhocJob | null`; `export interface AdhocJob { title: string; company: string; description?: string }`.
- [ ] `use-cover-letters.ts`: `GenerateBody` → `{ personaId: string; jobId?: string; job?: AdhocJob; instructions?: string }`. New `useAllCoverLetters(initialData?: CoverLetter[])`: queryKey `COVER_LETTERS_KEY`, `GET /api/cover-letters`, `staleTime: 30_000` + conditional `initialData` (the SSR-hydration pattern from `usePersonas` — comment why). `useCoverLetters(jobId)` (drawer) untouched. Note: `useGenerateCoverLetter`'s existing `COVER_LETTERS_KEY` prefix invalidation already refreshes both the library and per-job lists — no change.
- [ ] Tests: `useAllCoverLetters` fetches `/api/cover-letters` and serves `initialData` without an immediate clobber; generate mutation posts a `job` body verbatim.
- [ ] Commit `feat(slice-7c): cover letter types/hooks — adhocJob + all-letters library query`

### Task B2: shared `DocumentList` (borderless aligned library list)

**Files:**
- Create: `frontend-next/src/components/documents/document-list.tsx` (+ `document-list-row.tsx` — every styled element its own component)
- Test: `document-list.test.tsx`

```ts
export interface DocumentRow {
  id: string
  title: string        // letter/résumé title, fallback 'Untitled'
  context: string      // 'Acme · Staff Engineer' | 'General' | '—'
  personaName: string  // mapped by caller; fallback '—'
  createdAt: string    // ISO; rendered via shortDate, font-mono text-xs (numerics signature)
}
interface Props {
  rows: DocumentRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  emptyText: string
  'aria-label': string
}
```

- Borderless aligned grid (Linear/Height style — `jobs-table.tsx` is the styling reference): shared `GRID` cols `[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto_auto]`, rows `divide-y divide-border`, `px-3 py-2.5 text-sm transition-colors hover:bg-accent/50`, selected row `bg-accent`. Title `truncate font-medium`; context + persona `truncate text-muted-foreground`; date `shortDate` in `font-mono text-xs text-muted-foreground`; delete = ghost icon `Button` (`Trash2`, `size-3.5`) with `aria-label={'Delete ' + title}`.
- **A11y pitfall:** no `<button>` nested in `<button>` — the row is a `div` grid with `role="button"`/`tabIndex={0}`/Enter+Space handlers (or a select-button using safe non-nested markup); the delete button calls `e.stopPropagation()`.
- Empty state: `emptyText` in muted small type, no chrome.
- [ ] RTL tests: columns render (title/context/persona/short date); row click → `onSelect(id)`; keyboard Enter → `onSelect`; delete click → `onDelete(id)` and **not** `onSelect`; `selectedId` row marked (`aria-current` or class); empty state.
- [ ] Commit `feat(slice-7c): shared DocumentList for the letters/résumés libraries`

### Task B3: `GenerateCoverLetterBar` — persona + job-source toggle (tracked ⇄ paste)

**Files:**
- Create: `frontend-next/src/components/cover-letters/generate-cover-letter-bar.tsx`
- Test: `generate-cover-letter-bar.test.tsx`

Props: `{ personas: Persona[]; jobs: JobOption[]; isPending: boolean; onGenerate: (body: GenerateBody) => void }`. The bar owns its form state (persona defaulting to `personas[0]`, mode, jobId, title, company, description, instructions) — `GenerateResumeBar` is the structural template (rounded-lg border bg-card p-4, Label/Select/Textarea/Button primitives).

- `SegmentedControl` mode toggle: `[{ value: 'tracked', label: 'Tracked job', icon: Briefcase }, { value: 'paste', label: 'Paste a description', icon: ClipboardList }]`, `aria-label="Job source"`.
- **tracked**: job `Select` with a disabled-ish first option `value=""` "Select a job…" then `{title} — {company}` options.
- **paste**: `Input` Title + `Input` Company (side by side on sm+) + `Textarea` rows 5 "Job description" placeholder "Paste the job description (optional, but it makes the letter much better)".
- Both modes: instructions `Textarea` rows 2 + Generate button `Generate cover letter` / `Generating…`.
- Disabled: `isPending || !personaId || (mode === 'tracked' ? !jobId : !title.trim() || !company.trim())`.
- Payload: tracked → `{ personaId, jobId, instructions? }`; paste → `{ personaId, job: { title: trimmed, company: trimmed, ...(description.trim() ? { description: description.trim() } : {}) }, instructions? }` (instructions trimmed-or-omitted, as in the resume bar).
- [ ] RTL tests: defaults to tracked with job select; toggle swaps the field set; tracked payload shape; paste payload with description; paste payload **omits** blank description; disabled until required fields per mode; persona defaults to first.
- [ ] Commit `feat(slice-7c): GenerateCoverLetterBar with tracked-job ⇄ paste-a-JD toggle`

### Task B4: `/app/cover-letters` page + `CoverLettersWorkspace` + sidebar nav (both entries)

**Files:**
- Create: `frontend-next/src/app/app/cover-letters/page.tsx`, `src/components/cover-letters/cover-letters-workspace.tsx`
- Modify: `src/components/layout/app/sidebar-nav.tsx` (+ its test)
- Test: `cover-letters-workspace.test.tsx`

- [ ] **page.tsx** (server): metadata `'Cover letters'`; `apiServer.get` personas + `CoverLetter[]` letters + `AiStatus` (each in try/catch with safe fallbacks: `[]`, `[]`, `undefined`); render `<CoverLettersWorkspace personas={…} initialLetters={…} aiStatus={…} />` (no `useSearchParams` → no Suspense wrapper needed).
- [ ] **CoverLettersWorkspace** (`'use client'`): hooks — `useAllCoverLetters(initialLetters)`, `useGenerateCoverLetter`, `useUpdateCoverLetter(active?.id ?? '')`, `useDeleteCoverLetter`, `useJobOptions`, `useAiStatus(aiStatus)`. State: `active: CoverLetter | null`, `body: string`.
  - `PageHeader` title "Cover letters", description "For tracked jobs or pasted descriptions".
  - Generator slot: AI off → existing muted hint ("AI features are not configured."); personas empty → muted hint with a `next/link` to `/app/personas` ("Create a persona first…"); else `GenerateCoverLetterBar`; `generate.error` alert below (same `role="alert"` destructive style as the resume workspace). **Library renders in all three cases** (decision 9).
  - Row mapping → `DocumentRow[]`: `title ?? 'Untitled'`; context from `adhocJob` (`company · title`) else `jobsById.get(jobId)` (`company · title`) else `'—'`; personaName from a `personas` map else `'—'`; `createdAt`.
  - Layout: `grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]` — left `DocumentList` (emptyText "No cover letters yet — generate your first one above."), right: `active` → `CoverLetterEditor value={body} onChange={setBody} fileName=…` + "Save edits" button (`save.mutate({ bodyMarkdown: body })`), in a `self-start lg:sticky lg:top-0` wrapper; else a muted hint panel ("Select a letter or generate a new one.") as its own small component.
  - Select row → `setActive(letter); setBody(letter.bodyMarkdown)`. Generate success → same with the new letter. Delete → `del.mutate(id)`; if `id === active?.id` clear `active`. No auto-select on load (decision 10).
- [ ] **sidebar-nav.tsx**: add `{ href: '/app/resumes', label: 'Résumés', icon: FileText }` and `{ href: '/app/cover-letters', label: 'Cover letters', icon: Mail }` between Personas and Timeline; update `sidebar-nav.test.tsx`.
- [ ] RTL tests: tracked + adhoc letters render with correct context strings; persona names mapped; select opens the editor with the body; generate success (mocked apiClient) activates the new letter; delete of the active letter clears the editor pane; AI-off → hint **and** library still listed; personas-empty → generator hint with link, library intact.
- [ ] Full `npm run typecheck` green.
- [ ] Commit `feat(slice-7c): /app/cover-letters workspace + sidebar entries for Résumés and Cover letters`

### Task B5: résumé library on `/app/resumes` (frontend-only — survey follow-through)

**Files:**
- Modify: `frontend-next/src/app/app/resumes/page.tsx`, `src/components/resume/resumes-page-client.tsx`, `src/components/resume/resume-workspace.tsx`
- Test: extend `resume-workspace.test.tsx`

- [ ] **page.tsx**: also `apiServer.get<GeneratedResume[]>('/api/resumes')` (try/catch → `[]`) → pass `initialResumes` through `ResumesPageClient`.
- [ ] **ResumesPageClient**: pass `initialResumes` down; **remove the personas-empty early return** — the workspace now always renders and gates only the generator (decision 9; keep the same hint text inside the workspace).
- [ ] **ResumeWorkspace**: new prop `initialResumes: GeneratedResume[]`; `const { data: allResumes = [] } = useResumes(undefined, initialResumes)`; `const del = useDeleteResume()`.
  - Insert a `DocumentList` section between the generate bar and the editor grid: rows mapped as in B4 (context: `jobsById.get(jobId)` → `company · title`, else `'General'`), `selectedId = resume?.id ?? null`, emptyText "No résumés yet — generate your first one above."
  - Select row → `setResume(row); setContent(row.content)` (list rows carry full `content` — verified). Delete → clear `resume`/`content` when the active one is deleted. Generation already updates the list via the existing `RESUMES_KEY` invalidation.
  - Personas-empty: generate bar replaced by the muted hint (link to `/app/personas`); library + editor still functional.
- [ ] RTL tests: list renders from `initialResumes`; selecting a row populates the editor (content visible); deleting the open résumé clears the editor; personas-empty still shows the library.
- [ ] Full `npm run typecheck` + `npm run lint` green.
- [ ] Commit `feat(slice-7c): résumé library list on /app/resumes (reopen + delete past generations)`

---

## Phase C — Gates, smoke, docs

- [ ] **Backend gates:** `cd backend-express && npm run typecheck && npm run lint && npm test` (Postgres up, migration `0009` applied).
- [ ] **Frontend gates:** `cd frontend-next && npm run typecheck && npm run lint && npm test`. Production build via `docker build --target production ./frontend-next` (host `.next` is root-owned — per CLAUDE.md).
- [ ] **Stack:** `docker compose up -d --build` (no new npm deps → no `--renew-anon-volumes` needed). Backend auto-applies `0009` on boot — check `docker compose logs backend-express`.
- [ ] **Live smoke (GEMINI_API_KEY, app at :8080):** login → sidebar shows Résumés + Cover letters → `/app/cover-letters` → generate a **tracked-job** letter (picker) → generate a **pasted-JD** letter (title+company+JD) → confirm **no new job appears on the board** → edit + Save → PDF download works → delete a letter → `/app/resumes` lists past résumés → reopen an old one in the editor → JobDrawer cover-letter section still generates (regression). Confirm both letters spent rate-limit units.
- [ ] **Docs:** update `progress.md` (Slice 7c section incl. the résumé-library addition + survey rationale) and the CLAUDE.md "Done"/"Next" lines (next: Slice 8 Chrome extension).
- [ ] Merge to master only when the user says so; **never push**.

## What stays untouched (verify nothing drifted)
`buildCoverLetterPrompt` (input already `{title, company, snapshot}`); `ai.rate-limit.ts` / `ai-usage.repository.ts` (letters already counted); `CoverLetterEditor` + PDF derivation; `components/jobs/cover-letter/cover-letter-section.tsx` (still passes `jobId`; type widening to `jobId: string | null` is invisible to it); résumé generation pipeline + renderers; personas/profile modules; `GET /api/jobs` / kanban.
