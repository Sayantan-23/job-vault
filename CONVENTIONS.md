# CONVENTIONS.md

> Single source of truth for naming conventions in the Job Tracker project.
> All developers and AI agents **must** follow these rules when implementing any module.

---

## Language

**TypeScript only** — no plain JavaScript anywhere in this project.

| Layer | Requirement |
|-------|------------|
| Backend | All files use `.ts` extension |
| Frontend | All `.vue` files use `<script setup lang="ts">`. Composables, utils, and types use `.ts` |

---

## Database

### Tables & Columns

| Rule | Pattern | Example |
|------|---------|---------|
| Table names | `snake_case`, **plural** | `users`, `jobs`, `cover_letters`, `timeline_events`, `api_keys` |
| Column names | `snake_case` | `user_id`, `created_at`, `is_email_verified`, `master_resume_url` |
| Primary keys | Always `id`, UUID | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Foreign keys | `{referenced_table_singular}_id` | `user_id`, `job_id`, `related_job_id` |
| Timestamps | `timestamptz`, `_at` suffix | `created_at`, `updated_at`, `remind_at`, `last_activity_at` |
| Booleans | `is_{adjective}` or `has_{noun}`, default `FALSE` | `is_email_verified`, `is_completed`, `is_read`, `is_active` |
| JSON columns | `JSONB`; `_json` suffix for blobs, plain name for structured | `master_profile_json` (blob), `preferences` (structured) |
| Indexes | `idx_{table}_{column(s)}` | `idx_jobs_user_id`, `idx_jobs_status` |

### Foreign Key Cascades

| Relationship | Rule | Example |
|--------------|------|---------|
| Owned child records | `ON DELETE CASCADE` | `job_id` in `timeline_events` |
| Optional references | `ON DELETE SET NULL` | `related_job_id` in `notifications` |

### Standard Columns (all tables)

Every table includes `id`, `created_at`, and `updated_at`. Use a `BaseEntity` class to inherit these.

---

## Backend (NestJS)

### File Naming

All files use **kebab-case** with a descriptive suffix:

| File Type | Pattern | Example |
|-----------|---------|---------|
| Entity | `{singular}.entity.ts` | `user.entity.ts`, `timeline-event.entity.ts` |
| Service | `{context}.service.ts` | `auth.service.ts`, `scraper.service.ts` |
| Controller | `{context}.controller.ts` | `auth.controller.ts`, `job.controller.ts` |
| Module | `{context}.module.ts` | `auth.module.ts`, `job.module.ts` |
| DTO | `{action}-{entity}.dto.ts` | `create-job.dto.ts`, `update-profile.dto.ts` |
| Guard | `{name}-auth.guard.ts` | `jwt-auth.guard.ts`, `api-key-auth.guard.ts` |
| Filter | `{name}.filter.ts` | `http-exception.filter.ts` |
| Interceptor | `{name}.interceptor.ts` | `transform.interceptor.ts` |
| Decorator | `{name}.decorator.ts` | `current-user.decorator.ts` |
| Strategy | `{name}.strategy.ts` | `jwt.strategy.ts`, `google.strategy.ts` |
| Enum | `{context}.enum.ts` | `job-status.enum.ts` |

### Module Folder Structure

```
backend/src/modules/{module-name}/
├── {module}.module.ts
├── {module}.controller.ts
├── {module}.service.ts
├── entities/
│   └── {entity}.entity.ts
├── dto/
│   └── {action}-{entity}.dto.ts
├── guards/
├── decorators/
├── enums/
└── services/          # Sub-services if needed
```

### Class & Enum Naming

| Type | Pattern | Examples |
|------|---------|----------|
| Entity class | PascalCase, singular | `User`, `Job`, `CoverLetter`, `TimelineEvent` |
| DTO class | PascalCase + `Dto` | `CreateJobDto`, `LoginDto`, `PaginationQueryDto` |
| Service class | PascalCase + `Service` | `AuthService`, `JobService`, `GeminiService` |
| Controller class | PascalCase + `Controller` | `AuthController`, `JobController` |
| Module class | PascalCase + `Module` | `AuthModule`, `JobModule` |
| Guard class | PascalCase + `Guard` | `JwtAuthGuard`, `ApiKeyAuthGuard` |
| Enum name | PascalCase | `JobStatus`, `NotificationType`, `TimelineEventType` |
| **Enum values** | **UPPERCASE** | `WISHLIST`, `APPLIED`, `AUTO`, `GHOST_ALERT` |

