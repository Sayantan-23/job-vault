# Global Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One search across jobs, résumés, cover letters, personas and saved answers, opened from a trigger beside the notification bell.

**Architecture:** A single `GET /api/search?q=` runs one `UNION ALL` over the five tables, user-scoped, ranked at query time by Postgres FTS blended with `pg_trgm` similarity — no stored `tsvector`, no GIN index, no sync code (`d-0c5wyy`). The palette is a morphing card built over Radix `DialogPrimitive`, so focus trap, Escape, scroll lock and focus return come from the primitive and reduced-motion degrades to a plain centred dialog (`d-0cbc74`).

**Tech Stack:** Express 5 + Drizzle + PostgreSQL 16, Next.js 16 + React 19, TanStack Query v5, Tailwind v4, Vitest.

**Tracker:** `t-0c5wyz` · decisions `d-0c5wyy` (Postgres FTS, not a search engine), `d-0cbc74` (morph over Radix Dialog)

**Explicitly out of scope:** `t-0021` (the `/app/resumes/[id]` route and the `lg`→`xl` split). `?resume=<id>` already works — `resume/resumes-page-client.tsx:11` reads it — so search needs nothing there.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend-express/src/db/migrations/0014_*.sql` | `CREATE EXTENSION IF NOT EXISTS pg_trgm` |
| `backend-express/src/modules/search/search.schema.ts` | Zod query schema + result types |
| `backend-express/src/modules/search/search.repository.ts` | The `UNION ALL`, generated from a source descriptor list |
| `backend-express/src/modules/search/search.service.ts` | Short-query guard, passthrough |
| `backend-express/src/modules/search/search.controller.ts` | `requireUserId`, `{ data }` envelope |
| `backend-express/src/modules/search/search.router.ts` | `authMiddleware` + one GET |
| `backend-express/src/shared/api-router.ts` | Mount `/search` |
| `frontend-next/src/types/search.ts` | `SearchResult`, `searchResultHref` |
| `frontend-next/src/lib/query-keys.ts` | `searchKey(q)` |
| `frontend-next/src/lib/queries.ts` | `searchQuery(q)` — key + path, per the repo's key/query split |
| `frontend-next/src/hooks/use-search.ts` | Debounced `useQuery`, gated at 2 chars |
| `frontend-next/src/components/search/search-trigger.tsx` | The circular button, used in both clusters |
| `frontend-next/src/components/search/search-palette.tsx` | Morph shell + combobox behaviour |
| `frontend-next/src/components/search/search-results.tsx` | Grouped listbox |
| `frontend-next/src/components/search/search-result-row.tsx` | One option + highlight rendering |
| `frontend-next/src/styles/globals.css` | Morph geometry vars + reduced-motion fallback |
| `frontend-next/src/components/layout/app/app-shell.tsx` | Mount beside the bell (`lg` and up) |
| `frontend-next/src/components/layout/app/mobile-header.tsx` | Mount beside the bell (below `lg`) |
| `frontend-next/src/components/jobs/search-input.tsx` | Give up the ⌘K binding |
| `frontend-next/src/components/personas/personas-workspace.tsx` | `?persona=<id>` deep link |

**Ordering rationale:** the extension must exist before the query uses `similarity()`; the backend must exist before the hook; the hook before the UI that renders it; the mounts last, because they are the only irreversible-looking change to shared layout.

---

## Task 1: `pg_trgm` extension migration

Drizzle-kit generates migrations from schema objects and there is no schema object for an extension, so `db:generate` cannot produce this one. Write the SQL file by hand and register it in the journal.

**Files:**
- Create: `backend-express/src/db/migrations/0014_add_pg_trgm.sql`
- Modify: `backend-express/src/db/migrations/meta/_journal.json`

- [x] **Step 1: Write the migration**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

- [x] **Step 2: Register it**

Append an entry to `meta/_journal.json` mirroring the shape of the `0013` entry: `idx: 14`, `version` and `when` copied from the sibling entries' format, `tag: "0014_add_pg_trgm"`, `breakpoints: true`.

- [x] **Step 3: Verify**

`make up` (the backend runs `db:migrate` on boot), then:

```bash
docker compose exec postgres psql -U postgres -d jobvault -c "select extname from pg_extension where extname='pg_trgm'"
```

Must return one row. Also confirm `select similarity('google','goggle')` returns a float — that is the capability the query depends on.

---

## Task 2: The search module

Mirror `src/modules/answers/` exactly — same file split, same envelope, same error paths.

**Files:**
- Create: `search.schema.ts`, `search.repository.ts`, `search.service.ts`, `search.controller.ts`, `search.router.ts` under `backend-express/src/modules/search/`
- Modify: `backend-express/src/shared/api-router.ts`
- Test: `backend-express/src/modules/search/search.repository.test.ts`

- [x] **Step 1: Write the failing repository test**

Mirror `answers.repository.test.ts` — same `beforeAll` user seeding, same `afterAll` cleanup, real Postgres at `localhost:5433`, no mocks. Seed **two** users and one row of each of the five types for user A. Assert:

- a term in `jobs.title` returns that job with `type: 'job'`
- a term only in `jobs.snapshotMarkdown` still returns it (FTS covers the body)
- a one-character typo against a persona `name` returns it (this is the `pg_trgm` path and it fails without Task 1)
- user B's identical rows are **never** returned for user A
- a term matching nothing returns `[]`
- no single type can occupy more than 5 of the returned rows

- [x] **Step 2: `search.schema.ts`**

```ts
export const SearchQuerySchema = z.object({ q: z.string().trim().min(1).max(200) })

