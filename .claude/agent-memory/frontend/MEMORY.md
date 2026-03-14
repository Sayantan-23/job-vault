# Frontend Agent Memory

## Project Structure (FE-01 Complete)
- Root config: `frontend/nuxt.config.ts`, `frontend/app.config.ts`
- All app code lives in `frontend/app/` (Nuxt 4 convention)
- CSS: `frontend/app/assets/css/main.css` (Tailwind + Nuxt UI + Manrope font + CSS vars)
- Package manager: yarn (yarn.lock exists, use `yarn` not `npm`)
- app.config.ts is at `frontend/app.config.ts` (NOT `frontend/app/app.config.ts`)

## Nuxt UI v4 Patterns
- Colors configured in `app.config.ts` under `ui.colors` (primary: violet, neutral: zinc)
- Component theme overrides go in `app.config.ts` under `ui.{component}.slots`
- Semantic CSS utilities: `text-default`, `text-muted`, `text-dimmed`, `text-highlighted`, `bg-default`, `bg-muted`, `bg-elevated`, `border-default`
- Dark mode: `useColorMode()` composable, `colorMode.preference = 'dark'/'light'/'system'`
- Toast: `useToast().add({ title, description, color, icon, duration })`
- Colors for toasts: 'success', 'error', 'warning', 'info', 'primary'
- UApp is required root wrapper (provides toasts, tooltips, overlays)
- UForm validate prop: returns `{ name: string, message: string }[]`; @submit fires after validation passes
- UDropdownMenu items: flat `T[]` or nested `T[][]` (groups with separators); item props: label, icon, color, onSelect
- URadioGroup items: `{ label: string, value: string }[]`, orientation="horizontal" for inline layout

## Glassmorphism CSS Classes
- Glass card: `bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl shadow-lg shadow-black/5`
- Glass header: `sticky top-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30`
- CSS var for border radius: `--ui-radius: 0.75rem`

## Job Status Convention (CRITICAL)
- ALWAYS use UPPERCASE: 'WISHLIST', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'ARCHIVED'
- The plan file (01-project-setup.md) had lowercase -- CONVENTIONS.md overrides with UPPERCASE
- Color mapping: WISHLIST=neutral, APPLIED=info, INTERVIEWING=warning, OFFER=success, REJECTED=error, ARCHIVED=neutral

## Auto-imports in Nuxt
- `$fetch`, `navigateTo`, `definePageMeta`, `useColorMode`, `useToast`, `useState`, `computed`, `ref`, `reactive`, `watch`, `onMounted` are auto-imported
- Composables in `app/composables/` are auto-imported (useApi, useAuth, useToastNotify)
- Utils in `app/utils/` are auto-imported (API_BASE_URL, JOB_STATUSES, formatRelativeTime, etc.)
- Components in `app/components/` are auto-imported by folder path (AppHeader, EmptyState, LoginForm, etc.)

## Route Structure (Restructured)
- **Public pages**: `/` (landing), `/web/*` (faq, about, privacy, terms, contact) — use `web` layout
- **Auth pages**: `/app/auth/login`, `/app/auth/register`, `/app/auth/google/callback` — use `auth` layout
- **Authenticated pages**: `/app/dashboard`, `/app/profile` — use `default` layout
- Middleware: `/` and `/web/**` skip auth entirely; `/app/auth/**` are public auth routes; all other `/app/**` require auth
- `nuxt.config.ts` has `'/app/**': { ssr: false }` route rule for SPA mode on app routes
- `web` layout references `<WebNavbar />` and `<WebFooter />` (in `components/web/`)
- Plan for full public page implementation: `plans/frontend/09-public-pages.md`

## Auth Architecture (FE-02 Complete)
- `useAuth` composable: uses `$fetch` directly (NOT useApi) to avoid circular dependency
- `useApi` calls `useAuth().getAccessToken()` and `useAuth().refreshAccessToken()` for 401 handling
- Token storage: localStorage with keys `jobvault_access_token` and `jobvault_refresh_token`
- Session restore: `initSession()` called from auth middleware on first load
- Auth middleware: `/app/auth/**` are public auth routes (uses `to.path.startsWith('/app/auth')`)
- Google OAuth: redirect to `${API_BASE_URL}/auth/google`, callback at `/app/auth/google/callback?accessToken=...&refreshToken=...`
- API responses wrapped in `{ data: T }` -- always access `response.data` after `$fetch`
- Profile update: PATCH `/api/auth/profile` with `{ name?, preferences? }`

## Key Decisions
- `useApi` uses `$fetch` (ofetch) directly, body passed as-is (ofetch auto-serializes)
- Form validation uses inline validate functions (no Zod/Valibot dependency needed)
- `useAuth` uses `useState` for SSR-safe reactive state + localStorage for persistence
- `import.meta.client` guards all localStorage access for SSR safety
- `index.vue` is the landing page (web layout), NOT a redirect anymore
- All authenticated app routes live under `/app/*`; auth pages under `/app/auth/*`; navigateTo calls use `/app/dashboard`, `/app/auth/login`, etc.

