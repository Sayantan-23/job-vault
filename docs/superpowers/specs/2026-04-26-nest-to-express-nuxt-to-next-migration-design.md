# JobVault Stack Migration — Design Spec

> **Date:** 2026-04-26
> **Owner:** weloin-sayantan
> **Migration:** NestJS → Node/Express · Nuxt 4 → Next.js 15 (App Router)
> **Status:** Design approved — awaiting implementation plan

---

## 1. Goal & Motivation

Replace the current backend (NestJS) and frontend (Nuxt 4) with a Node/Express backend and a Next.js 15 (App Router) frontend.

**Driving reasons:**
- Strengthen Node/Express skills (over learning NestJS)
- Learn Next.js + React (already know Vue/Nuxt)
- Use a stack with broader market reach and learning material

The migration is **committed**, not exploratory. The project will be reviewed by a senior engineer — code quality and adherence to documented best practices is a primary concern.

---

## 2. Current Build State (Pre-Migration)

### Existing backend (`backend/` — NestJS) — ~62% built
- ✅ Built (`[T]` To Test): BE-01 Setup, BE-02 Auth (JWT + Google OAuth), BE-03 Job (CRUD + Cheerio scraper), BE-04 Dashboard, BE-05 Timeline/Reminders/Notifications/Scheduler
- 5 migrations exist
- ❌ Not built: BE-06 File Storage, BE-07 AI/Gemini, BE-08 Extension API

### Existing frontend (`frontend/` — Nuxt 4) — ~70% built
- ✅ Built: FE-01 Setup, FE-02 Auth, FE-03 Kanban, FE-04 Job mgmt, FE-06 Timeline/Reminders/Notifications, FE-09 Public landing, FE-10 Secondary pages
- ~40 Vue components, 10 composables, 10+ pages, glassmorphism theme
- ❌ Not built: FE-05 Filters/List view, FE-07 AI/Resume, FE-08 Chrome extension

The existing code stays in place during the migration as a reference. Old folders are deleted only after the new build reaches feature parity.

---

## 3. Stack Decisions (Approved)

| Concern | Choice | Reason |
|---|---|---|
| Backend framework | **Express 5** | Goal is to strengthen Express skills directly |
| Backend language | **TypeScript** (strict) | Type safety end-to-end |
| Frontend framework | **Next.js 15 (App Router)** | Modern Next; learn RSC + Server Actions in context |
| Frontend language | **TypeScript** (strict) | Same as backend |
| ORM | **Drizzle** | Prior user experience; SQL-near; strong TS inference |
| Database | **PostgreSQL** | Domain is relational; Drizzle is SQL-only; SQL is universally transferable |
| UI library | **shadcn/ui** | Most popular React choice; copy-paste source ownership; Tailwind-native; pairs with App Router |
| Auth (token format) | **Custom JWT, HTTP-only cookies** | Maximum learning value (vs. Auth.js abstraction) |
| Validation (both apps) | **Zod** | Schema → inferred type, single source of truth |
| Frontend data layer | **TanStack Query v5** | Caching, optimistic updates, background refetch |
| Forms | **React Hook Form + Zod resolver** | Standard pairing with shadcn `<Form>` |
| Drag & drop | **@dnd-kit/core** | Best-in-class React DnD |
| HTTP client (frontend) | **Native `fetch` wrapper** | Pairs with TanStack Query; no extra dep |
| Animations | **GSAP + Lenis** (kept) | Framework-agnostic; reused via React refs/effects |
| Logger (backend) | **Pino + pino-http** | Fast, structured, with request IDs |
| Security middleware | **helmet + cors + express-rate-limit** | Industry standard |
| Cron | **node-cron** | Replaces `@nestjs/schedule` |
| Testing | **Vitest** (both) + **Playwright** (E2E) | One tool for both apps |
| Lint/format | **ESLint + Prettier** | Standard |
| Repo layout | **Two top-level folders** (`backend-express/`, `frontend-next/`) | Mirrors current; avoids monorepo overhead |
| Env validation | **Zod schema parsed at startup** | Fails fast on misconfig |

---

