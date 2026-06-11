# JobVault — Progress Tracker

> **Last Updated**: 2026-06-10
> **Legend**: `[ ]` Pending · `[-]` In Progress · `[T]` To Test · `[x]` Done · Items marked ⚡ are on the critical path
>
> **Stitch Design Project**: `projects/15863924105464026227` — [Open in Stitch](https://stitch.google.com/projects/15863924105464026227)
> **Design Style**: Glassmorphism (frosted glass light + matching dark theme) · Subtle animations · Nuxt UI v4

---

## Migration Phase 0a — Backend Express Scaffolding (NEW)

> **Plan**: `docs/superpowers/plans/2026-04-26-phase-0a-backend-express-scaffolding.md`
> **Spec**: `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md`

- [x] backend-express scaffolded (Express 5 + Drizzle + Pino + Zod + TS strict)
- [x] /api/health responds 200 under Docker Compose
- [x] Root docker-compose.yml runs postgres + backend-express

## Migration Phase 0b — Frontend Next.js Scaffolding (NEW)

> **Plan**: `docs/superpowers/plans/2026-05-05-phase-0b-frontend-next-scaffolding.md`
> **Spec**: `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md`

- [x] frontend-next scaffolded (Next.js 15 + React 19 + Tailwind v4 + TanStack Query + TS strict)
- [x] Theme isolation skeleton (web/auth/app route groups with scoped CSS vars)
- [x] /, /about, /login render under Docker Compose; /app/dashboard redirects to /login
- [x] /api/* proxies through frontend-next to backend-express
- [x] Root docker-compose.yml runs postgres + backend-express + frontend-next

## Migration Slice 0 — Foundation (Design System + App Shell + Backend Schema) (NEW)

> **Plan**: `docs/superpowers/plans/2026-06-01-slice-0-foundation.md`
> **Spec**: `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md`
> **Design**: minimalist-ui — warm-stone base, flat muted-indigo accent, mono numerics, dark-mode first-class

### Frontend design system
- [x] Geist + Geist Mono fonts wired in root layout
- [x] App theme tokens (warm-stone + muted indigo + dark mode) scoped to `[data-theme-scope="app"]`
- [x] Status palette (`--ghost-active/stale/ghosted`) bridged into Tailwind; reserved for health only
- [x] Ghost threshold logic (`lib/ghost.ts`: active ≤7, stale ≤14, ghosted >14)
- [x] GhostMeter signature component (mono numerics, color + icon per level)
- [x] StatusChip signature component (6 statuses; neutral + indigo ramp, **not** the health palette)
- [x] Minimalist AppShell (sidebar nav: Dashboard/Timeline/Settings + header)
- [x] Web placeholder pages via ComingSoon (about/faq/contact/privacy/terms)

### Backend
- [x] Drizzle `users` table mirroring the NestJS User entity (12 columns, unique email/googleId)
- [x] Migration generated (`0000_new_spectrum.sql`) and applied to Postgres (verified `\d users`)

### Verification
- [x] Frontend: typecheck + lint + test (27) + build — all green
- [x] Backend: typecheck + lint + test (27) — all green
- [x] Adversarial multi-lens review run; semantic-color violation found and fixed, tests hardened
- [ ] Manual browser smoke (`/app/dashboard` light/dark, `/about` placeholder) — pending
- [x] Slice 2 (Jobs): `drizzle.config.ts` schema path generalized to the `src/db/schema/index.ts` barrel

## Migration Slice 1 — Authentication (email/password) (NEW)

> **Plan**: `docs/superpowers/plans/2026-06-02-slice-1-auth.md`
> **Spec**: `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md`
> **Auth model**: custom JWT in HTTP-only cookies (the intentional change from NestJS Bearer-in-body). Google OAuth deferred. No new migration (reuses Slice 0 `users`).

### Backend (`backend-express`)
- [x] JWT + bcrypt(12) token helpers; `Request.user` augmentation
- [x] Zod `validate` middleware + JWT-cookie `authMiddleware`
- [x] Auth Zod schemas + `toPublicUser` (strips passwordHash/refreshTokenHash)
- [x] Drizzle auth repository (real-Postgres tested)
- [x] Auth service: register/login/refresh/logout/profile — bcrypt 12, refresh rotation + reuse detection
- [x] Cookie helpers (accessToken path `/` 15m, refreshToken path `/api/auth` 7d), controller, router (+ auth rate-limit), wired under `/api/auth`
- [x] HTTP integration tests (Supertest): all 6 endpoints + cookie-flag assertions

### Frontend (`frontend-next`)
- [x] `Input` + `Label` primitives
- [x] Auth Zod schemas + `AuthUser` type
- [x] `useAuth` hooks (current user / login / register / logout via TanStack Query)
- [x] `LoginForm` + `RegisterForm` (RHF + Zod, minimalist design) + server-error alerts
- [x] Real `/login` + `/register` pages; `LogoutButton` in app header

### Verification
- [x] Backend: typecheck + lint + test (72) — all green
- [x] Frontend: typecheck + lint + test (43) — all green
- [x] Adversarial multi-lens review (auth-security & contract-parity clean); test-coverage gaps then closed
- [x] End-to-end smoke on the Docker stack: register→201+cookies, /me→200, login→200, dup→409, wrong-pw→401, `/login` renders the real form — all via the `:8080` browser proxy path
- [x] **Automatic token refresh — DONE** (`fix(auth): silent token refresh`, branch `fix-auth-silent-refresh`): the `api-client` now retries once on a 401 via `/api/auth/refresh` with a **single-flight** guard (so rotation never races), `middleware.ts` gates `/app/*` on **either** cookie (an expired access token + live refresh token is recoverable, not a logout), the refresh cookie is widened to `Path=/`, and `useJobs` refetches on mount. Sessions now roll forward across days of active use instead of ending at 15 minutes. Live-smoked through the `:8080` proxy.

## Migration Slice 2 — Jobs (CRUD + scraper + AddJobModal/JobDrawer) (NEW)

> **Plan**: `docs/superpowers/plans/2026-06-02-slice-2-jobs.md`
> **Spec**: `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md` (§9 Slice 2 resolutions)
> **Decisions**: Cheerio+Turndown scraper with an optional `fallback` seam (Gemini deferred to the AI slice); JobDrawer driven by the `?job=<id>` query param on a new `/app/jobs` page; `drizzle.config` points at the schema barrel; `status` is a pgEnum.

### Backend (`backend-express`)
- [x] `jobs` table (pgEnum `job_status`, FK→users cascade, 4 indexes) + migration `0001_stiff_scorpion`; `drizzle.config` generalized to the `index.ts` barrel (run via the `tsx` loader so drizzle-kit resolves NodeNext `.js` imports)
- [x] Job Zod schemas (create/update/move/scrape/query) + inferred types
- [x] HTML→Markdown (Turndown) + Cheerio scraper (JSON-LD + LinkedIn/Indeed/Greenhouse/Lever + generic) with optional `fallback` seam — no `@google/genai` dependency
- [x] Jobs repository (user-scoped CRUD, ILIKE search, status/ghost filters, per-status kanbanOrder) — real-Postgres tested
- [x] Jobs service (NOT_FOUND on missing/non-owned; scrape errors → VALIDATION_ERROR) + controller + router under `/api/jobs`
- [x] HTTP integration tests (Supertest): list+meta, filter-forwarding, create (+optional fields), scrape preview-only + 401, GET/PATCH/move/delete, 404 + validation 400s
- [x] Fixed a latent shared bug: `validate` middleware now persists coerced/defaulted `query`/`params` via `Object.defineProperty` (Express 5's `req.query` getter swallowed the old `Object.assign`)

### Frontend (`frontend-next`)
- [x] `Job`/`ScrapeResult` types + job Zod schemas
- [x] Radix Dialog/Sheet + Textarea/Select primitives
- [x] `use-jobs` hooks (list/single queries + create/scrape/update/delete)
- [x] JobSnapshot (react-markdown), ManualJobForm, UrlPasteForm, AddJobModal (URL + manual tabs)
- [x] JobDetails (status/notes/delete, guarded status cast), JobDrawer (URL-driven over `?job=`), JobsBoard (list + add)
- [x] `/app/jobs` page (SSR initial fetch, Suspense-wrapped) + "Jobs" nav item

### Verification
- [x] Backend: typecheck + lint + test (124) — all green
- [x] Frontend: typecheck + lint + test (73) + Docker production build — all green
- [x] Adversarial six-lens review (security/contract/strict-TS/scraper/test-faithfulness/design); coverage gaps closed, status cast hardened
- [x] Live end-to-end smoke on the Docker stack (via `:8080` proxy): register→201, create→201, list→`{data,meta}`, scrape `example.com`→ScrapeResult (preview-only, no persist)
- [ ] **Deferred — timeline auto-entries:** the NestJS `JobService` wrote a timeline event on create/status-change; that integration lands with **Slice 4** (Timeline + Reminders + Notifications), so Slice 2 jobs create/move without timeline side-effects.
- [ ] Manual browser pass (Add-Job modal tabs, drawer deep-link + Back, dark mode) — recommended before merge

## Migration Slice 3 — Dashboard & Kanban (NEW)

> **Plan**: `docs/superpowers/plans/2026-06-02-slice-3-dashboard-kanban.md`
> **Spec**: `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md` (§9 Slice 3 resolutions)
> **Decisions**: dedicated `/api/dashboard/kanban`+`/stats` (because `/api/jobs` is paginated); fractional-float `kanbanOrder` on drop; `@dnd-kit` + optimistic `useMoveJob` (snapshot rollback); ghost-days **derived live** from `lastActivityAt`; reuse the JobDrawer on the dashboard; ViewToggle deferred to Slice 5.

### Backend (`backend-express`)
- [x] `dashboard` module: query schema (search `.max(255)`) + response types, pure ghost-derivation helpers, repository (all user jobs, kanbanOrder order), service (grouping + derived-ghost stats), controller/router under `/api/dashboard`
- [x] `GET /api/dashboard/kanban` (6 columns + filtered stats) and `GET /api/dashboard/stats` (global) — user-scoped, auth-guarded
- [x] HTTP integration tests (Supertest) + real-DB repository test

### Frontend (`frontend-next`)
- [x] `@dnd-kit` installed; dashboard types + shared query keys; pure kanban helpers (`lib/kanban.ts`) — unit tested
- [x] `use-dashboard` (kanban query + optimistic `useMoveJob`); job edits/deletes also refresh the board
- [x] StatCard + DashboardStats (5 cards); sortable KanbanCard (tap-to-open vs drag, 6px threshold), droppable KanbanColumn, KanbanBoard (drag + snapshot rollback)
- [x] JobDrawer close generalized to the current page (reused on the dashboard via `?job=`)
- [x] DashboardView + `/app/dashboard` page (SSR initial board, Suspense)

### Verification
- [x] Backend: typecheck + lint + test (150) — all green
- [x] Frontend: typecheck + lint + test (105) + Docker production build — all green
- [x] Adversarial six-lens review (security/contract/strict-TS/ghost-derivation/dnd-optimistic/test-faithfulness); search capped + StatCard & drag-vs-tap tests added
- [x] Live end-to-end smoke on the Docker stack: kanban groups the 6 columns with **derived ghost-days**; `/stats` global; a `/move` (APPLIED→OFFER) persists into the board
- [ ] **Note — ghost-days derived live; move events don't write timeline entries yet** (timeline auto-events land in Slice 4)
- [ ] Manual browser pass (drag-and-drop, card → dashboard drawer, dark mode) — recommended before merge

### Slice 3.5 — Jobs Workspace + Overview Dashboard (2026-06-03)
- `/app/jobs` is now the unified workspace with a **Board ⇄ List** toggle (default List, `?view=board|list`, shareable; preserves `?job=`).
- `/app/dashboard` is a **stats-only overview** (`GET /api/dashboard/stats`); the board + drawer moved to the workspace.
- New `ui/SegmentedControl`; extracted `JobsList`; new `DashboardOverview`; new `lib/dashboard-defaults` (`EMPTY_STATS`/`EMPTY_BOARD`); removed `JobsBoard`/`DashboardView`.
- `useStats` hook added; job create/update/delete + move now invalidate the stats key; kanban card preserves `?view` when opening the drawer. **No backend changes.** (Spec §9 → "Slice 3.5 resolutions".)
- [x] Frontend: typecheck + lint + test (116) + Docker production build — all green; backend typecheck — green.
- [x] Adversarial six-lens review (behavior-parity/strict-TS/dead-code/test-quality/conventions/data-flow); coverage gaps closed (view→List clean-URL, job-mutation cache invalidations, useStats initialData isolation).
- [ ] Manual browser pass (toggle Board⇄List, `?view=` survives refresh, open-from-board returns to board, stats reflect adds) — recommended before merge.

## Migration Slice 4 — Timeline + Reminders + Notifications + Real-time (NEW) (2026-06-04)

> **Spec**: `docs/superpowers/specs/2026-06-03-slice-4-timeline-reminders-notifications-design.md` (+ app-redesign §9 "Slice 4 resolutions").
> **Plans**: `docs/superpowers/plans/2026-06-03-slice-4{a,b,c}-*.md`. Built as 3 sub-slices on branch `slice-4-timeline-reminders-notifications` (56 commits; **not yet merged to master**).

**Slice 4a — Timeline + auto-events**
- [x] `timeline_events` table (migration `0002`; `userId`+`jobId` cascade, `type` AUTO|MANUAL, `title`, nullable `description`) + `timeline` module (router→controller→service→repository→Zod). `GET`/`POST /api/jobs/:jobId/timeline` (ordered `createdAt DESC`; manual POST bumps `lastActivityAt`).
- [x] `jobs.service` emits AUTO events on **create** ("Job added to vault") and **status-change** on PATCH + move ("Status changed to {new}"), as a logged follow-on write (never rolls back the job mutation).
- [x] Frontend `useTimeline`/`useAddTimelineEntry` (optimistic prepend + 5-key invalidation) + `TimelineSection` in the JobDrawer. **Live smoke verified** end-to-end.

**Slice 4b — Reminders + Notifications + node-cron + ghost-filter fix**
- [x] `reminders` (`message`/`remindAt`/`isCompleted`) + `notifications` (`type` enum; `relatedJobId` **ON DELETE SET NULL**) tables (migration `0003`) + both modules. Notifications route order `read-all` before `:id/read`; unread derived client-side.
- [x] `node-cron` scheduler (system-wide repo + pure sweeps): **reminder sweep `*/5`** (due → REMINDER notification, idempotent) and **daily ghost sweep** (persists `ghostDays` as a bookkeeping anchor only; fires GHOST_ALERT once per 7/14-day crossing — two independent ifs). Started after `app.listen()` gated by `ENABLE_SCHEDULER`, stopped before `server.close()`, never in `createApp`; safe-boolean env parse.
- [x] **Fixed the latent `/api/jobs?ghostFilter` bug** — now derives ghost-days live in SQL (shared `GHOST_STALE_DAYS`/`GHOST_GHOST_DAYS` constants in `src/shared/ghost.ts`), matching the dashboard.
- [x] Frontend `use-notifications`/`use-reminders` hooks, `ui/popover` primitive, NotificationBell (in page headers) + RemindersSection (in JobDrawer). **Live smoke verified**: reminders CRUD, ghost-filter, both cron sweeps → notifications, read-all.

**Slice 4c — Real-time delivery (socket.io)**
- [x] socket.io gateway on the shared `http.Server` (cookie-auth `io.use()` handshake → per-user rooms); `emitToUser` seam in `notificationService.create`; `index.ts` runs **both** scheduler + socket lifecycles (gated by `ENABLE_SCHEDULER`/`ENABLE_REALTIME`, off in test). Frontend `socket.io-client` singleton + `RealtimeProvider` (pushes into the `NOTIFICATIONS_KEY` cache, dedupe-by-id, StrictMode-safe). **No app-level polling** (`useNotifications` = `staleTime 30s` + focus-refetch fallback). *(This overrides the migration spec §11.1 "real-time deferred / polling" baseline.)*
- [x] Next `/socket.io` proxy fixed (`skipTrailingSlashRedirect` + exact-slash rewrite — the handshake needs the trailing slash); dashboard page wrapped in `Suspense` for the header bell's `useSearchParams` (caught by the production build).
- [x] **Real-time verified end-to-end**: a socket.io client through the Next proxy received the cron-pushed REMINDER notification the instant the in-process `*/5` cron fired.

**Gates (all green):** backend `typecheck`+`lint`+**248 tests**; frontend `typecheck`+`lint`+**164 tests**+**production Docker build**. Per-chunk implementer→ground-truth-gate→adversarial-review loop; final whole-slice review APPROVE. No `git push`, no "Claude" in commit messages.
- [ ] Deferred — full backlog + rationale in [`docs/deferred-tasks.md`](docs/deferred-tasks.md): **email reminders (likely next)**, recurring reminders, soft-delete/`completedAt`, `STATUS_CHANGE`/`GENERAL` notifications, `/unread-count` endpoint, retention/auto-archive, global activity feed (`/app/timeline`), production WS-upgrade proxy, socket.io Redis adapter (multi-instance tripwire), web/mobile push. (Real-time works in dev on the long-polling fallback.)
- [ ] Manual browser pass + **merge to master** (user merges).

## Migration Slice 5 — Filters + Search + List View (NEW) (2026-06-04)

> **Spec**: `docs/superpowers/specs/2026-06-04-slice-5-filters-search-list-design.md`
> **Plan**: `docs/superpowers/plans/2026-06-04-slice-5-filters-search-list.md`
> Built on branch `slice-5-filters-search-list` (**not yet merged to master**). Orchestrated via the `Workflow` tool: 4 sequential TDD batches → ground-truth gate → 5-lens adversarial review → review-fix pass.
> **Decisions**: filters on **both** views, **server-driven** (zero backend changes — `GET /api/jobs` and `GET /api/dashboard/kanban` already filter/sort/paginate; ghostFilter fix shipped in Slice 4b); URL-synced via a single `useJobFilters` (+ shared pure `parseFilters`); list toolbar search with **Cmd/⌘K** focus; **borderless aligned** sortable list (not a spreadsheet table); **hybrid board drag** (cross-column status moves stay enabled while filtered, within-column reorder suppressed) via pure `resolveDrop`.

### Frontend (`frontend-next`)
- [x] `types/filters.ts` + pure `lib/filters.ts` (`parseFilters`/`isFiltered`/`buildListQuery`/`buildBoardQuery`); filter-encoded query keys (`jobsListKey`/`kanbanKey`) nested under existing prefixes so current invalidations still match; `apiClient/apiServer.getPage` preserve pagination `meta` (incl. through the 401-refresh retry); `useDebouncedValue`; `shortDate`.
- [x] `useJobFilters` (URL↔filter source of truth — clean-URL + reset-page rules, preserves `view`/`job`); filter-aware `useJobs` (→ `{data, meta}`, `keepPreviousData`) + `useKanban` (search+ghost, gated to the board view).
- [x] `SearchInput` (debounced + Cmd/⌘K + clear, loop-safe vs external value changes), `SortControl`, `JobsToolbar` (per-view controls + reset), `JobsTable` (sortable borderless list with responsive columns, replaces `JobsList`), `JobsPagination`, `ReorderPausedHint`.
- [x] Hybrid board drag (`resolveDrop` pure helper; controlled `KanbanBoard` writing the active `kanbanKey`; restores snapshot on unresolved/cancelled drops); `JobsWorkspace` owns both queries; `page.tsx` SSR-seeds the filtered list/board from URL params (array-param safe) for deep links.

### Verification
- [x] Frontend: typecheck + lint + **216 tests** + **production Docker build** — all green.
- [x] Adversarial 5-lens review (strict-TS/cache-keys · URL-sync/data-flow · hybrid-drag · test-faithfulness · design/a11y/conventions); fixes applied: search-input debounce loop, responsive table columns, unresolved-drop snapshot restore, dynamic sort aria-label, list-view board-fetch gating, +getPage-refresh / setSort-toggle / active-arrow / skeleton tests.
- [ ] **Known testing boundary:** dnd-kit drag is not exercised at the component level (jsdom can't resolve drop targets); the drop decision is covered exhaustively by `resolveDrop` unit tests + the live smoke. The Ghost column shows the `GhostMeter` ("Nd") rather than a separate relative-activity label (accepted simplification).
- [ ] Manual browser pass (search/sort/paginate/reset, deep-link SSR, board hybrid drag while filtered, toggle preserves filters) + **merge to master** (user merges).

### Slice 5 follow-up — List column filters (Notion-style) (2026-06-04)
> **Spec**: `docs/superpowers/specs/2026-06-04-list-column-filters-redesign-design.md` · **Plan**: `docs/superpowers/plans/2026-06-04-list-column-filters-redesign.md`. Orchestrated via the `Workflow` tool (sequential TDD batches → ground-truth gate → 5-lens adversarial review → review-fix pass).
- Filters moved off the header onto the columns: **Search + Activity** are the only header controls; **Status** filter + **Added date-range** live in per-column hover **funnels** (new `@radix-ui/react-popover` anchored popover, `StatusFilterMenu`/`DateRangeMenu`); tap a column to sort with a **3-state cycle** (asc → desc → off→default `createdAt` desc; Added toggles).
- Backend (additive, no migration): `createdFrom`/`createdTo` on `GET /api/jobs` (schema + repo SQL, UTC day boundaries, end-of-day-inclusive `createdTo`).
- `isFiltered` split into `isBoardFiltered` (search+ghost) and `isListFiltered` (all list filters) — also fixes the earlier nit where a status-only filter paused board reordering. `SortControl` + `SORT_OPTIONS` removed. `jobsListKey` extended with the date params so the Added filter refetches; SSR `FILTER_PARAMS` includes `from`/`to`.
- [x] Backend typecheck+lint+tests; frontend typecheck+lint+**231 tests** + Docker prod build — all green. Adversarial 5-lens review; blockers (date in cache key, exactOptional build break) + major (SSR date params) + cleanups fixed.
- [ ] **Known minor:** the Status/Date funnel menus don't auto-close on select (Escape/outside-click closes them); easy follow-up to wire `AnchoredPopoverClose`. Manual browser pass + **merge to master** (user merges).

## Migration Slice 6 — File Storage + AI / Gemini (**re-scoped**) (2026-06-05)

> **Spec**: `docs/superpowers/specs/2026-06-05-slice-6-ai-resume-cover-letter-design.md`. **Re-scope** (vs the original BE-06/07 roadmap): **no file storage** (Cloudinary/Multer/PDFKit/resume-upload-parsing all dropped) — everything persisted is **text/JSON in Postgres**; PDFs render **client-side** (react-pdf), never stored. The AI emits **content as JSON/Markdown**, the app owns formatting in code → a `.tex` (Copy/Overleaf) and a PDF both derive deterministically with **zero backend rendering toolchain**. Built as 3 sub-slices (6a/6b/6c) on branch `slice-6-ai-resume-cover-letter` (**merged to master 2026-06-06**).

**Slice 6a — Personas + Gemini foundation (DONE)**
> **Plan**: `docs/superpowers/plans/2026-06-05-slice-6a-personas-gemini-foundation.md`. Orchestrated via the `Workflow` tool: sequential per-task TDD implementation → solo ground-truth gates → 5-lens adversarial review → review-fix → live smoke.
- [x] Backend: `@google/genai` Gemini wrapper (`isAiEnabled`/`generateText`/`generateStructured` — structured-JSON output, Zod-validated, output-typed generic; provider errors wrapped, **429/quota → `RATE_LIMITED`**); shared `ResumeContent` schema (mapped from the example `.tex`); `GET /api/ai/status` → `{ enabled, maxPersonas }`; `personas` table (migration `0004`) + module (router→controller→service→repository→Zod) with cap enforcement + AI-structuring; env knobs `GEMINI_API_KEY`/`GEMINI_MODEL`(default `gemini-3.5-flash`; `gemini-2.0-flash` is deprecated)/`AI_RATE_LIMIT_PER_HOUR`/`MAX_PERSONAS`; new `SERVICE_UNAVAILABLE` (503) code.
- [x] Frontend: `Persona`/`ResumeContent` types + `usePersonas`/`useAiStatus` hooks; reusable **`ResumeContentEditor`** (text · add/remove bullets · remove entry — extended in 6b); `CreatePersonaWizard` (paste résumé/notes → AI-structure); `/app/personas` page + workspace (cap counter, AI-disabled state) + **Personas** sidebar nav.
- [x] **Gates green:** backend `typecheck`+`lint`+**289 tests**; frontend `typecheck`+`lint`+**246 tests**+**production Docker build**. Adversarial 5-lens review (0 blockers; majors/minors fixed: Gemini error-wrap, output-typed generic, GET `/:id` + `ai/status`-enabled tests, frontend `fields` contract, spec §7 reconciled).
- [x] **Live smoke (Docker, real key):** `/api/ai/status` → `enabled:true`; auth + Gemini call reach the provider and the error path maps a real provider **429 → clean `RATE_LIMITED`** (no leak). **Note:** actual persona creation is blocked only by the test key's quota (`limit: 0` for `gemini-2.0-flash` on free tier) — a key/billing matter, not a code defect.
**Slice 6b — Résumé generation (DONE)**
> **Plan**: `docs/superpowers/plans/2026-06-05-slice-6b-resume-generation.md`. Orchestrated via the `Workflow` tool: sequential per-task TDD → solo gates → 5-lens adversarial review → review-fix → live smoke.
- [x] Backend: `generated_resumes` table (migration `0005`); pure **`.tex` deriver** (`renderResumeTex`, golden-tested vs the user's template, **single-pass LaTeX-escape** + `escapeLatexUrl` for `\href` args + `**bold**`→`\textbf`); `buildResumePrompt` (persona-only **or** persona+job, no-invent guardrail); **DB-derived hourly rate limit** (`ai-usage.repository` + `assertWithinRateLimit`, spent **after** ownership checks); `resumes` module — `POST /api/resumes` (generate, rate-limited, persona+job ownership), `GET ?jobId=`, `GET/:id`, **`GET /:id/tex`**, `PATCH/:id`, `DELETE/:id`.
- [x] Frontend: `@react-pdf/renderer` (ESM → `transpilePackages` in `next.config.ts`); **`ResumeDocument`** (react-pdf, mirrors the `.tex`, `splitBold` bold runs, project URLs); extended **`ResumeContentEditor`** to projects/skills/education; `useResumes` hooks; live **PDF preview** (`PDFViewer`, dynamic ssr:false) + structured editor + **Copy LaTeX · Open in Overleaf · Download PDF** (`PDFDownloadLink`); `/app/resumes` workspace reached from a persona's **Generate résumé** link.
- [x] **Gates green:** backend `typecheck`+`lint`+**317 tests**; frontend `typecheck`+`lint`+**259 tests**+**production Docker build** (build fix: transpile the ESM-only react-pdf). Adversarial 5-lens review (3 blockers + 4 majors fixed: LaTeX URL/email escaping, escapeLatex double-escape, rate-limit-after-ownership, react-pdf project URL + `'use client'`; security scoping rated clean).
- [x] **Live smoke (Docker, real key):** persona→résumé→`.tex` end-to-end on Gemini (validated on `gemini-2.5-flash-lite` when `gemini-3.5-flash` was transiently overloaded; the path is model-agnostic). `GEMINI_MODEL` restored to `gemini-3.5-flash`.
- [ ] **Known boundaries:** react-pdf renders to PDF not the DOM, so `ResumeDocument`/preview/download are covered by `splitBold` units + element-build smoke + the live manual smoke (no `pdf()` in CI); job-tailored résumé reachable via `?job=` until the **JobDrawer tab wires in 6c**.

**Slice 6c — Cover letters + JobDrawer wiring (DONE)**
> **Plan**: `docs/superpowers/plans/2026-06-06-slice-6c-cover-letters-jobdrawer.md`. Orchestrated via the `Workflow` tool: sequential per-task TDD → solo gates → 5-lens adversarial review → review-fix → live smoke.
- [x] Backend: `cover_letters` table (migration `0006`; `userId`+`jobId` cascade, `personaId` **ON DELETE SET NULL**); `buildCoverLetterPrompt` (Markdown letter, per job + persona + instructions, no-invent guardrail, via `generateText`); **rate-limit count now sums résumés + cover letters** (`ai-usage.repository`, shared hourly budget); `cover-letters` module — `POST /api/cover-letters` (generate; **job + persona ownership** then rate-limit), `GET ?jobId=`, `GET/:id`, `PATCH/:id`, `DELETE/:id`. (`personaId` is **required** at generation — a letter is drawn from a persona; spec §7 corrected to match.)
- [x] Frontend: `CoverLetter` type + `useCoverLetters` hooks; `CoverLetterEditor` (textarea + **react-markdown** preview + Copy text + Download PDF via a react-pdf paragraph doc); job-tailored résumé wired via **`?job=`** in the workspace; **JobDrawer** gains a **Résumé launcher** (deep-links `/app/resumes?job=…`) and an in-drawer **Cover-letter section** (persona pick → generate → edit/preview → copy/PDF/save).
- [x] **Gates green:** backend `typecheck`+`lint`+**334 tests**; frontend `typecheck`+`lint`+**267 tests**+**production Docker build**. Adversarial 5-lens review (security/scoping rated clean, rate-limit-after-ownership confirmed); the only substantive finding was a spec-vs-code `personaId` optionality mismatch → resolved by correcting the spec (impl was right) + a `bodyMarkdown` max-length guard.
- [x] **Live smoke (Docker, real key):** persona + job → cover letter generated on Gemini (tailored 1243-char Markdown letter naming the role/company), list-by-job works. (Validated on `gemini-2.5-flash-lite`; `GEMINI_MODEL` restored to `gemini-3.5-flash`.)

### ✅ Slice 6 complete (6a + 6b + 6c) — branch `slice-6-ai-resume-cover-letter`
Personas (AI-structured backgrounds) → tailored **résumés** (LaTeX `.tex` + client-side react-pdf preview/PDF, persona-only or job-tailored) → per-job **cover letters** (Markdown + PDF), all on **Gemini 3.5 Flash**, **zero file storage** (text/JSON in Postgres; PDFs render client-side), shared DB-derived hourly rate limit, env-gated. Migrations `0004`–`0006`. **Merged to master 2026-06-06** (+ persona/résumé UI polish: card grid + edit sheet, full-width-controls/sticky-preview résumé workspace, job-picker on the résumé form, PDF name/contact gap fix). Local master is ahead of `origin/master` — user pushes.
- [ ] **Next:** user manual browser pass + **merge to master**. Then the remaining migration backlog: Chrome extension (Slice 8), public-pages redesign, Google OAuth, email reminders (`docs/deferred-tasks.md`).
- [x] **Follow-up (user-requested 2026-06-06): Personas + User Master-Profile redesign — brainstormed + approved.** See **Slice 7** below (design spec + 7a/7b plans). Brief `docs/superpowers/specs/2026-06-06-personas-profile-redesign-brief.md` superseded by the design spec `…-personas-profile-redesign-design.md`.

---

## Migration Slice 7 — Personas + User Master-Profile Redesign (2026-06-10)

> **Spec**: `docs/superpowers/specs/2026-06-06-personas-profile-redesign-design.md` (brainstormed + approved 2026-06-06; supersedes the brief). **Branch**: `slice-7-personas-profile-redesign` (off master). Built in two sub-slices: **7a** (master profile foundation, DONE — merged to master 2026-06-10) + **7b** (persona redesign, DONE 2026-06-11).
>
> **Model decisions:** new rich shared **`ProfileContent`** schema (structured month+year dates, project technologies/links, education grade, employment type, current/ongoing flags) — **lenient at rest** (nullable dates + optional ids so AI-parsed/legacy data validate) with requiredness enforced in the form; backend **`ensureIds`** assigns ids on every write. Persona sections are **copied** snapshots editable per-persona **except education** (pick-from-profile; Edu-B snapshot + re-pick). Two persona modes — **"Build from profile"** + **"Import a résumé"** (paste or in-memory PDF). **Personas are never rendered directly** → the `.tex`/react-pdf pipeline stays untouched (a flattener is unnecessary).

**Slice 7a — Master Profile foundation (DONE)**
> **Plan**: `docs/superpowers/plans/2026-06-06-slice-7a-master-profile.md`. Orchestrated via the `Workflow` tool: sequential per-task TDD (backend chain → frontend chunks) → solo ground-truth gates → 4-lens adversarial review (find → verify) → review-fix.
- [x] Backend: shared **`ProfileContent`** Zod schema + `ensureIds` + `emptyProfileContent` (`src/shared/profile-content.schema.ts`); **`user_profiles`** table (1/user, migration `0007`); `profile` module (router→controller→service→repository→Zod) — **`GET /api/profile`** (saved content, else an unpersisted empty default) + **`PUT /api/profile`** (validate → `ensureIds` → upsert). **No persona changes** (deferred to 7b).
- [x] Frontend: `@/types/profile` mirror + `@/lib/profile` factories/`validateProfileContent`; `useProfile`/`useUpdateProfile` hooks (`PROFILE_KEY`); reusable primitives **`MonthYearPicker`**, **`ChipInput`**, **`BulletListEditor`**, **`LinksEditor`** + a styled **`Checkbox`** ui primitive; per-section editors (Basics/Experience/Projects/Skills/Education) composed into **`ProfileEditor`**; **`ProfileWorkspace`** (load/edit/validate/save) on a new **`/app/profile`** page. **Account menu** at the sidebar foot (`AccountMenu` + monogram `MonogramAvatar` + smooth `AnchoredPopover` dropdown → Profile / Settings / Sign out) **replaces** the old sign-out button; **Profile & Settings moved out of the primary nav** into it.
- [x] **Gates green:** backend `typecheck`+`lint`+**353 tests**; frontend `typecheck`+`lint`+**320 tests**+**production Docker build** (`/app/profile` in the route manifest). Adversarial 4-lens review (22 raw findings → 1 confirmed: education `bullets` editor missing); a follow-up self-audit caught two more editor field-coverage gaps (experience `employmentType`, education `location`) → all fixed so every editor covers 100% of its schema fields.
- [x] ~~Next: user manual browser pass of `/app/profile`. Then Slice 7b.~~ → 7a merged to master 2026-06-10 (+ post-merge polish: standard PageHeader layout, tonal add / soft-red remove buttons, account-menu replaces sidebar sign-out, name/email pre-fill from the registered user, server-rendered profile seed).

**Slice 7b — Persona redesign (DONE 2026-06-11)**
> **Plan**: `docs/superpowers/plans/2026-06-11-slice-7b-persona-redesign.md`. Same loop as 7a: `Workflow`-orchestrated sequential per-task TDD (A1–A7 backend → B1–B7 frontend, commit per task) → solo ground-truth gates → 4-lens adversarial review (18 confirmed findings, 0 rejected) → 5-group review-fix pass → live smoke.
- [x] Backend: **`personas.data` retyped to `ProfileContent`** (no DDL) + **`resumeContentToProfileContent`** up-converter (golden-tested tolerant date parser — en/em dashes, spaced/unspaced digit hyphens, `to`, current-markers; **lossless**: any unparsed side stashes a `Dates: <original>` leading bullet) + **lazy normalization on every repository return** (list/find/create/update) + idempotent skip-and-report **`db:backfill-personas`** script (ran on dev: 8/8 converted, re-run 0). **Create is AI-free** — `POST /api/personas { name, data, rawInput? }` (cap-checked, `ensureIds`); new **`POST /api/personas/parse-resume`** (multipart `file` PDF and/or `text`; in-memory `multer` + `pdf-parse`; AI-off/cap/rate-limit fail-fast; returns `{ content, rawText }`) — the **only AI persona path**, counted in the shared hourly limit via new **`resume_parse_events`** table (migration **`0008`**) summed into `countRecentGenerations`. AI structuring retargeted to a `PROFILE_SCHEMA_GUIDE` (MonthYear dates, technologies, links, grade, current/inProgress, omit ids); `buildResumePrompt`/`buildCoverLetterPrompt` take `ProfileContent` + a render-dates-as-human-strings note — **résumé output stays `ResumeContent`; renderers untouched**.
- [x] Frontend: `Persona.data: ProfileContent`; **api-client `postForm`** (FormData passes through the silent-refresh 401 retry) + `useParseResume`; `ProfileSection` extracted for reuse; **`PersonaItemPicker`** (checkbox multi-select of profile items by id + Add all, deep copies keep ids) + **pick-only `PersonaEducationSection`** (read-only rows + Remove + picker + "Manage in profile" link; imported entries appear as removable rows) composed into **`PersonaContentEditor`** (pickers + editable copies + single Add-custom affordance per section); **`CreatePersonaSheet`** replaces the wizard — mode chooser (**"Build from profile"** seeds basics/summary; **"Import a résumé"** paste/PDF → parse → review) converging on the same editor, save posts `rawInput` on import / null on manual; `EditPersonaSheet` swapped to the rich editor; workspace gates creation on the **cap only** (AI-off only disables import).
- [x] **Adversarial review fixes** (3 major + 8 minor, each verified then TDD-fixed): lossless half-parseable date conversion; dateless imported/legacy education no longer save-blocks personas (`validateProfileContent` `requireEducationDates` opt-out for the pick-only context) + client link-requiredness mirror; in-flight parse detached on Back (no draft clobber); stale edit-error reset; dirty-guard on Escape/overlay dismissal (protects spent parse quota); normalized `update` returns; backfill per-row resilience; single add affordance; AI-off + at-cap banners co-render.
- [x] **Gates green:** backend `typecheck`+`lint`+**424 tests**; frontend `typecheck`+`lint`+**376 tests**+production Docker build. **Live smoke (Docker, real key):** register → profile → manual persona (`rawInput: null`) → **PDF parse on Gemini** (LibreOffice-generated résumé → rich `ProfileContent`: MonthYear dates, `current`, technologies, grade, skill groups, ids) → imported persona with `rawText` audit → **job-tailored résumé + cover letter off the `ProfileContent` persona** (AI rendered `{month,year}` as "Mar 2021 – Present") → `.tex` derives → exactly 1 `resume_parse_events` row spent.
- [x] **Browser-pass UX iteration (user feedback 2026-06-11):** persona-sheet sections switched to a **stacked** layout (`ProfileSection layout="stacked"`; `/app/profile` keeps two-column); **persona Basics section removed** — contact identity lives on the master profile and **generation merges `profileService.getSavedBasics()` over the persona's basics** at résumé/cover-letter time (fallback to the persona's own parsed basics when no profile is saved; drafts still carry basics silently + a blank-name guard on create); "Add custom" outline buttons dropped for the section editors' own **softPrimary add buttons below the entries** (matching Add link/Add bullet).
- [x] **AI resilience (browser-pass finding 2026-06-11):** the user's PDF import 500'd bare-text — root cause was **`gemini-3.5-flash` provider overload (503 "high demand")** compounding three gaps, all fixed: the Next dev rewrite proxy aborted >30s upstreams with a plain-text 500 (→ `experimental.proxyTimeout: 180_000`); the Gemini call could hang on undici's 5-min headers timeout (→ `httpOptions.timeout: 60_000`, which the SDK also forwards as a server deadline); and timeouts/overload surfaced as generic `INTERNAL_ERROR` (→ `DEADLINE_EXCEEDED`/abort/headers-timeout and 503 `UNAVAILABLE`/"high demand" now map to **retryable `SERVICE_UNAVAILABLE` with clear messages**, plus `generateStructured` retries once on malformed/schema-missing JSON). End-to-end PDF parse re-verified through the 8080 proxy.
- [x] **Fallback model chain (user-approved follow-up):** optional **`GEMINI_FALLBACK_MODEL`** env — when the primary model fails **transiently** (timeout or 503 overload, i.e. the `SERVICE_UNAVAILABLE` classes), `callModel` retries the request once on the fallback model (pino warn on each fallback; no fallback for 429/quota, auth/generic errors, or AI-not-configured). Dev env restored to `GEMINI_MODEL=gemini-3.5-flash` + `GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite` (probes during the outage: 3.5-flash 503, 2.5-flash intermittent 503, flash-lite consistently 200 in ~1s); **live-verified against the real outage** — primary 503 → fallback parsed the PDF in 3.7s total. *(Clarified during review of the idea: PDF→text extraction is already library-based [`pdf-parse`] — only structuring needs the model; a heuristic no-AI structuring fallback was considered and rejected, OCR for scanned PDFs stays deferred.)*
- [x] **Structured-output hardening (browser-pass finding 2026-06-11):** the fallback model's JSON failed `ProfileContentSchema` ("AI output did not match the expected shape") — fixed threefold in `generateStructured`: **`sanitizeModelJson`** strips null-valued keys / null array entries before validation (safe: nullable-by-design fields are `.nullable().default(null)`, so Zod restores their null; `.optional()` fields rejecting explicit null was the failure being absorbed); the retry now **feeds the Zod issues back** to the model (`path: message` lines, ≤10) instead of blind-resending; terminal failures **log issues + a 500-char raw preview** and carry the ZodError as cause. Live-verified on flash-lite with a rich CV (employmentType enum normalized, year-only dates, grades, skill groups). Known worst-case latency: a *hanging* (vs fast-503) primary burns its 60s deadline before the fallback answers.
- [x] **User browser pass done; merged to master 2026-06-11** (merge `e75ecb2`; pass surfaced + fixed: stacked sheet layout, persona Basics removal w/ generation-time merge, add-buttons below sections, proxy/Gemini timeout + overload mapping, fallback model chain, structured-output sanitize/feedback-retry).
- [ ] **Next:** remaining migration backlog — **Chrome extension** (Slice 8), public-pages redesign, Google OAuth, email reminders (`docs/deferred-tasks.md`).

---

## Dependency Diagram

```
BE-01 (Project Setup) ──→ BE-02 (Auth) ──→ BE-03 (Job) ──┬→ BE-04 (Dashboard)
        │                      │                │          ├→ BE-05 (Timeline)
        │                      │                │          └→ BE-08 (Extension)
        │                      └→ BE-06 (Storage) → BE-07 (AI) → BE-05 (Timeline)
        │
FE-01 (Project Setup) → FE-02 (Auth) → FE-03 (Kanban) → FE-04 (Jobs) → FE-05 (Filters)
                                                   │                         │
                                                   └→ FE-06 (Timeline) → FE-07 (AI)
                                                                              │
                                                              FE-08 (Chrome Extension)
```

## Recommended Implementation Order

1. ⚡ **Project Setup** — BE-01 → FE-01
2. ⚡ **Authentication** — BE-02 → FE-02
3. ⚡ **Job Management** — BE-03 → FE-04
4. ⚡ **Dashboard & Kanban** — BE-04 → FE-03
5. **Timeline, Reminders & Notifications** — BE-05 → FE-06
6. **Filtering, Search & List View** — FE-05
7. **File Storage & AI** — BE-06 → BE-07 → FE-07
8. **Chrome Extension** — BE-08 → FE-08

---

## 0. UI Design (Stitch)

### Desktop Screens
- [x] Login page — `screens/48236897aa574537a74ce7ba2ae81e68`
- [x] Register page — `screens/967b798c190a44e386ef211d97ebecb4`
- [x] Dashboard / Kanban board — `screens/a86b3403254d4aa7bf873aed323d6394`
- [x] Job Drawer (slide-over detail panel) — `screens/c588cd259dc044a4967cacbff98335b6`
- [x] Add Job Modal (URL paste + manual tabs) — `screens/f4714572e5cc437683e6dc5348a40411`
- [x] Resume / Profile page — `screens/0de5687ba28a49ea898ec1956191dae6`
- [x] Cover Letter Editor — `screens/5fd1b14d183b4cb4a70503c7503b0afe`
- [x] Timeline & Notifications view — `screens/8ceeac87c17c4ba4b8a2267979da7e3f`
- [x] Profile / Settings page — `screens/b6ce922edf914eebb855c0f12f2b3628`
- [x] List View (table with filters) — `screens/aee03f3fe7a347018ac52c5e54f95358`

### Dark Mode Desktop Screens
- [x] Login page (dark) — `screens/6c33d1a73d9843d98f09e9d0ffd890c5`
- [-] Register page (dark) — generation pending (Stitch timeout)

### Mobile Screens
- [x] Login page (mobile) — `screens/9779cd8b2244493e990e28cdcf54e327`
- [x] Register page (mobile) — `screens/b721a4c2b6aa446fb4972ebe3395dc9c`
- [x] Dashboard / Kanban board (mobile) — `screens/56532cbc1e264285b1ab20a1a1c6c8bc`
- [x] Job Details (mobile) — `screens/0ffd19e1874141bfb2cab851960abbe5`
- [x] Add Job screen (mobile) — `screens/ff21308e4cff45e391d597536a8005b2`
- [x] Resume page (mobile) — `screens/0814dab24d554e85945dc890be486b99`
- [x] Cover Letter Editor (mobile) — `screens/286a259c86cf410cb46e9114be728f48`
- [x] Timeline view (mobile) — `screens/5310cca7537148bf8b35fd77da7c437b`
- [x] Settings page (mobile) — `screens/af5e777ddf494866a8e8657498f26ec5`
- [x] List View (mobile) — `screens/cacf4ef9ac2a4d16adf8747ef150b9ea`

---

## 1. Project Setup & Foundation

> **Dependencies**: None — this is the foundation for everything else
> **Plans**: `plans/backend/01-project-setup.md` · `plans/frontend/01-project-setup.md`

### Backend (BE-01)
- [T] Create NestJS project with dependencies (MikroORM, PostgreSQL driver, helmet, class-validator)
- [T] Configure environment variables (.env, .env.example) and app config
- [T] Set up MikroORM config and database connection
- [T] Create BaseEntity (UUID id, createdAt, updatedAt)
- [T] Create global pipes, filters, interceptors (ValidationPipe, HttpExceptionFilter, TransformInterceptor)
- [T] Create pagination DTOs (PaginationQueryDto, PaginatedResponse)
- [T] Configure main.ts (global prefix `/api`, CORS, helmet, validation)
- [T] Create Dockerfile + docker-compose.yml with PostgreSQL
- [ ] Run initial migration and verify connection

### Frontend (FE-01)
- [T] Initialize Nuxt 3 project with @nuxt/ui, Tailwind CSS, ESLint
- [T] Configure nuxt.config.ts (modules, runtime config, proxy rules)
- [T] Configure app.config.ts for Nuxt UI theming (glassmorphism tokens, dual theme)
- [T] Create CSS assets (main.css with Tailwind + glassmorphism utilities)
- [T] Create type definitions (types/api.ts — ApiResponse, PaginatedResponse, ApiError)
- [T] Create utilities (constants.ts, formatters.ts)
- [T] Create composables (useApi.ts, useToastNotify.ts)
- [T] Create layout components (AppHeader.vue, AppFooter.vue, LoadingSpinner, EmptyState)
- [T] Create layouts (default.vue, auth.vue) with glassmorphism styling
- [T] Create auth middleware stub and index redirect page
- [T] Create Dockerfile and verify dev server starts

---

## 2. Authentication

> **Dependencies**: Project Setup (1)
> **Plans**: `plans/backend/02-auth-module.md` · `plans/frontend/02-auth.md`

### Backend (BE-02)
- [T] Create User entity (name, email, passwordHash, googleId, preferences, refreshTokenHash)
- [T] Create User migration
- [T] Create auth DTOs (RegisterDto, LoginDto, RefreshTokenDto, UpdateProfileDto, AuthResponseDto)
- [T] Create JWT strategy, JwtAuthGuard, @CurrentUser() decorator
- [T] Create AuthService (register, login, refresh, logout, Google login, profile CRUD)
- [T] Create AuthController (8 endpoints: register, login, refresh, logout, Google OAuth, me, profile)
- [T] Create Google OAuth strategy and GoogleAuthGuard
- [T] Wire AuthModule into AppModule
- [ ] Test auth flows (register, login, token refresh/rotation, protected routes, OAuth)

### Frontend (FE-02)
- [T] Create auth types (types/auth.ts — User, credentials, tokens, profile)
- [T] Create useAuth composable (login, register, logout, refresh, session restore)
- [T] Update useApi to integrate token attachment and 401 auto-refresh
- [T] Create auth form components (LoginForm, RegisterForm, GoogleOAuthButton) with glassmorphism
- [T] Create auth pages (login.vue, register.vue, auth/google/callback.vue)
- [T] Create profile page (user info, preferences, theme toggle)
- [T] Update auth middleware with full guard logic
- [T] Integrate user menu into AppHeader

---

## 3. Job Management & Scraping

> **Dependencies**: Authentication (2)
> **Plans**: `plans/backend/03-job-module.md` · `plans/frontend/04-job-management.md`

### Backend (BE-03)
- [T] Create JobStatus enum and Job entity (title, company, location, salary, sourceUrl, snapshotMarkdown, status, kanbanOrder, ghostDays, notes)
- [T] Create Job migration
- [T] Create job DTOs (CreateJobDto, CreateJobFromUrlDto, UpdateJobDto, MoveJobDto, JobQueryDto)
- [T] Create MarkdownService (HTML → Markdown via Turndown)
- [T] Create ScraperService (Cheerio extraction + Gemini fallback)
- [T] Create JobService (CRUD, scrape, move, ghost tracking, filters)
- [T] Create JobController (7 endpoints: create, scrape, list, get, update, move, delete)
- [T] Wire JobModule and test (CRUD, scraping, filters, kanban move, pagination)

### Frontend (FE-04)
- [T] Create/extend job types (CreateJobFromUrlRequest, CreateJobManualRequest, ScrapeResult)
- [T] Create useJobDrawer composable (drawer state, job fetching, CRUD)
- [T] Create AddJobModal with URL paste + manual entry tabs (glassmorphism modal)
- [T] Create UrlPasteForm (URL input, scrape preview, loading states)
- [T] Create ManualJobForm (full job fields, validation)
- [T] Create JobDrawer (USlideover — split panel with glass effect)
- [T] Create JobSnapshot component (markdown renderer)
- [T] Create JobDetails panel (info section, notes editor, status actions)
- [T] Integrate drawer into KanbanCard click and add "Add Job" buttons

---

## 4. Dashboard & Kanban Board

> **Dependencies**: Authentication (2) — can be built in parallel with Job Management (3)
> **Plans**: `plans/backend/04-dashboard-api.md` · `plans/frontend/03-dashboard-kanban.md`

### Backend (BE-04)
- [T] Create dashboard DTOs (KanbanCardDto, KanbanColumnDto, KanbanBoardResponseDto, DashboardStatsDto)
- [T] Create DashboardService (getKanbanBoard, getStats with filters)
- [T] Create DashboardController (2 endpoints: kanban, stats)
- [T] Wire DashboardModule and test (6 columns, filters, stats, empty state)

### Frontend (FE-03)
- [T] Create job types (types/job.ts — Job, JobCard, KanbanColumn, DashboardStats, MoveJobRequest)
- [T] Create GhostMeter component (color-coded ghost days: green/yellow/red)
- [T] Create KanbanCard component (glassmorphism card with hover lift animation)
- [T] Create KanbanColumn component (droppable area, colored border, count header)
- [T] Create KanbanBoard component (6 fixed columns, horizontal scroll)
- [T] Create useJobs composable (fetchKanban, moveJob, optimistic updates, rollback)
- [T] Install vue-draggable-plus and implement drag-and-drop with ghost styles
- [T] Create DashboardStats component (stat cards with glass effect)
- [T] Create ViewToggle component (Kanban/List toggle)
- [T] Create dashboard.vue page (stats, toggle, board, loading/empty states)

---

## 5. Timeline, Reminders & Notifications

> **Dependencies**: Job Management (3)
> **Plans**: `plans/backend/05-timeline-reminders.md` · `plans/frontend/06-timeline-reminders.md`

### Backend (BE-05)
- [T] Create entities (TimelineEvent, Reminder, Notification) and migrations
- [T] Create DTOs for timeline events, reminders, notifications
- [T] Create TimelineService (getJobTimeline, addManualEntry, addAutoEntry)
- [T] Create TimelineController (get timeline, add manual entry)
- [T] Create ReminderService + ReminderController (CRUD for reminders)
- [T] Create NotificationService + NotificationController (list, mark read, mark all read)
- [T] Create SchedulerService with crons (daily ghost update, 10-min reminder check)
- [T] Integrate auto timeline entries into JobService (status change, creation)
- [T] Wire all modules and test (endpoints, crons, cascading deletes)

### Frontend (FE-06)
- [T] Create types (timeline.ts, reminder.ts, notification.ts)
- [T] Create useTimeline, useReminders, useNotifications composables
- [T] Create timeline components (TimelineEntry, AddTimelineEntry, JobTimeline)
- [T] Create reminder components (ReminderItem, AddReminderForm, ReminderList)
- [T] Create notification components (NotificationBell with badge, NotificationPopover)
- [T] Integrate notification bell into AppHeader
- [T] Update JobDetails with tabs (Timeline, Reminders, Notes, Cover Letter)
- [T] Set up notification polling (60s interval, pause on tab hidden)

---

## 6. Filtering, Search & List View

> **Dependencies**: Dashboard & Kanban (4), Job Management (3)
> **Plans**: `plans/frontend/05-ghost-search-listview.md` (frontend only)

### Frontend (FE-05)
- [ ] Create filter types (types/filters.ts — GhostFilter, SortField, JobFilters)
- [ ] Create useJobFilters composable (filter state, query builder, reset)
- [ ] Create HeaderSearchBar (debounced input, Cmd/Ctrl+K shortcut)
- [ ] Create DashboardFilters (status, ghost, sort selects + reset button)
- [ ] Update useJobs to accept and apply filters
- [ ] Create JobListView component (UTable with sortable columns, pagination)
- [ ] Update dashboard.vue with filters bar and conditional kanban/list rendering
- [ ] Implement URL query param syncing with filters

---

## 7. File Storage & AI / Gemini

> **Dependencies**: Auth (2), Job Management (3), Timeline (5)
> **Plans**: `plans/backend/06-file-storage.md` · `plans/backend/07-ai-gemini.md` · `plans/frontend/07-ai-module.md`

### Backend — File Storage (BE-06)
- [ ] Configure Cloudinary integration
- [ ] Create CloudinaryService (upload, delete)
- [ ] Create file-upload interceptor (Multer — PDF/DOCX, 10MB max)
- [ ] Create StorageController (resume upload, cover letter PDF download)
- [ ] Wire StorageModule and test (upload, validation, PDF generation)

### Backend — AI / Gemini (BE-07)
- [ ] Create CoverLetter entity and migration
- [ ] Create cover letter DTOs and Gemini prompt templates
- [ ] Create GeminiService (generateText, generateStructuredOutput)
- [ ] Create ResumeParserService (PDF/DOCX text extraction → MasterProfile structuring)
- [ ] Create AiRateLimiter (10 generations/hour per user)
- [ ] Create CoverLetterService + CoverLetterController (generate, CRUD)
- [ ] Wire CoverLetterModule and test (generation, rate limiting, CRUD)

### Frontend (FE-07)
- [ ] Create types (resume.ts, cover-letter.ts)
- [ ] Create useResume and useCoverLetter composables
- [ ] Install TipTap dependencies and create TipTapEditor wrapper
- [ ] Create resume components (ResumeUpload dropzone, MasterProfileView, MasterProfileEditor)
- [ ] Create resume.vue page (upload + profile management)
- [ ] Create cover letter components (Generator, Editor, Export, List) with glassmorphism
- [ ] Integrate cover letter tab into JobDetails drawer

---

## 8. Chrome Extension

> **Dependencies**: Auth (2), Job Management (3), Timeline (5)
> **Plans**: `plans/backend/08-extension-api.md` · `plans/frontend/08-chrome-extension.md`

### Backend (BE-08)
- [ ] Create ApiKey entity and migration
- [ ] Create extension DTOs (CreateApiKeyDto, QuickCreateJobDto, CheckUrlQueryDto)
- [ ] Create ApiKeyGuard (X-API-Key header auth) and @ApiKeyUser() decorator
- [ ] Create ExtensionService (key management, quick create, URL check, URL normalization)
- [ ] Create ExtensionController (3 extension endpoints) + API key routes on AuthController
- [ ] Wire ExtensionModule and test (key CRUD, quick create, duplicate detection)

### Frontend — Chrome Extension (FE-08)
- [ ] Initialize extension project (Vite + Vue 3 + Tailwind, manifest.json MV3)
- [ ] Create shared types, constants, and chrome.storage wrapper
- [ ] Create content scripts (LinkedIn, Indeed, generic extractors + job page detector)
- [ ] Create overlay ("Save to JobVault" floating button)
- [ ] Create background service worker (message handling, badge updates)
- [ ] Create popup app (LoginView, CaptureView, SuccessView, SettingsView)
- [ ] Create extension composables (useExtAuth, useExtApi)
- [ ] Build and test in Chrome (load unpacked, verify all flows)

---

## 9. Public Pages (Landing + Shared Components)

> **Dependencies**: FE-01 (Project Setup), Route restructuring (complete)
> **Plans**: `plans/frontend/09-public-pages.md`

### Frontend (FE-09)
- [x] Install gsap dependency
- [x] Create useScrollReveal composable (GSAP ScrollTrigger wrapper)
- [x] Add hero-bg gradient CSS class to main.css
- [x] Build WebNavbar (fixed, transparent-to-glass on scroll, auth-aware, mobile slideover)
- [x] Build WebFooter (4-column grid, social icons, glass styling)
- [x] Update web.vue layout with pt-16 for fixed navbar
- [x] Build landing page (index.vue) with all 7 sections + scroll animations
- [x] Landing page SSR works (view source shows rendered HTML)
- [x] All sections render in both light and dark mode
- [x] All sections are responsive (mobile, tablet, desktop)

---

## 10. Secondary Public Pages

> **Dependencies**: FE-09 (Public Core — web layout, WebNavbar, WebFooter, useScrollReveal)
> **Plans**: `plans/frontend/10-secondary-pages.md`

### Frontend (FE-10)
- [x] FAQ page with UAccordion containing 8 Q&A items inside glass card
- [x] About page with mission text (3 paragraphs) and 3 values cards in grid
- [x] Contact page with form (name, email, subject, message) + validation + toast on submit
- [x] Contact page with email info card and social media links
- [x] Privacy Policy page with 6 sections, prose styling
- [x] Terms & Conditions page with 8 sections, prose styling
- [x] All pages use `layout: 'web'` and have `useSeoMeta()` with proper SEO tags
- [x] All pages have scroll-reveal animations on headings and content
- [x] All pages render correctly in light and dark modes
- [x] All pages are responsive (mobile, tablet, desktop)
