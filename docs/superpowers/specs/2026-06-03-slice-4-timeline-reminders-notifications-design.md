# JobVault — Slice 4: Timeline + Reminders + Notifications — Design Spec

> Parent specs: [`2026-04-26-…-migration-design.md`](./2026-04-26-nest-to-express-nuxt-to-next-migration-design.md) (architecture + phase roadmap) and [`2026-06-01-app-redesign-…-minimalist-design.md`](./2026-06-01-app-redesign-express-next-minimalist-design.md) (app surface + per-slice resolutions in §9). This spec covers the build sequence's **Timeline → Reminders/Notifications** phase. Decisions here are recorded in condensed form as "Slice 4 resolutions (2026-06-03)" in the app-redesign spec §9.

---

## 1. Goal & scope

Restore the original app's two "ghost-proof" nudge mechanisms on the Express + Next stack:

- **Timeline** — a per-job activity history (system **AUTO** events + user **MANUAL** notes), shown in the `JobDrawer`.
- **Reminders** — user-authored, future-dated, per-job follow-up nudges (*"ping the Acme recruiter Friday"*).
- **Notifications** — the delivery surface: a header bell + popover. Reminders that come due, and jobs that cross ghost thresholds, become notifications.
- **Scheduler** — a `node-cron` background worker that turns due reminders into notifications and runs the daily ghost sweep.
- **Real-time** — notifications are pushed over **socket.io** (no app-level polling).

Reference behavior to match lives in `backend/src/modules/{timeline,reminder,notification,scheduler}` and `frontend/app/components/{timeline,reminder,notification}` (NestJS/Nuxt — **read-only**, do not edit). Contracts below are stated explicitly so the plan can be derived without re-reading the old stack.

## 2. Sub-slice structure, sequencing & migrations

Slice 4 splits into three sub-slices, each independently shipped + verified, because their risk profiles differ sharply (4a is additive request-time work; 4b introduces the cron lifecycle; 4c introduces the WebSocket gateway). Each sub-slice gets its own plan in `docs/superpowers/plans/`.

| Sub-slice | Scope | New infra |
|---|---|---|
| **4a** | `timeline` module + jobs-service auto-events + `useTimeline` + JobDrawer timeline section | none (request-time only) |
| **4b** | `reminders` + `notifications` modules + `node-cron` scheduler (reminder sweep + ghost sweep) + ghost-filter bug fix + bell/popover + reminders UI | node-cron lifecycle, `ENABLE_SCHEDULER` env |
| **4c** | socket.io gateway (cookie-auth on upgrade, per-user rooms) + push on notification create + client cache updates | WebSocket server + client, Next/Docker upgrade proxy |