## 4. Best-Practices Documents

Three opinionated reference docs were written before any code is touched. They define the standards a senior reviewer will check against.

- `docs/best-practices/typescript.md` — strict tsconfig, banned patterns, Zod-as-source-of-truth, branded IDs, discriminated unions, reviewer checklist
- `docs/best-practices/nextjs.md` — Server vs Client components, App Router structure, data fetching, caching, middleware auth, RHF+Zod forms, shadcn conventions
- `docs/best-practices/express.md` — layered architecture, middleware order, async handler pattern, error envelope, JWT cookies, refresh rotation, Drizzle repository pattern, user-scoping rule, cron, testing

All implementation work follows these. Each doc ends with a per-PR reviewer checklist.

---

## 5. High-Level Architecture

```
job-vault/
├── backend-express/    # New: Node 20+ / Express 5 / Drizzle / PostgreSQL
├── frontend-next/      # New: Next.js 15 / React 19 / shadcn/ui
├── plans/              # Existing — used as spec for what to build
├── backend/            # Existing Nest — kept as reference until Phase 8 cleanup
├── frontend/           # Existing Nuxt — kept as reference until Phase 8 cleanup
└── docker-compose.yml  # Updated to point at new services
```

**Two independent processes in dev:**
- `backend-express`: port 3000, serves `/api/*`
- `frontend-next`: port 8080, proxies `/api/*` → `http://localhost:3000`

**Communication:**
- JSON contracts identical to existing app (success → `{ data, meta? }`, error → `{ statusCode, message, error, details? }`)
- Auth via HTTP-only cookies set by backend, automatically forwarded by Next.js
- All browser requests include `credentials: 'include'`; backend CORS allows `http://localhost:8080` with `credentials: true`
- Server Components forward cookies via `cookies()` helper

---

## 6. Backend Internals (`backend-express/`)

### Folder structure
```
backend-express/src/
├── index.ts                # Boot: env, migrations, server start, graceful shutdown
├── app.ts                  # Express app factory (testable, no port binding)
├── config/env.ts           # Zod-validated env (fails fast)
├── db/
│   ├── client.ts           # Drizzle pool + client singleton
│   ├── schema/             # Drizzle tables (users, jobs, timeline_events, ...)
│   └── migrations/         # Drizzle Kit output
├── middleware/             # auth, error, logger, validate, transform
├── shared/                 # AppError, asyncHandler, logger (Pino)
├── modules/
│   ├── auth/               # router, controller, service, repository, schema, test
│   ├── job/                # + services/scraper, services/markdown
│   ├── dashboard/
│   ├── timeline/
│   ├── reminder/
│   ├── notification/
│   ├── storage/            # Cloudinary + PDFKit
│   ├── ai/                 # Gemini + cover letters + resume parser
│   └── extension/          # API key auth + quick-create endpoints
└── jobs/                   # node-cron schedulers
```

### Module template
Every feature module has the same shape:
```
modules/<feature>/
├── <feature>.router.ts       # Express Router; binds middleware → controllers
├── <feature>.controller.ts   # Parses req, calls service, formats res
├── <feature>.service.ts      # Pure business logic
├── <feature>.repository.ts   # Drizzle queries; returns domain objects
├── <feature>.schema.ts       # Zod schemas + inferred DTO types
└── <feature>.test.ts         # Co-located unit tests
```

### Layered architecture rules
- Router knows about Controller. Nothing else.
- Controller knows about Service + Schema. Never about Drizzle or DB.
- Service knows about Repository + other Services. Never about Express (`req`, `res`).
- Repository knows about Drizzle. Returns plain objects, not DB rows leaking pg internals.

If a Controller calls Drizzle directly, the PR is rejected.

### Wiring
No DI container. Services and repositories are exported as object literals. A single `apiRouter` mounts each feature router under `/api/<feature>`.

### Auth flow
1. `POST /api/auth/login` → verify password → set `accessToken` (15m, `path: /`) + `refreshToken` (7d, `path: /api/auth`) HTTP-only cookies → return user
2. Subsequent requests carry cookies automatically
3. `authMiddleware` verifies `accessToken`; on expiry, frontend middleware calls `POST /api/auth/refresh` (rotation)
4. Google OAuth: standard Passport.js callback → same cookie issuance

