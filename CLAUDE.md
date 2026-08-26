# CLAUDE.md

Guidance for Claude Code when working in this repository.

## ⚠️ Current State — read first

JobVault ("Ghost-Proof Job Application & AI Assistant") is **mid-migration**: the original stack (NestJS + Nuxt 4) is being rebuilt as **Express + Next.js**, feature-by-feature, with a fresh **minimalist-ui** design.

- **Active code:** `backend-express/` (Express 5 + Drizzle) and `frontend-next/` (Next.js 16). **Build here.**
- **Legacy stacks removed** (2026-07-05): the original `backend/` (NestJS) and `frontend/` (Nuxt) reference folders were deleted. Read the original behavior/contracts via git history (last present at commit `dd9daa1`).
- **Done** — one line per shipped unit. Full detail (decisions, migration numbers, verification) lives in `progress.md`; keep it that way: **a finished slice adds ONE line here, the narrative goes in `progress.md`.**
  - Slices 0–5 (2026-06-01..04): Foundation · Auth (JWT cookies + silent refresh) · Jobs (CRUD + Cheerio/Turndown scraper, AddJobModal, `?job=` JobDrawer) · Dashboard/Kanban (`@dnd-kit`, optimistic move, live ghost-days) · 3.5 unified Jobs workspace (Board⇄List) · Timeline/Reminders/Notifications (node-cron sweeps + socket.io real-time) · Filters/Search/List (URL-synced `useJobFilters`, ⌘K search, hybrid board drag).
  - Slice 6 AI (merged 2026-06-06): personas + `@google/genai` wrapper; résumé generation (pure `.tex` deriver + client-side react-pdf — **no backend rendering, no file storage**); cover letters; DB-derived hourly AI rate limit. Migrations `0004`–`0006`.
  - Slice 7 (2026-06-10..16): 7a master profile (`ProfileContent` Zod, `/app/profile` ProfileEditor, migration `0007`); 7b personas re-based onto `ProfileContent`, AI-free create, PDF résumé import (migration `0008`); 7c cover-letters workspace + adhoc pasted-JD letters (migration `0009`) + résumé library; follow-up: shared markdown parser (PDF matches preview), AI refine with stage-then-commit UI (`ai_usage_events`, migration `0010`), `/app/cover-letters/[id]` route split; ConfirmDialog/`useConfirm` gating every entity delete.
  - Slice 8 Chrome extension (merged 2026-06-22): `api-keys` (migration `0011`) + `extension` modules, **`X-API-Key` runtime auth — no cookie weakening**, `/extension/authorize` `launchWebAuthFlow` handoff, on-demand live-DOM extraction (`chrome.scripting`+`activeTab`), extension base URL = web origin `:8080`.
  - App editorial-shell redesign (merged 2026-06-25): de-dashboarded `/app` — dissolved sidebar, no top bar, Jobs is home (KPI page deleted), grouped borderless JobList, Newsreader serif, centered 1240px frame, window-edge scrollbar, collapsible icon rail.
  - Public landing v3 + six sub-pages + global dark finale (merged 2026-07-15) · Mobile app nav (speed-dial below `lg`, merged 2026-07-15).
  - Slice 9 referral outreach (merged 2026-07-17): `job_contacts` (migration `0012`), `contacts` module with AUTO timeline events, JobDrawer Outreach section, `OutreachBadge` on list + kanban; ghost meter untouched (employer-signal only).
  - Next.js 16 upgrade (branch `upgrade-next-16`, 2026-08-26): next 16.3.3 + react 19.2.8, `middleware.ts`→`proxy.ts`, Turbopack dev+build (`transpilePackages` workaround dropped), React Compiler on (in vitest too; 16 pre-existing hooks violations demoted to warn → `t-0c7ire`), typegen `PageProps`, `next typegen` before typecheck. Deferred per `d-0c7hxl`: Cache Components, `<Activity/>` (`t-0c7irf`), TS7 (`t-0c7irg`).
  - Saved answers library (branch `slice-answers-library`, 2026-08-25): `question_answers` (migration `0013`), two **character-measured** variants, one-call dual-variant Gemini generate, `/app/answers` + `?answer=`/`?new` slideover, copy chips stamping `last_used_at`. `jobId` wired end-to-end but no UI sends it (`.blink/tasks/t-0c61ek`).
- **Next:** **Google OAuth**, **email reminders**; then the two follow-ups this slice sets up — **extension answer surfacing** [`t-0c5uc8`, where most of the value is] and **global search** [`t-0c5wyz`, Postgres FTS per decision `d-0c5wyy`; it also builds `/app/resumes/[id]` and a `?persona=` slideover]. **The backlog now lives in `.blink/tasks/`, one file per item** — `docs/deferred-tasks.md` and `docs/polish-and-tech-debt.md` are just pointers. (User pushes — local master ahead of `origin/master`.)