All enums use UPPERCASE string values:

```typescript
export enum JobStatus {
  WISHLIST = 'WISHLIST',
  APPLIED = 'APPLIED',
  INTERVIEWING = 'INTERVIEWING',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum TimelineEventType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum NotificationType {
  GHOST_ALERT = 'GHOST_ALERT',
  REMINDER = 'REMINDER',
  STATUS_CHANGE = 'STATUS_CHANGE',
  GENERAL = 'GENERAL',
}
```

### Entity Field Conventions

| Rule | Pattern | Example |
|------|---------|---------|
| Field names | `camelCase` in TypeScript | `userId`, `createdAt`, `isEmailVerified` |
| DB mapping | Auto-mapped to `snake_case` by MikroORM | `userId` → `user_id` |
| Relations | Entity reference, not ID | `@ManyToOne(() => User) user: User` |
| Hidden fields | `{ hidden: true }` on sensitive data | `passwordHash`, `refreshTokenHash`, `keyHash` |

### API Routes

| Rule | Pattern | Example |
|------|---------|---------|
| Global prefix | `/api` | All routes start with `/api/` |
| Resource names | Plural, kebab-case | `/jobs`, `/cover-letters`, `/api-keys` |
| Resource actions | `/resource/:id/action` | `/jobs/:id/move`, `/jobs/:id/timeline` |
| HTTP GET | Read (list or single) | `GET /api/jobs`, `GET /api/jobs/:id` |
| HTTP POST | Create or non-idempotent action | `POST /api/auth/register`, `POST /api/cover-letters/generate` |
| HTTP PATCH | Partial update | `PATCH /api/jobs/:id` |
| HTTP DELETE | Remove | `DELETE /api/jobs/:id` |

### Response Formats

```typescript
// Success (single)
{ data: T }

// Success (paginated list)
{
  data: T[],
  meta: { total: number, page: number, limit: number, totalPages: number }
}

// Error (via HttpExceptionFilter)
{
  statusCode: number,
  message: string | string[],
  error: string,
  timestamp: string,
  path: string
}
```

### Pagination Defaults

| Parameter | Type | Default | Constraint |
|-----------|------|---------|------------|
| `page` | number | `1` | Min: 1 |
| `limit` | number | `20` | Min: 1, Max: 100 |
| `sortBy` | string | `'createdAt'` | Must be an entity field |
| `sortOrder` | `'asc'` \| `'desc'` | `'desc'` | — |

### Service Method Naming

| Operation | Method | Example |
|-----------|--------|---------|
| Create | `create` | `create(dto)` |
| Read all | `findAll` | `findAll(userId, query)` |
| Read one | `findOne` | `findOne(id, userId)` |
| Update | `update` | `update(id, userId, dto)` |
| Delete | `delete` (**not** `remove`) | `delete(id, userId)` |

### Variables & Constants

| Type | Pattern | Example |
|------|---------|---------|
| Variables | `camelCase` | `accessToken`, `jobData`, `userId` |
| Private fields | `camelCase` (no `_` prefix) | `private accessToken` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_FILE_SIZE`, `TRACKING_PARAMS` |
| Environment variables | `SCREAMING_SNAKE_CASE`, grouped | `DB_HOST`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` |

### Validation

Global `ValidationPipe` settings — apply these once in `main.ts`:

```typescript
whitelist: true,
forbidNonWhitelisted: true,
transform: true,
transformOptions: { enableImplicitConversion: true }
```

### Error Messages

Backend error messages that are reused across endpoints should be extracted as constants. One-off messages can be inline.

---

## Frontend (Nuxt 4)

### File Naming

