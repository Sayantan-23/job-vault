# Personas + Master Profile Redesign — Design Spec

> **STATUS: approved design (brainstormed 2026-06-06).** Supersedes the pre-brainstorm brief `2026-06-06-personas-profile-redesign-brief.md`. Next step: a bite-sized TDD plan via `superpowers:writing-plans`, then implement with ultracode (same loop as Slice 6). This is **Slice 7** in the migration roadmap (Chrome extension is Slice 8).

## 1. Context & goal

Today a persona is created from `name + pasted résumé text → AI structures it into a self-contained `ResumeContent``. The user wants a richer model:

1. A **master profile** — the canonical, reusable record of the user's skills, education, projects, and experience, edited once.
2. **Personas created two ways**: **"Build from profile"** (pick profile items + add custom + edit) or **"Import a résumé"** (paste text *or* upload a PDF → AI fills it in).
3. **Richer, standardized structured fields** for each section (structured month+year dates, technologies-used, grades, "currently working/studying"), modeled on how LinkedIn / Indeed / Zety / Novoresume / Resume.io / Workday / Greenhouse collect this data.

The defining constraint discovered during the brainstorm: **personas are never rendered to PDF/LaTeX directly.** A persona is only *edited* and then *fed to the AI as input*. Only **generated résumés** (`generated_resumes.content`, a `ResumeContent`) ever reach the `.tex`/react-pdf renderers (`resumes.service.ts:59` → `renderResumeTex`; `resume-workspace.tsx` → `ResumePreview`/`DownloadPdfButton`). Therefore the rich profile/persona shape only needs to feed (a) the editor UI and (b) the AI prompts — **no deterministic "flatten to résumé" converter is required, and the entire generation/rendering pipeline stays untouched.**

## 2. Decisions resolved (from the brief's 9 open questions)

| # | Question | Decision |
|---|---|---|
| 1 | Master-profile data model | **New `user_profiles` table** (1 row/user), `content jsonb` = `ProfileContent`. Legacy `users.masterProfileJson`/`masterResumeUrl` left dormant (cleanup deferred). |
| 2 | Profile surface / nav | Dedicated **`/app/profile`** page (main nav + account menu). |
| 3 | Persona ↔ profile relationship | **Snapshot/copy** for basics, summary, experience, projects, skills (editable per persona). |
| 4 | Education mechanics | **Edu-B**: education is managed only on the profile; in a persona you **pick which degrees to include** (snapshot copy, re-pick to refresh) — no add, no inline edit. |
| 5 | Manual section UX | Per section: multi-select **picker of profile items + "Add all" + "Add custom"**; selected items become editable copies. Education = pick-only. |
| 6 | Auto-mode input | **Paste text OR upload PDF** (in-memory `pdf-parse`, nothing stored). DOCX deferred. Counts against the AI hourly limit. |
| 7 | Migration / back-compat | Up-convert existing `personas.data` (`ResumeContent`) → `ProfileContent` via a tolerant date parser; lazy normalization on read + one-off backfill. |
| 8 | Mode naming | **"Build from profile"** (manual) + **"Import a résumé"** (auto). |
| 9 | Ship sequencing | Slice 6 already merged to master (2026-06-06); this builds from `master`. |

Additional decisions made during brainstorm:
- **Professional title/headline**: omitted from v1 (would require touching the frozen renderer); easy to add later.
- **Skill proficiency levels**: dropped — skills are plain chips.
- **Skills flat vs categorized**: one mechanism — skill groups with an optional category. A single default group ("Skills") behaves as a flat list; "+ Add category" splits into named groups. No toggle.
- **Project links**: repeatable `label + url` rows (Live demo / GitHub / …), replacing the single project URL.
- **Dates**: month+year granularity (no day). Experience start+end required (end unless `current`); education start+end required (`current` for in-progress); project dates optional. `month` is nullable within a date for year-only entries. *Requiredness is enforced in the input form, not the stored schema (§4.1), so AI-parsed and legacy data always validate.*
- **Grade**: single free-text field ("3.8/4.0", "8.5/10 CGPA", "85%") — no separate scale enum.

## 3. Mental model

> Your **master profile** is the canonical record of everything about you. A **persona** is a tailored snapshot built either **from your profile** (pick + add custom + edit) or **by importing a résumé** (AI fills it in). Everything in a persona is an editable copy — *except education*, which is picked from the profile and managed there.

## 4. Data model

### 4.1 New shared `ProfileContent` schema

Lives in `backend-express/src/shared/profile-content.schema.ts` (Zod; `z.infer` → TS type), mirrored on the frontend as `@/types/profile`. Used by **both** `user_profiles.content` and `personas.data`. Every repeatable entry carries a stable `id` (uuid, generated server- or client-side) for editor keys, reorder, and the education picker.

