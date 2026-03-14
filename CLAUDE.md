# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Job Tracker ("Ghost-Proof Job Application & AI Assistant") — a full-stack app for managing job applications, preserving job postings, and generating AI cover letters. The project has detailed implementation plans in `plans/` but the backend/frontend code is not yet built.

## Tech Stack

- **Backend**: NestJS + MikroORM + PostgreSQL 16 (Docker)
- **Frontend**: Nuxt 4 + Nuxt UI v4 (Reka UI + Tailwind CSS)
- **AI**: Google Gemini 2.0 Flash (cover letters, resume parsing)
- **Storage**: Cloudinary (resume files), pdfkit (PDF export)
- **Scraping**: Cheerio (primary) + Gemini fallback
- **Auth**: JWT (access 15m + refresh 7d with rotation), Google OAuth 2.0 via Passport.js

## Development Commands

### Docker (full stack)
```bash
docker-compose up              # Start postgres + backend + frontend
docker-compose up postgres     # Database only (local dev)
```

### Backend (`backend/`)
```bash
npm run start:dev              # NestJS dev server with watch (port 3000)
npm run build                  # Compile TypeScript
npm run test                   # Jest unit tests
npm run test:e2e               # Supertest E2E tests
npx mikro-orm migration:create # Create new migration
npx mikro-orm migration:up     # Run pending migrations
```

### Frontend (`frontend/`)
```bash
npm run dev                    # Nuxt dev server (port 8080)
npm run build                  # Production SSR build
npm run preview                # Preview production build
npm test                       # Vitest unit tests
npm run test:e2e               # Playwright E2E tests
```

## Architecture

### Monorepo Structure
```
job-tracker/
├── backend/           # NestJS API (to be created)
├── frontend/          # Nuxt 4 SPA (to be created)
├── plans/
│   ├── backend/       # 8 backend implementation plans (01-08)
│   └── frontend/      # 8 frontend implementation plans (01-08)
├── project.md         # Executive project specification
└── docker-compose.yml # PostgreSQL + backend + frontend orchestration
```

### Backend Modules (NestJS)
8 independent modules, each with its own plan in `plans/backend/`:
1. **Project Setup** — MikroORM config, global pipes/filters/interceptors, base entity, pagination
2. **Auth** — User entity, JWT + refresh token rotation, Google OAuth, `@CurrentUser()` decorator
3. **Job** — CRUD, web scraping (Cheerio + Gemini), ghost days tracking
4. **Dashboard** — Kanban board API, aggregated stats
5. **Timeline & Reminders** — Event log, cron jobs (ghost detection daily, reminders every 10m)
6. **File Storage** — Cloudinary upload, PDF generation with pdfkit
7. **AI/Gemini** — Resume parsing, cover letter generation (rate-limited: 10/hour per user)
8. **Extension API** — Chrome extension auth via API keys (X-API-Key header)

### Frontend Structure (Nuxt 4)
8 implementation plans in `plans/frontend/`:
- State via composables: `useAuth` (tokens/user), `useJobs` (board data), `useApi` ($fetch wrapper)
- Layouts: `default.vue` (authenticated app), `auth.vue` (login/register), `web.vue` (public pages)
- Routes: `/` (landing), `/web/**` (public pages), `/app/auth/**` (login/register), `/app/**` (protected app)
- Global auth middleware: `/` and `/web/**` public; `/app/auth/**` public auth; `/app/**` requires auth
- Kanban uses `vue-draggable-plus` with optimistic updates (float-based ordering)
- Nuxt UI v4 semantic color theming with dark mode support

### Database (PostgreSQL)
Core entities: User, Job, CoverLetter, TimelineEvent, Reminder, Notification, ApiKey. All use UUID primary keys with `timestamptz` fields. All queries scoped by `userId` — no cross-user data access.

### Key Conventions
- All API routes prefixed with `/api/`
- Global `HttpExceptionFilter` wraps errors in `{ statusCode, message, error }` format
- Global `TransformInterceptor` wraps success responses in `{ data, meta? }` format
- Standardized pagination via `PaginationQueryDto` (page, limit, sortBy, sortOrder)
- Frontend proxies `/api/**` to backend in dev via Nuxt config
- **All naming conventions** (DB, backend, frontend) are defined in `CONVENTIONS.md` — read it before implementing any module