| File Type | Pattern | Example |
|-----------|---------|---------|
| Pages | `kebab-case.vue` | `login.vue`, `dashboard.vue`, `profile.vue` |
| Components | `PascalCase.vue` (flat files) | `KanbanBoard.vue`, `JobDrawer.vue`, `LoginForm.vue` |
| Composables | `use{Name}.ts` | `useAuth.ts`, `useJobs.ts`, `useApi.ts` |
| Types | `{context}.ts` | `auth.ts`, `job.ts`, `filters.ts` |
| Utils | `{context}.ts` | `constants.ts`, `formatters.ts` |
| Layouts | `{name}.vue` | `default.vue`, `auth.vue` |
| Middleware | `{name}.global.ts` or `{name}.ts` | `auth.global.ts` |
| Plugins | `{name}.ts` | `api.ts` |

### Component File Naming (pathPrefix-aware)

Nuxt auto-imports components with the **directory name as a prefix** (pathPrefix). To avoid stuttered names like `<KanbanKanbanBoard />`, component filenames must **NOT repeat the directory name**.

**Rule:** The file name + directory prefix should produce the desired component tag.

| Directory | File Name | Auto-imported As | Usage in Template |
|-----------|-----------|------------------|-------------------|
| `layout/` | `AppHeader.vue` | `<LayoutAppHeader />` | `<LayoutAppHeader />` |
| `kanban/` | `Board.vue` | `<KanbanBoard />` | `<KanbanBoard />` |
| `kanban/` | `Column.vue` | `<KanbanColumn />` | `<KanbanColumn />` |
| `auth/` | `LoginForm.vue` | `<AuthLoginForm />` | `<AuthLoginForm />` |
| `auth/` | `GoogleOAuthButton.vue` | `<AuthGoogleOAuthButton />` | `<AuthGoogleOAuthButton />` |
| `job/` | `Drawer.vue` | `<JobDrawer />` | `<JobDrawer />` |
| `job/` | `AddJobModal.vue` | `<JobAddJobModal />` | `<JobAddJobModal />` |
| `ui/` | `LoadingSpinner.vue` | `<UiLoadingSpinner />` | `<UiLoadingSpinner />` |
| `dashboard/` | `Stats.vue` | `<DashboardStats />` | `<DashboardStats />` |
| `ghost/` | `Meter.vue` | `<GhostMeter />` | `<GhostMeter />` |

**Common mistake:** Do NOT name a file `kanban/KanbanBoard.vue` — that produces `<KanbanKanbanBoard />`.

### Component Folder Structure

```
frontend/app/components/
├── layout/
│   ├── AppHeader.vue          → <LayoutAppHeader />
│   ├── AppFooter.vue          → <LayoutAppFooter />
│   └── AppSidebar.vue         → <LayoutAppSidebar />
├── kanban/
│   ├── Board.vue              → <KanbanBoard />
│   ├── Column.vue             → <KanbanColumn />
│   └── Card.vue               → <KanbanCard />
├── auth/
│   ├── LoginForm.vue          → <AuthLoginForm />
│   ├── RegisterForm.vue       → <AuthRegisterForm />
│   └── GoogleOAuthButton.vue  → <AuthGoogleOAuthButton />
├── job/
│   ├── Drawer.vue             → <JobDrawer />
│   ├── Details.vue            → <JobDetails />
│   ├── Snapshot.vue           → <JobSnapshot />
│   ├── AddJobModal.vue        → <JobAddJobModal />
│   ├── StatusBadge.vue        → <JobStatusBadge />
│   └── Actions.vue            → <JobActions />
├── dashboard/
│   ├── Stats.vue              → <DashboardStats />
│   └── ViewToggle.vue         → <DashboardViewToggle />
├── ghost/
│   └── Meter.vue              → <GhostMeter />
└── ui/
    ├── LoadingSpinner.vue     → <UiLoadingSpinner />
    └── EmptyState.vue         → <UiEmptyState />
```

### TypeScript Naming

| Type | Pattern | Examples |
|------|---------|----------|
| Interfaces | PascalCase | `User`, `Job`, `JobCard`, `KanbanColumn` |
| Request types | `{Action}{Resource}Request` | `LoginRequest`, `CreateJobRequest` |
| Response types | `{Resource}Response` | `AuthResponse`, `PaginatedResponse<T>` |
| Type aliases | PascalCase | `JobStatus`, `GhostFilter` |