```ts
const MonthYear = z.object({
  month: z.number().int().min(1).max(12).nullable().default(null), // null = year-only
  year:  z.number().int().min(1900).max(2100),
})

const ProfileLink = z.object({
  id: z.string().optional(), // server assigns via ensureIds() (see note below)
  label: z.string().min(1),
  url: z.string().min(1),
})

const ProfileBasics = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(ProfileLink).default([]),
})

const ProfileExperience = z.object({
  id: z.string().optional(), // server assigns via ensureIds() (see note below)
  company: z.string().min(1),
  role: z.string().min(1),
  employmentType: z.enum(['full-time','part-time','contract','freelance','internship','self-employed']).optional(),
  location: z.string().optional(),
  startDate: MonthYear.nullable().default(null),
  endDate: MonthYear.nullable().default(null),
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
}) // requiredness (start required; end unless current) enforced in the input form, not here

const ProfileProject = z.object({
  id: z.string().optional(), // server assigns via ensureIds() (see note below)
  name: z.string().min(1),
  role: z.string().optional(),
  description: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
  links: z.array(ProfileLink).default([]),
  startDate: MonthYear.nullable().default(null),
  endDate: MonthYear.nullable().default(null),
  inProgress: z.boolean().default(false),
})

const ProfileSkillGroup = z.object({
  id: z.string().optional(), // server assigns via ensureIds() (see note below)
  category: z.string().default('Skills'), // default single group = flat behavior
  items: z.array(z.string()).default([]),
})

const ProfileEducation = z.object({
  id: z.string().optional(), // server assigns via ensureIds() (see note below)
  degree: z.string().min(1),
  institution: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  location: z.string().optional(),
  startDate: MonthYear.nullable().default(null),
  endDate: MonthYear.nullable().default(null),
  current: z.boolean().default(false), // "currently studying" -> endDate is expected graduation
  grade: z.string().optional(),
  bullets: z.array(z.string()).default([]),
}) // requiredness (start required; end unless current) enforced in the input form, not here

const ProfileContentSchema = z.object({
  basics: ProfileBasics,
  summary: z.string().default(''),
  experience: z.array(ProfileExperience).default([]),
  projects: z.array(ProfileProject).default([]),
  skills: z.array(ProfileSkillGroup).default([]),
  education: z.array(ProfileEducation).default([]),
})
```

**Two deliberate leniencies in the stored schema** (so AI-parsed résumés, partial edits, and legacy rows always validate):
- **Dates and most fields are optional/nullable at rest.** Field *requiredness* (experience needs a start; end needed unless `current`; education needs start + graduation) is enforced in the **frontend input form** (RHF + a stricter submit check), never in `ProfileContentSchema`. The AI's `generateStructured` validates against this lenient schema, so a résumé with a vague "Summer 2021" or a missing end date never fails structuring.
- **`id` is optional.** The model is never asked to invent ids. The backend runs an `ensureIds(content)` normalizer (`crypto.randomUUID()` for any missing entry/link id) on every write (`PUT /api/profile`, persona create/update), on `parse-resume` output, and during lazy normalization of legacy rows — so persisted data always carries stable ids and the editor can rely on them.

`ResumeContent` (`shared/resume-content.schema.ts`) is **unchanged** — it remains the AI's résumé-generation output shape and the renderers' input.

### 4.2 New `user_profiles` table

`backend-express/src/db/schema/user-profiles.ts`:

| column | type | notes |
|---|---|---|
| `id` | uuid PK | `defaultRandom()` |
| `userId` | uuid notNull **unique** | FK → `users.id` ON DELETE CASCADE |
| `content` | jsonb notNull | `$type<ProfileContent>()` |
| `createdAt` / `updatedAt` | timestamptz notNull | `defaultNow()` |

One row per user (upserted). Re-export from `db/schema/index.ts`; ensure `drizzle.config.ts` covers it. Migration **`0007`** (generate via `db:generate`, never hand-numbered).

### 4.3 `personas.data` retype

`personas.data` changes from `$type<ResumeContent>()` → `$type<ProfileContent>()`. Same `jsonb` column — **no DDL change**, only the TS `$type` and the Zod validation. Existing rows handled by §8 migration.

## 5. Backend

### 5.1 New `profile` module (`src/modules/profile/`)

Standard layered module (`router → controller → service → repository → schema`):
- `GET /api/profile` → returns the user's `ProfileContent` (creates an empty default `{ basics: { name: <user name or '' > }, summary:'', experience:[], projects:[], skills:[], education:[] }` lazily if none exists).
- `PUT /api/profile` → upsert `{ content: ProfileContent }` (full replace, validated).
- Guarded by `authMiddleware`; scoped by `userId`; success/error envelopes as usual.

