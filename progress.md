# JobVault — Progress Tracker

> **Last Updated**: 2026-02-22
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
- [ ] Slice 1 (Auth): update `drizzle.config.ts` schema path to handle multiple tables

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
