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
2. JobDrawer: parallel-route slot vs. intercepting routes vs. simple modal — decide in Slice 2.
3. Zod schema sharing between backend/frontend — start by copying.
4. Exact accent indigo shade + full token table — finalize in Slice 0.