**Migrations stay per-slice** (matching the repo's `0000`/`0001` precedent): 4a generates the migration for `timeline_events` (+ enum `timeline_event_type`); 4b generates the migration for `reminders` + `notifications` (+ enum `notification_type`). `drizzle.config.ts` already targets the `src/db/schema/index.ts` barrel — new schema files only need an `export *` line; **no config change** (the CLAUDE.md "generalize it" note is already satisfied).

## 3. Data model (Drizzle `pgTable`, following the `JOB_STATUSES` const + `pgEnum` single-source pattern)

All tables: `id` uuid PK `defaultRandom()`; `createdAt`/`updatedAt` `timestamp({ withTimezone: true }).notNull().defaultNow()`; indexed on `userId` (+ FK/filter columns). All queries scoped by `userId`. Enums exported as both a `const [...] as const` (for Zod) and a `pgEnum` (for Drizzle), re-exported from `index.ts`.

### `timeline_events`
| column | type | notes |
|---|---|---|
| `userId` | uuid, FK→`users.id` `onDelete: cascade`, notNull | added for uniformity + the "all queries scoped by userId" convention |
| `jobId` | uuid, FK→`jobs.id` `onDelete: cascade`, notNull | |
| `type` | `timeline_event_type` enum (`AUTO` \| `MANUAL`), notNull | |
| `title` | varchar(255), notNull | |
| `description` | text, nullable | |

Indexes: `userId`, `jobId`. *(Per-job endpoint still verifies job ownership; the `userId` column makes a future global activity feed cheap without changing this slice.)*

### `reminders`
| column | type | notes |
|---|---|---|
| `userId` | uuid, FK→`users.id` `onDelete: cascade`, notNull | |
| `jobId` | uuid, FK→`jobs.id` `onDelete: cascade`, notNull | |
| `message` | varchar(500), notNull | |
| `remindAt` | timestamp({ withTimezone: true }), notNull | **UTC contract** — stored/compared in UTC, rendered browser-local |
| `isCompleted` | boolean, notNull, default false | dedup marker — once true, never re-fires |

Indexes: `userId`, `jobId`, `remindAt`. One-time only (no recurrence). Hard delete.

### `notifications`
| column | type | notes |
|---|---|---|
| `userId` | uuid, FK→`users.id` `onDelete: cascade`, notNull | |
| `message` | text, notNull | |
| `type` | `notification_type` enum (`GHOST_ALERT` \| `REMINDER` \| `STATUS_CHANGE` \| `GENERAL`), notNull | only `GHOST_ALERT` + `REMINDER` are created in Slice 4; the other two are reserved (legacy parity) |
| `isRead` | boolean, notNull, default false | |
| `relatedJobId` | uuid, FK→`jobs.id` **`onDelete: set null`**, nullable | so deleting a job doesn't destroy notification history |

Indexes: `userId`, `(userId, isRead)`. List capped at 50 server-side, `createdAt DESC`.

## 4. Slice 4a — Timeline

### Backend (`backend-express/src/modules/timeline/`, full router→controller→service→repository→schema + co-located `.test.ts`)

- `GET /api/jobs/:jobId/timeline` → `{ data: TimelineEvent[] }`, ordered `createdAt DESC`. 404 if the job isn't found / not owned.
- `POST /api/jobs/:jobId/timeline` body `{ title (≤255, required), description? }` → `{ data: TimelineEvent }` (MANUAL) and **bumps `job.lastActivityAt = now`**.
- Internal `timelineService.addAutoEntry({ userId, jobId, title, description? })` — writes an AUTO event; called by `jobs.service` (not exposed over HTTP). Does **not** bump `lastActivityAt` (the job mutation that triggered it already does).

### Auto-events (legacy parity, service-centralized)

`jobs.service` calls `timelineService.addAutoEntry` on:
- **create** → title `"Job added to vault"`, description `"Added to {status} column"`.
- **status change** (`old !== new`) on **both** `PATCH /api/jobs/:id` (when `input.status` differs) **and** `PATCH /api/jobs/:id/move` → title `"Status changed to {new}"`, description `"Moved from {old} to {new}"`.
- **No** events for notes/location/salary/other field edits.

**Retrofit:** `jobs.repository.move()`/`update()` are currently pure `UPDATE … RETURNING` and never read the prior row. To detect `old !== new`, `jobs.service` reads the current status first (the repo stays pure). The auto-event write is a side effect orchestrated in `jobs.service` so the trigger logic isn't duplicated across `move`/`update`/`create`; the **transaction boundary** (whether the timeline write shares the job mutation's transaction, or is a follow-on write whose failure is logged but doesn't roll back the mutation) is decided in the 4a plan. Existing `jobs.router.test.ts` (which mocks the repository) is updated to assert the timeline-service interaction.

### Frontend

- `useTimeline(jobId)` — TanStack Query, key `timelineKey(jobId)`; `useAddTimelineEntry(jobId)` mutation with optimistic prepend + invalidate.
- A **Timeline section inside `JobDrawer`** (already `?job=`-URL-driven). Reverse-chronological list; AUTO vs MANUAL visually distinguished (icon + muted/primary treatment). Inline manual-add form (title required, description optional). Every styled element is its own component (e.g. `TimelineList`, `TimelineEntry`, `TimelineAddForm`).

## 5. Slice 4b — Reminders + Notifications + scheduler

### Reminders backend (`modules/reminders/`)
- `GET /api/jobs/:jobId/reminders` → `{ data: Reminder[] }`, ordered `remindAt ASC`.
- `POST /api/jobs/:jobId/reminders` body `{ message (≤500), remindAt (ISO) }` → `{ data: Reminder }`.
- `PATCH /api/reminders/:id` body `{ message?, remindAt?, isCompleted? }` → `{ data: Reminder }`.
- `DELETE /api/reminders/:id` → `{ data: { id } }` (hard delete).
- A `remindersRouter` mounts the `/api/reminders/:id` routes; the job-scoped list/create mount under `/api/jobs/:jobId/reminders`. Both registered in `api-router` alongside `jobsRouter`/`dashboardRouter`.

### Notifications backend (`modules/notifications/`)
- `GET /api/notifications?unreadOnly=<bool>` → `{ data: Notification[] }` (capped 50, `createdAt DESC`).
- `PATCH /api/notifications/read-all` → `{ data: { updated: n } }` — **declared before** `:id/read` so Express doesn't capture `"read-all"` as `:id`.
- `PATCH /api/notifications/:id/read` → `{ data: Notification }`.
- Internal `notificationService.create({ userId, message, type, relatedJobId? })` — used by the scheduler. (In 4c this also emits the socket push.)
- **Unread count is derived client-side** from the fetched list (legacy parity — no dedicated `/unread-count` endpoint).

### Scheduler (`backend-express/src/scheduler/`, new `node-cron` dependency)

Two cron tasks, each implemented as a **pure sweep function** (testable directly, without timers) wired to a cron expression:

1. **Reminder sweep — `*/5 * * * *` (every 5 min).** Query `reminders WHERE remindAt <= now AND isCompleted = false` → for each, `notificationService.create({ type: REMINDER, message, relatedJobId })` and set `isCompleted = true`, in one transaction. Idempotent via the flag (a completed reminder never re-fires).
2. **Ghost sweep — daily at midnight.** For each non-`ARCHIVED` job, compute `days = floor((now - COALESCE(lastActivityAt, createdAt)) / 1d)`. Persist `jobs.ghostDays = days` **purely as the cron's crossing-detection anchor**. Fire a `GHOST_ALERT` notification once per threshold crossing (`prev ≤ T && new > T`) at `T=7` (`"{company} - {title} has been inactive for {n} days"`) and `T=14` (`"Ghost alert: {company} - {title} - no activity for {n} days"`). Fires once per crossing, not repeatedly.

> **The persisted `ghostDays` is bookkeeping only.** Everything user-facing (dashboard kanban + the fixed `/api/jobs` filter) derives ghost-days **live** from timestamps, so the daily-stale column is never a display source. This keeps Slice 3's deliberate derive-live decision intact while giving the cron a reliable `prev` anchor for crossing detection.

**Lifecycle (load-bearing):** the scheduler is a singleton started **after `app.listen()`** in `index.ts` (never inside `createApp`, or supertest/vitest spin live timers), and **stopped in `shutdown()` before `server.close()`**. Gated by `ENABLE_SCHEDULER` (default **off** when `NODE_ENV === 'test'`; on in dev/prod).

### 🐞 Ghost-filter bug fix (lands in 4b)

`jobs.repository.findAll` currently filters `ghostFilter` against the stored `jobs.ghostDays` column, which is **never written** (always `0`) → `?ghostFilter=stale|ghost` returns nothing today. Fix: rewrite the condition to **derive live in SQL** (`now - COALESCE(lastActivityAt, createdAt)`), so `/api/jobs` matches the dashboard kanban exactly (Slice 5's list view depends on this). Extract shared constants **`GHOST_STALE_DAYS = 7` / `GHOST_GHOST_DAYS = 14`** consumed by `dashboard.ghost`, `jobs.repository`, and the ghost cron — killing the current triple-duplication.

### Frontend (4b — event-driven liveness, **no interval polling**)
- **Notification bell + popover** in the **PageHeader actions region** (right-aligned, alongside the existing view toggle / Add Job). Badge = unread count (capped `99+`), hidden at 0.
- `useNotifications()` — TanStack Query, key `NOTIFICATIONS_KEY`; liveness via **refetch-on-window-focus + invalidate-on-mutation** (event-driven, *not* `refetchInterval`). `useMarkNotificationRead` / `useMarkAllRead` — optimistic `setQueryData` + invalidate. Clicking a notification with `relatedJobId` sets `?job=id` (reuses the URL-driven `JobDrawer`).
- **Reminders UI inside `JobDrawer`** — list (sorted by `remindAt`), create/edit/complete/delete; due/overdue state surfaced. Each styled element its own component (`ReminderList`, `ReminderItem`, `ReminderForm`, `NotificationBell`, `NotificationPopover`, `NotificationItem`).

## 6. Slice 4c — WebSocket real-time (socket.io)

Notifications are **persisted in Postgres** (source of truth) and **delivered over socket.io** — WebSocket is transport, not storage. Chosen over raw `ws` to buy the fiddly real-time *behavior* (reconnect+backoff, heartbeat, rooms, handshake auth) — consistent with the project's existing "hand-write presentation, delegate fiddly behavior" precedent (Radix for overlay mechanics).

- **Server:** socket.io attached to the same `http.Server`. `io.use()` handshake middleware verifies the `accessToken` cookie → `userId`; `socket.join(userId)`. On notification create, `notificationService` (and the cron through it) calls `io.to(userId).emit('notification', payload)` → pushes to all the user's open tabs/devices.
- **Client:** `socket.io-client`, same-origin. The Next/Docker proxy must forward the WS upgrade; the transparent **long-polling fallback stays enabled** as the proxy safety net (it is transport-level, not the app-level polling we removed). On `'notification'` → update the TanStack Query cache (prepend to the list, bump unread). This **supersedes 4b's focus-refetch** as the primary path (focus-refetch kept as a fallback for the initial load / missed events).
- **Auth/lifecycle:** socket bound to `userId` at connect; **re-verified on reconnect** (notifications are low-sensitivity, read-only, the user's own data). Sockets closed before `server.close()` in shutdown; gated off under `NODE_ENV === 'test'`. Future multi-instance scaling adds the socket.io **Redis adapter** (not now — single instance).
- **`mark-read` / `read-all` stay HTTP PATCH** (reuse 4b's optimistic mutations); WS carries only server→client notification pushes.

## 7. Cross-cutting

- **Testing (TDD, per sub-slice).** Service unit tests with a mocked repository; repository integration tests against real test Postgres (never mock Drizzle); HTTP via Supertest. **Scheduler** tested as pure sweep functions (find-due / detect-crossing) — no real timers. Frontend hooks/components via RTL + MSW. 4c tests the gateway's auth + per-user emit logic.
- **Conventions.** Controller never imports Drizzle; service never touches `req`/`res`; repository returns plain objects. `asyncHandler` + `AppError(code, message)` + `validate(schema, source)` + `authMiddleware` per-router. Success `{ data }`, error `{ statusCode, message, error, details? }`.
- **Workflow.** Commit per task; **commit-don't-push**; **no "Claude" in commit messages**; every styled element its own component. Substantial sub-slices orchestrated via the `Workflow` tool (implement → adversarial read-only verify → solo ground-truth gates); don't run concurrent `next build`/`vitest` in the same dir.

## 8. Resolved decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Slice split | **4a** (timeline) / **4b** (reminders + notifications + cron) / **4c** (socket.io) |
| 2 | Migrations | per-slice (4a: timeline_events; 4b: reminders + notifications) |
| 3 | Timeline auto-events | legacy parity: create + status-change on both PATCH and move; none for notes/other edits |
| 4 | `timeline_events.userId` | **present** (uniform with reminders/notifications + the scoping convention) |
| 5 | Reminder model | legacy parity: `message`/`remindAt`(UTC)/`isCompleted`; one-time; hard delete |
| 6 | Reminder cron interval | **every 5 min** |
| 7 | Ghost sweep | daily @midnight; persist `ghostDays` as **bookkeeping-only anchor**; fire `GHOST_ALERT` on 7/14-day crossings; user-facing ghost stays **derived-live** |
| 8 | `/api/jobs` ghostFilter | fix to **derive-live in SQL** + shared `GHOST_STALE_DAYS`/`GHOST_GHOST_DAYS` constants |
| 9 | Notification unread count | **client-derived** from the list (no `/unread-count` endpoint) |
| 10 | Notification delivery | **socket.io push, no app-level polling** (4c); 4b interim = event-driven focus-refetch |
| 11 | WS library | **socket.io** (long-polling fallback kept as proxy safety net) |
| 12 | Scheduler lifecycle | singleton; start after `app.listen()`; stop before `server.close()`; `ENABLE_SCHEDULER` env, off in test |

## 9. Deviation from prior specs (recorded)

The migration spec **§11.1 "Real-time notifications (replace polling)"** defers real-time and the app-redesign baseline assumed 60s polling. **Slice 4 overrides this:** there is **no app-level polling**; real-time is delivered via socket.io in **4c**. Rationale: the user explicitly prefers a real-time transport over polling, and delegating reconnection/heartbeat to socket.io keeps the custom surface small. The polling→WebSocket "future enhancement" is therefore pulled forward into Slice 4c. (Multi-instance Redis adapter remains future work.)

## 10. Risks & mitigations

- **Auto-event detection needs the old status** — `move`/`update` don't read the prior row. → `jobs.service` reads current status before mutating; centralize the timeline write in the service to avoid double-emit/miss; update mocked `jobs.router.test.ts`.
- **Retrofitting shipped Slice 2/3 code** — adding side-effects to create/move/update can break existing tests + the optimistic kanban move. → keep the repo pure; add the side effect in the service; expand tests carefully.
- **Scheduler test isolation** — node-cron must not spin under supertest/vitest. → start only after `app.listen()`, never in `createApp`; `ENABLE_SCHEDULER` off in test; test sweep functions directly.
- **Notification route ordering** — `read-all` must precede `:id/read`. → enforced + covered by a route test.
- **`relatedJobId` FK rule** — must be `ON DELETE SET NULL` (not cascade) or job deletion silently drops notification history. → asserted in a repository test (delete a job, notification survives with null `relatedJobId`).
- **`remindAt` timezone** — ambiguous UTC vs local makes reminders fire at the wrong wall-clock time. → store/compare UTC, render browser-local; cover with a cron-due test at a UTC boundary.
- **Ghost-alert dedup** — must fire once per crossing. → the persisted `ghostDays` anchor (decision #7) makes `prev ≤ T && new > T` reliable; covered by a sweep test simulating consecutive days.
- **Threshold drift** — 7/14 duplicated across three sites. → single shared constants (decision #8).
- **WS upgrade through Next/Docker** — "works locally, breaks in container." → keep socket.io's long-polling fallback enabled; verify the upgrade against the Docker stack as a 4c smoke test.
- **`lastActivityAt` reset by any edit** — a notes-only edit already resets the ghost timer (existing behavior). → confirmed intended; no timeline event for non-status edits, but the ghost timer reset is retained (an edit *is* activity).

## 11. Out of scope / deferred

- Recurring reminders (RRULE/interval), reminder soft-delete / `completedAt`.
- `STATUS_CHANGE` / `GENERAL` notification creation (enum values reserved only).
- A dedicated `/api/notifications/unread-count` endpoint.
- Global cross-job activity feed / dashboard recent-activity feed (the `timeline_events.userId` column readies it; the feed itself is a later slice).
- Notification retention / auto-archive policy.
- socket.io Redis adapter / multi-instance scaling.
- Email/push delivery channels.
