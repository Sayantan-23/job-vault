# CLAUDE.md

Guidance for Claude Code when working in this repository.

## ⚠️ Current State — read first

JobVault ("Ghost-Proof Job Application & AI Assistant") is **mid-migration**: the original stack (NestJS + Nuxt 4) is being rebuilt as **Express + Next.js**, feature-by-feature, with a fresh **minimalist-ui** design.

- **Active code:** `backend-express/` (Express 5 + Drizzle) and `frontend-next/` (Next.js 15). **Build here.**
- **Reference only:** `backend/` (NestJS) and `frontend/` (Nuxt) — kept to read the original behavior/contracts. **Do not edit; delete only at the final cleanup slice.**
- **Done:** Slice 0 (Foundation), Slice 1 (Auth — email/password, JWT cookies, **+ silent token refresh**), Slice 2 (Jobs — CRUD + Cheerio/Turndown scraper, AddJobModal + URL-driven JobDrawer via `?job=`).
- **Next:** Slice 3 (Dashboard & Kanban — `@dnd-kit` board + `GET /api/dashboard/kanban`/`stats` endpoints; `PATCH /api/jobs/:id/move` is already built). **Plan not yet written** — brainstorm the open decisions, then write `docs/superpowers/plans/YYYY-MM-DD-slice-3-dashboard-kanban.md`.

### Where to look (source of truth)
- `progress.md` — **status of every slice; read this first.**
- `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md` — overall migration architecture + the slice roadmap.
- `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md` — scope of this effort (app surface + Express), design direction, decisions.
- `docs/superpowers/plans/2026-06-01-slice-0-foundation.md`, `…/slice-1-auth.md`, `…/2026-06-02-slice-2-jobs.md` — the executed slice plans (use as the pattern for new slices).
- `docs/best-practices/{express,nextjs,typescript}.md` — the standards a reviewer checks against.
- `CONVENTIONS.md` — DB/backend/frontend naming conventions.

## Tech Stack (target)

- **Backend** (`backend-express/`): Express 5, Drizzle ORM, PostgreSQL 16, Pino, Zod, strict TypeScript (NodeNext — imports use `.js`).
- **Frontend** (`frontend-next/`): Next.js 15 (App Router) + React 19, Tailwind v4 (CSS-first), TanStack Query v5, React Hook Form + Zod. **UI primitives are hand-written in `src/components/ui/` with our tokens (not the shadcn CLI); Radix is used only for overlay *behavior* (`@radix-ui/react-dialog` → dialog/sheet). Any styled element gets its own component — never inline styled markup.**
- **Auth:** custom JWT in **HTTP-only cookies** (access 15m, refresh 7d, **both `path:/`**) + refresh rotation + **silent refresh** (api-client retries 401→`/api/auth/refresh`→retry, single-flight; `middleware.ts` gates `/app/*` on either cookie). (NestJS used Bearer-in-body; the cookie model is the intentional change.)
- **Design:** minimalist-ui — warm-stone base, **flat muted-indigo** accent, **Geist** (sans) + **Geist Mono** (numerics signature) + **Instrument Serif** (editorial headings), faint hairline borders, near-zero diffuse shadows, dark-mode first-class. Use the `minimalist-ui` skill.
- **Deferred (not yet built):** Google OAuth, AI/cover-letters/resume (Gemini), file storage (Cloudinary/pdfkit), public-page redesign, Chrome extension. (Automatic token refresh is now **done**.)

## Running the stack (Docker)

Host ports `5432`/`3000`/`3001` are taken on this machine, so a **gitignored root `.env`** remaps them:
`DB_PORT_EXTERNAL=5433`, `BACKEND_PORT=3100`, `FRONTEND_PORT=8080` (`JWT_SECRET` is a 32-char dev value). Recreate `.env` from these if it is missing.

```bash
docker compose up -d --build                              # postgres + backend-express + frontend-next
docker compose up -d --build --force-recreate --renew-anon-volumes   # use this after adding npm deps
docker compose logs -f backend-express                    # watch logs
```

