# JobVault — App Rebuild (Express backend + Next.js app surface, minimalist-ui) — Design Spec

> **Date:** 2026-06-01
> **Owner:** weloin-sayantan
> **Builds on:** `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md`
> **Best-practices:** `docs/best-practices/{typescript,express,nextjs}.md`
> **Status:** Design approved — awaiting implementation plan

---

## 1. Goal

Build the **authenticated app** of JobVault in the new stack: a **Node/Express + Drizzle** backend (`backend-express/`) serving the existing API contracts, and a **Next.js 15 + shadcn/ui** frontend (`frontend-next/`) for the `/app/*` surface, rendered in a **fresh minimalist-ui design**.

This is a *frontend redesign + backend port done together, feature-by-feature*. The parent migration spec defines the overall architecture; this spec narrows scope to the app surface, fixes the design direction, and defines the build sequence.

**Non-goals (this effort):**
- Public/marketing pages — kept as working placeholders, redesigned later.
- AI / file-storage / cover-letter / resume features — **deferred** (separate later effort; needs Gemini + Cloudinary keys).
- Chrome extension — later.
- Real-time notifications — stays 60s polling.

---

## 2. Current reality (must-know)

- `backend-express/` currently exposes **only `/api/health`**. All feature endpoints must be built.
- `backend/` (NestJS) is the **working reference** — ~62% built, exposes the canonical API contract.
- Both backends expose an **identical `/api/*` contract** (success `{ data, meta? }`, error `{ statusCode, message, error, details? }`), so the frontend is backend-agnostic. Each slice builds its Express endpoints first; the NestJS backend is a temporary fallback only if an endpoint isn't ready.
- `frontend-next/` is scaffolded (Next 15, React 19, Tailwind v4, TanStack Query, theme-isolated route groups, API client/server, test harness) — no feature UI yet.

**Canonical API contract** (ported verbatim from NestJS):

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/refresh`, `/logout`; `GET /api/auth/google`, `/google/callback`, `/me`; `PATCH /api/auth/profile` |
| Jobs | `GET /api/jobs`, `POST /api/jobs`, `POST /api/jobs/scrape`, `GET /api/jobs/:id`, `PATCH /api/jobs/:id`, `PATCH /api/jobs/:id/move`, `DELETE /api/jobs/:id` |
| Dashboard | `GET /api/dashboard/kanban`, `GET /api/dashboard/stats` |
| Timeline/Reminders | `GET /api/jobs/:jobId/reminders`, `POST /api/jobs/:jobId/reminders`, `PATCH /api/reminders/:id`, `DELETE /api/reminders/:id`, timeline get/add |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/read-all`, `PATCH /api/notifications/:id/read` |

---

## 3. Design system (minimalist-ui, app surface)

Scoped to `app/` via the parent spec's theme isolation (`[data-theme-scope="app"]`). The `(web)` scope is untouched.

**Tokens**
- **Base:** warm neutral (stone/warm-gray), not pure black/white. Light + **dark mode first-class**, per-scope.
- **Accent (brand / primary action):** **muted indigo/blue**, used **flat** — no gradient, no glow, no glass. (The "AI-slop" look came from violet + gradient + glass, not the hue; flat desaturated color avoids it.)
- **Semantic palette (status only):** green → amber → red, reserved exclusively for application *health* (GhostMeter, status). Kept separate from the brand accent so color carries one meaning each — indigo never means "status," green/amber/red never mean "action."
- **Type:** clean sans for UI (Geist/Inter); tighter display weight for headings; **mono for numerics** (ghost-days, counts, dates, salary) — the signature treatment that reads "tracking instrument," the one anti-generic nod (no full brutalism).
- **Surfaces:** flat bento cards, hairline borders, minimal shadow. No glassmorphism, no heavy gradients.

**Components**
- shadcn/ui primitives themed via CSS variables to these tokens (logic shared, visuals ours).
- **Signature components:** `GhostMeter` (green/amber/red intensity + mono day count) and terminal-style **status chips** for the 6 kanban columns.

---

## 4. Backend approach (`backend-express/`)