export type SearchResultType = 'job' | 'resume' | 'coverLetter' | 'persona' | 'answer'

export type SearchResult = {
  type: SearchResultType
  id: string
  title: string
  subtitle: string | null
  snippet: string | null
}
```

- [x] **Step 3: `search.repository.ts`**

Do **not** hand-write five near-identical SQL blocks. Declare the five sources once and generate the branches — there are exactly five instances today, so this is deduplication, not speculative abstraction:

```ts
const SOURCES = [
  { type: 'job',        table: jobs,             title: jobs.title,             subtitle: jobs.company, fts: [jobs.title, jobs.company, jobs.snapshotMarkdown], trgm: jobs.title,             snippet: jobs.snapshotMarkdown },
  { type: 'resume',     table: generatedResumes, title: generatedResumes.title, subtitle: null,         fts: [generatedResumes.title, generatedResumes.instructions], trgm: generatedResumes.title, snippet: generatedResumes.instructions },
  { type: 'coverLetter',table: coverLetters,     title: coverLetters.title,     subtitle: null,         fts: [coverLetters.title, coverLetters.instructions, coverLetters.bodyMarkdown], trgm: coverLetters.title, snippet: coverLetters.bodyMarkdown },
  { type: 'persona',    table: personas,         title: personas.name,          subtitle: null,         fts: [personas.name, personas.rawInput], trgm: personas.name,          snippet: personas.rawInput },
  { type: 'answer',     table: questionAnswers,  title: questionAnswers.question,subtitle: null,        fts: [questionAnswers.question, questionAnswers.answerShort, questionAnswers.answerLong], trgm: questionAnswers.question, snippet: questionAnswers.answerLong },
]
```

Per source, build a branch with a `drizzle-orm` `sql` fragment (see `jobs.repository.ts:20` for the existing raw-SQL idiom):

```sql
(select '<type>'::text as type,
        <id>::text as id,
        <title> as title,
        <subtitle-or-null> as subtitle,
        <snippet> as snippet_source,
        greatest(ts_rank(<ftsvec>, plainto_tsquery('english', $q)),
                 similarity(<trgm>, $q)) as rank
   from <table>
  where <user_id> = $uid
    and (<ftsvec> @@ plainto_tsquery('english', $q) or similarity(<trgm>, $q) > 0.3)
  order by rank desc
  limit 5)
