# Slice 7b — Persona Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild personas on top of the Slice 7a master profile: persona `data` becomes `ProfileContent`, legacy rows up-convert losslessly, creation gets two modes — **"Build from profile"** (per-section pickers + add custom + editable copies; education pick-only) and **"Import a résumé"** (paste text or upload PDF → AI structures `ProfileContent` → review → save) — and the persona editor swaps to the rich profile editors. AI structuring retargets to `ProfileContent`; the résumé/cover-letter **generation pipeline output stays `ResumeContent` and the renderers stay untouched**.

**Architecture:** Same layered backend modules and controlled `value`/`onChange` frontend editors as 7a. New pure converter `resumeContentToProfileContent` (golden-tested) + `normalizePersonaData` applied lazily on every persona read, plus a one-off backfill script. `POST /api/personas` becomes a plain save (no AI); a new `POST /api/personas/parse-resume` is the only AI persona path and counts against the shared hourly limit via a new `resume_parse_events` table (migration `0008`) summed into the existing DB-derived count.

**Reference:** `docs/superpowers/specs/2026-06-06-personas-profile-redesign-design.md` (§4–§10). Slice 7a plan (`2026-06-06-slice-7a-master-profile.md`) is the style template.

**Decisions filling small spec gaps (made 2026-06-11, consistent with the approved design):**
1. **Rate-limit counting for `parse-resume`:** the hourly limit is DB-derived (`ai-usage.repository` sums `generated_resumes` + `cover_letters`), but a parse stores no row. → New minimal `resume_parse_events` table (id, user_id, created_at; migration `0008`), inserted after each successful parse and summed into `countRecentGenerations`.
2. **Imported education vs pick-only:** AI-parsed education entries land in the draft and render as **read-only rows with a Remove button** in the persona education section, alongside the profile picker. No add, no inline edit — decision #4 holds.
3. **`parse-resume` response carries the extracted text:** `{ data: { content: ProfileContent, rawText: string } }` so the frontend can pass `rawInput` (audit) when saving — for PDFs the browser never sees the extracted text otherwise.
4. **FormData via api-client:** raw `fetch` would bypass the silent-refresh 401 retry; instead `api-client` learns to pass `FormData` bodies through (`postForm`), keeping refresh semantics.
5. **Personas no longer require AI at all** for manual creation — `PersonasWorkspace` gates "New persona" only on the cap; AI-off only disables the import mode (and shows the existing hint).
6. **Picker identity = profile item `id`:** picked items are deep copies that **keep the profile item's `id`**, so the picker checkboxes reflect membership and education "re-pick to refresh" is an id match. `ensureIds` on the server still fills anything missing.

**Conventions to honor (verified against the codebase):**
- Backend relative imports end in `.js` (NodeNext ESM); module files `<feature>.{router,controller,service,repository,schema}.ts` + co-located `.test.ts`; success envelope `{ data }`; `AppError(code, message)`; `validate(schema)`; `authMiddleware`.
- Frontend: `'use client'` only on interactive leaves; every styled element is its own component; `cn()` from `@/lib/utils`; query keys in `src/lib/query-keys.ts`; client fetch via `@/lib/api-client`, server via `@/lib/api-server`.
- Commit per task. Plain commit messages (`feat(slice-7b): …`), **no Claude attribution/trailers, never push**.
- Single backend test: `cd backend-express && npm test -- <path>`. Frontend: `cd frontend-next && npm test -- <path>`.
- Repository tests need Postgres (`docker compose up -d postgres`) + `DATABASE_URL=postgres://postgres:postgres@localhost:5433/jobvault`.

---

## Phase A — Backend

### Task A1: `resumeContentToProfileContent` + tolerant date parser + `normalizePersonaData`

**Files:**
- Create: `backend-express/src/shared/resume-to-profile.ts`
- Test: `backend-express/src/shared/resume-to-profile.test.ts`

Pure functions, no I/O:

```ts
// Parse a single side of a date range: "Jan 2022", "January 2022", "01/2022", "2022".
// Returns null when unparseable.
function parseMonthYear(raw: string): MonthYear | null

// Split a range string on – — - "to" (with surrounding spaces for "-" and "to" so
// "Co-op" never splits). Right side matching /present|current|now|ongoing/i →
// { current: true, endDate: null }. A single un-ranged value = start only.
export function parseDateRange(raw: string): { startDate: MonthYear | null; endDate: MonthYear | null; current: boolean }

export function resumeContentToProfileContent(legacy: ResumeContent): ProfileContent
// - basics: copy fields; links copied (ids assigned later by ensureIds)
// - summary: copy
// - experience: title → role; date → parseDateRange. If `date` is non-empty but
//   BOTH sides unparsed (startDate and endDate null, not current) → keep nulls and
//   unshift `Dates: <original>` onto bullets so nothing is lost.
// - projects: tagline → description; url → links: [{ label: 'Link', url }]; technologies: []
// - skills: { category, items } kept as-is
// - education: period → parseDateRange (same unparseable fallback into bullets);
//   fieldOfStudy/location/grade absent → omitted
// Output passes ProfileContentSchema.parse, then ensureIds.

export function isLegacyResumeContent(data: unknown): boolean
// Structural markers, checked BEFORE any Zod parse (Zod strips unknown keys, which
// would silently drop tagline/url/date/period): any experience item with a 'title'
// or 'date' key; any education item with a 'period' key; any project with a
// 'tagline' or 'url' key. Empty/section-less objects are NOT legacy (shapes coincide).

export function normalizePersonaData(data: unknown): ProfileContent
// if isLegacyResumeContent → ResumeContentSchema.parse → resumeContentToProfileContent
// else → ProfileContentSchema.parse → ensureIds
// On a failed primary parse, try the other branch before throwing (defensive; dev data).
```

- [ ] **Step 1: Write the failing golden tests** — a corpus of real date strings through `parseDateRange`:
  - `"Jan 2022 – Present"` → `{ startDate: {month:1, year:2022}, endDate: null, current: true }`
  - `"January 2020 - March 2023"` → both full
  - `"2019–2021"`, `"2019 - 2021"` → year-only sides
  - `"06/2021 – 08/2021"` → numeric months
  - `"2021 – now"`, `"2020 to Present"` → current
  - `"Summer 2021"` → all null, not current (unparseable)
  - `"Mar 2022"` (no range) → start only
  - Converter goldens: a full legacy `ResumeContent` fixture (links, experience w/ parseable + unparseable dates, project w/ tagline+url, skills, education w/ period) → exact expected `ProfileContent` (ids asserted truthy, not equal); `isLegacyResumeContent` true/false cases incl. an empty-sections object (false) and a `ProfileContent` (false); `normalizePersonaData` on legacy, on modern, and on modern-without-ids (ids filled).
- [ ] **Step 2: Run to verify FAIL** (`npm test -- src/shared/resume-to-profile.test.ts`)
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run to verify PASS**
- [ ] **Step 5: Commit** `feat(slice-7b): resumeContentToProfileContent up-converter + tolerant date parser`

---

### Task A2: retype `personas.data` to `ProfileContent` + lazy normalization on read

**Files:**
- Modify: `backend-express/src/db/schema/personas.ts` (`$type<ProfileContent>()`, import swap — **no DDL**)
- Modify: `backend-express/src/modules/personas/personas.repository.ts`
- Test: extend `backend-express/src/modules/personas/personas.repository.test.ts`

- [ ] Repository: `listForUser` and `findById` map rows through `normalizePersonaData(row.data)` before returning (pure read-time normalization; persistence happens via the A7 backfill). `update` patch type → `ProfileContent`.
- [ ] Real-DB test: insert a legacy-shaped row via `getDb().insert(personas)` (cast `data: legacyFixture as unknown as ProfileContent`), read back via `findById`/`listForUser` → normalized (`experience[0].role`, `startDate.year`, project `links[0].url`, ids present). A modern row passes through unchanged (ids preserved).
- [ ] **NOTE:** this task breaks typecheck for `personas.service.ts`/`personas.schema.ts` (still `ResumeContent`) — acceptable mid-chain; A3 fixes it. Run only the repository test here, not the full gate.
- [ ] Commit `feat(slice-7b): personas.data → ProfileContent + lazy legacy normalization on read`