Per parent spec §6 + `docs/best-practices/express.md`:
- Layered: `router → controller → service → repository → schema (Zod)`. Controllers never touch Drizzle.
- **Drizzle** ORM; schema mirrors the 5 existing tables (`users`, `jobs`, `timeline_events`, `reminders`, `notifications`). Drizzle Kit migrations.
- **Pino** structured logging; **helmet + cors + express-rate-limit**; `cors` allows `http://localhost:8080` with `credentials: true`.
- **Auth:** custom JWT in **HTTP-only cookies** (`accessToken` 15m `path:/`, `refreshToken` 7d `path:/api/auth`); refresh rotation; Google OAuth via Passport.
- **Cron:** `node-cron` (daily ghost update, 10-min reminder check).
- Framework-agnostic ports: Cheerio scraper, Turndown markdown.
- All queries **user-scoped** — no cross-user access.

---

## 5. Frontend approach (`frontend-next/`, app surface)

Per parent spec §7:
- `app/` route group with `AppShell` (header + sidebar) in minimalist-ui.
- Server Components fetch initial data via `lib/api-server.ts` (forwards cookies); Client islands mutate via **TanStack Query** + `lib/api-client.ts`.
- Hooks replace Vue composables: `use-auth`, `use-jobs`, `use-job-drawer`, `use-timeline`, `use-reminders`, `use-notifications`, `use-toast`.
- Optimistic kanban via `setQueryData` + rollback; `@dnd-kit/core` for drag.
- Forms: React Hook Form + Zod resolver + shadcn `<Form>`.
- `middleware.ts`: cookie check + refresh + redirect for `/app/*`.
- **Public pages:** `(web)/*` stay as working placeholders (route + minimal shell + "coming soon"), redesigned in a later effort.

---

## 6. Vertical slices (build sequence)

Each slice = Express endpoints **+** new-design Next pages **+** tests **+** manual smoke, merged before the next begins. Frontend runs against `backend-express`.

| Slice | Scope | Reference |
|---|---|---|
| **0. Foundation** | Design system (tokens, scoped theme CSS, themed shadcn primitives), minimalist `AppShell`, web placeholder pages, Drizzle `users` schema + migration, Express auth wiring stub | parent §3, this §3 |
| **1. Auth** | Express auth (register/login/refresh/logout/me/profile + Google OAuth, JWT cookies, rotation); Next login/register/callback pages, `middleware.ts`, `use-auth` | `plans/backend/02`, `plans/frontend/02` |
| **2. Jobs** | Express job CRUD + Cheerio scraper + Turndown markdown; AddJobModal, JobDrawer, UrlPasteForm, ManualJobForm, JobSnapshot | `plans/backend/03`, `plans/frontend/04` |
| **3. Dashboard & Kanban** | Express kanban/stats; KanbanBoard (@dnd-kit), KanbanColumn, KanbanCard, GhostMeter, DashboardStats, ViewToggle, optimistic moves | `plans/backend/04`, `plans/frontend/03` |
| **4. Timeline + Reminders + Notifications** | Express entities/services/scheduler + auto-events; TimelineEntry, ReminderList, NotificationBell (60s polling) | `plans/backend/05`, `plans/frontend/06` |
| **5. Filters + Search + List View** | URL-synced filters, debounced search (Cmd/Ctrl+K), sortable JobListView table | `plans/frontend/05` |

**Deferred after Slice 5:** File Storage + AI (Cloudinary, PDFKit, Gemini, resume parser, cover letters), Chrome extension, public-page redesign, real-time notifications.

**Per-slice done-criteria:** typecheck + lint clean · backend unit/integration tests pass · frontend hook/component tests pass · critical-path manual smoke in browser · `progress.md` updated · PR merged.

---

## 7. Testing strategy

Per parent spec §10: Vitest (both apps), RTL for components, Supertest for HTTP, Playwright for critical-path E2E. Never mock Drizzle (real test Postgres for repositories); MSW for frontend network mocks. Tests run under the same strict TS config.

---

## 8. Resolved decisions

- **Backend target:** `backend-express` (built feature-by-feature; NestJS is reference/fallback).
- **Design:** minimalist-ui, muted indigo accent (flat), warm-stone base, mono numerics signature, dark-mode first-class.
- **Scope:** app surface only; web pages placeholdered; AI/storage deferred after Slice 5.
- **Sequence:** vertical-slice-first, Foundation → Auth → Jobs → Dashboard/Kanban → Timeline → Filters.

## 9. Open questions for the implementation plan