### Where to look (source of truth)
- `progress.md` — **status of every slice; read this first.**
- `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md` — overall migration architecture + the slice roadmap.
- `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md` — scope of this effort (app surface + Express), design direction, decisions.
- `docs/superpowers/plans/` — the executed slice plans (Slices 0–4, incl. `2026-06-03-slice-4{a,b,c}-*.md`); use the latest as the pattern for new slices.
- `docs/deferred-tasks.md` — backlog of intentionally-deferred work (email reminders, recurring/soft-delete reminders, production WS-upgrade proxy, socket.io Redis adapter for multi-instance, global `/app/timeline` feed).
- `docs/best-practices/{express,nextjs,typescript}.md` — the standards a reviewer checks against.
- `CONVENTIONS.md` — DB/backend/frontend naming conventions.

## Delegation & context hygiene — not optional

The main thread orchestrates and reviews; it does not implement. Delegation is the **default** — never wait for the user or a skill chain to say "use the coder agent":

- **Implementation → the `coder` agent** (its def pins `model: opus`; never Sonnet 5). Any change beyond a trivial single-file tweak (~≤10 lines) gets dispatched with an exact spec: files, behavior, which sibling pattern to mirror, which gates to run. Independent tasks → parallel coders.
- **Locating code → `cavecrew-investigator` / Explore.** Never page through files inline (`cat`/`sed -n` loops) to answer "where is X / how does the sibling page do it".
- **Review → the `reviewer` agent** after coder reports, before merge.
- **Screenshots never enter the main thread.** In-browser verification (playwright-cli) runs in a subagent that looks at the images and reports pass/fail + what differs; each image Read costs 40–70KB of main context. The main thread reads at most one final screenshot per surface, if any.
- **Scope verification to the change.** A cosmetic tweak needs hot-reload + a subagent eyeball, not the full suite. Full gates (`make gates`) run once before commit/merge — not after every edit.

## Consistency before novelty

Recurring defect class: a new page hand-rolls a pattern a sibling already implements, slightly differently (the answers-page header vs the jobs-page header). Rules:

- Before building any new surface, **read the closest sibling first** (list pages: jobs · answers · cover-letters · resumes · personas; editors; drawers) and match its components, sizes and responsive behavior exactly.
- If the pattern exists only as per-page markup (2+ near-copies), **extract the shared component** into `components/ui/` and migrate the siblings — never add another copy.
- Backend: a new module mirrors the closest existing module (`answers`, `contacts`) — router shape, envelope, error paths, test layout.
- Any deliberate divergence from a sibling gets flagged to the user before it ships.

## Tech Stack (target)

- **Backend** (`backend-express/`): Express 5, Drizzle ORM, PostgreSQL 16, Pino, Zod, strict TypeScript (NodeNext — imports use `.js`).
- **Frontend** (`frontend-next/`): Next.js 16 (App Router) + React 19, Tailwind v4 (CSS-first), TanStack Query v5, React Hook Form + Zod. **UI primitives are hand-written in `src/components/ui/` with our tokens (not the shadcn CLI); Radix is used only for overlay *behavior* (`@radix-ui/react-dialog` → dialog/sheet). Any styled element gets its own component — never inline styled markup.**
- **Auth:** custom JWT in **HTTP-only cookies** (access 15m, refresh 7d, **both `path:/`**) + refresh rotation + **silent refresh** (api-client retries 401→`/api/auth/refresh`→retry, single-flight; `proxy.ts` gates `/app/*` on either cookie). (NestJS used Bearer-in-body; the cookie model is the intentional change.)
- **Design:** minimalist-ui — warm-stone base, **flat muted-indigo** accent, **Geist** (sans) + **Geist Mono** (numerics signature) + **Instrument Serif** (editorial headings), faint hairline borders, near-zero diffuse shadows, dark-mode first-class. Use the `minimalist-ui` skill.
- **Deferred (not yet built):** Google OAuth, AI/cover-letters/resume (Gemini), file storage (Cloudinary/pdfkit), public-page redesign, Chrome extension. (Automatic token refresh is now **done**.)

## Running the stack (Docker)

Everything goes through the root **`Makefile`** — run `make` for the full list.

```bash
make setup      # once: writes .env from the committed .env.example
make up         # build + start postgres, backend-express, frontend-next
make doctor     # "why isn't X working?" — env keys, containers, API + AI status
make seed       # fill the DB with demo data (demo@jobvault.app / demo1234)
make logs s=backend-express
make rebuild    # after adding npm deps (--force-recreate --renew-anon-volumes)
make gates      # typecheck + lint + both test suites + production web build
```