### 5.2 `personas` module changes

- `persona.data` type/validation → `ProfileContent`.
- **Create is no longer AI-mandatory.** `POST /api/personas` accepts `{ name, data: ProfileContent }` and saves directly (cap check, no AI). This serves *both* modes (manual builds `data` from picks; import pre-fills `data` via the parse endpoint, user reviews, then saves).
- `PATCH /api/personas/:id` accepts `{ name?, data?: ProfileContent }` (full-object replace of `data`).
- **New `POST /api/personas/parse-resume`** (AI helper, does not create a persona):
  - Accepts `multipart/form-data` with an optional `file` (PDF) and/or a `text` field.
  - If `file`: extract text in-memory via `pdf-parse` (memory storage `multer`; nothing persisted). Else use `text`.
  - Fail fast if at persona cap or over the AI hourly rate limit (`assertWithinRateLimit`).
  - `geminiService.generateStructured(buildStructurePrompt({ pastedResume: text }), ProfileContentSchema)` → returns `{ data: ProfileContent }` for the editor to pre-fill.
  - **Counts against the shared AI hourly limit** (the only persona path that does).
- `rawInput` retained (audit) — set to the extracted/pasted text on import; null for manual.

### 5.3 AI changes (`src/modules/ai/`)

- **Structuring target → `ProfileContent`.** `buildStructurePrompt` + `SCHEMA_GUIDE` describe the rich `ProfileContent` shape, including `MonthYear` dates (`{ month: 1-12 | null, year }`), `technologies[]`, project `links[]`, education `grade`, and the `current`/`inProgress` flags. `generateStructured(..., ProfileContentSchema)` validates output.
- **Generation prompts read richer input, unchanged output.** `buildResumePrompt` / `buildCoverLetterPrompt` `JSON.stringify` the `ProfileContent` as "CANDIDATE BACKGROUND (authoritative facts)". The AI still **outputs `ResumeContent`** (résumé) / Markdown (cover letter). Add a one-line note in the prompt that dates arrive as `{month, year}` and should be rendered as human strings (e.g. "Jan 2022 – Present"). **No `ResumeContentSchema` change, no deriver change.**
- `GET /api/ai/status` unchanged (`{ enabled, maxPersonas }`).