## Implementation Plans

Always read the relevant plan before implementing a module. Plans contain exact entity schemas, DTO definitions, endpoint specs, folder structures, and acceptance criteria:
- `plans/backend/01-project-setup.md` through `08-extension-api.md`
- `plans/frontend/01-project-setup.md` through `08-chrome-extension.md`
- `project.md` — high-level feature requirements and user workflows

## Agent System & Implementation Workflow

This project uses custom Claude Code sub-agents. **When asked to implement a feature, you are the orchestrator** — follow the workflow below to delegate work to specialized agents.

Alternatively, for dedicated orchestration sessions: `claude --agent project-manager`

### Available Agents

| Agent | Role | When to spawn |
|---|---|---|
| `designer` | UI/UX | When designs are missing or need updates (uses Stitch MCP) |
| `backend` | Backend Dev | For all NestJS + MikroORM implementation tasks |
| `frontend` | Frontend Dev | For all Nuxt 4 + Nuxt UI v4 implementation tasks |
| `backend-tester` | Backend QA | After backend implementation to run Jest + Supertest tests |
| `frontend-tester` | Frontend QA | After frontend implementation to run Vitest + Playwright tests |

### Progress Status Protocol

- `[ ]` Pending → `[-]` In Progress → `[T]` To Test → `[x]` Done
- Implementation agents mark `[T]` when finished; only tester agents mark `[x]`

### Dependency Diagram

```
BE-01 (Setup) → BE-02 (Auth) → BE-03 (Job) ─┬→ BE-04 (Dashboard)
                     │              │         ├→ BE-05 (Timeline)
                     │              │         └→ BE-08 (Extension)
                     └→ BE-06 (Storage) → BE-07 (AI) → BE-05
FE-01 (Setup) → FE-02 (Auth) → FE-03 (Kanban) → FE-04 (Jobs) → FE-05 (Filters)
                                      └→ FE-06 (Timeline) → FE-07 (AI) → FE-08
```

### Implementation Order

1. **Project Setup** — BE-01 → FE-01
2. **Authentication** — BE-02 → FE-02
3. **Job Management** — BE-03 → FE-04
4. **Dashboard & Kanban** — BE-04 → FE-03
5. **Timeline & Reminders** — BE-05 → FE-06
6. **Filters & List View** — FE-05
7. **File Storage & AI** — BE-06 → BE-07 → FE-07
8. **Chrome Extension** — BE-08 → FE-08

### Orchestration Workflow (FOLLOW THIS when asked to implement)

1. **Read `progress.md`** — check current status of all tasks
2. **Check dependencies** — do NOT start a feature if its prerequisites aren't `[x]` Done
3. **Read the relevant plan(s)** from `plans/backend/` and/or `plans/frontend/`
4. **Check designs** — if the relevant Stitch screen in progress.md isn't `[x]`, spawn the `designer` agent first
5. **Spawn implementation agents**:
   - Spawn `backend` agent with: plan path, tasks to update, context from prior features
   - Spawn `frontend` agent with: plan path, Stitch screen IDs, backend API contracts, tasks to update
   - Run in parallel if frontend doesn't depend on backend; otherwise backend first
6. **After implementation** (tasks show `[T]`):
   - Spawn `backend-tester` for backend `[T]` tasks
   - Spawn `frontend-tester` for frontend `[T]` tasks
7. **If tests fail**: spawn the original implementation agent with failure details to fix, then re-test
8. **Only when all tests pass**: verify progress.md shows `[x]` for all tasks, then move to next feature

### Orchestration Rules

- NEVER skip the dependency check
- NEVER proceed to the next feature until ALL tests pass for the current one
- ALWAYS read `CONVENTIONS.md` before the first implementation in a session
- ALWAYS pass the relevant plan file path when spawning an implementation agent
- If asked to "implement next", find the first uncompleted feature whose dependencies are all `[x]`
- If frontend needs backend help (e.g., missing endpoint), spawn the backend agent for that specific task
- See `plans/sub-agents-plan.md` for the full agent architecture

## Environment Variables

Backend requires: `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `DB_*` (host/port/user/password/name), `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `CLOUDINARY_*` (cloud_name/api_key/api_secret), `GEMINI_API_KEY`

Frontend requires: `NUXT_PUBLIC_API_BASE` (default: `http://localhost:3000`)