### External services kept as-is
Cloudinary, Gemini, PDFKit, Cheerio, Turndown — all framework-agnostic. Direct port from current code.

---

## 7. Frontend Internals (`frontend-next/`)

### Folder structure
```
frontend-next/src/
├── app/                              # App Router
│   ├── layout.tsx                    # Root: only <html>, <body>, fonts, providers. NO theme tokens.
│   ├── page.tsx                      # / — landing (empty placeholder for future redesign)
│   ├── (web)/                        # Public pages — own theme + own shell. All empty stubs.
│   │   ├── layout.tsx                # WebShell (WebNavbar + WebFooter)
│   │   └── about|faq|contact|privacy|terms/page.tsx
│   ├── (auth)/                       # Login/register — uses app/ theme + own shell
│   │   ├── layout.tsx                # AuthShell (centered glass card)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── google/callback/page.tsx
│   ├── app/                          # Authenticated app — own theme + own shell
│   │   ├── layout.tsx                # AppShell (AppHeader + AppSidebar)
│   │   ├── dashboard/                # Kanban + stats
│   │   ├── jobs/[id]/
│   │   ├── resume/
│   │   ├── timeline/
│   │   └── settings/
│   ├── error.tsx
│   ├── not-found.tsx
│   └── global-error.tsx
├── components/
│   ├── ui/                           # shadcn/ui primitives (theme-agnostic, use CSS vars)
│   ├── kanban/                       # Board, Column, Card, GhostMeter
│   ├── job/                          # AddJobModal, JobDrawer, Snapshot, Forms
│   ├── timeline/
│   ├── reminder/
│   ├── notification/
│   ├── auth/                         # LoginForm, RegisterForm, GoogleButton
│   ├── layout/
│   │   ├── web/                      # WebNavbar, WebFooter — used ONLY by (web)
│   │   ├── auth/                     # AuthShell — used ONLY by (auth)
│   │   └── app/                      # AppHeader, AppSidebar — used ONLY by app/
│   └── shared/                       # Truly cross-cutting (LoadingSpinner, EmptyState)
├── hooks/                            # React hooks (replace Vue composables)
│   ├── use-auth.ts
│   ├── use-jobs.ts
│   ├── use-job-drawer.ts
│   ├── use-add-job-modal.ts
│   ├── use-timeline.ts
│   ├── use-reminders.ts
│   ├── use-notifications.ts          # 60s polling (Phase 4) — replaced by WebSocket later
│   ├── use-toast.ts
│   └── use-scroll-reveal.ts
├── lib/
│   ├── api-client.ts                 # Browser fetch wrapper (cookies auto-sent)
│   ├── api-server.ts                 # Server Component fetch (forwards cookies)
│   ├── query-client.ts               # TanStack QueryClient + defaults
│   ├── auth-server.ts                # cookies() + JWT decode helpers
│   ├── utils.ts                      # cn() + formatters
│   └── constants.ts
├── schemas/                          # Zod schemas (mirrors backend)
├── types/
├── styles/
│   ├── globals.css                   # Tailwind base + resets ONLY. No theme tokens.
│   ├── web/
│   │   ├── theme.css                 # CSS vars scoped to [data-theme-scope="web"]
│   │   └── glassmorphism.css
│   └── app/
│       ├── theme.css                 # CSS vars scoped to [data-theme-scope="app"]
│       └── glassmorphism.css
└── middleware.ts                     # Auth: cookie check + refresh + redirect
```

### Theme & layout isolation (hard requirement)

`(web)` and `app/` must be visually and structurally independent. Changing one cannot affect the other.

- **Two scoped theme files** with identical variable names, scoped via `[data-theme-scope="web"]` and `[data-theme-scope="app"]` selectors
- **Each layout imports only its own theme CSS** and sets `data-theme-scope` on its outermost wrapper
- **Each layout uses its own shell components** (`components/layout/web/` vs `components/layout/app/`) — no cross-imports
- **shadcn/ui primitives** stay shared (logic-shared) but render different visuals via CSS vars
- **Dark mode** is per-scope: app could support dark mode while web stays light-only — independent
- **Auth pages** import `styles/app/theme.css` (share tokens with app) but use their own `AuthShell` component — independent layout, shared theme