## Job Management (FE-04 Complete)
- `useJobDrawer` composable: shared state via `useState` for drawer open/close + selected job
- `useAddJobModal` composable: shared state for Add Job modal (decouples header button from page-level modal)
- Cross-layout communication: use `useState`-based composables rather than v-model through layouts
- `marked` library used for markdown rendering in JobSnapshot; configured with `breaks: true, gfm: true`
- `v-model:open` on Nuxt UI overlays (UModal, USlideover) works with `ref.value` in templates
- UTabs: `v-model` binds to item `value` field; `#content` slot provides `{ item }` for conditional rendering
- USelect items: `{ label: string, value: string }[]`; v-model binds to `value` field
- JobDrawer split panel: left 60% (lg:w-3/5) for snapshot, right 40% (lg:w-2/5) for details
- Job components in `app/components/job/`: AddJobModal, JobActions, JobDetails, JobDrawer, JobInfoSection, JobNotesEditor, JobSnapshot, JobStatusBadge, ManualJobForm, UrlPasteForm
- Auto-save pattern (JobNotesEditor): watch + setTimeout debounce (1.5s) with saving/saved status indicator

## Dashboard & Kanban (FE-03 Complete)
- `useJobs` composable: uses `useState` for `kanbanData` and `isLoading`; fetches from `/dashboard/kanban`
- vue-draggable-plus: `VueDraggable` component with `v-model`, `group="kanban"` for cross-column drag
- Drag-and-drop flow: vue-draggable-plus mutates arrays automatically, then `onDragEnd` calculates new order and calls API
- Rollback strategy: on API failure, refetch entire board via `fetchKanban()` (simpler than manual array rollback)
- Float-based ordering: `calculateNewOrder()` uses midpoint between neighbors for insertion
- Ghost styles: `.kanban-ghost` and `.kanban-drag` CSS classes in main.css (using CSS vars for theme compat)
- KanbanColumn border colors: mapped from Nuxt UI semantic colors to Tailwind border-t classes
- DashboardStats: grid of glass cards showing Total/Applied/Interviewing/Offers/Ghost Alerts
- ViewToggle: custom inline-flex button group (not UButtonGroup since we need icon-only toggle)
- Dashboard re-fetches kanban data when JobDrawer closes (watch on `jobDrawer.isOpen`)

## Timeline, Reminders & Notifications (FE-06 Complete)
- Component naming: pathPrefix convention -- `timeline/Job.vue` -> `<TimelineJob />`, `reminder/List.vue` -> `<ReminderList />`
- Composables with local state (ref): child components must NOT create their own composable instances for shared state
- Pattern: child components (AddEntry, Item) make direct API calls and emit events to parent, parent updates composable state
- useNotifications: uses `useState` for global shared state (notification count visible in header + popover)
- useTimeline/useReminders: use local `ref()` since state is per-job and only used within one parent component
- Notification polling: started in `default.vue` layout via `onMounted`/`onUnmounted`; pauses on hidden tab via `document.visibilityState`
- UPopover: supports `v-model:open`; use `#default` slot for trigger, `#content` slot for popover body
- UChip: `show` prop controls visibility of the chip badge; `text` for badge content
- UTabs in JobDetails: `v-model` + `items` array with `{ label, value, icon }`; `#content="{ item }"` slot for tab panels

## Nuxt UI v4 Component Gotchas (CRITICAL)
- **NO `UDivider`** in Nuxt UI v4 -- use `USeparator` instead (common mistake from v3 muscle memory)
- USlideover: `#default` slot is the trigger; use `v-model:open` for external control; `#body` for content
- UBadge: supports `color` and `variant` props (e.g., `color="primary" variant="subtle"`)

## Public Pages / Landing (FE-09 Complete)
- gsap + ScrollTrigger for scroll animations; `useScrollReveal` composable wraps GSAP
- gsap registered with `gsap.registerPlugin(ScrollTrigger)` guarded by `import.meta.client`
- WebNavbar: fixed position, transparent-to-glass on scroll, auth-aware (client-only check), USlideover for mobile menu
- WebFooter: 4-column grid, social icons, glass styling
- Landing page: 7 sections (hero, trust badges, features, how-it-works, testimonials, chrome extension promo, CTA)
- Hero illustration: CSS-based mock kanban board (no external SVG), glassmorphism style
- `hero-bg` CSS class in main.css for gradient background
- web.vue layout: `pt-16` on main for fixed navbar offset

## Docker Development (IMPORTANT)
- Frontend runs in Docker via WSL; node_modules are in anonymous volume (`/app/node_modules`)
- Adding new deps requires `docker compose build --no-cache app && docker compose down -v && docker compose up -d`
- Windows EPERM on tailwindcss native binary is common; install deps via Docker container or after stopping all containers
- `wsl bash -c "cd /mnt/d/Projects/job-tracker/frontend && docker compose ..."` for Docker commands

## Nuxt UI MCP Note
- MCP tools for Nuxt UI are now accessible (get-component, list-components, etc.)
- Skill files at: `.claude/skills/nuxt-ui/references/` (theming.md, components.md, composables.md)