1. Env var naming — preserve current names vs. Express conventions.
2. JobDrawer: parallel-route slot vs. intercepting routes vs. simple modal — ~~decide in Slice 2~~ **resolved (see below).**
3. Zod schema sharing between backend/frontend — start by copying.
4. Exact accent indigo shade + full token table — finalize in Slice 0.

### Slice 2 resolutions (2026-06-02)

- **Scraper / Gemini fallback:** Slice 2 ships the deterministic **Cheerio + Turndown** scraper only, structured with a typed *optional* `fallback?: (html) => Promise<Partial<ScrapeResult>>` seam. The Gemini implementation is **deferred to the AI slice** (no `@google/genai` dependency yet; `GEMINI_API_KEY` stays optional/unused). Rationale: matches the spec's AI deferral, stays fully testable without a key, and the `UrlPasteForm` manual-entry path is the real fallback for weak scrapes.
- **JobDrawer routing:** **URL query param** `?job=<id>` on a new **`/app/jobs`** index page (a minimal list + "Jobs" nav item added in this slice, since Kanban is Slice 3 and List View is Slice 5). The drawer is a client island that reads `searchParams` and fetches via TanStack Query — back-button/deep-link/notification-link friendly without parallel/intercepting-route machinery.
- **`drizzle.config.ts` schema path:** point `schema:` at the existing **`src/db/schema/index.ts` barrel** (which re-exports every table). Adding `jobs` is one `export *` line the app needs anyway; the config never changes again.
- **Jobs schema specifics:** `status` as a `pgEnum('job_status', [...6])`; plain `string` ids (consistent with the Slice 1 auth module — no branded types introduced mid-migration); `kanbanOrder` float auto-incremented per-status on create and set explicitly on move; `lastActivityAt` updated on create/update/move; `ghostDays` stored (default 0) with its *population* (cron vs. derive) deferred to Slice 3/4; `/api/jobs/scrape` is **preview-only** (returns `ScrapeResult`, does not persist).

### Slice 3 resolutions (2026-06-02)

- **Dashboard endpoints:** dedicated `GET /api/dashboard/kanban` (→ `{ columns, stats }` — 6 always-present columns each with a trimmed `KanbanCard` projection sorted by `kanbanOrder` ASC) and `GET /api/dashboard/stats` (→ global `{ totalJobs, byStatus, ghostAlerts, recentActivity }`). New `dashboard` module mirroring the jobs layout. **Chosen over client-grouping `/api/jobs`** because that endpoint is paginated (limit 20) and a board needs the full set. Endpoints accept optional `search`/`status`/`ghostFilter` (forward-compatible; the Slice 3 UI sends none — filter UI is Slice 5).
- **`kanbanOrder` on drop:** **fractional float midpoint** — between cards → `(before + after) / 2`; first → `first / 2`; append → `last + 1`; empty column → `1`. O(1) per move, touches only the dragged card (no reindex).
- **Optimistic moves:** `@dnd-kit/core` + `@dnd-kit/sortable`; new `useMoveJob()` mutation (`PATCH /api/jobs/:id/move`) using the TanStack `onMutate` (cancel + snapshot + optimistic `setQueryData`) → `onError` (rollback) → `onSettled` (invalidate kanban) pattern.
- **Stats shown:** 5 cards — **Total · Applied · Interviewing · Offers · Ghost alerts** (mono numerics).
- **Ghost data:** **derived at read-time** from `lastActivityAt` (fallback `createdAt`) in the dashboard service — `ghostDays`, `ghostAlerts` (>14d) and `ghostFilter` computed live so the signature feature works in Slice 3 without the Slice 4 cron. (Stored `ghostDays` column stays; the cron may persist it later for DB-level sorting.)
- **Card → drawer:** reuse the Slice 2 `JobDrawer` on the dashboard via `/app/dashboard?job=<id>`; generalize its close to return to the **current pathname** (works on `/app/dashboard` and `/app/jobs`). The drawer is the full detail view (info + status + notes + snapshot) — no separate detail page.
- **ViewToggle:** **deferred to Slice 5** (ships with the List View). Slice 3 = stats + Kanban board only. *(Superseded by the Slice 3.5 IA refinement below — the toggle is pulled forward.)*
- **Column label/color:** derived on the frontend from `STATUS_META`/`JOB_STATUSES`; the backend kanban columns carry `status` + `jobs` only (no presentation).

### Slice 3.5 resolutions — workspace / overview split (2026-06-03)