### Composable → hook translations

| Vue composable | React hook | Notes |
|---|---|---|
| `useApi.ts` | `lib/api-client.ts` + `lib/api-server.ts` | Two flavors for browser vs Server Component |
| `useAuth.ts` | `use-auth.ts` | TanStack Query for current user |
| `useJobs.ts` | `use-jobs.ts` | Optimistic kanban via `setQueryData` + rollback |
| `useJobDrawer.ts` | `use-job-drawer.ts` + `@drawer` parallel route | URL-driven for shareable links |
| `useToastNotify.ts` | `use-toast.ts` | shadcn ships its own toast |
| `useScrollReveal.ts` | `use-scroll-reveal.ts` | GSAP + useEffect (used only by `(web)` if redesigned) |

### Server vs Client split (rule of thumb)
- Default: Server Component
- Push `'use client'` as far down the tree as possible
- Server fetches initial data → passes to Client island for interactivity
- Mutations always go through TanStack Query

---

## 8. Data Flow

### Two `api` flavors
- **`lib/api-client.ts`** (Client Components, hooks): native `fetch` with `credentials: 'include'`
- **`lib/api-server.ts`** (Server Components, middleware): reads cookies via `cookies()`, forwards in `Cookie` header, always `cache: 'no-store'`

### TanStack Query setup
- `QueryClient` provider at root
- Default `staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false`
- Global mutation `onError` shows toast
- SSR hydration via `initialData` from Server Components — no waterfall

### Auth flow (end-to-end)
- **Login (Client):** form → `apiClient.post('/api/auth/login')` → backend sets cookies → `setQueryData(['currentUser'])` → `router.push('/app/dashboard')`
- **Authenticated request (Client):** `useQuery` → `apiClient.get` → cookie sent automatically
- **Authenticated request (Server):** `apiServer` → forwards cookie header → backend handles
- **Refresh:** middleware on `/app/*` checks expiry, calls `/api/auth/refresh`, copies `Set-Cookie` headers to `NextResponse`
- **Mid-request 401:** `apiClient` catches once → calls refresh → retries original; on failure clears cache and redirects

### Optimistic updates (Kanban example)
```
useMoveJob:
  onMutate: snapshot prev → setQueryData(local mutation) → return prev
  onError:  setQueryData(prev) + toast
  onSettled: invalidateQueries(['kanban']) — reconcile with server
```

### Error contract
Backend errors: `{ statusCode, message, error, details? }`. Frontend wraps in typed `ApiError` class. TanStack Query and React Hook Form both consume consistently.

---

## 9. Migration Phases

Hybrid approach: read the relevant `plans/` doc + reference current code → rewrite idiomatically in the new stack. New code lives in `backend-express/` and `frontend-next/`. Old code stays browsable as reference until Phase 8.

| Phase | Scope | Reference |
|---|---|---|
| **0. Scaffolding** | Both apps boot, connect to DB, return health endpoints. Theme isolation skeleton. Updated `docker-compose.yml` | `plans/backend/01`, `plans/frontend/01` |
| **1. Auth** | User schema, JWT cookie issuance, refresh rotation, Google OAuth, login/register UI, middleware | `plans/backend/02`, `plans/frontend/02` + current code |
| **2. Job Management** | CRUD + Cheerio scraper + Markdown + Gemini fallback, AddJobModal, JobDrawer | `plans/backend/03`, `plans/frontend/04` + current code |
| **3. Dashboard & Kanban** | Dashboard endpoints, KanbanBoard with @dnd-kit, optimistic moves, GhostMeter, Stats | `plans/backend/04`, `plans/frontend/03` + current code |
| **4. Timeline + Reminders + Notifications** | Schemas, services, scheduler, auto-events, bell with **60s polling** (placeholder) | `plans/backend/05`, `plans/frontend/06` + current code |
| **5. Filters + Search + List View** | URL-synced filters, search bar, sortable table — NEW work | `plans/frontend/05` |
| **6. File Storage + AI** | Cloudinary, PDFKit, Gemini, ResumeParser, CoverLetter generator/editor — NEW work | `plans/backend/06+07`, `plans/frontend/07` |
| **7. Chrome Extension** | ApiKey auth, quick-create endpoints, popup UI — NEW work. Decision: keep extension Vue or port to React | `plans/backend/08`, `plans/frontend/08` |
| **8. Cleanup** | Delete `backend/` + `frontend/`, update `docker-compose.yml`, update `CLAUDE.md`, update `progress.md` | — |
| **9. Future enhancements** (deferred) | Real-time notifications, public landing redesign, anything captured later | See section 11 |