---

### Task A3: personas API reshape — create-from-data (no AI), update with `ProfileContent`

**Files:**
- Modify: `backend-express/src/modules/personas/personas.schema.ts`, `personas.service.ts` (controller/router unchanged except schema names)
- Test: rewrite `personas.schema.test.ts`, `personas.service.test.ts`, update `personas.router.test.ts`

```ts
// personas.schema.ts — PersonaInputsSchema is DELETED
export const CreatePersonaSchema = z.object({
  name: z.string().min(1).max(100),
  data: ProfileContentSchema,
  rawInput: z.string().max(100_000).nullable().optional(),
})
export const UpdatePersonaSchema = z
  .object({ name: z.string().min(1).max(100).optional(), data: ProfileContentSchema.optional() })
  .refine((v) => v.name !== undefined || v.data !== undefined, { message: 'Nothing to update' })
```

- [ ] `personasService.create(userId, input)`: **no `isAiEnabled` check** (manual creation works without AI), cap check (unchanged comment about the tolerable race), `ensureIds(input.data)`, `personasRepository.create({ userId, name, data, rawInput: input.rawInput ?? null })`.
- [ ] `personasService.update`: when `data` present, store `ensureIds(data)`.
- [ ] Tests: create saves directly (no gemini mock involved — assert `geminiService.generateStructured` NOT called), cap → CONFLICT, ids ensured; router 201/400 (invalid `data`)/409; update validates `ProfileContent`.
- [ ] Run the personas module tests + `npm run typecheck` (resumes/cover-letters services should now typecheck because `persona.data` is `ProfileContent` and the prompts still accept it — if prompts block typecheck, defer the full gate to A5).
- [ ] Commit `feat(slice-7b): persona create/update accept ProfileContent directly (no AI on create)`

---

### Task A4: `resume_parse_events` table (migration `0008`) + shared rate-limit sum

**Files:**
- Create: `backend-express/src/db/schema/resume-parse-events.ts` (+ re-export from `index.ts`)
- Modify: `backend-express/src/modules/ai/ai-usage.repository.ts`
- Generated: `backend-express/src/db/migrations/0008_*.sql` (via `npm run db:generate`, never hand-numbered)
- Test: extend `ai-usage.repository.test.ts`; table-shape test like `user-profiles.test.ts`

```ts
export const resumeParseEvents = pgTable('resume_parse_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [index('idx_resume_parse_events_user_id').on(t.userId)])
```

- [ ] `aiUsageRepository.countRecentGenerations` sums the third table; new `aiUsageRepository.recordResumeParse(userId)` inserts a row.
- [ ] Real-DB test: parse events within/outside the cutoff are counted/ignored alongside résumés + cover letters.
- [ ] Generate + apply migration `0008` (`DATABASE_URL=… npm run db:generate && npm run db:migrate`).
- [ ] Commit `feat(slice-7b): resume_parse_events table (0008) counted in the shared AI hourly limit`

---

### Task A5: AI prompt retarget — structuring → `ProfileContent`, generation reads richer input

**Files:**
- Modify: `backend-express/src/modules/ai/ai.prompts.ts`
- Test: update `ai.prompts.test.ts`