### Environment: the root `.env` is the single source of truth

Compose reads `${VAR}` interpolation **only** from the `.env` next to
`docker-compose.yml` — never from `backend-express/` or `frontend-next/`. So all
values live in the root `.env` (gitignored), documented key-by-key in the
committed **`.env.example`**.

- **Never add a second `.env` next to an app.** `dotenv` and Next both refuse to
  overwrite a variable already in `process.env`, so the compose-supplied value
  always wins and the app-local file is silently ignored. A valid
  `GEMINI_API_KEY` once sat in `backend-express/.env` while the API reported AI
  as disabled — that is the failure mode.
- The backend loads the root file via `src/config/load-dotenv.ts` (resolved from
  the module's own path, so it works under tsx, vitest, drizzle-kit and `dist/`).
  Inside the container the path does not exist and compose supplies everything.
- Secrets are written `${GEMINI_API_KEY}` in compose with **no `:-` default**, so
  an unset key makes compose warn out loud instead of silently disabling AI.
  `make doctor` also reports keys present in `.env.example` but missing from `.env`.
- The one exception: Next can only auto-load env files from its own directory, so
  a **host-run** `npm run dev` in `frontend-next/` needs `.env.local` (copy
  `frontend-next/.env.example`). It holds no secrets. Under Docker it is unused.
- Host ports `5432`/`3000`/`3001` are taken on this machine, hence
  `DB_PORT_EXTERNAL=5433`, `BACKEND_PORT=3100`, `FRONTEND_PORT=8080`. Keep
  `DATABASE_URL`'s port in sync with `DB_PORT_EXTERNAL` (host runs use it).

- App: **http://localhost:8080** · API (direct): **http://localhost:3100/api/health** (`make urls`)
- Backend runs `db:migrate && dev` on startup (auto-applies Drizzle migrations).
- The browser calls `/api/*` **same-origin**; Next proxies it to `BACKEND_INTERNAL_URL` (the in-network backend). Don't put a Docker hostname in a `NEXT_PUBLIC_*` var.
- Both services bind-mount their source and hot-reload. `.next` and `node_modules` are anonymous volumes (hence `make rebuild` after dep changes).

### Per-app commands

`make test-backend` / `make test-web` / `make typecheck` / `make lint` run these
inside the containers (where `node_modules` actually lives). Directly:

```bash
# backend-express/
npm run typecheck && npm run lint && npm run test         # Vitest (+ real Postgres for repository tests)
npm run db:generate && npm run db:migrate                 # Drizzle Kit

# frontend-next/
npm run typecheck && npm run lint && npm run test && npm run build   # Vitest + RTL; Next build
```
> Note: the running dev container writes a root-owned `.next` into the host mount, so a host `rm -rf .next` may hit permission errors — verify production builds via `make build-web` (`docker build --target production ./frontend-next`) instead.

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

For **UI/visual changes**, verify in-browser with the `playwright-cli` skill (screenshot at desktop + mobile widths, e.g. 1440 / 1024 / 390) before claiming done — don't rely on tests alone. Run the screenshot pass in a subagent that eyeballs the images and reports; don't Read image files into the main thread (see *Delegation & context hygiene*).

Slice order (per the spec): Foundation → Auth → **Jobs** → Dashboard/Kanban → Timeline/Reminders/Notifications → Filters/Search/List.

## Environment variables

- **backend-express:** `NODE_ENV`, `PORT`, `CORS_ORIGINS`, `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `LOG_LEVEL`; later `GOOGLE_*`, `CLOUDINARY_*`, `GEMINI_API_KEY` (optional, validated by Zod at startup).
- **frontend-next:** `BACKEND_INTERNAL_URL` (server-side proxy target), `NEXT_PUBLIC_API_BASE` (legacy fallback).

<!-- blink:begin v0.5.2 -->
## Project tracking (Blink) — not optional

job-vault keeps its plan in `.blink/`, one file per entity. The file
is the record and it is written **before** the work, never after it. Write to
`.blink/` when you plan, start, finish, block or drop work, and when a
real technical choice gets made.

- Tasks run `backlog` → `planned` → `in_progress` → `done`; exits: `dropped`,
  `blocked` (needs `blocked_by`), `paused` (needs `paused_reason`). Never delete a file.
- A task is created at `backlog` while it is still being planned, not when work
  on it starts. A real choice becomes a file in `.blink/decisions/`.
- Run `blink validate` after every write; `0` means clean.

Full contract: the `/blink:tracking` skill; fields:
`.blink/SCHEMA.md`. Read both before your first write.
<!-- blink:end -->