- App: **http://localhost:8080** · API (direct): **http://localhost:3100/api/health**
- Backend runs `db:migrate && dev` on startup (auto-applies Drizzle migrations).
- The browser calls `/api/*` **same-origin**; Next proxies it to `BACKEND_INTERNAL_URL` (the in-network backend). Don't put a Docker hostname in a `NEXT_PUBLIC_*` var.
- Both services bind-mount their source and hot-reload. `.next` and `node_modules` are anonymous volumes (hence `--renew-anon-volumes` after dep changes).

### Per-app commands
```bash
# backend-express/
npm run typecheck && npm run lint && npm run test         # Vitest (+ real Postgres for repository tests)
npm run db:generate && npm run db:migrate                 # Drizzle Kit

# frontend-next/
npm run typecheck && npm run lint && npm run test && npm run build   # Vitest + RTL; Next build
```
> Note: the running dev container writes a root-owned `.next` into the host mount, so a host `rm -rf .next` may hit permission errors — verify production builds via `docker build --target production ./frontend-next` instead.

## Backend architecture (`backend-express/`)

Layered modules under `src/modules/<feature>/`: `router → controller → service → repository → schema (Zod)` + co-located `.test.ts`.
- Controller never imports Drizzle; service never touches `req`/`res`; repository returns plain objects.
- `asyncHandler` wraps async handlers; throw `AppError(code, message)` (codes map to HTTP status); `validate(schema)` middleware parses bodies; `authMiddleware` guards protected routes via the `accessToken` cookie.
- Success envelope `{ data, meta? }`; error envelope `{ statusCode, message, error, details? }` (matches the old Nest contract — frontend is unaffected).
- Drizzle schema files in `src/db/schema/`, re-exported from `index.ts`. **`drizzle.config.ts` currently points at a single table file — generalize it to all tables when Slice 2 adds `jobs`.**
- All queries scoped by `userId`.

## Frontend architecture (`frontend-next/`)

App Router with theme-isolated route groups: `(web)/` (public, placeholder pages for now), `(auth)/` (login/register), `app/` (authenticated). Each sets `data-theme-scope` and imports its own theme CSS. Tokens live in `src/styles/{app,web}/theme.css` and are bridged to Tailwind via `@theme inline` in `globals.css`.
- React hooks replace Vue composables (`src/hooks/`); `lib/api-client.ts` (browser, relative URLs) and `lib/api-server.ts` (Server Components, forwards cookies).
- Server Components by default; push `'use client'` down to interactive leaves (hooks, forms).
- shadcn-style primitives in `src/components/ui/`.

## Implementation workflow

This repo uses the **superpowers** skills, not the old sub-agent system (those agents were removed). For each slice:
1. Read `progress.md` and the migration/app-redesign specs.
2. For a new slice with open design choices, brainstorm the decisions with the user, then write a bite-sized TDD plan to `docs/superpowers/plans/YYYY-MM-DD-slice-N-<name>.md` (mirror the Slice 1 plan).
3. Execute the plan task-by-task (TDD, commit per task). Substantial slices may be orchestrated via the `Workflow` tool: implement → adversarial read-only verify → solo ground-truth gates. (Don't run multiple `next build`/`vitest` in the same dir concurrently — they race on `.next`/caches.)
4. Verify (typecheck + lint + tests + a smoke test against the Docker stack), update `progress.md`, then move on.

Slice order (per the spec): Foundation → Auth → **Jobs** → Dashboard/Kanban → Timeline/Reminders/Notifications → Filters/Search/List.

## Environment variables

- **backend-express:** `NODE_ENV`, `PORT`, `CORS_ORIGINS`, `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `LOG_LEVEL`; later `GOOGLE_*`, `CLOUDINARY_*`, `GEMINI_API_KEY` (optional, validated by Zod at startup).
- **frontend-next:** `BACKEND_INTERNAL_URL` (server-side proxy target), `NEXT_PUBLIC_API_BASE` (legacy fallback).