- [ ] Rename the existing `SCHEMA_GUIDE` → `RESUME_SCHEMA_GUIDE` (content unchanged — it describes the **output** of résumé generation, which stays `ResumeContent`).
- [ ] New `PROFILE_SCHEMA_GUIDE` describing the `ProfileContent` JSON shape: `MonthYear` dates as `{ "month": 1-12 | null, "year": number }` (null month = year-only; unknown date → null), experience `role`/`employmentType`/`location`/`startDate`/`endDate`/`current`, project `description`/`technologies[]`/`links[{label,url}]`/`inProgress`, education `fieldOfStudy`/`location`/`grade`/`current`/`bullets`, skills groups. Tell the model to **omit all `id` fields** and never invent facts. Keep the `**bold**` emphasis instruction for bullets/summary.
- [ ] `buildStructurePrompt(resumeText: string): string` — signature simplifies to the single extracted/pasted text (the `PersonaInputs` type is gone); uses `PROFILE_SCHEMA_GUIDE`.
- [ ] `buildResumePrompt(background: ProfileContent, job, instructions?)` / `buildCoverLetterPrompt(background: ProfileContent, job, instructions?)`: only the type + one added line near the background: `Background dates appear as {month, year} objects (month may be null); render them as human-readable strings like "Jan 2022 – Present".` Résumé output keeps `RESUME_SCHEMA_GUIDE`.
- [ ] Full backend `npm run typecheck` must pass from here on (resumes/cover-letters services compile unchanged — `persona.data` is `ProfileContent` end-to-end).
- [ ] Commit `feat(slice-7b): AI structuring targets ProfileContent; generation prompts read MonthYear dates`

---

### Task A6: `POST /api/personas/parse-resume` (multipart: PDF and/or text → `ProfileContent`)

**Files:**
- Modify: `backend-express/package.json` (add `multer@^2`, `@types/multer`, `pdf-parse@^1`, `@types/pdf-parse`)
- Modify: `personas.router.ts`, `personas.controller.ts`, `personas.service.ts`, `personas.schema.ts`
- Test: `personas.service.test.ts` + `personas.router.test.ts` additions

- [ ] Router: `router.post('/parse-resume', uploadPdf.single('file'), asyncHandler(personasController.parseResume))` where `uploadPdf = multer({ storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: pdf-only ('application/pdf') })`. Wrap/translate multer errors (size/type) into the standard error envelope (`VALIDATION`).
- [ ] **`pdf-parse` ESM quirk:** under NodeNext, `import pdfParse from 'pdf-parse'` executes the package's debug block (`!module.parent`) which reads a test PDF and crashes at import. Import the inner module instead: `import pdfParse from 'pdf-parse/lib/pdf-parse.js'` (verify at install time; if v2 of the package resolves this, plain import is fine).
- [ ] `personasService.parseResume(userId, { text?: string, fileBuffer?: Buffer })`:
  1. `isAiEnabled` → else `SERVICE_UNAVAILABLE`
  2. persona cap (fail fast, `CONFLICT`)
  3. `assertWithinRateLimit(userId)`
  4. extract: `fileBuffer ? (await pdfParse(fileBuffer)).text : ''`; `combined = [extracted, text].filter(s => s?.trim()).join('\n\n')`; empty → `VALIDATION` ("Provide a PDF or pasted text"); clamp to 50_000 chars
  5. `const content = ensureIds(await geminiService.generateStructured(buildStructurePrompt(combined), ProfileContentSchema))`
  6. `await aiUsageRepository.recordResumeParse(userId)` (only after a successful parse)
  7. return `{ content, rawText: combined }`
- [ ] Controller returns `{ data: { content, rawText } }` (200). Text-only requests may arrive as multipart (`text` field) **or** JSON — multer's `.single()` handles multipart; add a tiny Zod schema for the optional `text` body field.
- [ ] Tests: service — AI-off, at-cap, rate-limited orderings; pdf path (mock `pdf-parse`), text path, both combined; empty input → VALIDATION; parse event recorded on success and NOT on failure. Router (supertest, mocked service or mocked deeper): 401 unauthenticated; multipart text-only 200; non-PDF file rejected; oversized rejected.
- [ ] After `npm install`: rebuild containers later with `--renew-anon-volumes` (Phase C).
- [ ] Commit `feat(slice-7b): POST /api/personas/parse-resume (multer memory + pdf-parse + AI structuring)`