### Dependency rules
- Phase N can't start until Phase N−1 is `[x]` Done
- Inside each phase, backend lands first (or in parallel if frontend is mocked)
- Each phase ends with: tests pass, manual smoke test in browser, PR merged, progress updated

---

## 10. Testing Strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Backend services (unit) | Vitest, mocked repository | 80%+ |
| Backend repositories (integration) | Vitest + real test Postgres | 60%+ |
| Backend HTTP (integration) | Vitest + Supertest | 50%+ |
| Frontend hooks/utils | Vitest + RTL | 70%+ |
| Frontend components | RTL (queries by role/label) | behavior, no hard target |
| E2E | Playwright (against Docker stack) | critical paths only |

### Rules
- **Never mock Drizzle.** Repository tests hit a real Postgres test database
- **MSW for frontend network mocks** — never touch real backend in unit tests
- **Tests run under same strict TS config** — no loosening for tests
- **Per-phase test gate:** unit + integration + critical-path E2E + manual smoke before `[x]`

### CI
GitHub Actions on every PR: typecheck → lint → unit + integration → E2E. Cannot merge if any fail.

---

## 11. Future Enhancements (Deferred)

### Real-time notifications (replace polling)
**Current plan (Phase 4):** TanStack Query 60s polling — matches existing Nest behavior.

**Future:** WebSocket-based push.
- Backend: add `ws` (or `socket.io`) server; on auth, subscribe client to `user:<userId>` channel; emit notification events on creation
- **NATS option:** introduce NATS as message broker between Express services and the WebSocket gateway. Useful if backend ever splits into multiple instances; overkill for single-instance deploys
- **Migration path:** keep `useNotifications` hook signature stable. Internally swap polling for WebSocket subscription that pushes into the same React Query cache via `queryClient.setQueryData`. Components don't change
- **Why deferred:** introducing WebSockets + NATS during the framework migration would conflate two unrelated changes. Land the migration first; layer real-time on top

### Public landing redesign
The user will redesign the public landing pages. Phase 0 scaffolds `(web)/` with empty placeholder pages and a working `WebShell`. Routes exist; content is intentionally blank.

### Chrome extension framework choice
Phase 7 decides whether to keep the extension in Vue 3 (low cost — extension is small and isolated) or port to React (consistency with frontend). Decide when reaching that phase.

---

## 12. What's Out of Scope for This Spec

- Detailed step-by-step implementation tasks — those go in the implementation plan (next document)
- UI redesign of public landing pages — user will redesign separately
- Migration to monorepo tooling (Turborepo, etc.) — explicitly rejected for now
- Auth.js / NextAuth — explicitly rejected (custom JWT chosen for learning value)
- MongoDB — explicitly rejected (Postgres fits the relational domain)
- Pages Router — explicitly rejected (App Router only)

---

## 13. Open Questions to Resolve in the Implementation Plan

1. Exact env var naming (preserve current names or rename for Express conventions?)
2. Whether to keep `mikro-orm.config.ts` migrations runnable for old Nest backend during overlap, or freeze them
3. Whether to share Zod schemas between backend and frontend via a copied file or a small shared package (initial: copy)
4. JobDrawer: parallel route slot vs intercepting routes vs simple modal — decide during Phase 2
5. Chrome extension framework choice — decide at Phase 7