### 5.4 New dependencies
- `pdf-parse` (in-memory PDF → text), `multer` (memory storage, the parse endpoint's multipart handling). Both validated to work with Express 5. No file storage, no Cloudinary.

## 6. Frontend

### 6.1 Shared primitives (each its own component, per repo convention)
In `src/components/profile/` (or `src/components/ui/` where generic):
- `MonthYearPicker` — two adjacent selects (Month name | Year); month optional (year-only); pairs with a `current`/`inProgress` checkbox that disables the end picker and shows "Present".
- `ChipInput` — type-and-add chips with remove (skills items, project technologies).
- `BulletListEditor` — repeatable bullet rows (reuse/extract from the existing editor's bullet handling).
- `LinksEditor` — repeatable `label + url` rows (basics + projects).
- `RepeatableSection` — generic add/remove/reorder wrapper for entry lists.

### 6.2 `/app/profile` page + `ProfileEditor`
- New route `app/app/profile/page.tsx` + `ProfileEditor` composed of section editors: `BasicsEditor`, `SummaryEditor`, `ExperienceEditor`, `ProjectsEditor`, `SkillsEditor`, `EducationEditor` — each built from the primitives above. Save via `PUT /api/profile`.
- New `useProfile` / `useUpdateProfile` hooks (TanStack Query, same envelope/conventions as `usePersonas`). Add a nav entry.

### 6.3 Persona creation — two modes
Replace `create-persona-wizard.tsx` with a mode chooser:
- **"Build from profile"** — for each section, a multi-select **picker of profile items** + **"Add all"** + **"Add custom"**. Selected/added items become **editable copies** rendered with the same section editors. **Education is pick-only** (checkbox list of profile degrees; no add, no inline edit; a "Manage in profile" link). Basics + summary pre-filled from profile, editable.
- **"Import a résumé"** — paste text *or* upload PDF → `POST /api/personas/parse-resume` → pre-fills the same editor for review/edit → save.
- Both modes end at the **same review-and-save editor** and `POST /api/personas { name, data }`.

### 6.4 Persona editing
Replace the current persona editor (`edit-persona-sheet.tsx` + flat `ResumeContentEditor`) with the rich `ProfileEditor` (persona variant: education is pick-only). The **generated-résumé** editor on `/app/resumes` keeps using the flat `ResumeContentEditor` on `ResumeContent` — **unchanged**.

## 7. What stays untouched
`shared/resume-content.schema.ts`; the `.tex` deriver (`resume-tex.ts`) + golden tests; react-pdf `ResumeDocument` + `resume-preview.tsx` / `download-pdf-button.tsx`; `generated_resumes` / `cover_letters` tables; the résumé/cover-letter generation flow shape and their tests; `ResumeContentEditor` (still used for generated-résumé editing).

## 8. Migration

- **`0007`** adds the `user_profiles` table.
- **Persona up-conversion** (`ResumeContent` → `ProfileContent`): a pure function `resumeContentToProfileContent(legacy): ProfileContent` (co-located with the schema, golden-tested):
  - basics/summary copy; assign `id`s to links/entries.
  - experience: `date: string` → `{ startDate, endDate, current }` via a tolerant parser (`split on –/-/to`; right side matching `/present|current|now/i` → `current:true, endDate:null`; each side `MonthName YYYY` / `MM/YYYY` / bare `YYYY` → `{month?, year}`). **Unparseable → set the date(s) to `null` and stash the original string in a leading bullet** so nothing is lost (the lenient stored schema accepts null dates).
  - projects: `tagline` → `description`; `url` → `links:[{label:'Link', url}]`; `technologies` default `[]`.
  - skills: `items: string[]` kept as-is under each group.
  - education: `period: string` → `{ startDate, endDate, current }` via the same parser.
- Applied via **lazy normalization on read** (the persona repository normalizes any legacy-shaped row through `resumeContentToProfileContent` before returning) plus a **one-off backfill script** to persist. Dev data, low stakes — lazy normalization guarantees no read-time crash even before backfill runs.

## 9. Testing strategy
- **Backend (Vitest):** `ProfileContentSchema` validation + defaults, incl. **accepting partial/AI-shaped data with missing dates and missing ids**, and `ensureIds` filling them; `profile` repository (real Postgres) + service; persona create-from-data (no AI) + `parse-resume` (mocked Gemini, mocked `pdf-parse`); `resumeContentToProfileContent` golden tests over a corpus of real `date`/`period` strings (incl. unparseable fallbacks); `buildStructurePrompt` snapshot for the `ProfileContent` guide.
- **Frontend (Vitest + RTL):** `MonthYearPicker` / `ChipInput` / `LinksEditor` / `BulletListEditor` primitives; `ProfileEditor` section add/remove/edit; persona "Build from profile" picker logic (add all / add custom / education pick-only); `useProfile` hook; `next build` green.
- **Smoke:** against the Docker stack with `GEMINI_API_KEY` — create profile, build a persona from it, import a PDF résumé, generate a résumé + cover letter end-to-end (verifies the unchanged generation pipeline still works off `ProfileContent`).

## 10. Suggested sub-slicing
- **Slice 7a** — `ProfileContent` schema + `user_profiles` table (migration `0007`) + `profile` module (`GET`/`PUT`) + `/app/profile` page with the rich `ProfileEditor` and shared primitives. Persona up-conversion function + lazy normalization land here (so `personas.data` reads stay safe).
- **Slice 7b** — persona redesign: two creation modes ("Build from profile" pickers + "Import a résumé" with `parse-resume`/`pdf-parse`/`multer`), AI structuring retarget to `ProfileContent`, persona editor swap to the rich editor, generation-prompt note tweak, backfill script.

## 11. Deferred / out of scope
- Onboarding flow that collects profile data (separate, later — this slice gives it a home).
- Professional title/headline on the résumé header (needs renderer change).
- DOCX import; client-side PDF parsing; proficiency levels; skill autocomplete/suggestions.
- Bootstrapping the **profile** from an imported résumé (the `parse-resume` endpoint could pre-fill the profile editor too — easy follow-on).
- Removing the dormant `users.masterProfileJson` / `masterResumeUrl` columns (final-cleanup slice).

## 12. Key file anchors
- Schema: `backend-express/src/shared/{profile-content.schema.ts (new), resume-content.schema.ts (unchanged)}`
- DB: `backend-express/src/db/schema/{user-profiles.ts (new), personas.ts (retype), index.ts}`, `drizzle.config.ts`, `src/db/migrations/0007_*`
- Backend modules: `backend-express/src/modules/{profile/ (new), personas/, ai/{ai.prompts.ts, gemini.service.ts, ai.rate-limit.ts}}`, downstream `modules/{resumes,cover-letters}/*` (prompt input only)
- Frontend: `frontend-next/src/app/app/profile/page.tsx (new)`, `src/components/profile/* (new)`, `src/components/personas/*`, `src/hooks/{use-profile.ts (new), use-personas.ts}`, `src/types/profile.ts (new)`