---

### Task A7: one-off backfill script

**Files:**
- Create: `backend-express/src/scripts/backfill-personas.ts`
- Modify: `backend-express/package.json` (script `db:backfill-personas`, runner matching `dev`'s — `tsx`)

- [ ] Reads **raw** rows (`getDb().select().from(personas)` directly — not the repository, which normalizes), filters `isLegacyResumeContent(row.data)`, converts via `resumeContentToProfileContent`, `UPDATE … SET data` per row, logs `converted X of Y personas`. Idempotent (second run converts 0).
- [ ] No test file needed (the conversion logic is golden-tested in A1); verify by running against the dev DB in Phase C.
- [ ] Commit `feat(slice-7b): persona backfill script (legacy ResumeContent → ProfileContent)`

---

## Phase B — Frontend

### Task B1: api-client FormData + persona types/hooks retype + `useParseResume`

**Files:**
- Modify: `frontend-next/src/lib/api-client.ts`, `src/types/persona.ts`, `src/hooks/use-personas.ts`
- Delete: `frontend-next/src/schemas/persona.ts` (the old wizard form schema; remove its test if any)
- Test: extend `src/hooks/use-personas.test.tsx` (+ api-client test if one exists)

- [ ] `api-client`: in `request()`, `const isForm = body instanceof FormData`; set the JSON `Content-Type` header and `JSON.stringify` **only when `body !== undefined && !isForm`**; when `isForm`, pass `body` through untouched (browser sets the multipart boundary). Add `postForm: <T>(path: string, form: FormData) => request<T>('POST', path, form)`. The 401→refresh→retry path must re-send the same `FormData`.
- [ ] `types/persona.ts`: `data: ProfileContent` (import from `@/types/profile`); add `export interface ParsedResume { content: ProfileContent; rawText: string }`.
- [ ] `use-personas.ts`: `useCreatePersona` body → `{ name: string; data: ProfileContent; rawInput?: string | null }`; `useUpdatePersona` data → `ProfileContent`; new `useParseResume()` mutation: `({ text, file }: { text?: string; file?: File }) → FormData (append file/text when present) → apiClient.postForm<ParsedResume>('/api/personas/parse-resume', fd)`.
- [ ] Tests: postForm called with FormData (assert no JSON header logic by asserting the mutation passes a FormData); create payload shape.
- [ ] Commit `feat(slice-7b): persona types/hooks on ProfileContent + FormData api-client + useParseResume`

> Frontend typecheck breaks at this point (wizard/edit-sheet still on the old shape) and heals across B5–B7. Run targeted tests only until B7.

### Task B2: extract the two-column `ProfileSection` for reuse

**Files:**
- Create: `frontend-next/src/components/profile/profile-section.tsx` (move the private `Section` out of `profile-editor.tsx`, export as `ProfileSection`)
- Modify: `profile-editor.tsx` to import it
- Test: existing profile-editor tests stay green (pure refactor)

- [ ] Commit `refactor(slice-7b): extract ProfileSection from ProfileEditor for persona reuse`

### Task B3: `PersonaItemPicker` — generic profile-item multi-select

**Files:**
- Create: `frontend-next/src/components/personas/persona-item-picker.tsx`
- Test: `persona-item-picker.test.tsx`

Generic over `{ id?: string }` items. Props: `profileItems: T[]`, `selectedIds: Set<string>` (ids present in the draft), `getTitle(item): string`, `getSubtitle?(item): string`, `onAdd(items: T[])`, `onRemove(ids: string[])`, `emptyHint: string` (e.g. "Nothing in your profile yet — add items on your Profile page"), `label: string`.

- Renders a bordered, hairline panel titled "From your profile": one checkbox row per profile item (title + muted subtitle), checked when its id is in `selectedIds`. Checking → `onAdd([deepCopy(item)])` (deep copy via `structuredClone`, **id kept**); unchecking → `onRemove([id])`. An **"Add all"** ghost button adds deep copies of all unselected items. Empty profile section → `emptyHint` text only.
- [ ] RTL tests: rows render with checked state from `selectedIds`; check → `onAdd` with a copy (`not.toBe` the profile object, same `id`); uncheck → `onRemove`; Add all adds only the missing ones; empty hint.
- [ ] Commit `feat(slice-7b): PersonaItemPicker (profile multi-select with Add all)`

### Task B4: `PersonaEducationSection` — pick-only education

**Files:**
- Create: `frontend-next/src/components/personas/persona-education-section.tsx` (+ small `persona-education-row.tsx` if the row is non-trivial — every styled element its own component)
- Test: `persona-education-section.test.tsx`

Props: `value: ProfileEducation[]`, `onChange`, `profileEducation: ProfileEducation[]`.
- Current entries render as **read-only rows**: `degree — institution`, muted `fieldOfStudy · formatted dates` (reuse a small `formatMonthYearRange` helper — add to `src/lib/profile.ts` with tests: `{1,2022}–null+current` → "Jan 2022 – Present", year-only → "2019 – 2021", both null → ""), soft-destructive icon Remove.
- Below: `PersonaItemPicker` over `profileEducation` (no "Add custom"). A "Manage education in your profile →" link (`next/link` to `/app/profile`).
- Imported (AI-parsed) entries naturally appear as removable read-only rows (decision 2).
- [ ] RTL tests: rows + remove; picker add/remove wiring; manage link href.
- [ ] Commit `feat(slice-7b): pick-only persona education section`

### Task B5: `PersonaContentEditor` — the rich persona editor

**Files:**
- Create: `frontend-next/src/components/personas/persona-content-editor.tsx`
- Test: `persona-content-editor.test.tsx`

Props: `value: ProfileContent`, `onChange`, `profile: ProfileContent` (for pickers; pass `emptyProfileContent()` when unloaded).
Composes `ProfileSection` blocks exactly like `ProfileEditor`, with pickers above each pickable section:
- **Basics** → `ProfileBasicsEditor` (prefill handled by callers).
- **Summary** → `Textarea` (same as ProfileEditor's section).
- **Experience / Projects / Skills** → `PersonaItemPicker` (titles: `role @ company` / project `name` / skill-group `category` with item count subtitle) **+ "Add custom"** outline button (uses `newExperience()`/`newProject()`/`newSkillGroup()` factories from `@/lib/profile`) + the corresponding 7a section editor for the draft copies.
- **Education** → `PersonaEducationSection`.
`selectedIds` per section derived from `value.<section>` ids; `onRemove` filters the draft by id.
- [ ] RTL tests: picking an experience makes it appear in the editor; editing the copy calls `onChange` without mutating `profile`; Add custom appends an empty entry; education section is pick-only (no add-custom button).
- [ ] Commit `feat(slice-7b): PersonaContentEditor (pickers + editable copies + pick-only education)`

### Task B6: `CreatePersonaSheet` — two creation modes

**Files:**
- Create: `frontend-next/src/components/personas/create-persona-sheet.tsx` (+ `persona-mode-card.tsx`, `pdf-file-input.tsx` as their own styled components)
- Delete: `frontend-next/src/components/personas/create-persona-wizard.tsx` (+ its test)
- Test: `create-persona-sheet.test.tsx`

A `Sheet` (matching `EditPersonaSheet`'s sticky header: Cancel / primary action) with internal step state `'mode' | 'import' | 'edit'`:
1. **mode** — persona name `Input` + two `PersonaModeCard`s: **"Build from profile"** (subtitle: "Pick from your master profile and tailor") and **"Import a résumé"** (subtitle: "Paste text or upload a PDF — AI fills it in"; disabled with hint when `!aiStatus.enabled`). Choosing Build seeds the draft: `{ ...emptyProfileContent(), basics: structuredClone(profile.basics), summary: profile.summary }` → `edit`. Choosing Import → `import`.
2. **import** — paste `Textarea` + `PdfFileInput` (hidden `<input type="file" accept="application/pdf">` behind an outline button showing the chosen file name + clear) + "Parse with AI" button → `useParseResume`; pending state "Parsing…"; on success seed draft from `content` (stash `rawText`) → `edit`; surface `ApiError` messages (rate-limit 429 text included). Back link to mode.
3. **edit** — `PersonaContentEditor` for review/tailoring; Save runs `validateProfileContent(draft)` (same error list UI as `ProfileWorkspace`) then `useCreatePersona({ name, data: draft, rawInput: rawText ?? null })` → close + reset state.
- [ ] RTL tests: mode seeding from profile; import success path (mocked `useParseResume`/api) lands in edit with parsed data; save posts `{ name, data, rawInput }`; AI-off disables import card; validation errors block save.
- [ ] Commit `feat(slice-7b): CreatePersonaSheet with Build-from-profile and Import-a-résumé modes`

### Task B7: edit sheet swap + workspace/page wiring

**Files:**
- Modify: `edit-persona-sheet.tsx`, `personas-workspace.tsx`, `src/app/app/personas/page.tsx`
- Test: update `edit-persona-sheet.test.tsx`, `personas-workspace.test.tsx`

- [ ] `EditPersonaSheet`: `ResumeContentEditor` → `PersonaContentEditor` (state type `ProfileContent`); save validates via `validateProfileContent` and PATCHes `{ name, data }`.
- [ ] `personas/page.tsx`: also server-fetch `apiServer.get<ProfileContent>('/api/profile')` (catch → `emptyProfileContent()` shape inline) and pass `initialProfile` down.
- [ ] `PersonasWorkspace`: accept `initialProfile`, `useProfile(initialProfile)`, pass `profile` to both sheets; **`canCreate = !atCap`** (AI no longer gates creation — keep the AI-off hint but reword it to "…to import résumés": import is the only AI path now); render `CreatePersonaSheet`.
- [ ] Check `PersonaCard` still compiles (it reads `data.experience.length` / `data.skills.length` — both exist on `ProfileContent`).
- [ ] Full frontend `npm run typecheck` + all persona/profile tests green from here.
- [ ] Commit `feat(slice-7b): persona editor on PersonaContentEditor; workspace two-mode wiring`

---

## Phase C — Gates, backfill, smoke, docs

- [ ] **Backend gates:** `cd backend-express && npm run typecheck && npm run lint && npm test` (Postgres up, migrations applied).
- [ ] **Frontend gates:** `cd frontend-next && npm run typecheck && npm run lint && npm test`. Production build via `docker build --target production ./frontend-next` (host `.next` is root-owned — per CLAUDE.md).
- [ ] **Stack:** `docker compose up -d --build --force-recreate --renew-anon-volumes` (new backend deps). Backend auto-migrates `0008` on boot.
- [ ] **Backfill:** run `npm run db:backfill-personas` against the dev DB; re-run to confirm idempotence (0 converted).
- [ ] **Live smoke (GEMINI_API_KEY):** login → profile has data → create persona "Build from profile" (pick + add custom + edit, education picked) → create persona "Import a résumé" with a real PDF (use `example_resume.tex`-derived PDF or any résumé PDF) → both personas listed → edit one in the rich editor → generate a job-tailored résumé + a cover letter off a `ProfileContent` persona (verifies the untouched pipeline) → confirm the parse spent 1 unit of the hourly limit.
- [ ] **Docs:** update `progress.md` (Slice 7b section) and the CLAUDE.md "Done"/"Next" lines.
- [ ] Merge to master only when the user says so; never push.

## What stays untouched (verify nothing drifted)
`shared/resume-content.schema.ts`; `resume-tex.ts` + golden tests; react-pdf `ResumeDocument`/preview/download; `generated_resumes`/`cover_letters` tables and module logic (only the prompt input type changed); `ResumeContentEditor` (still the generated-résumé editor on `/app/resumes`); `GET /api/ai/status`.