Follow-on refinement to Slice 3 (decided before the Slice 3 branch merged). Slice 3 left the Kanban board on `/app/dashboard` and the jobs list on `/app/jobs` as two disconnected pages of the same data — the board read as "odd" under a stats row because a dashboard wants to be a *scannable overview* while a board wants to be a *workspace*. This restores the original app's single-workspace + view-toggle intent.

- **IA:** `/app/jobs` becomes the **unified Jobs workspace** with a **Board ⇄ List** view toggle (the board and the list are two views of one surface). `/app/dashboard` becomes a **stats-only overview**. **No new sidebar item** — Board is a *mode of* Jobs, not a route sibling. (The deferred-to-Slice-5 `ViewToggle` from §3 is pulled forward to here.)
- **Default view:** **List**. The board is opt-in via the toggle.
- **View persistence:** **URL query param** `?view=board|list` on `/app/jobs` (consistent with `?job=`, shareable, survives refresh; toggling preserves any `?job=`). No localStorage.
- **Dashboard scope (now):** the **5 stat cards only** (Total · Applied · Interviewing · Offers · Ghost alerts), fed by the existing `GET /api/dashboard/stats`. **Charts and a recent-activity feed are explicitly deferred** (recent-activity needs an activity log we don't track yet — natural fit alongside Slice 4 timeline/Slice 5). No needs-attention list in this slice.
- **Backend:** **no changes.** Board view reuses `GET /api/dashboard/kanban`; list view reuses `GET /api/jobs`; dashboard reuses `GET /api/dashboard/stats`.
- **Add Job:** the toolbar action moves onto the Jobs-workspace toolbar (next to the toggle). The `?job=` drawer continues to work in both views.
- **Component hygiene:** the segmented toggle is a reusable `ui/segmented-control` primitive (not inline markup); the list rows are extracted into a `JobsList` component; the dashboard becomes a `DashboardOverview` component.

### Slice 4 resolutions (2026-06-03)

Full design: [`2026-06-03-slice-4-timeline-reminders-notifications-design.md`](./2026-06-03-slice-4-timeline-reminders-notifications-design.md). Headlines:

- **Split into 4a / 4b / 4c** (different risk profiles): **4a** = `timeline` module + jobs-service auto-events + JobDrawer timeline section (request-time only); **4b** = `reminders` + `notifications` modules + `node-cron` scheduler + bell/popover + reminders UI; **4c** = **socket.io** real-time delivery. Migrations stay **per-slice** (4a: `timeline_events`; 4b: `reminders` + `notifications`).
- **Timeline:** legacy parity — AUTO events on **create** and **status-change** (both `PATCH /jobs/:id` and `/move`), none for notes/other edits; service-centralized (`jobs.service` → `timelineService.addAutoEntry`, repo stays pure). `timeline_events` carries `userId` (uniform with the other two tables + the scoping convention).
- **Reminders:** legacy parity — `message`/`remindAt`(UTC)/`isCompleted`; one-time; hard delete. Reminder-due cron runs **every 5 min** → REMINDER notification + `isCompleted=true` (idempotent).
- **Ghost sweep:** daily @midnight persists `jobs.ghostDays` as a **bookkeeping-only crossing-detection anchor** and fires `GHOST_ALERT` on 7/14-day crossings — **user-facing ghost stays derived-live** (Slice 3's decision is intact). Also **fixes the `/api/jobs` ghostFilter bug** (it reads the always-0 stored column) by deriving live in SQL, with shared `GHOST_STALE_DAYS`/`GHOST_GHOST_DAYS` constants.
- **Notifications:** `GET /api/notifications?unreadOnly=` (capped 50), `PATCH /read-all` (routed before `:id/read`), `PATCH /:id/read`; `relatedJobId` is `ON DELETE SET NULL`; **unread count derived client-side**. Bell + popover live in the **PageHeader actions region**; click-through reuses the `?job=` drawer.
- **Delivery: no app-level polling.** Real-time via **socket.io** (cookie-auth on upgrade, per-user rooms, long-polling fallback kept as the Next/Docker proxy safety net). **This overrides the migration spec §11.1 "real-time deferred / 60s polling" baseline** — pulled forward into 4c. 4b interim liveness = event-driven refetch-on-window-focus (not interval polling).
- **Scheduler lifecycle:** singleton started **after `app.listen()`** (never in `createApp`), stopped before `server.close()`; gated by `ENABLE_SCHEDULER` (off in test).