```

where `<ftsvec>` is `to_tsvector('english', concat_ws(' ', <fts cols>))`. Use `concat_ws`, not `coalesce` chains — it skips NULLs, and a single NULL in a plain `||` concat nulls the whole expression.

Join the five branches with `union all` (`sql.join`), then wrap:

```sql
select type, id, title, subtitle,
       ts_headline('english', snippet_source, plainto_tsquery('english', $q),
                   'StartSel=<STX>,StopSel=<ETX>,MaxWords=18,MinWords=5,MaxFragments=1') as snippet
  from ( <union all> ) hits
 order by rank desc
 limit 20
```

`ts_headline` goes in the **outer** query so it runs on ~20 surviving rows, not on every job description in the table.

> **Security — do not simplify this away.** `ts_headline`'s default `StartSel`/`StopSel` are `<b>`/`</b>`, i.e. HTML, and one snippet source is `jobs.snapshotMarkdown`, which is **scraped from third-party job pages**. Rendering that as HTML is a stored-XSS path. Use the control characters `\x02` (STX) and `\x03` (ETX) as the delimiters instead and split on them client-side into React nodes. No `dangerouslySetInnerHTML` anywhere in this feature.

- [x] **Step 4: service, controller, router**

Service: return `[]` when the trimmed query is under 2 characters — the client debounces and will fire at one character, and an error there is noise, not a fault. Otherwise delegate to the repository.

Controller: `requireUserId(req)`, `{ data }` envelope, 200. Router: `router.use(authMiddleware)` then `router.get('/', asyncHandler(searchController.search))`. Query-param validation follows the **jobs** module's pattern (`answers` has no query params to copy).

Mount in `src/shared/api-router.ts` beside the others: `router.use('/search', searchRouter)`.

- [x] **Step 5: Verify**

```bash
make test-backend && make typecheck && make lint
```

All new tests green, no pre-existing test broken.

---

## Task 3: Frontend data layer

**Files:**
- Create: `frontend-next/src/types/search.ts`, `frontend-next/src/hooks/use-search.ts`
- Modify: `frontend-next/src/lib/query-keys.ts`
- Test: `frontend-next/src/types/search.test.ts`

- [x] **Step 1: Failing test for the href mapper**

`searchResultHref` is a pure total function over the five types; test one case per type against the table below. This is the check that catches a route drifting later.

| Type | Href |
|---|---|
| `job` | `/app/jobs?job=<id>` |
| `coverLetter` | `/app/cover-letters/<id>` |
| `answer` | `/app/answers?answer=<id>` |
| `resume` | `/app/resumes?resume=<id>` |
| `persona` | `/app/personas?persona=<id>` |

- [x] **Step 2: Types + mapper + hook**

Mirror `hooks/use-answers.ts` for the apiClient and query-key idiom. One `useQuery`, keyed on the **debounced** term, `enabled: q.trim().length >= 2`, `placeholderData: keepPreviousData` so results do not flash empty between keystrokes.

- [x] **Step 3: Verify** — `make test-web && make typecheck`

---

## Task 4: The palette shell

The morph, per `d-0cbc74`. Read that decision before starting.

**Files:**
- Create: `frontend-next/src/components/search/search-trigger.tsx`, `search-palette.tsx`
- Modify: `frontend-next/src/styles/globals.css`
- Test: `frontend-next/src/components/search/search-palette.test.tsx`

- [x] **Step 1: Failing behaviour test**

Assert the parts that are not visual: ⌘K opens it, Escape closes it, ArrowDown moves `aria-activedescendant` through the options, Enter navigates to the active option's href, and the input carries `role="combobox"` with `aria-expanded` / `aria-controls`.

- [x] **Step 2: Build it**

- `SearchTrigger` — a `size-9 rounded-full` button matching the bell's geometry in `notification-bell.tsx:48`. Same component in both clusters.
- `SearchPalette` — controlled `DialogPrimitive.Root`. On open, read `getBoundingClientRect()` off **the trigger that was clicked** and write `--jv-search-x` / `--jv-search-y` onto the content element. That is what makes one component work from both the desktop cluster and the mobile header with no branching.
- Style `DialogPrimitive.Content` as the card and animate geometry off `data-[state=open]` / `data-[state=closed]`, the same attribute hook `sheet.tsx` and `anchored-popover.tsx` already use. ~300ms, `cubic-bezier(0.22, 1, 0.36, 1)`.
- Hide the real trigger while open (`opacity-0 pointer-events-none`); the card carries its own close control at its right edge so the icon reads as one element travelling. Radix still returns focus to the real trigger on close.
- Results region expands with `grid-template-rows: 0fr → 1fr` — auto height without measuring.
- `motion-reduce:` drops the geometry transition and lands the card centred. **This is also the fallback if the morph is rejected**, so verify it renders correctly as a plain dialog.
- Combobox semantics are not optional and Radix Dialog supplies none of them: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, a `role="listbox"` of `role="option"` rows, arrow keys, Enter, Escape.

- [x] **Step 3: Verify** — `make test-web`

---

## Task 5: Results list

**Files:**
- Create: `frontend-next/src/components/search/search-results.tsx`, `search-result-row.tsx`
- Test: `frontend-next/src/components/search/search-result-row.test.tsx`

- [x] **Step 1: Failing test for highlight rendering**

Given a snippet containing `\x02term\x03`, the row renders `term` inside a `<mark>` and the surrounding text as plain nodes. Add a case where the snippet contains `<script>` or `<img onerror=…>` literal text and assert it is rendered as **text**, not parsed as markup. That test is the standing guard on the XSS path named in Task 2.

- [x] **Step 2: Build it**

Split the snippet on the STX/ETX sentinels into an array of `{ text, marked }` and map to React nodes. Group rows by `type` under a small label per group; keep the flat DOM order matching the ranked order so arrow-key traversal stays in rank order. Empty state and a loading state consistent with the existing list pages.

- [x] **Step 3: Verify** — `make test-web`

---

## Task 6: Mount the palette, hand over ⌘K

**Files:**
- Modify: `frontend-next/src/components/layout/app/app-shell.tsx`, `mobile-header.tsx`, `frontend-next/src/components/jobs/search-input.tsx`

- [x] **Step 1: Mount**

`app-shell.tsx:46` — add the trigger beside `NotificationBell` inside the `jv-content-col` cluster, with the same `pointer-events-auto`. `mobile-header.tsx:90` — add it to the `ml-auto` row before the bell. The cluster is `lg:block` only, which is exactly why both mounts are needed.

- [x] **Step 2: Take the chord**

`jobs/search-input.tsx:51-60` binds ⌘K on `window`, so it fires on every page mounting that field. Delete that effect — the palette owns the chord now. The jobs field keeps its debounce, its clear button and its focus behaviour; it just loses the global shortcut.

- [x] **Step 3: Verify** — `make test-web` (the existing `search-input` test asserting the shortcut must be updated to assert it is gone, not deleted outright).

---

## Task 7: `?persona=<id>` deep link

The only missing deep link of the five.

**Files:**
- Modify: `frontend-next/src/components/personas/personas-workspace.tsx`
- Test: `frontend-next/src/components/personas/personas-workspace.test.tsx`

- [x] **Step 1: Failing test** — with `?persona=<id>` in the URL, the `EditPersonaSheet` for that persona is open; clearing it closes the sheet.

- [x] **Step 2: Build it**

`personas-workspace.tsx:23` holds `editing` in local `useState`. Drive it from `useSearchParams()` instead, mirroring how `AnswersIndex` reads `?answer=` and how its `close()` deletes the param and re-pushes. Do not add a second pattern — copy the answers one.

- [x] **Step 3: Verify** — `make test-web`

---

## Final verification

- [x] `make gates` — typecheck + lint + both suites + production web build, once, green.
- [x] Browser pass **in a subagent** (`playwright-cli`), never reading screenshots into the main thread: at 1440, 1024 and 390 — the morph open/close from both the desktop cluster and the mobile header, ⌘K, arrow-key traversal, a hit of each of the five types navigating to the right place, and the reduced-motion fallback rendering as a plain centred dialog.
- [x] Live-smoke ranking against seeded data: a term found only in a job description, and a one-character typo against a persona name.
- [x] `reviewer` agent over the branch diff.
- [x] Update `progress.md`; set `t-0c5wyz` to `done`; `blink validate` → 0.
