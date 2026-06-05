# JobVault — Slice 6: AI Résumé & Cover Letter Generation — Design Spec

> Parent specs: [`2026-04-26-…-migration-design.md`](./2026-04-26-nest-to-express-nuxt-to-next-migration-design.md) (architecture + phase roadmap) and [`2026-06-01-app-redesign-…-minimalist-design.md`](./2026-06-01-app-redesign-express-next-minimalist-design.md) (app surface + per-slice resolutions in §9). This is the roadmap's **"File Storage + AI / Gemini"** phase, **re-scoped** (see §1) away from file storage toward AI generation with **text/JSON-only persistence**. Decisions here should be recorded in condensed form as "Slice 6 resolutions (2026-06-05)" in the app-redesign spec §9 once executed.
>
> **Status:** Design approved (2026-06-05) — awaiting implementation plan.

---

## 1. Goal & re-scope

Make JobVault generate **tailored, ATS-clean résumés and cover letters** from the user's background — the headline value of the product. Two deliberate scope changes from the original BE-06/BE-07/FE-07 roadmap:

1. **No file storage this slice.** The original plan was Cloudinary + Multer + PDFKit + a résumé-upload parser. We drop all of it. Nothing is uploaded or stored as a binary. Everything persisted is **text/JSON in Postgres**; every PDF is rendered **on demand, client-side, and never stored**. (Investigation 2026-06-05 confirmed the *old* NestJS/Nuxt stack never actually built cover letters, résumé parsing, or storage — they were UI stubs. Only `users.masterProfileJson`/`masterResumeUrl` columns and a `PATCH /api/auth/profile` existed, and Gemini was wired *only* as a scraper fallback. So this is greenfield.)
2. **Résumé output is structured JSON, not AI-authored LaTeX.** The AI emits **content** (validated JSON / Markdown); the app owns **formatting** in code. This guarantees a consistent, ATS-clean result every run, removes the "AI produced un-compilable LaTeX" failure mode, and lets us render to a `.tex` *and* a PDF with **zero backend rendering toolchain** (no TeX engine, no headless Chromium).

### The architectural keystone

> The AI never produces formatting. It fills a schema; the template (owned in our code) produces the document.

From one `ResumeContent` JSON we deterministically render **(a)** a `.tex` file (string-fill + LaTeX-escape — no compiler) for **Copy / Open in Overleaf**, and **(b)** a PDF via **`@react-pdf/renderer`** (a pure-JS PDF engine in the browser) for **live preview *and* one-click download**. What the user previews *is* the file they download. Consistency and ATS-cleanliness are properties of the template, designed once, inherited by every generation.

## 2. Resolved product decisions (from brainstorming, 2026-06-05)

