# Slice 7c — Cover Letters Workspace + Paste-a-JD Generation — Design Spec

> **STATUS: approved design (surveyed + decided 2026-06-12).** User picked **option C with C1** after a 7-agent market survey. Next step: a bite-sized TDD plan (`docs/superpowers/plans/`), then implement — same loop as Slices 7a/7b. Slots in **before the Chrome extension (Slice 8)**.

## 1. Context & goal

Cover letters today (Slice 6c) can only be generated from a **tracked job's drawer** — `POST /api/cover-letters` hard-requires `jobId`, and the JobDrawer's cover-letter section is the only UI surface. There is no place to browse all letters and no way to write a letter for a job you haven't tracked (cold/speculative applications).

Goal: a standalone **`/app/cover-letters` workspace** (list + generate + edit) where the job context is either a **tracked job** (picker) or a **pasted description** (title + company + JD text) — the pasted variant stored **on the letter itself**, never materialized as a tracked job.

## 2. Survey findings (2026-06-12, 7 research agents over ~10 tools)

- **Every tracker-type product (Careerflow, Huntr, Jobscan, Teal) has both** a per-job entry point *and* a job-agnostic/dedicated surface; none relies on the job view alone.
- **Paste-a-JD is the industry baseline**; a tracked job is a convenience picker, not a gate. Huntr's hard tracked-job requirement and Zety's old no-JD flow are both criticized. Teal materializes a pasted JD as a tracked job (rejected here — clutters a kanban-centric board with speculative jobs).
- **A letters library is table stakes** in account-based tools. Huntr's no-autosave is universally flagged (JobVault already auto-saves — keep).
- **Careerflow** (closest analog: tracker + AI) is the model: "Application Materials → Cover Letter" workspace; pasted JD+title is the baseline path; tracked job is an optional one-click import; post-generation edit/regenerate + free-text instructions.
- Common-but-not-universal: tone/length presets (Teal: short/medium/long + casual⇄formal; Careerflow: tone/length/language). **Deferred** — our existing `instructions` field covers steering for v1.

## 3. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Standalone surface? | **Yes** — `/app/cover-letters` page + sidebar nav entry (next to Résumés), mirroring the `/app/resumes` workspace pattern. JobDrawer section **stays** as the per-job shortcut. |
| 2 | Job-free generation? | **Paste-a-JD** (title + company required, description text optional-but-encouraged). No fully job-free "generic letter" mode (survey: reviewers call that output generic). |
| 3 | What happens to a pasted JD? (**C1**) | Stored **on the letter** (`adhocJob` jsonb) — no tracked-job row, no board clutter. (Teal-style materialization and an "also add to board" checkbox were considered and rejected/deferred.) |
| 4 | Tone/length controls | Deferred (instructions field suffices; cheap dropdown later). |
| 5 | Job-URL scraping into the paste form | Deferred (natural follow-on — the Cheerio scraper already exists). |

## 4. Data model

`cover_letters` (migration **`0009`**, generate via `db:generate`):
- `job_id` → **nullable** (DDL change).
- New `adhoc_job` jsonb nullable, `$type<AdhocJob>` where `AdhocJob = { title: string; company: string; description?: string }`.
- Invariant: **exactly one** of `jobId` / `adhocJob` per letter — enforced in Zod + service (a DB CHECK is optional if drizzle generates it cleanly).

## 5. Backend (`modules/cover-letters/`)

- `GenerateCoverLetterSchema`: `{ personaId, instructions?, jobId? , job?: { title: min(1), company: min(1), description?: string (bounded, e.g. max 50_000) } }` + refine: exactly one of `jobId`/`job`.
- `generate()`: if `jobId` → current path (ownership check, snapshot from the tracked job). Else → prompt with `{ title: job.title, company: job.company, snapshot: job.description ?? null }` and persist `adhocJob`. Everything downstream identical: profile-basics merge, rate limit (still counted), `buildCoverLetterPrompt` **unchanged**, letter title `${company} — cover letter`.
- `GET /api/cover-letters` already lists all (jobId query optional) — response rows now carry `adhocJob` for display.

## 6. Frontend

- Sidebar nav: **Cover letters** → `app/app/cover-letters/page.tsx` (server-fetch letters + personas + ai status, hydrate like the resumes page).
- `CoverLettersWorkspace` mirroring `resume-workspace.tsx`: **borderless aligned list** (user preference — Linear/Height style, not boxed tables) of all letters — title, company/role (from the tracked job or `adhocJob`), persona, date — selecting one opens the existing **`CoverLetterEditor`** (markdown edit + preview + PDF download, unchanged).
- Generator form: persona picker + **job-source toggle** (`SegmentedControl`: "Tracked job" → jobs dropdown ⇄ "Paste a description" → title/company inputs + JD textarea) + instructions + Generate. Reuse `useCoverLetters` hooks (extend the create body).
- JobDrawer `cover-letter-section.tsx` unchanged (still passes `jobId`).

## 7. What stays untouched
`buildCoverLetterPrompt` (input already `{title, company, snapshot}`); rate limiting (`ai-usage` counts letters); `CoverLetterEditor` / PDF derivation; the JobDrawer flow; résumé generation; personas/profile.

## 8. Testing
Backend: schema XOR validation; service adhoc path (mocked Gemini; `adhocJob` persisted; no job lookup; rate limit + basics merge still apply); router (400 when both/neither job inputs). Frontend: workspace list rendering incl. adhoc letters; generator toggle behavior + payloads; hooks. Gates + a live smoke (tracked-job letter + pasted-JD letter end-to-end).

## 9. Key file anchors
- Backend: `backend-express/src/modules/cover-letters/{cover-letters.schema.ts,cover-letters.service.ts,cover-letters.router.ts}`, `src/db/schema/cover-letters.ts`, migration `0009`.
- Frontend: `frontend-next/src/app/app/cover-letters/page.tsx` (new), `src/components/cover-letters/*` (new workspace; reuse `components/resume/cover-letter-editor.tsx`), `src/hooks/use-cover-letters.ts`, sidebar nav config.
