# CLAUDE.md

Guidance for Claude Code when working in this repository.

## ⚠️ Current State — read first

JobVault ("Ghost-Proof Job Application & AI Assistant") is **mid-migration**: the original stack (NestJS + Nuxt 4) is being rebuilt as **Express + Next.js**, feature-by-feature, with a fresh **minimalist-ui** design.

- **Active code:** `backend-express/` (Express 5 + Drizzle) and `frontend-next/` (Next.js 15). **Build here.**
- **Legacy stacks removed** (2026-07-05): the original `backend/` (NestJS) and `frontend/` (Nuxt) reference folders were deleted. Read the original behavior/contracts via git history (last present at commit `dd9daa1`).
- **Done:** Slice 0 (Foundation), Slice 1 (Auth — email/password, JWT cookies, **+ silent token refresh**), Slice 2 (Jobs — CRUD + Cheerio/Turndown scraper, AddJobModal + URL-driven JobDrawer via `?job=`), Slice 3 (Dashboard & Kanban — `@dnd-kit` board + `GET /api/dashboard/kanban`/`stats`, optimistic `move`, ghost-days **derived live**), Slice 3.5 (unified Jobs workspace with Board⇄List toggle + stats-only Dashboard overview), Slice 4 (Timeline + Reminders + Notifications — per-job timeline in the JobDrawer + auto-events, `node-cron` scheduler [reminder sweep + daily ghost sweep], notifications bell, and **socket.io real-time** delivery [overrides the spec's "60s polling" placeholder; long-polling fallback through the Next proxy in dev]), Slice 5 (Filters + Search + List View — URL-synced filters/sort/pagination on **both** views via a single `useJobFilters`, debounced search with Cmd/⌘K, a **borderless aligned** sortable list replacing the plain list, and a **hybrid board drag** [cross-column status moves stay enabled while filtered, within-column reorder suppressed]; **frontend-only** — `GET /api/jobs` + `GET /api/dashboard/kanban` already filter/sort/paginate server-side), **Slice 6a** (Personas + Gemini foundation — **re-scoped Slice 6: no file storage**; AI emits structured **JSON/Markdown** and the app owns formatting in code, so a `.tex` [Copy/Overleaf] and a **client-side react-pdf** PDF both derive deterministically with **zero backend rendering toolchain**; `@google/genai` wrapper + `GET /api/ai/status`, `personas` CRUD [cap + AI-structuring], `/app/personas` + reusable `ResumeContentEditor`), **Slice 6b** (Résumé generation — `generated_resumes` table [migration `0005`], pure **`.tex` deriver** [golden-tested, single-pass LaTeX-escape + `\href` URL escaping + `**bold**`], `buildResumePrompt` [persona-only or persona+job], **DB-derived hourly rate limit** [spent after ownership], `resumes` module incl. `GET /:id/tex`; frontend **react-pdf** `ResumeDocument` [ESM → `transpilePackages`] preview/PDF + extended editor + **Copy LaTeX / Open in Overleaf / Download PDF** on `/app/resumes`), **Slice 6c** (Cover letters + JobDrawer wiring — `cover_letters` table [migration `0006`], `buildCoverLetterPrompt` [Markdown, per job + persona, via `generateText`], **rate-limit count now sums résumés + cover letters**, `cover-letters` module; frontend `CoverLetterEditor` [react-markdown preview + PDF] + `useCoverLetters`, **job-tailored résumé via `?job=`**, and the **JobDrawer Résumé launcher + Cover-letter section**). **→ Slice 6 (6a+6b+6c) COMPLETE** on `slice-6-ai-resume-cover-letter` (gates green, adversarially reviewed, live-smoked on Gemini; migrations `0004`–`0006`; **merged to master 2026-06-06**, plus persona/résumé UI polish [card grid + edit, full-width-controls/sticky-preview résumé workspace, PDF header fix]), **Slice 7a** (Master profile — shared lenient **`ProfileContent`** Zod schema + `ensureIds`, `user_profiles` table [migration `0007`], `profile` module [`GET`/`PUT /api/profile`], `/app/profile` with the rich per-section **`ProfileEditor`** [MonthYearPicker/ChipInput/BulletListEditor/LinksEditor primitives], account menu replaces sidebar sign-out; **merged to master 2026-06-10**), **Slice 7b** (Persona redesign — `personas.data` → `ProfileContent` [no DDL] with **lossless `resumeContentToProfileContent`** up-conversion [lazy normalization on every repository return + idempotent `db:backfill-personas`], **AI-free create** `POST /api/personas { name, data, rawInput? }`, new **`POST /api/personas/parse-resume`** [in-memory `multer`+`pdf-parse`, the only AI persona path, counted via `resume_parse_events` migration `0008`], AI structuring retargeted to `ProfileContent` [résumé output stays `ResumeContent`; renderers untouched]; frontend **two-mode `CreatePersonaSheet`** ["Build from profile" pickers + "Import a résumé" paste/PDF via api-client `postForm`] + **`PersonaContentEditor`** [editable copies, pick-only education] replacing the flat persona editor; gates + 4-lens adversarial review [11 verified fixes] + live Gemini PDF-import/generation smoke), **Slice 7c** (Cover-letters workspace + résumé library — `cover_letters.job_id` **nullable** + `adhoc_job` jsonb with an XOR CHECK [migration `0009`], `GenerateCoverLetterSchema` XOR `jobId`/inline `job {title, company, description?}`, service adhoc branch [no job lookup, blank-description normalization, title clamp]; frontend **`/app/cover-letters` workspace** [`GenerateCoverLetterBar` with a tracked⇄paste `SegmentedControl` toggle, shared **`DocumentList`** in `components/documents/`, `useAllCoverLetters`] + **résumé library on `/app/resumes`** [survey-backed scope addition — consumes the 6b list/delete API+hooks no UI ever used] + **both sidebar entries** [Résumés, Cover letters]; 4-lens adversarial review [11 minor fixes: SSR-fallback healing via `undefined`-not-`[]`, shared `MutationErrorAlert`/`NoPersonasHint`, `useRevealBelowLg`, list polish/a11y]; live-smoked on Gemini [tracked + pasted-JD letters, adhoc never lands on the board]; **committed directly on master `84e7d16..b3c886c`, 2026-06-12** — no slice branch), **Slice 7c follow-up** (Cover-letter editor overhaul + AI refine — shared `lib/cover-letter-markdown.ts` parser feeding **both** the HTML preview and the react-pdf doc [PDF matches preview: bold/links/paragraphs, no raw markdown]; clean-text Copy; reusable `MarkdownProse` [fixes the dead-`prose` job snapshot]; **AI refine** `POST /api/cover-letters/:id/refine` [Humanize/Shorten/Make-longer/Fix-grammar/Custom, returns a candidate without persisting, counted via **`ai_usage_events`** migration `0010`] with a **stage-then-commit review UI** [in-place proposal owns the letter slot, Show-original compare, Keep/Try-again/Discard + Undo, plain-text word-diff for Fix-grammar via `lib/word-diff.ts`]; **IA route split** — `/app/cover-letters` list index + New sheet + dedicated **`/app/cover-letters/[id]`** editor route [in-shell not-found]; **document + side-rail layout** [`useCoverLetterRefine` hook + `RefineControls`/`CoverLetterProposal`; `CoverLetterEditor` `layout` prop split-at-`xl`/stacked; left-aligned; back-arrow `back` prop on `PageHeader`]; 5 adversarial review passes [incl. a critical cross-letter state-leak fix]; **merged to master `578504c` via `--no-ff`, 2026-06-16**), **Confirmation dialogs** (reusable **`ConfirmDialog`** [`components/ui/`] + promise-based **`useConfirm`** hook gating **every entity delete** — cover letters, résumés, personas, jobs [migrated off its inline 2-step], reminders; **micro in-editor removals stay instant**; merged to master `a3ddc16` via `--no-ff`, 2026-06-16).
- **Slice 8** (Chrome extension — **DONE, merged to master 2026-06-22 [merge `2fae798`, `--no-ff`], live-smoked**): one-click "Save to JobVault" from LinkedIn/Indeed/most boards. Backend `api-keys` module [migration `0011`: `api_keys` table, bcrypt `keyHash`, mint-once/list/revoke, `apiKeyMiddleware` on `X-API-Key`] + `extension` module [`verify-key`/`check-url`/`quick-create` with `normalizeJobUrl`+`findBySourceUrl` dedup + "Added via Chrome Extension" timeline / `scrape` fallback]. Web: Settings→**Connected apps** + public **`/extension/authorize`** [`launchWebAuthFlow` handoff, redirect-allowlist, token-in-fragment, inline signup via `useOptionalCurrentUser`/`InlineAuthForm`]. New **`extension/`** project [React 19 + Vite + Tailwind v4 + crxjs MV3]: content-script extractors [LinkedIn split-pane-scoped, Indeed, generic schema.org] + popup [Connect/Capture/Success/Settings] + background connect driver. **No cookie weakening** [runtime is header-auth; only the same-origin mint uses the cookie]. **Adversarially reviewed** (4-lens + verification; 6 fixes: authorize-page silent refresh, dropped salaryRange, over-broad LinkedIn company selector, connect-cancel UX, array `jobLocation`, dropped unused `scripting` perm). Gates green: 600 backend + 522 web + 29 extension tests (1151). Post-merge browser-pass fixes: connect points at the web-app origin `:8080` (proxies `/api/*`); **on-demand live-DOM extraction on any site** (`chrome.scripting`+`activeTab`, no declared content_scripts); descriptions → clean Markdown (ported backend Turndown + sanitizer) with decorative-bold stripping (Naukri). **Deferred** (`docs/deferred-tasks.md`): pin the extension `key`, real icons, per-site extractors, Web Store packaging.
- **App editorial-shell redesign** (DONE — **merged to master 2026-06-25** [merge `0adb715`, `--no-ff`, 15 commits]): re-points the `/app` surface from "dashboard" → calm editorial workspace, minimalist-ui system kept intact (the dashboard feel was framing/chrome, not palette/type). **Newsreader** serif replaces Instrument Serif (`--font-serif`), new `--hairline` token, new primitives `PageHeading`/`InlineStats`/`AppPage`. Sidebar **dissolved** into the canvas, global **top utility bar removed** (all pages render an in-content `PageHeading`), **Dashboard KPI page deleted** → `/app/jobs` is home (`/app/dashboard` redirects, login lands on Jobs), **Notifications moved into the rail** (routes to `/app/jobs?job=`). Dense jobs table → grouped **borderless `JobList`** [needs-attention (APPLIED/INTERVIEWING, server-sort-truthful, `<h2>` labels) vs in-progress] with sort/status/date relocated to a slim `JobsListControls`; **board quieted**; settings/persona/document-list cards de-boxed to hairlines; **editorial serif empty states**. **Frontend-only** (no backend/API/DB change). Built + verified via workflows [build fan-out → 4-lens adversarial review → fix fan-out; 8 fixes incl. route-skeleton rework, prod-build `useSearchParams` Suspense fix]. Gates green: typecheck + lint + **513 tests** + **production build**. **Post-plan follow-ups** (same branch): single **centered 1240px app frame** [one centered content width, sidebar in-frame] replacing the inconsistent per-page widths; **window-edge scrollbar** [`main` runs to the viewport edge, sidebar carries the left gutter; thin `.app-scroll`]; **collapsible icon rail** [240↔56px, content widens 1000↔1184, 1240px total constant; cookie-persisted + pre-paint `SidebarScript`, hover-revealed right-edge handle]. Plan `docs/superpowers/plans/2026-06-25-app-editorial-shell-redesign.md`, mocks `docs/mocks/redesign-shell.html` + `centered-shell.html`. **Merged to master `0adb715` 2026-06-25.**
- **Slice 9** (Referral outreach tracking — **DONE, merged to master 2026-07-17** [merge `2947a15`, `--no-ff`], live-smoked): track *who* you reached out to for a referral per job + their reply status. Backend `job_contacts` table [migration `0012`: free-text `contact` varchar(500), optional `channel` enum EMAIL/LINKEDIN/OTHER, `status` enum NO_RESPONSE→HEARD_BACK/REFERRED/DECLINED, editable `reached_out_at`, `notes`; user/job FKs cascade; the enums' const arrays are the single source of truth for the `pgEnum` + Zod] + `contacts` module mirroring reminders' dual-router [`GET/POST /api/jobs/:jobId/contacts`, `PATCH/DELETE /api/contacts/:id`]; service emits AUTO timeline events via `timelineService.addAutoEntry` [reached out / heard back / referred / declined — none on delete or on reverting to NO_RESPONSE; failures logged+swallowed]; **ghost meter deliberately untouched** [stays employer-signal only]; `GET /api/jobs` rows + kanban cards gain `outreachCount`/`outreachReplies` [replies = status != NO_RESPONSE] via one grouped `contactsRepository.countsForJobs` merge. Frontend `use-contacts` hooks [invalidate contacts+jobs+kanban+timeline], JobDrawer **Outreach section** [`components/jobs/outreach/`: Person/Channel/Notes form + item rows with compact status select, inline edit, confirm-gated delete via `useConfirm`] + shared **`OutreachBadge`** on jobs-list rows [`✉ N · M replied`, hidden below `sm`] and kanban cards [icon+count, accent tint when replied, tooltip]. Gates green [636 backend + 572 frontend + production build]; live-smoked desktop 1440 + mobile 390. Spec `docs/superpowers/specs/2026-07-16-referral-outreach-tracking-design.md`, plan `docs/superpowers/plans/2026-07-16-slice-9-referral-outreach.md`.
- **Saved answers library** (**DONE on branch `slice-answers-library`, 2026-08-25**, live-smoked on Gemini): reusable answers to the open-ended questions application forms keep asking, in **two length variants measured in CHARACTERS** [ATS fields cap characters, never words]. Backend `question_answers` table [migration `0013`: `question` varchar(500), nullable `answer_short`/`answer_long`, `last_used_at`; **no `job_id`**, no tags — answers are reusable by definition] + `answers` module [`GET/POST /api/answers`, `PATCH/DELETE /api/answers/:id`, `POST /api/answers/:id/used`, `POST /api/answers/generate` — declared **before** `/:id` and returning **200 not 201**, it persists nothing]; at-least-one-variant enforced in Zod on create and by a stored-row merge in the service on update [no DB CHECK, by spec]; `buildAnswerPrompt` + `AnswerDraftSchema` return **both variants from one structured Gemini call** [one rate-limit slot, consistent pair; both fields `.min(1)` because `sanitizeModelJson` drops nulls but `""` would otherwise validate]; rate limit spent only after ownership, `ai_usage_events` written only after success. Frontend `/app/answers` + sidebar entry, `?answer=`/`?new` slideover, **dedicated `AnswerList`** [the shared `DocumentList` could NOT be reused — `DocumentRow` is a fixed four-field shape with no slot for interactive children], row **copy chips** that stamp `last_used_at` **after** a successful clipboard write [new `onCopied` prop on the shared `CopyButton`], `AnswerEditor` with live character counts, and the **ethics note** in two placements [no page banner, no dismiss state]. Rows stack below `sm` via `sm:contents`. **Form facts deliberately cut** [notice period, CTC, years of experience, work authorization — memorized values that browser autofill already covers; storage only pays when composing costs more than retrieving, and facts earn their keep only in a product that *submits* forms]. Gates green [680 backend + 609 frontend + production build]; adversarially reviewed [5 fixes: cross-record draft leak, `.min(1)`, copy-before-write, unsurfaced delete error, 390px truncation]. `jobId` is built and tested end to end but **no UI sends it yet** [`.blink/tasks/t-0c61ek`]. Spec `docs/superpowers/specs/2026-08-25-saved-answers-library-design.md`, plan `docs/superpowers/plans/2026-08-25-saved-answers-library.md`.
- **Next:** **Google OAuth**, **email reminders**; then the two follow-ups this slice sets up — **extension answer surfacing** [`t-0c5uc8`, where most of the value is] and **global search** [`t-0c5wyz`, Postgres FTS per decision `d-0c5wyy`; it also builds `/app/resumes/[id]` and a `?persona=` slideover]. **The backlog now lives in `.blink/tasks/`, one file per item** — `docs/deferred-tasks.md` and `docs/polish-and-tech-debt.md` are just pointers. (User pushes — local master ahead of `origin/master`.)

### Where to look (source of truth)
- `progress.md` — **status of every slice; read this first.**
- `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md` — overall migration architecture + the slice roadmap.
- `docs/superpowers/specs/2026-06-01-app-redesign-express-next-minimalist-design.md` — scope of this effort (app surface + Express), design direction, decisions.
- `docs/superpowers/plans/` — the executed slice plans (Slices 0–4, incl. `2026-06-03-slice-4{a,b,c}-*.md`); use the latest as the pattern for new slices.
- `docs/deferred-tasks.md` — backlog of intentionally-deferred work (email reminders, recurring/soft-delete reminders, production WS-upgrade proxy, socket.io Redis adapter for multi-instance, global `/app/timeline` feed).
- `docs/best-practices/{express,nextjs,typescript}.md` — the standards a reviewer checks against.
- `CONVENTIONS.md` — DB/backend/frontend naming conventions.

## Tech Stack (target)

- **Backend** (`backend-express/`): Express 5, Drizzle ORM, PostgreSQL 16, Pino, Zod, strict TypeScript (NodeNext — imports use `.js`).
- **Frontend** (`frontend-next/`): Next.js 15 (App Router) + React 19, Tailwind v4 (CSS-first), TanStack Query v5, React Hook Form + Zod. **UI primitives are hand-written in `src/components/ui/` with our tokens (not the shadcn CLI); Radix is used only for overlay *behavior* (`@radix-ui/react-dialog` → dialog/sheet). Any styled element gets its own component — never inline styled markup.**
- **Auth:** custom JWT in **HTTP-only cookies** (access 15m, refresh 7d, **both `path:/`**) + refresh rotation + **silent refresh** (api-client retries 401→`/api/auth/refresh`→retry, single-flight; `middleware.ts` gates `/app/*` on either cookie). (NestJS used Bearer-in-body; the cookie model is the intentional change.)
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

For **UI/visual changes**, verify in-browser with the `playwright-cli` skill (screenshot at desktop + mobile widths, e.g. 1440 / 1024 / 390) and eyeball the result before claiming done — don't rely on tests alone.

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
