# JobVault — Progress Tracker

> **Last Updated**: 2026-06-02
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
