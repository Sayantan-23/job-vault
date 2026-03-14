# Backend Agent Memory

## Project Patterns
- **Module resolution**: `nodenext` - all imports use `.js` extensions (e.g., `./auth.service.js`)
- **tsconfig**: `module: nodenext`, `moduleResolution: nodenext`, `target: ES2023`, `experimentalDecorators: true`
- **Package manager**: Uses yarn (yarn.lock present, use `yarn` not `npm`)
- **BaseEntity**: `src/common/entities/base.entity.ts` - has `id` (UUID via uuid v4), `createdAt`, `updatedAt`
- **MikroORM config**: `src/config/mikro-orm.config.ts` - uses `process.env` directly, entity glob patterns
- **ConfigModule**: Global, loaded in AppModule. Strategies use `process.env` in `super()` (NestJS pattern)
- **EntityManager**: Import from `@mikro-orm/postgresql` (NOT `@mikro-orm/core`)

## File Structure
- Entities: `src/modules/{mod}/entities/{entity}.entity.ts`
- DTOs: `src/modules/{mod}/dto/{action}-{entity}.dto.ts`
- Strategies: `src/modules/{mod}/strategies/{name}.strategy.ts`
- Guards: `src/modules/{mod}/guards/{name}-auth.guard.ts`
- Migrations: `src/migrations/Migration{YYYYMMDD}{seq}_{Name}.ts`

## Completed Modules
- **BE-01** (Project Setup): BaseEntity, global pipes/filters/interceptors, pagination DTOs, main.ts
- **BE-02** (Auth): User entity, JWT+Google strategies, AuthService, AuthController, 8 endpoints
- **BE-03** (Job): Job entity, 7 endpoints (CRUD + scrape + move), ScraperService (Cheerio+Gemini), MarkdownService
- **BE-04** (Dashboard): 2 endpoints (kanban board + stats), no new entities, reads Job via MikroOrmModule.forFeature
- **BE-05** (Timeline/Reminders/Notifications): 3 entities, 4 modules, 9 endpoints, SchedulerService with crons

## Key Decisions (BE-02)
- `AuthResponseDto` is an interface (not class) since it's only used as return type
- `GoogleProfile` interface defined in auth.service.ts for Google OAuth user data
- `JwtModule.registerAsync` with ConfigService (not `register` with process.env)
- Google callback redirects to frontend URL derived from CORS_ORIGINS env var
- Account linking: if Google email matches existing user, links googleId to that user
- Token reuse detection: clears refreshTokenHash to force re-login on all devices
- Hidden fields (`passwordHash`, `refreshTokenHash`) use MikroORM `{ hidden: true }`

## Key Decisions (BE-03)
- `ScrapeResult` is an exported interface in `scraper.service.ts`
- Kanban order calculation uses Knex (`em.getKnex()`) for raw MAX query
- `JobStatus` enum values are UPPERCASE per CONVENTIONS.md (not lowercase as in plan)
- Migration default status is `'WISHLIST'` (uppercase) matching the enum
- Gemini is optional: if `GEMINI_API_KEY` not set, logs warning and skips fallback
- `GoogleGenAI` from `@google/genai` — uses `models.generateContent()` API
- ScraperService supports JSON-LD, platform selectors (LinkedIn/Indeed/Greenhouse/Lever), and generic fallback
- `findAll` uses QueryBuilder for complex filtering, `clone().count()` for total before pagination
- All queries scoped by userId: `findOne` uses `{ id, user: userId }`, `findAll` uses `where({ user: userId })`
- Controller uses `ParseUUIDPipe` on `:id` params for validation

## Key Decisions (BE-04)
- No new entities or migrations — Dashboard reads from existing Job entity
- Module uses `MikroOrmModule.forFeature([Job])` directly (no need to import JobModule)
- `COLUMN_CONFIG` uses UPPERCASE keys matching `JobStatus` enum values
- `COLUMN_ORDER` array defines rendering order: WISHLIST->APPLIED->INTERVIEWING->OFFER->REJECTED->ARCHIVED
- Kanban board fetches ALL user jobs (no pagination) for drag-and-drop support
- Stats in kanban response are calculated from filtered jobs; `/stats` endpoint uses unfiltered jobs
- Ghost filter thresholds: active<=7, stale 8-14, ghost>14
- Recent activity: lastActivityAt (or createdAt fallback) within 7 days
- DTOs used as return types use `import type`; DTOs used with NestJS decorators use regular import

## Key Decisions (BE-05)
- Enums (`TimelineEventType`, `NotificationType`) defined inline in entity files (not separate enum files)
- MikroORM v6 uses `deleteRule` not `onDelete`: `@ManyToOne(() => Job, { deleteRule: 'cascade' })`
- ReminderController uses `@Controller()` (no prefix) with explicit route paths for mixed routes (`jobs/:jobId/reminders` + `reminders/:id`)
- NotificationController defines `read-all` route BEFORE `:id/read` to avoid route parameter conflicts
- SchedulerService uses `em.fork()` in `updateGhostDays` to avoid EntityManager state conflicts
- Ghost threshold detection compares `previousGhostDays` vs `newGhostDays` to detect crossing 7 and 14 day boundaries
- Reminder `isCompleted` means "notification was sent" — not "user acted on it"
- `getDueReminders()` populates `['job', 'user']` for scheduler to access user.id and job.id
- JobService integrates TimelineService directly (not optional) — JobModule imports TimelineModule
- Auto timeline entries: "Job added to vault" on create, "Status changed to {status}" on move
- `@nestjs/schedule` installed for cron support, `ScheduleModule.forRoot()` in SchedulerModule
- NotificationService `markAllRead` uses `nativeUpdate` for bulk efficiency
- Notifications limited to 50 per query, ordered by `createdAt DESC`
- NotificationQueryDto `unreadOnly` uses `Transform` to convert string 'true' to boolean