### Props, Emits & State

| Element | Pattern | Example |
|---------|---------|---------|
| Props | `camelCase` | `jobId`, `isLoading`, `modelValue` |
| Emits (defineEmits) | `camelCase` | `emit('updateModelValue', value)` |
| Emits (template) | `kebab-case` | `@update:model-value="..."` |
| Reactive refs | `camelCase` | `const isLoading = ref(false)` |
| Boolean state | `is/has/should` prefix | `isOpen`, `hasData`, `shouldRefresh` |

### Composable Pattern

Composables return an object with reactive state (Refs/Computed) and methods:

```typescript
export function useAuth() {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  async function login(credentials: LoginRequest) { /* ... */ }
  async function logout() { /* ... */ }

  return { user, isAuthenticated, login, logout };
}
```

### Routes

| Pattern | Example |
|---------|---------|
| Public: `/web/kebab-case` | `/web/faq`, `/web/about`, `/web/contact` |
| Auth: `/app/auth/kebab-case` | `/app/auth/login`, `/app/auth/register` |
| App: `/app/kebab-case` | `/app/dashboard`, `/app/profile` |
| Dynamic: `/app/:param` | `/app/jobs/:id` |

### Constants

Location: `utils/constants.ts`. Use `SCREAMING_SNAKE_CASE`:

```typescript
export const JOB_STATUSES = ['WISHLIST', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'ARCHIVED'] as const;
export const JOB_STATUS_LABELS: Record<JobStatus, string> = { WISHLIST: 'Wishlist', APPLIED: 'Applied', /* ... */ };
export const JOB_STATUS_COLORS: Record<JobStatus, string> = { WISHLIST: 'neutral', APPLIED: 'info', /* ... */ };
```

### Event Handlers

Name handlers with `on{Action}` prefix: `onClick`, `onSubmit`, `onDragEnd`, `onCreated`.

### Styling

- Use **Tailwind CSS** utility classes — avoid `<style>` blocks unless truly necessary
- Use **Nuxt UI** semantic color tokens: `primary`, `error`, `success`, `warning`, `info`, `neutral`
- Error messages and user-facing strings are **inline** (no i18n abstraction)

---

## Shared Conventions

### Job Statuses

```typescript
type JobStatus = 'WISHLIST' | 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED' | 'ARCHIVED';
```

Kanban columns render in this order: WISHLIST → APPLIED → INTERVIEWING → OFFER → REJECTED → ARCHIVED.

### Status → Color Mapping

| Status | Nuxt UI Color |
|--------|---------------|
| WISHLIST | `neutral` |
| APPLIED | `info` |
| INTERVIEWING | `warning` |
| OFFER | `success` |
| REJECTED | `error` |
| ARCHIVED | `neutral` |

### Ghost Days

| Days Since Last Activity | Label | Color |
|--------------------------|-------|-------|
| ≤ 7 | Active | green |
| 8–14 | Stale | yellow |
| > 14 | Ghost | red |

Calculated from `lastActivityAt` (or `createdAt` if no activity exists).

### Kanban Ordering

- Field: `kanbanOrder` (float)
- Sort: `ORDER BY kanban_order ASC` within each status column
- New job: `max(kanbanOrder) + 1`
- Insert between A and B: `(A + B) / 2`

### Date Handling

| Layer | Format |
|-------|--------|
| Database | `timestamptz` (UTC) |
| API responses | ISO 8601 string (`"2026-02-17T10:30:00.000Z"`) |
| Frontend display | Relative ("2 days ago") via formatter utils |

### User Scoping

All database queries **must** be scoped by `userId`. No cross-user data access is ever allowed.

### Rate Limiting (AI)

10 AI generations per hour per user. Return `429 Too Many Requests` when exceeded.

---

## Testing

| Layer | Framework | Unit Test | E2E Test |
|-------|-----------|-----------|----------|
| Backend | Jest + Supertest | `{name}.spec.ts` | `{name}.e2e-spec.ts` |
| Frontend | Vitest + Playwright | `{name}.spec.ts` | `{name}.e2e-spec.ts` |