1. **Personas (not "profiles").** A user keeps up to **5** saved, role-focused versions of their background (e.g. *Backend* vs *Full-stack*). Personas are **separate from jobs**. Picking the right persona yields better-tailored output. The cap is **env-configurable** (`MAX_PERSONAS`, default 5).
2. **Persona input is a hybrid, AI-structured.** The user supplies any of: structured fields (experience / projects / skills / education), a **free-text** textarea, and/or a **pasted existing résumé** (text — *not* a file upload). One Gemini call **structures all of it** into clean `ResumeContent` JSON, which is then **editable**.
3. **Résumé has two modes.** *Persona-only* (job-agnostic) and *persona + a specific job* (tailored to that job's snapshot). Stored as `ResumeContent` JSON. **One fixed template** derived from the user's example `.tex` (§4); ATS-cleanliness is a hard requirement.
4. **Cover letter is per single job**, drawn from a persona (+ optional instructions). Stored as **Markdown**.
5. **Pre-generation instructions.** Before generating either artifact, the user may add a free-text instruction ("emphasize leadership", "≤ 300 words"). Stored alongside the result.
6. **Light, structured editing only — not Canva.** Edit any text · add/remove bullet points · remove an entry / hide a section. **No** drag-reorder (deferred), no fonts/colors/layout/positioning. Cover letter = plain textarea + live Markdown preview.
7. **Outputs.** Résumé: **Copy LaTeX · Open in Overleaf · Download PDF**. Cover letter: **Copy text · Download PDF**. All client-side.
8. **Persistence = DB rows, no files.** Three new tables; `.tex`/PDF derived on demand.
9. **Contact info lives inside each persona** (self-contained résumés). *Open simplification:* could be hoisted to the user and entered once; chosen per-persona for flexibility. Revisit if maintenance friction shows up.
10. **Config via env now, admin dashboard later.** API key, model, rate limit, and persona cap are env knobs, written as clean seams so they migrate to an admin UI without contract churn.

## 3. The `ResumeContent` schema (single source of truth)

The same shape represents a **persona's background** and a **generated résumé** (a résumé is an AI-curated/tailored instance of the same structure). Mapped directly from the user's example `.tex`:

```ts
// types/resume.ts (frontend) + src/modules/<feature>/*.schema.ts (backend Zod) — kept in lockstep
interface ResumeContent {
  basics: {
    name: string
    phone?: string
    email?: string
    location?: string
    links: { label: string; url: string }[]      // e.g. { label: 'LinkedIn', url: '…' }, GitHub, portfolio
  }
  summary: string                                  // Professional Summary paragraph
  experience: {
    company: string
    title: string                                  // designation
    date: string                                   // free-form, e.g. "Jan 2024 - present"
    bullets: string[]                              // may contain **bold** inline markup
  }[]
  projects: {
    name: string
    tagline?: string                               // italic right-aligned line, e.g. "Enterprise Workflow Automation Platform"
    url?: string
    bullets: string[]
  }[]
  skills: {
    category: string                               // "Languages", "Frameworks", "Databases", …
    items: string[]                                // ["JavaScript", "TypeScript", "Java"]
  }[]
  education: {
    degree: string                                 // "Master of Computer Applications"
    institution: string                            // "Brainware University"
    period?: string                                // "2022-2024"
  }[]
}
```

**Inline emphasis.** The example résumé bolds key phrases inside bullets/summary. We support a minimal `**bold**` convention in `summary`, `experience.bullets`, `projects.bullets`, and `projects.tagline`. The AI is instructed to mark impactful phrases with `**…**`. Renderers: `**x**` → `\textbf{x}` (LaTeX, after escaping) and a bold `<Text>` run (react-pdf). No other markup is supported (no italics/links inside bullets). The structured editor shows the raw `**` markers (devs read Markdown; keeps editing a plain text field).

**Section omission = "hide a section."** An empty array (e.g. `projects: []`) renders nothing for that section. The editor's "remove entry" pops array items; removing all items (or a future explicit toggle) hides the section. No separate visibility flag in v1.

## 4. Rendering targets (both derived from `ResumeContent`)

### 4a. `.tex` deriver — backend, pure function

`renderResumeTex(content: ResumeContent): string` reproduces the user's template verbatim in structure (preamble fixed; body string-filled). Key fidelity points from the example:

- Class `article` a4paper 10pt; Helvetica (`helvet` scaled 0.92) as sans default; geometry `top/bottom 0.4in, left/right 0.5in`; `pagestyle{empty}`.
- Colors `headerblue #1A73E8`, `ruleblue #2B6CB0` (section underline rule), `linkblue #0645AD`; `hyperref` colored links.
- Centered `\huge\bfseries` name; centered small pipe-separated contact line (`phone | mailto-email | location | links…`).
- Section = bold large title + blue `\titlerule`.
- Experience entry: `\textbf{company} \hfill date \\ title` + `itemize` bullets (`leftmargin=1em`, `itemsep=1pt`).
- Project entry: `\textbf{name} \hfill \textit{tagline}` (+ optional `\href` url) + bullets.
- Skills: per-category `\textbf{Category:} comma-joined items \\`.
- Education: `\textbf{degree,} institution (period) \\`.

**LaTeX-escaping is mandatory** for every interpolated user string: `\ & % $ # _ { } ~ ^` → their escaped forms, applied **before** expanding the `**bold**` markup into `\textbf{}`. This pure function is golden-tested against the example `.tex` (§9).

### 4b. `ResumeDocument` — frontend, `@react-pdf/renderer`

A React component tree mirroring 4a's visual result (registered sans font, single column, same margins/colors/section rules, real selectable text). Used two ways:

- **Preview:** `@react-pdf/renderer`'s `<PDFViewer>` (or `usePDF`) renders the live PDF in the browser — WYSIWYG identical to the download.
- **Download:** `<PDFDownloadLink>` / `pdf().toBlob()` → a one-click `.pdf`. No backend, no stored file.

**ATS rules baked into the template (designed once):** single column, real text (never an image), standard headings, standard sans font, no tables/text-boxes/icons/graphics. Length varies with content; the template flows to additional pages gracefully (not a formatting break).

### 4c. Open in Overleaf

Client-side: a form-POST of the derived `.tex` to Overleaf's document-open endpoint (`snip`/`snip_uri`). The frontend obtains the `.tex` from `GET /api/resumes/:id/tex` (or the value embedded in the résumé response). No backend Overleaf integration.

## 5. Data model (3 new tables — migration `0004`)

All `userId`-scoped, following the existing Drizzle module conventions (`src/db/schema/*`, re-exported from `index.ts`). No binary columns, no file references.

```
personas
  id            uuid pk
  userId        uuid  → users(id) ON DELETE CASCADE
  name          text  (e.g. "Backend")
  data          jsonb (ResumeContent — the editable structured background)
  rawInput      text  null   (the original free-text / pasted résumé, kept for re-structuring)
  createdAt, updatedAt timestamptz
  -- service enforces ≤ MAX_PERSONAS per user on create

generated_resumes
  id            uuid pk
  userId        uuid  → users(id) ON DELETE CASCADE
  personaId     uuid  → personas(id) ON DELETE CASCADE
  jobId         uuid  → jobs(id)     ON DELETE SET NULL   (null = persona-only mode)
  title         text  null
  instructions  text  null
  content       jsonb (ResumeContent — generated, then user-edited; source of truth)
  createdAt, updatedAt timestamptz

cover_letters
  id            uuid pk
  userId        uuid  → users(id) ON DELETE CASCADE
  jobId         uuid  → jobs(id)     ON DELETE CASCADE     (per single job)
  personaId     uuid  → personas(id) ON DELETE SET NULL    (which background it drew from)
  title         text  null
  instructions  text  null
  bodyMarkdown  text
  createdAt, updatedAt timestamptz
```

`.tex` and PDF are **never** columns — both are derived. `drizzle.config.ts` already points at the schema barrel (Slice 2), so new tables are picked up automatically.

## 6. AI integration (Gemini)

A single framework-agnostic wrapper, mirroring the layered backend pattern (service owns the SDK; controllers/repositories never import it).

- **Dependency:** `@google/genai` added to `backend-express` (currently only in the legacy NestJS stack). Initialized from `GEMINI_API_KEY`; **optional** — absent key ⇒ feature disabled, not a boot failure (same posture as the old scraper).
- **Structured output:** for résumé/persona JSON, call with `responseMimeType: 'application/json'` + a response schema, then **Zod-validate** the result against `ResumeContent`. Invalid/again-malformed output ⇒ `AppError('VALIDATION_ERROR', …)`, never a 500. Cover-letter generation returns Markdown text (no schema).
- **Three prompt builders** (pure functions, unit-testable in isolation from the SDK):
  1. `buildStructurePrompt(rawInputs)` → `ResumeContent` from messy fields + free text + pasted résumé.
  2. `buildResumePrompt(persona.data, job?, instructions?)` → tailored `ResumeContent` (selects/rewrites/emphasizes for the job's `snapshotMarkdown`/title/company; honors instructions; marks emphasis with `**`).
  3. `buildCoverLetterPrompt(persona.data, job, instructions?)` → Markdown cover letter.
- **Model:** `GEMINI_MODEL` env, default `gemini-2.0-flash` (proven in the legacy scraper; fast, cheap, supports structured output), swappable to a newer Flash model without code change.
- **Rate limiting — DB-derived, no extra table.** A generation is allowed only if the user's count of `generated_resumes` + `cover_letters` rows created in the trailing hour is `< AI_RATE_LIMIT_PER_HOUR` (default 10). Survives restarts; accurate; zero new schema. Exceeded ⇒ `AppError` mapping to HTTP 429.
- **Testing posture:** the SDK client is injected/seam-mocked so **automated tests never call the real API**; prompt builders, schema validation, rate-limit math, `.tex` deriver, and controllers (Supertest, Gemini mocked) are all deterministic. A real key is used only for the manual Docker smoke.

## 7. API surface (backend-express)

Success envelope `{ data, meta? }`, error envelope `{ statusCode, message, error, details? }` — unchanged. All routes `authMiddleware`-guarded and `userId`-scoped. New modules: `personas`, `resumes`, `cover-letters`, and a shared `ai` service (Gemini wrapper + status).

| Method & path | Body / query | Behavior | Returns |
|---|---|---|---|
| `GET /api/ai/status` | — | capability probe | `{ enabled: boolean, maxPersonas: number }` (enabled=false when no key; the persona cap rides here so the list endpoint stays a plain collection) |
| `GET /api/personas` | — | list user's personas | `{ data: Persona[] }` (count derived client-side as `length`; cap from `/api/ai/status`) |
| `POST /api/personas` | `{ name, inputs: { fields?, freeText?, pastedResume? } }` | **AI-structures** inputs → enforces cap → saves | `201 { data: Persona }` |
| `GET /api/personas/:id` | — | one (owned) | `{ data: Persona }` |
| `PATCH /api/personas/:id` | `{ name?, data? }` | user's manual edits to structured background | `{ data: Persona }` |
| `DELETE /api/personas/:id` | — | delete | `204` |
| `POST /api/resumes` | `{ personaId, jobId?, instructions? }` | **generate** (rate-limited) → save | `201 { data: Resume }` |
| `GET /api/resumes` | `?jobId=` (optional) | list (optionally by job) | `{ data: Resume[] }` |
| `GET /api/resumes/:id` | — | one | `{ data: Resume }` |
| `GET /api/resumes/:id/tex` | — | derived `.tex` for Copy/Overleaf/download | `{ data: { tex: string } }` |
| `PATCH /api/resumes/:id` | `{ title?, content? }` | save user edits to `content` | `{ data: Resume }` |
| `DELETE /api/resumes/:id` | — | delete | `204` |
| `POST /api/cover-letters` | `{ jobId, personaId?, instructions? }` | **generate** (rate-limited) → save | `201 { data: CoverLetter }` |
| `GET /api/cover-letters` | `?jobId=` | list (optionally by job) | `{ data: CoverLetter[] }` |
| `GET /api/cover-letters/:id` | — | one | `{ data: CoverLetter }` |
| `PATCH /api/cover-letters/:id` | `{ title?, bodyMarkdown? }` | save edits | `{ data: CoverLetter }` |
| `DELETE /api/cover-letters/:id` | — | delete | `204` |

`NOT_FOUND` on missing/non-owned rows; generation when `!enabled` ⇒ clear `AppError` (HTTP 503). PDF and Overleaf are **client-only** — no endpoints.

## 8. Frontend surfaces (frontend-next)

Server-Components-by-default, `'use client'` pushed to interactive leaves; TanStack Query hooks; primitives reused/extended in `src/components/ui/` per CLAUDE.md (any styled element is its own component — no inline styled markup).

- **`/app/personas`** — manage the ≤5 personas. A **create wizard**: choose source (paste résumé / fill fields / free text, combinable) → *Structure with AI* → review & edit the structured result → save. Also the home for **persona-only résumé** generation. Surfaces the `count/max` cap.
- **JobDrawer tabs** — add **"Résumé"** and **"Cover letter"** tabs to the existing drawer, for **job-tailored** generation in context: pick persona → optional instructions → Generate → preview + light edit → output actions.
- **New components** (each a real component, none inline): `PersonaWizard`, `PersonaList`/`PersonaCard`, `ResumeDocument` (react-pdf template), `ResumePreview` (`<PDFViewer>` wrapper), `ResumeEditor` (structured fields: text edit, add/remove bullet, remove entry), `CoverLetterEditor` (textarea + Markdown preview), `GenerateBar` (persona select + instructions field + Generate), and `CopyButton` / `OpenInOverleafButton` / `DownloadPdfButton`.
- **Hooks:** `usePersonas`, `useResumes`, `useCoverLetters` (+ `useAiStatus`). Generate affordances are hidden/disabled when `useAiStatus().enabled` is false.
- **Design:** minimalist-ui skill — warm-stone base, flat muted-indigo accent, Geist/Geist Mono/Instrument Serif, hairline borders, dark-mode first-class.

## 9. Error handling & testing

**Error handling**
- **No API key:** `ai/status.enabled = false`; UI hides Generate; any generation endpoint returns a clear `AppError` ("AI features are not configured") → 503. Existing non-AI features (jobs, board, timeline…) are unaffected.
- **Gemini failure / malformed output:** caught in the service; Zod rejects bad JSON → `VALIDATION_ERROR`; never a 500.
- **Rate limit exceeded:** `AppError` → 429 with a friendly message.
- **Ownership:** every read/write filters by `userId`; missing/non-owned → `NOT_FOUND`.

**Testing** (backend Vitest + real-Postgres repository tests; frontend Vitest + RTL)
- **Pure functions:** `renderResumeTex` golden test vs the example `.tex` (incl. LaTeX-escaping of `% & _ …` and `**bold**` → `\textbf`); prompt builders; rate-limit math.
- **Schema:** Zod `ResumeContent` accept/reject cases (the AI-output guard).
- **Services:** NOT_FOUND/ownership; cap enforcement (6th persona rejected); generation with a **mocked Gemini client** (deterministic JSON/Markdown); rate-limit gate.
- **Controllers:** Supertest for all endpoints incl. `ai/status` both states, 401 unauth, 429 over-limit, 503 no-key.
- **Frontend:** `ResumeDocument` structural render; `ResumeEditor` (edit text, add/remove bullet, remove entry → content updates); `CoverLetterEditor`; hooks; wizard happy path. **No real API calls** in automated tests.
- **Manual Docker smoke** (real `GEMINI_API_KEY`, via the `:8080` proxy): create persona from pasted résumé → generate persona-only résumé → preview + edit + Copy LaTeX + Download PDF + Open in Overleaf; on a job → generate tailored résumé + cover letter from the JobDrawer; verify no-key disables cleanly and the rate limit trips at the configured count.

## 10. Configuration (env)

Validated by `config/env.ts` (Zod, fail-fast) — all optional with sane defaults so the stack boots without AI:

| Var | Default | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | (unset) | Enables AI. Unset ⇒ `ai/status.enabled=false`, generation 503s. |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Generation model; swappable. **Note:** `gemini-2.0-flash` is deprecated; free-tier quota is per-model/project so the working model varies by key (verified 2026-06: a free key ran `gemini-3.5-flash` and `gemini-2.5-flash-lite` but not `gemini-2.0-flash`). |
| `AI_RATE_LIMIT_PER_HOUR` | `10` | Max résumé+cover-letter generations/user/trailing-hour. |
| `MAX_PERSONAS` | `5` | Persona cap per user. |

Knobs are read through a small config seam (not scattered `process.env` reads) so an admin dashboard can later override them per-user/plan without touching call sites.

## 11. Suggested decomposition (build as 3 sub-slices, like Slice 4)

- **6a — Personas + Gemini foundation.** `@google/genai` wrapper + `config/env` additions + `GET /api/ai/status` + DB-derived rate-limit helper; `personas` table (migration `0004`) + module + AI-structuring (`POST /api/personas`, CRUD); `types/resume.ts` + Zod `ResumeContent`; `/app/personas` wizard + management UI. **Exit:** create/edit/delete a persona, structured from pasted text, gated by the cap.
- **6b — Résumé generation.** `resumes` module (generate + CRUD + `/tex`), `renderResumeTex` deriver (golden-tested); frontend `ResumeDocument` (react-pdf), `ResumePreview`, `ResumeEditor`, `GenerateBar`, Copy/Overleaf/DownloadPdf; **persona-only** mode on `/app/personas` and **job mode** scaffold. **Exit:** generate → preview → light-edit → all three outputs work.
- **6c — Cover letters + JobDrawer wiring.** `cover-letters` module (generate + CRUD); `CoverLetterEditor` (textarea + Markdown preview) + Copy/PDF; wire the **Résumé + Cover-letter tabs into the JobDrawer** for job-tailored generation. **Exit:** from a job, generate a tailored résumé and cover letter end-to-end.

Each sub-slice: TDD, commit-per-task, ground-truth gate (typecheck + lint + tests + Docker prod build) + adversarial review, per the Slice 4/5 pattern. No `git push`; no "Claude" in commit messages.

## 12. Out of scope / deferred

- **File storage** (Cloudinary), **stored PDFs**, **résumé *file* upload + binary parsing** (we parse *pasted text* only), and a **server-side LaTeX→PDF compiler** (Tectonic/Chromium). The structured-JSON model makes any of these a cheap, additive future slice with no rework.
- **Multiple résumé templates** (one fixed template now; the deriver + `ResumeDocument` are written so a second template is additive).
- **Drag-reorder** of entries/bullets in the editor (v1 is add/remove/edit/remove-entry).
- **Rich-text (WYSIWYG) cover letters** (Markdown now).
- **Per-user/plan AI quotas via admin dashboard** (env knobs now; seams ready).
- **Hoisting contact info to the user** (per-persona now; §2.9).
- **AI for the job scraper** (the Express scraper is intentionally Cheerio/Turndown-only; unchanged here).

---

### Self-review note
Single-implementation-plan scope is large but cleanly separable into 6a/6b/6c (§11), each independently shippable. No placeholders. No file/binary handling anywhere (consistent with §1). Contracts in §7 are explicit enough to derive the plan without re-reading the legacy stack.
