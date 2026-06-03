# Slice 4c — Real-time Notification Delivery (socket.io) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push freshly-created notifications to the user's open tabs in real time over socket.io (cookie-authenticated handshake, per-user rooms), replacing 4b's focus-refetch as the primary freshness path with no app-level polling.

**Architecture:** A socket.io `Server` attaches to the same `http.Server` Express listens on; an `io.use()` handshake middleware parses the `accessToken` cookie and verifies it (`verifyToken`) to attach `socket.data.userId`, then joins a room named after the user id. `notificationService.create` (built in 4b) calls a thin `emitToUser(userId, 'notification', payload)` seam after persisting (best-effort, no-op when `io` is unset, e.g. under test). The Next.js client lazily opens a same-origin socket inside a `RealtimeProvider` mounted in the authenticated `app/` route group; on each `'notification'` event it prepends to the `NOTIFICATIONS_KEY` TanStack Query cache (deduped by id), and the bell's unread count — derived client-side from that list (spec §9) — updates as a consequence.

**Tech Stack:** Express 5, socket.io (server) + socket.io-client (browser), Drizzle ORM, Zod env, strict TypeScript (NodeNext, relative imports end in `.js`); Next.js 15 App Router + React 19 + TanStack Query v5; Vitest + React Testing Library.

---

## Prerequisites

**Slices 4a AND 4b are merged to master before this slice begins.** Slice 4c imports their artifacts directly by exact name and does not re-create or stub them:

- **From 4a** — `TIMELINE_KEY` / `timelineKey(jobId)` in `src/lib/query-keys.ts` and the timeline UI (no direct 4c dependency, but 4a must be merged so the JobDrawer surface is complete).
- **From 4b backend** — the notifications module at `backend-express/src/modules/notifications/`, specifically `notificationService.create(input): Promise<NotificationRow>` which persists a notification via `notificationRepository.create(...)` and **returns the created row**. The 4b scheduler (`backend-express/src/scheduler/`) is started after `app.listen()` and stopped before `server.close()` in `index.ts`, gated by `ENABLE_SCHEDULER`. The `ENABLE_SCHEDULER` line already exists in the `backend-express` service `environment:` block of `docker-compose.yml`.
- **From 4b frontend** — `NOTIFICATIONS_KEY = ['notifications'] as const` (single key, no param) in `src/lib/query-keys.ts`; `useNotifications` in `src/hooks/use-notifications.ts` (fetches `GET /api/notifications` as the whole list, deriving unread client-side via `data.filter((n) => !n.isRead).length`); and `interface Notification` in `src/types/notification.ts` with shape `{ id; userId; message; type: 'GHOST_ALERT' | 'REMINDER' | 'STATUS_CHANGE' | 'GENERAL'; isRead: boolean; relatedJobId: string | null; createdAt: string }`.

This plan references those identifiers verbatim with no hedging — they exist when 4c executes.

---

## File Structure

**Backend (`backend-express/`)**
- `package.json` — **Modify:** add the `socket.io` dependency.
- `src/config/env.ts` — **Modify:** add `ENABLE_REALTIME` using the safe boolean parse (`z.string().default('false').transform((v) => v === 'true' || v === '1')`).
- `src/realtime/socket.ts` — **Create:** `createSocketServer(httpServer)`, the cookie-auth handshake middleware, `getIo()`/`setIo()` singleton, and `emitToUser(userId, event, payload)` (no-op when `io` is unset). Plus exported `parseAccessTokenCookie` + `socketAuthMiddleware` for isolated unit tests.
- `src/realtime/socket.test.ts` — **Create:** unit tests for the handshake middleware (valid cookie attaches `userId`; missing/invalid cookie rejected) and `emitToUser` no-op when `io` unset.
- `src/modules/notifications/notification.service.ts` — **Modify (4b file):** call `emitToUser(userId, 'notification', notification)` after persisting in `create`, wrapped best-effort.
- `src/modules/notifications/notification.service.test.ts` — **Modify (4b file):** assert `emitToUser` is invoked with the created notification, and that `create` still succeeds when realtime is unset (no-op).
- `src/index.ts` — **Modify (surgical):** build an explicit `http.Server`, **retain the 4b scheduler start/stop wiring verbatim**, gate `createSocketServer`/`setIo` behind `env.ENABLE_REALTIME && env.NODE_ENV !== 'test'`, and `io?.close()` before `server.close()` in `shutdown()`.

**Frontend (`frontend-next/`)**
- `package.json` — **Modify:** add the `socket.io-client` dependency.
- `src/lib/socket.ts` — **Create:** `getSocket()` lazy singleton + `connectSocket()`/`disconnectSocket()`, same-origin, `autoConnect:false`, transports `['websocket','polling']`.
- `src/lib/socket.test.ts` — **Create:** unit tests asserting the singleton is reused and connect/disconnect call through.
- `src/components/shared/realtime-provider.tsx` — **Create:** `'use client'` provider that connects the socket on mount, subscribes to `'notification'`, prepends to the `NOTIFICATIONS_KEY` cache (dedupe by id), and disconnects on unmount.
- `src/components/shared/realtime-provider.test.tsx` — **Create:** asserts `connectSocket` runs on mount + `disconnectSocket` on unmount; a mocked socket emits `'notification'` → the `NOTIFICATIONS_KEY` cache gains the new item (deduped) and the client-derived unread count increments.
- `src/app/app/layout.tsx` — **Modify:** wrap `AppShell` in `RealtimeProvider` so it runs only on authenticated app pages.
- `src/hooks/use-notifications.ts` — **Modify (4b file):** relax the aggressive `staleTime:0` to a calmer `30_000` now that push drives freshness; keep `refetchOnWindowFocus: true` as a fallback.
- `next.config.ts` — **Modify:** add a `/socket.io/:path*` rewrite to the backend.

**Root**
- `docker-compose.yml` — **Modify:** add `ENABLE_REALTIME: ${ENABLE_REALTIME:-true}` to the `backend-express` service `environment:` block.

---

## Tasks

### Task 1: Add the `socket.io` backend dependency

**Files:**
- Modify: `backend-express/package.json` + `backend-express/package-lock.json`

- [ ] **Step 1: Add the dependency to `package.json`.** Add `"socket.io": "^4.8.1"` to `dependencies`, keeping alphabetical order (between `pino-http` and `turndown`). The edited block:
```json
    "pg": "^8.13.1",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "socket.io": "^4.8.1",
    "turndown": "^7.2.4",
    "zod": "^3.23.8"
```

- [ ] **Step 2: Install it so the lockfile updates.** socket.io ships its own TypeScript types, so no `@types/*` is needed. Run the install and confirm it completes — `package-lock.json` MUST change:
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm install socket.io@^4.8.1 && git status --short package-lock.json
```
Expected: `node_modules/socket.io` exists and `git status` shows `package-lock.json` as modified. If the host `npm install` cannot run, install inside the container instead and copy the lockfile back out so both files are committed:
```bash
cd /home/weloin/Projects/job-vault && docker compose run --rm backend-express npm install socket.io@^4.8.1 && git -C backend-express status --short package-lock.json
```
Either path MUST end with `package-lock.json` actually modified before you commit.

- [ ] **Step 3: Confirm it resolves.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && node -e "require.resolve('socket.io'); console.log('ok')"
```
Expected: prints `ok`.

- [ ] **Step 4: Commit `package.json` AND `package-lock.json` together.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && git add package.json package-lock.json && git commit -m "chore(backend-express): add socket.io dependency for real-time notifications"
```

---

### Task 2: `ENABLE_REALTIME` env flag (safe boolean parse)

**Files:**
- Modify: `backend-express/src/config/env.ts`
- Modify: `backend-express/src/config/env.test.ts`

> **`z.coerce.boolean()` is a footgun:** it coerces the *string* `'false'` to **`true`** (any non-empty string is truthy). Use an explicit string transform that only accepts `'true'`/`'1'` as true, so `ENABLE_REALTIME=false` in `.env`/compose actually disables the gateway.

- [ ] **Step 1: Write the failing test.** Append this `describe` block to `backend-express/src/config/env.test.ts` (it reuses the existing `parseEnv` import; build a local minimal base so the assertions are self-contained):
```ts
describe('parseEnv ENABLE_REALTIME', () => {
  const base = {
    CORS_ORIGINS: 'http://localhost:8080',
    DATABASE_URL: 'postgres://user:pw@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(32),
  }

  it('defaults ENABLE_REALTIME to false when unset', () => {
    expect(parseEnv(base).ENABLE_REALTIME).toBe(false)
  })

  it('parses the string "false" as boolean false (not the z.coerce.boolean footgun)', () => {
    expect(parseEnv({ ...base, ENABLE_REALTIME: 'false' }).ENABLE_REALTIME).toBe(false)
  })

  it('parses the string "true" as boolean true', () => {
    expect(parseEnv({ ...base, ENABLE_REALTIME: 'true' }).ENABLE_REALTIME).toBe(true)
  })

  it('parses the string "1" as boolean true', () => {
    expect(parseEnv({ ...base, ENABLE_REALTIME: '1' }).ENABLE_REALTIME).toBe(true)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run test -- src/config/env.test.ts
```
Expected: fails — `ENABLE_REALTIME` is `undefined` (not `false`), and the `'true'`/`'1'` cases return `undefined`.

- [ ] **Step 3: Implement.** In `backend-express/src/config/env.ts`, add the field to `envSchema` directly after the `JWT_REFRESH_EXPIRY` line:
```ts
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  // NB: z.coerce.boolean() coerces the string 'false' to TRUE, so parse explicitly.
  ENABLE_REALTIME: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
```

- [ ] **Step 4: Run it, expect PASS.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run test -- src/config/env.test.ts
```
Expected: all four cases pass (notably `'false'` → `false`).

- [ ] **Step 5: Typecheck.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run typecheck
```

- [ ] **Step 6: Commit.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && git add src/config/env.ts src/config/env.test.ts && git commit -m "feat(backend-express): add ENABLE_REALTIME env flag (safe string boolean, default off)"
```

---

### Task 3: `src/realtime/socket.ts` — handshake auth, singleton, `emitToUser`

**Files:**
- Create: `backend-express/src/realtime/socket.ts`
- Create: `backend-express/src/realtime/socket.test.ts`

The handshake middleware, cookie parser, and `emitToUser` are exported as standalone functions so the test exercises them in isolation — **no real listening socket is started in the default test run.**

- [ ] **Step 1: Write the failing test.** Create `backend-express/src/realtime/socket.test.ts`:
```ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

beforeAll(() => {
  process.env['NODE_ENV'] = 'test'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
  process.env['LOG_LEVEL'] = 'silent'
})

interface FakeSocket {
  handshake: { headers: { cookie?: string } }
  data: { userId?: string }
}

function fakeSocket(cookie?: string): FakeSocket {
  return { handshake: { headers: cookie === undefined ? {} : { cookie } }, data: {} }
}

describe('parseAccessTokenCookie', () => {
  it('extracts the accessToken value from a cookie header', async () => {
    const { parseAccessTokenCookie } = await import('./socket.js')
    expect(parseAccessTokenCookie('foo=1; accessToken=abc.def.ghi; bar=2')).toBe('abc.def.ghi')
  })

  it('returns undefined when the header is missing or has no accessToken', async () => {
    const { parseAccessTokenCookie } = await import('./socket.js')
    expect(parseAccessTokenCookie(undefined)).toBeUndefined()
    expect(parseAccessTokenCookie('foo=1; bar=2')).toBeUndefined()
  })
})

describe('socketAuthMiddleware', () => {
  it('attaches socket.data.userId for a valid signed cookie', async () => {
    const { signAccessToken } = await import('@/modules/auth/auth.tokens.js')
    const { socketAuthMiddleware } = await import('./socket.js')
    const token = signAccessToken({ id: 'u1', email: 'a@b.c' })
    const socket = fakeSocket(`accessToken=${token}`)
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    expect(next).toHaveBeenCalledWith()
    expect(socket.data.userId).toBe('u1')
  })

  it('rejects a missing cookie with an unauthorized error', async () => {
    const { socketAuthMiddleware } = await import('./socket.js')
    const socket = fakeSocket(undefined)
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    const err = next.mock.calls[0]?.[0] as Error
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('unauthorized')
    expect(socket.data.userId).toBeUndefined()
  })

  it('rejects an invalid token with an unauthorized error', async () => {
    const { socketAuthMiddleware } = await import('./socket.js')
    const socket = fakeSocket('accessToken=not-a-real-jwt')
    const next = vi.fn()
    socketAuthMiddleware(socket as never, next)
    const err = next.mock.calls[0]?.[0] as Error
    expect(err.message).toBe('unauthorized')
  })
})

describe('emitToUser', () => {
  beforeEach(async () => {
    const { setIo } = await import('./socket.js')
    setIo(undefined)
  })

  it('is a no-op (does not throw) when io is unset', async () => {
    const { emitToUser } = await import('./socket.js')
    expect(() => emitToUser('u1', 'notification', { id: 'n1' })).not.toThrow()
  })

  it('emits to the user room when io is set', async () => {
    const emit = vi.fn()
    const to = vi.fn(() => ({ emit }))
    const { setIo, emitToUser } = await import('./socket.js')
    setIo({ to } as never)
    emitToUser('u1', 'notification', { id: 'n1' })
    expect(to).toHaveBeenCalledWith('u1')
    expect(emit).toHaveBeenCalledWith('notification', { id: 'n1' })
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run test -- src/realtime/socket.test.ts
```
Expected: fails — `./socket.js` does not exist (module resolution error).

- [ ] **Step 3: Implement.** Create `backend-express/src/realtime/socket.ts`:
```ts
import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { getEnv } from '@/config/env.js'
import { logger } from '@/shared/logger.js'
import { verifyToken } from '@/modules/auth/auth.tokens.js'

// socket.io's per-connection middleware signature (a thin alias so tests can
// call the handshake middleware in isolation without a live server).
type SocketNext = (err?: Error) => void

/** Hand-parse the `accessToken` value from a raw Cookie header. */
export function parseAccessTokenCookie(header: string | undefined): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [rawName, ...rawVal] = part.trim().split('=')
    if (rawName === 'accessToken') return rawVal.join('=')
  }
  return undefined
}

/**
 * Handshake auth: verify the `accessToken` cookie and attach `socket.data.userId`.
 * Runs on every new connection, so reconnects are re-verified automatically.
 */
export function socketAuthMiddleware(socket: Socket, next: SocketNext): void {
  const token = parseAccessTokenCookie(socket.handshake.headers.cookie)
  if (!token) {
    next(new Error('unauthorized'))
    return
  }
  try {
    const payload = verifyToken(token)
    socket.data.userId = payload.sub
    next()
  } catch {
    next(new Error('unauthorized'))
  }
}

// --- Singleton ------------------------------------------------------------
let io: Server | undefined

export function setIo(next: Server | undefined): void {
  io = next
}

export function getIo(): Server | undefined {
  return io
}

/**
 * Construct a socket.io server bound to the given http.Server, install the
 * cookie-auth handshake, and join each connection to its per-user room.
 * Stores the instance in the module singleton and returns it.
 */
export function createSocketServer(httpServer: HttpServer): Server {
  const env = getEnv()
  const server = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  })
  server.use(socketAuthMiddleware)
  server.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined
    if (userId) {
      void socket.join(userId)
      logger.debug(
        { userId, socketId: socket.id, transport: socket.conn.transport.name },
        'socket connected',
      )
    }
  })
  setIo(server)
  return server
}

/**
 * Best-effort server→client push to all of a user's open sockets. A no-op when
 * the socket server is not running (e.g. under test, or with realtime disabled),
 * and never throws — notification persistence must not depend on delivery.
 */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userId).emit(event, payload)
}
```

- [ ] **Step 4: Run it, expect PASS.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run test -- src/realtime/socket.test.ts
```
Expected: all cases pass. (If `socket.io` is not installed on the host, run inside the Docker stack: `docker compose exec backend-express npm run test -- src/realtime/socket.test.ts`.)

- [ ] **Step 5: Typecheck + lint.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && git add src/realtime/socket.ts src/realtime/socket.test.ts && git commit -m "feat(backend-express): socket.io gateway with cookie-auth handshake and per-user emitToUser"
```

---

### Task 4: Wire the emit seam into `notificationService.create`

**Files:**
- Modify: `backend-express/src/modules/notifications/notification.service.ts` (built in 4b)
- Modify: `backend-express/src/modules/notifications/notification.service.test.ts` (built in 4b)

> **Integration point.** 4b's `notificationService.create(input): Promise<NotificationRow>` persists a notification via `notificationRepository.create(...)` and returns the created row. This task adds a thin import of `emitToUser` from `@/realtime/socket.js` and calls `emitToUser(notification.userId, 'notification', notification)` after persistence, **best-effort (never throws** — `emitToUser` is already a safe no-op when `io` is unset). The unit test mocks the repository (per the SERVICE unit-test convention) and additionally mocks `@/realtime/socket.js` so it can assert the emit without a live server.

- [ ] **Step 1: Write/extend the failing test.** In `backend-express/src/modules/notifications/notification.service.test.ts`, add the realtime mock at the top alongside the existing repository mock, and add the assertions. Add this mock block (next to the existing `vi.mock('./notification.repository.js', …)`):
```ts
vi.mock('@/realtime/socket.js', () => ({ emitToUser: vi.fn() }))
```
Add the imports beneath the existing service/repository imports:
```ts
import { emitToUser } from '@/realtime/socket.js'

const emit = vi.mocked(emitToUser)
```
Add this `describe` block (the 4b test already defines a `fakeNotification` helper and a mocked `repo`; reuse them):
```ts
describe('notificationService.create emits over socket.io', () => {
  it('pushes the persisted notification to the owner after saving', async () => {
    const created = fakeNotification({ id: 'n1', userId: 'u1', message: 'due', type: 'REMINDER' })
    repo.create.mockResolvedValue(created)
    const result = await notificationService.create({ userId: 'u1', message: 'due', type: 'REMINDER' })
    expect(result.id).toBe('n1')
    expect(emit).toHaveBeenCalledWith('u1', 'notification', created)
  })

  it('still resolves when realtime is a no-op (emit never throws)', async () => {
    const created = fakeNotification({ id: 'n2', userId: 'u1' })
    repo.create.mockResolvedValue(created)
    emit.mockImplementation(() => {})
    await expect(
      notificationService.create({ userId: 'u1', message: 'x', type: 'GENERAL' }),
    ).resolves.toMatchObject({ id: 'n2' })
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run test -- src/modules/notifications/notification.service.test.ts
```
Expected: fails — `create` does not call `emitToUser` yet.

- [ ] **Step 3: Implement.** In `backend-express/src/modules/notifications/notification.service.ts`, add the import at the top:
```ts
import { emitToUser } from '@/realtime/socket.js'
```
In the `create` function, after the repository persists the row and before returning it, emit:
```ts
const notification = await notificationRepository.create(values)
emitToUser(notification.userId, 'notification', notification)
return notification
```
`emitToUser` is best-effort and never throws, so no try/catch is required.

- [ ] **Step 4: Run it, expect PASS.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run test -- src/modules/notifications/notification.service.test.ts
```
Expected: both new cases pass and the existing 4b cases stay green.

- [ ] **Step 5: Typecheck + lint.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && git add src/modules/notifications/notification.service.ts src/modules/notifications/notification.service.test.ts && git commit -m "feat(backend-express): emit created notifications over socket.io to the owner"
```

---

### Task 5: `index.ts` — explicit `http.Server`, socket lifecycle, ordered shutdown (preserving the 4b scheduler)

**Files:**
- Modify: `backend-express/src/index.ts`

There is no automated test for `index.ts` (it is the process bootstrap, exercised by the Docker smoke in the Verification task). This edit is **surgical**: it converts `app.listen()` into an explicit `http.Server` so socket.io can attach, **keeps every scheduler line 4b added** (the `startScheduler()` call after `listen` and the `stopScheduler()` call in `shutdown()`), and adds the socket gateway alongside them.

> **Do NOT overwrite this file in a way that drops the 4b scheduler wiring.** The post-4b `index.ts` already contains: `import { startScheduler, stopScheduler } from './scheduler/scheduler.js'`; a `startScheduler()` call gated by `env.ENABLE_SCHEDULER && env.NODE_ENV !== 'test'` placed **after** `server.listen(...)`; and a `stopScheduler()` call inside `shutdown()` **before** `server.close()`. Those exact lines are retained below — 4c only adds the `http.createServer(app)`, the socket gateway start (also after `listen`), and `io?.close()` (also before `server.close()`).

- [ ] **Step 1: Implement.** Edit `backend-express/src/index.ts` to the final post-4c form below. The 4b scheduler lines are marked `// (4b)`; the 4c additions are marked `// (4c)`:
```ts
import 'dotenv/config'
import http from 'node:http'
import { createApp } from './app.js'
import { getEnv } from './config/env.js'
import { logger } from './shared/logger.js'
import { closeDb } from './db/client.js'
import { startScheduler, stopScheduler } from './scheduler/scheduler.js' // (4b)
import { createSocketServer, getIo, setIo } from './realtime/socket.js' // (4c)

const env = getEnv()
const app = createApp()
const server = http.createServer(app) // (4c) explicit server so socket.io can attach

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'backend-express started')

  // (4b) Start the cron scheduler after listen — never inside createApp, or
  // supertest/vitest would spin live timers. Off under test.
  if (env.ENABLE_SCHEDULER && env.NODE_ENV !== 'test') {
    startScheduler()
    logger.info('node-cron scheduler started')
  }

  // (4c) Attach the real-time gateway after listen, gated and off under test.
  if (env.ENABLE_REALTIME && env.NODE_ENV !== 'test') {
    createSocketServer(server)
    logger.info('socket.io real-time gateway enabled')
  }
})

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  const forceExit = setTimeout(() => {
    logger.error('forced exit after 10s')
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  stopScheduler() // (4b) stop cron tasks before tearing down the server

  // (4c) Close all sockets before the HTTP server, otherwise open WS
  // connections keep `server.close()` from ever firing its callback.
  const io = getIo()
  if (io) {
    io.close()
    setIo(undefined)
  }

  server.close(async (err) => {
    if (err) logger.error({ err }, 'server close failed')
    try {
      await closeDb()
    } catch (closeErr) {
      logger.error({ err: closeErr }, 'db close failed')
    }
    process.exit(err ? 1 : 0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection')
})
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException')
  shutdown('uncaughtException')
})
```
> This reflects the canonical post-4b `index.ts`: `startScheduler`/`stopScheduler` are imported from `./scheduler/scheduler.js` (the path 4b uses). If 4b's merged code differs, keep 4b's exact import/call sites unchanged and only layer the `http.Server` + socket lines around them.

- [ ] **Step 2: Typecheck + lint.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run typecheck && npm run lint
```
Expected: both pass (the existing test suite does not import `index.ts`, so the suite is unaffected; verify with the next step).

- [ ] **Step 3: Run the full backend suite (no regressions).**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run test
```
Expected: all tests pass; no live socket and no live cron are opened (both gateways are off under test).

- [ ] **Step 4: Commit.**
```bash
cd /home/weloin/Projects/job-vault/backend-express && git add src/index.ts && git commit -m "feat(backend-express): attach socket.io to an explicit http.Server, preserve scheduler, order shutdown"
```

---

### Task 6: Add `ENABLE_REALTIME` to the backend service in `docker-compose.yml`

**Files:**
- Modify: `docker-compose.yml`

> Editing the root `.env` alone does **not** reach the container — compose only injects a variable into a service when it is listed in that service's `environment:` block (or via `env_file`). The `backend-express` env block must explicitly map `ENABLE_REALTIME`.

- [ ] **Step 1: Add the env line.** In the `backend-express` service `environment:` block, add `ENABLE_REALTIME` anchored on the 4b-added `ENABLE_SCHEDULER` line (which sits with `LOG_LEVEL` / `CHOKIDAR_USEPOLLING`). The edited block:
```yaml
    environment:
      NODE_ENV: development
      PORT: 3000
      CORS_ORIGINS: http://localhost:8080
      DATABASE_URL: postgres://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@postgres:5432/${DB_NAME:-jobvault}
      JWT_SECRET: ${JWT_SECRET:-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}
      JWT_ACCESS_EXPIRY: 15m
      JWT_REFRESH_EXPIRY: 7d
      LOG_LEVEL: ${LOG_LEVEL:-info}
      CHOKIDAR_USEPOLLING: "true"
      ENABLE_SCHEDULER: ${ENABLE_SCHEDULER:-true}
      ENABLE_REALTIME: ${ENABLE_REALTIME:-true}
```
> The browser uses socket.io same-origin (proxied via Next), so the `frontend-next` service needs no new env.

- [ ] **Step 2: Validate the compose file parses.**
```bash
cd /home/weloin/Projects/job-vault && docker compose config >/dev/null && echo "compose ok"
```
Expected: prints `compose ok` (no YAML errors).

- [ ] **Step 3: Commit.**
```bash
cd /home/weloin/Projects/job-vault && git add docker-compose.yml && git commit -m "chore: enable socket.io realtime in the backend-express service (ENABLE_REALTIME)"
```

---

### Task 7: Rebuild the Docker stack with the new backend dependency

**Files:** none (operational step).

- [ ] **Step 1: Recreate `.env` if missing** (gitignored; remaps the taken host ports). Keep both gateway flags on for dev:
```bash
cd /home/weloin/Projects/job-vault && test -f .env || printf 'DB_PORT_EXTERNAL=5433\nBACKEND_PORT=3100\nFRONTEND_PORT=8080\nJWT_SECRET=devsecretdevsecretdevsecret12345\nENABLE_SCHEDULER=true\nENABLE_REALTIME=true\n' > .env
```
*(If `.env` exists, ensure it includes `ENABLE_REALTIME=true`; add the line if absent. With no `.env` override, the compose default `${ENABLE_REALTIME:-true}` already runs the gateway.)*

- [ ] **Step 2: Rebuild with renewed anon volumes** (required after a dependency change so `node_modules` is reinstalled):
```bash
cd /home/weloin/Projects/job-vault && docker compose up -d --build --force-recreate --renew-anon-volumes
```

- [ ] **Step 3: Confirm the backend is up and `socket.io` resolves inside the container.**
```bash
cd /home/weloin/Projects/job-vault && docker compose logs --tail=40 backend-express && docker compose exec backend-express node -e "require.resolve('socket.io'); console.log('socket.io ok')"
```
Expected: logs show `backend-express started`, `node-cron scheduler started` (4b), and `socket.io real-time gateway enabled`; the node command prints `socket.io ok`.

- [ ] **Step 4: No commit** (operational only).

---

### Task 8: Add the `socket.io-client` frontend dependency

**Files:**
- Modify: `frontend-next/package.json` + `frontend-next/package-lock.json`

- [ ] **Step 1: Add the dependency.** In `frontend-next/package.json`, add `"socket.io-client": "^4.8.1"` to `dependencies`, keeping alphabetical order (after `react-markdown`, before `tailwind-merge`):
```json
    "react-hook-form": "^7.77.0",
    "react-markdown": "^10.1.0",
    "socket.io-client": "^4.8.1",
    "tailwind-merge": "^2.5.4",
    "zod": "^3.23.8"
```

- [ ] **Step 2: Install it so the lockfile updates** (socket.io-client ships its own types):
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm install socket.io-client@^4.8.1 && git status --short package-lock.json
```
Expected: `node_modules/socket.io-client` exists and `git status` shows `package-lock.json` modified. If the host install cannot run, install inside the container and confirm the lockfile changed:
```bash
cd /home/weloin/Projects/job-vault && docker compose run --rm frontend-next npm install socket.io-client@^4.8.1 && git -C frontend-next status --short package-lock.json
```
Either path MUST end with `package-lock.json` actually modified before committing.

- [ ] **Step 3: Confirm it resolves.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && node -e "require.resolve('socket.io-client'); console.log('ok')"
```
Expected: prints `ok`.

- [ ] **Step 4: Commit `package.json` AND `package-lock.json` together.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && git add package.json package-lock.json && git commit -m "chore(frontend-next): add socket.io-client dependency"
```

---

### Task 9: `src/lib/socket.ts` — lazy same-origin singleton

**Files:**
- Create: `frontend-next/src/lib/socket.ts`
- Create: `frontend-next/src/lib/socket.test.ts`

- [ ] **Step 1: Write the failing test.** Create `frontend-next/src/lib/socket.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const connect = vi.fn()
const disconnect = vi.fn()
const fakeSocket = { connect, disconnect, on: vi.fn(), off: vi.fn() }
const ioFactory = vi.fn(() => fakeSocket)

vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => ioFactory(...args) }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('getSocket', () => {
  it('lazily creates one socket and reuses it', async () => {
    const { getSocket } = await import('./socket')
    const a = getSocket()
    const b = getSocket()
    expect(a).toBe(b)
    expect(ioFactory).toHaveBeenCalledTimes(1)
  })

  it('configures same-origin connection with autoConnect off and both transports', async () => {
    const { getSocket } = await import('./socket')
    getSocket()
    const opts = ioFactory.mock.calls[0]?.[1] as Record<string, unknown>
    expect(opts).toMatchObject({
      path: '/socket.io',
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  })
})

describe('connectSocket / disconnectSocket', () => {
  it('connects and disconnects the singleton', async () => {
    const { connectSocket, disconnectSocket } = await import('./socket')
    connectSocket()
    disconnectSocket()
    expect(connect).toHaveBeenCalledTimes(1)
    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run test -- src/lib/socket.test.ts
```
Expected: fails — `./socket` does not exist.

- [ ] **Step 3: Implement.** Create `frontend-next/src/lib/socket.ts`:
```ts
import { io, type Socket } from 'socket.io-client'

// A single same-origin socket shared across the app. An `undefined` URL connects
// to the page origin; the Next rewrite forwards `/socket.io/*` to the backend.
// socket.io negotiates the best available transport: a real WebSocket upgrade if
// the proxy forwards the Upgrade header, otherwise it holds a long-polling
// connection. Both deliver pushes promptly — neither is the app-level polling we
// removed. (See next.config.ts for the upgrade-forwarding caveat behind Docker.)
let socket: Socket | undefined

export function getSocket(): Socket {
  if (!socket) {
    socket = io(undefined, {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function connectSocket(): Socket {
  const s = getSocket()
  s.connect()
  return s
}

export function disconnectSocket(): void {
  socket?.disconnect()
}
```

- [ ] **Step 4: Run it, expect PASS.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run test -- src/lib/socket.test.ts
```
Expected: all cases pass.

- [ ] **Step 5: Typecheck + lint.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && git add src/lib/socket.ts src/lib/socket.test.ts && git commit -m "feat(frontend-next): lazy same-origin socket.io-client singleton"
```

---

### Task 10: `RealtimeProvider` — connect, subscribe, update cache

**Files:**
- Create: `frontend-next/src/components/shared/realtime-provider.tsx`
- Create: `frontend-next/src/components/shared/realtime-provider.test.tsx`

> **Cache & unread.** The provider reads/writes the notifications list at `NOTIFICATIONS_KEY` (4b, `['notifications']`). On each `'notification'` it prepends the pushed `Notification` and dedupes by `id`. **Unread is client-derived** (spec §9): `useNotifications` computes `data.filter((n) => !n.isRead).length`, so inserting a freshly-created `isRead:false` notification increments the bell badge automatically — the provider never touches an unread counter directly. The red test below asserts both the mount/unmount socket lifecycle and the cache mutation (including the derived-unread increment) before any wiring exists, so it genuinely fails first.

- [ ] **Step 1: Write the failing test.** Create `frontend-next/src/components/shared/realtime-provider.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Notification } from '@/types/notification'

// A controllable fake socket: capture the 'notification' handler so the test can fire it.
const handlers: Record<string, (payload: unknown) => void> = {}
const on = vi.fn((event: string, cb: (payload: unknown) => void) => {
  handlers[event] = cb
})
const off = vi.fn()
const connect = vi.fn()
const disconnect = vi.fn()

vi.mock('@/lib/socket', () => ({
  connectSocket: () => {
    connect()
    return { on, off }
  },
  disconnectSocket: () => disconnect(),
  getSocket: () => ({ on, off, connect, disconnect }),
}))

import { RealtimeProvider } from './realtime-provider'
import { NOTIFICATIONS_KEY } from '@/lib/query-keys'

// Concrete builder for a Notification matching the 4b interface shape.
function fakeNotification(over: Partial<Notification> = {}): Notification {
  return {
    id: 'n-id',
    userId: 'u1',
    message: 'msg',
    type: 'REMINDER',
    isRead: false,
    relatedJobId: null,
    createdAt: '2026-06-03T00:00:00.000Z',
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const k of Object.keys(handlers)) delete handlers[k]
})

function setup(seed: Notification[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(NOTIFICATIONS_KEY, seed)
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, Wrapper }
}

function unread(list: Notification[] | undefined): number {
  return (list ?? []).filter((n) => !n.isRead).length
}

describe('RealtimeProvider', () => {
  it('connects the socket on mount and disconnects on unmount', () => {
    const { Wrapper } = setup([fakeNotification({ id: 'n0', isRead: true })])
    const { unmount } = render(
      <Wrapper>
        <RealtimeProvider>
          <span>child</span>
        </RealtimeProvider>
      </Wrapper>,
    )
    expect(connect).toHaveBeenCalledTimes(1)
    unmount()
    expect(disconnect).toHaveBeenCalledTimes(1)
  })

  it('prepends a pushed notification and increments the client-derived unread count', () => {
    const seed = [fakeNotification({ id: 'n0', isRead: true })]
    const { client, Wrapper } = setup(seed)
    render(
      <Wrapper>
        <RealtimeProvider>
          <span>child</span>
        </RealtimeProvider>
      </Wrapper>,
    )
    expect(unread(client.getQueryData<Notification[]>(NOTIFICATIONS_KEY))).toBe(0)
    handlers['notification']?.(fakeNotification({ id: 'n1', isRead: false }))
    const list = client.getQueryData<Notification[]>(NOTIFICATIONS_KEY)
    expect(list?.map((n) => n.id)).toEqual(['n1', 'n0'])
    expect(unread(list)).toBe(1)
  })

  it('dedupes a notification already in the cache', () => {
    const seed = [fakeNotification({ id: 'n0', isRead: false })]
    const { client, Wrapper } = setup(seed)
    render(
      <Wrapper>
        <RealtimeProvider>
          <span>child</span>
        </RealtimeProvider>
      </Wrapper>,
    )
    handlers['notification']?.(fakeNotification({ id: 'n0', isRead: false, message: 'dup' }))
    const list = client.getQueryData<Notification[]>(NOTIFICATIONS_KEY)
    expect(list?.map((n) => n.id)).toEqual(['n0'])
    expect(unread(list)).toBe(1)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run test -- src/components/shared/realtime-provider.test.tsx
```
Expected: fails — `./realtime-provider` does not exist, so `connectSocket`/`disconnectSocket` are never called on mount/unmount and the cache is never mutated.

- [ ] **Step 3: Implement.** Create `frontend-next/src/components/shared/realtime-provider.tsx`:
```tsx
'use client'

import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { NOTIFICATIONS_KEY } from '@/lib/query-keys'
import type { Notification } from '@/types/notification'

/**
 * Opens the real-time channel for authenticated app pages: connects the socket
 * on mount, prepends each pushed `'notification'` into the TanStack Query cache
 * at NOTIFICATIONS_KEY (deduped by id), and disconnects on unmount. Unread is
 * client-derived (spec §9) — `useNotifications` counts `!isRead` over this list,
 * so a pushed `isRead:false` notification increments the bell badge for free.
 * This supersedes focus-refetch as the primary freshness path; focus-refetch in
 * `useNotifications` stays as a fallback for the initial load / missed events.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = connectSocket()

    function onNotification(payload: Notification) {
      queryClient.setQueryData<Notification[]>(NOTIFICATIONS_KEY, (prev) =>
        prev ? [payload, ...prev.filter((n) => n.id !== payload.id)] : [payload],
      )
    }

    socket.on('notification', onNotification)
    return () => {
      socket.off('notification', onNotification)
      disconnectSocket()
    }
  }, [queryClient])

  return <>{children}</>
}
```

- [ ] **Step 4: Run it, expect PASS.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run test -- src/components/shared/realtime-provider.test.tsx
```
Expected: all three cases pass.

- [ ] **Step 5: Typecheck + lint.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && git add src/components/shared/realtime-provider.tsx src/components/shared/realtime-provider.test.tsx && git commit -m "feat(frontend-next): RealtimeProvider pushes socket notifications into the query cache"
```

---

### Task 11: Mount `RealtimeProvider` in the authenticated `app/` layout

**Files:**
- Modify: `frontend-next/src/app/app/layout.tsx`
- Create: `frontend-next/src/app/app/layout.test.tsx`

Mounting in the `app/` route-group layout (not the root `Providers`) keeps the socket from connecting on public `(web)` / `(auth)` pages where the user is unauthenticated. The root layout's `Providers` already supplies the `QueryClientProvider` that `RealtimeProvider` reads. The red test asserts the layout actually mounts `RealtimeProvider` by spying on `connectSocket` (which only runs if the provider is mounted) — before Step 3 wires it in, `connectSocket` is never called, so the test fails for real.

- [ ] **Step 1: Write the failing test.** Create `frontend-next/src/app/app/layout.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const connect = vi.fn()

// Stub the heavy shell + the socket so the layout test stays a unit test.
vi.mock('@/components/layout/app/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}))
vi.mock('@/lib/socket', () => ({
  connectSocket: () => {
    connect()
    return { on: vi.fn(), off: vi.fn() }
  },
  disconnectSocket: vi.fn(),
  getSocket: () => ({ on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }),
}))

import AuthenticatedLayout from './layout'

describe('AuthenticatedLayout', () => {
  it('renders the shell and its children inside the realtime provider', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>
          <span data-testid="page">page</span>
        </AuthenticatedLayout>
      </QueryClientProvider>,
    )
    expect(screen.getByTestId('shell')).toBeInTheDocument()
    expect(screen.getByTestId('page')).toHaveTextContent('page')
    // RealtimeProvider must be mounted by the layout, so the socket connects.
    expect(connect).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run test -- src/app/app/layout.test.tsx
```
Expected: fails — the layout renders `AppShell` directly with no `RealtimeProvider`, so `connect` is never called (`expect(connect).toHaveBeenCalledTimes(1)` fails with 0).

- [ ] **Step 3: Implement.** Edit `frontend-next/src/app/app/layout.tsx` to wrap `AppShell` in `RealtimeProvider`:
```tsx
import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app/app-shell'
import { RealtimeProvider } from '@/components/shared/realtime-provider'
import '@/styles/app/theme.css'

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme-scope="app">
      <RealtimeProvider>
        <AppShell>{children}</AppShell>
      </RealtimeProvider>
    </div>
  )
}
```
> If the current `app/layout.tsx` has additional wrappers (e.g. an auth guard or extra theme markup from earlier slices), keep them and insert `RealtimeProvider` as the wrapper directly around `AppShell`; do not remove existing structure.

- [ ] **Step 4: Run it, expect PASS.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run test -- src/app/app/layout.test.tsx
```
Expected: passes — shell + page render, and `connect` was called once (provider mounted).

- [ ] **Step 5: Typecheck + lint.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && git add src/app/app/layout.tsx src/app/app/layout.test.tsx && git commit -m "feat(frontend-next): mount RealtimeProvider in the authenticated app layout"
```

---

### Task 12: Proxy `/socket.io` to the backend in `next.config.ts`

**Files:**
- Modify: `frontend-next/next.config.ts`

> **WebSocket-upgrade honesty.** This rewrite forwards `/socket.io/*` requests to the backend. socket.io then negotiates the best available transport: a **real WS upgrade** if the proxy forwards the `Upgrade` header, otherwise a **held long-polling** connection. Neither is the 60s app-level polling we removed — both deliver pushes promptly. **Known limitation:** `next start` / standalone output may not forward the raw WS `Upgrade` over a rewrite, in which case socket.io transparently falls back to long-polling. For production, front the app with a proxy (nginx/Traefik) that forwards `Upgrade`/`Connection: upgrade` to the backend's `/socket.io` so the WS transport is used. That production fronting is a **follow-up, not done in this slice** — this slice keeps long-polling enabled as the safety net so realtime works either way.

- [ ] **Step 1: Implement.** Edit the `rewrites()` array in `frontend-next/next.config.ts` to add the socket.io rewrite alongside the existing `/api` one:
```ts
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      // socket.io uses /socket.io/* by default. This rewrite forwards those
      // requests to the backend; socket.io upgrades to WebSocket when the proxy
      // forwards the Upgrade header, otherwise it holds a long-polling
      // connection (still a real-time push, not app-level polling). next
      // start/standalone may not forward the raw WS Upgrade over a rewrite — in
      // production front the app with nginx/Traefik forwarding Upgrade. Follow-up.
      { source: '/socket.io/:path*', destination: `${backendUrl}/socket.io/:path*` },
    ]
  },
```

- [ ] **Step 2: Verify the config typechecks + lints.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run typecheck && npm run lint
```
Expected: both pass.

- [ ] **Step 3: Commit.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && git add next.config.ts && git commit -m "feat(frontend-next): proxy /socket.io to the backend (WS upgrade or long-polling)"
```

---

### Task 13: Relax `useNotifications` freshness now that push exists

**Files:**
- Modify: `frontend-next/src/hooks/use-notifications.ts` (built in 4b)
- Modify: `frontend-next/src/hooks/use-notifications.test.tsx` (built in 4b)

> 4b's `useNotifications` used `staleTime: 0` + `refetchOnWindowFocus: true` so a tab regaining focus re-pulled the list. With the socket push now driving freshness, relax `staleTime` to `30_000` (matching the global `makeQueryClient` default) while keeping `refetchOnWindowFocus: true` as the fallback for the initial load and any events missed while disconnected.

- [ ] **Step 1: Update the test for the calmer staleTime.** In `frontend-next/src/hooks/use-notifications.test.tsx`, add this case (it asserts the options factory the hook spreads into `useQuery`, so the options are unit-testable without firing a focus event):
```tsx
describe('useNotifications freshness', () => {
  it('uses a 30s staleTime and keeps focus refetch as a fallback', () => {
    const opts = notificationsQueryOptions()
    expect(opts.staleTime).toBe(30_000)
    expect(opts.refetchOnWindowFocus).toBe(true)
  })
})
```
Add `notificationsQueryOptions` to the existing import from `@/hooks/use-notifications` at the top of the test file.

- [ ] **Step 2: Run it, expect FAIL.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run test -- src/hooks/use-notifications.test.tsx
```
Expected: fails — `notificationsQueryOptions` is not exported and/or `staleTime` is still `0`.

- [ ] **Step 3: Implement.** In `frontend-next/src/hooks/use-notifications.ts`, extract the query config into an exported `notificationsQueryOptions()` factory and spread it into `useQuery`. Replace the inline `useQuery({...})` config with:
```ts
// The socket push (RealtimeProvider) is the primary freshness path now, so the
// list no longer needs to be perpetually stale. A 30s staleTime matches the app
// default; refetch-on-focus stays on as a fallback for the initial load and any
// notifications that arrived while the socket was disconnected.
export function notificationsQueryOptions() {
  return {
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => apiClient.get<Notification[]>('/api/notifications'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  } as const
}

export function useNotifications() {
  return useQuery(notificationsQueryOptions())
}
```
Keep 4b's `useMarkNotificationRead` / `useMarkAllRead` mutations unchanged — WS carries only server→client pushes; mark-read stays an HTTP PATCH with its optimistic `setQueryData` + invalidate. Ensure `NOTIFICATIONS_KEY`, `apiClient`, `Notification`, and `useQuery` remain imported (they already are from 4b).

- [ ] **Step 4: Run it, expect PASS.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run test -- src/hooks/use-notifications.test.tsx
```
Expected: the freshness case passes and the existing 4b cases stay green.

- [ ] **Step 5: Typecheck + lint.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit.**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && git add src/hooks/use-notifications.ts src/hooks/use-notifications.test.tsx && git commit -m "refactor(frontend-next): calmer useNotifications staleTime now that socket push drives freshness"
```

---

### Task 14: Verification — full gates on both apps + Docker real-time smoke

**Files:** none (verification only).

- [ ] **Step 1: Backend gates (sequential — do not run two vitest in one dir concurrently).**
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run typecheck && npm run lint && npm run test
```
Expected: all pass. (If `socket.io` is missing on the host, run the test step inside the container: `docker compose exec backend-express npm run test`.)

- [ ] **Step 2: Frontend gates (typecheck + lint + test).**
```bash
cd /home/weloin/Projects/job-vault/frontend-next && npm run typecheck && npm run lint && npm run test
```
Expected: all pass.

- [ ] **Step 3: Frontend production build** (verify the rewrite config + provider compile under `next build`; run alone, not alongside another build/vitest):
```bash
cd /home/weloin/Projects/job-vault/frontend-next && docker build --target production ./
```
*(Per CLAUDE.md, prefer the Docker production build over a host `next build` because the running dev container owns a root-owned `.next` in the host mount.)*

- [ ] **Step 4: Rebuild + restart the stack with realtime enabled** (ensures the new deps, the compose `ENABLE_REALTIME`, and the scheduler are live):
```bash
cd /home/weloin/Projects/job-vault && docker compose up -d --build --force-recreate --renew-anon-volumes && docker compose logs --tail=30 backend-express
```
Expected: `socket.io real-time gateway enabled` and `node-cron scheduler started` appear in the logs.

- [ ] **Step 5: Reachability + negotiated-transport probe.** First confirm the `/socket.io` rewrite reaches the backend (a session payload starting with `0{"sid":...` proves the proxy works), then capture which transport the socket actually negotiates from BOTH ends — accepting **either** WS or long-polling as success (push works either way):
```bash
cd /home/weloin/Projects/job-vault && curl -s "http://localhost:8080/socket.io/?EIO=4&transport=polling" | head -c 80; echo
```
Expected: prints a socket.io handshake payload (`0{"sid":"...","upgrades":["websocket"],...}`). The `"upgrades":["websocket"]` field indicates the backend offers a WS upgrade; whether the Next proxy forwards it is reported by the client-side check below.

  Then run a tiny client probe inside the frontend container that connects through the same-origin proxy and reports the negotiated transport (do NOT call only the polling endpoint and declare success — report the actual transport):
```bash
cd /home/weloin/Projects/job-vault && docker compose exec frontend-next node -e "
const { io } = require('socket.io-client');
const jar = process.env.SMOKE_COOKIE || '';
const s = io('http://frontend-next:8080', { path: '/socket.io', transports: ['websocket','polling'], extraHeaders: jar ? { cookie: jar } : {} });
s.on('connect', () => { console.log('SERVER reports transport via logs; CLIENT transport =', s.io.engine.transport.name); s.close(); process.exit(0); });
s.on('connect_error', (e) => { console.log('connect_error (expected if no auth cookie):', e.message); process.exit(0); });
setTimeout(() => { console.log('no connect within 5s'); process.exit(1); }, 5000);
"
```
Expected: the handshake is reachable; with a valid auth cookie the client logs `CLIENT transport = websocket` **or** `CLIENT transport = polling` — **either is success** (push works). Server-side, the `socket connected` log line (Task 3) records `transport` via `socket.conn.transport.name`; cross-check it in `docker compose logs backend-express`. Log which transport negotiated. (Without an auth cookie the handshake middleware correctly rejects with `connect_error: unauthorized`, which still proves the gateway and proxy are wired.)

- [ ] **Step 6: Manual two-tab real-time smoke.**
  1. Open `http://localhost:8080` in two browser tabs and sign in as the same user (`admin@weloin.com`) in both.
  2. In one tab open DevTools → Network → WS and note the negotiated transport: Status `101 Switching Protocols` (WebSocket) **or** repeated `transport=polling` 200s (long-polling fallback). Record which.
  3. Trigger a notification for that user without touching the UI — either insert one directly, or let the reminder/ghost sweep fire. Direct insert via the DB:
```bash
cd /home/weloin/Projects/job-vault && docker compose exec postgres psql -U postgres -d jobvault -c "INSERT INTO notifications (user_id, message, type) SELECT id, 'Realtime smoke test', 'GENERAL' FROM users WHERE email = 'admin@weloin.com';"
```
  > NOTE: a raw `INSERT` exercises only the persistence path. To exercise the **emit seam** (`notificationService.create` → `emitToUser`) end-to-end, prefer letting the reminder sweep fire (create a reminder with `remindAt` in the past and wait for the 5-min cron) so the push originates from the service, not a manual row. The raw insert is a fallback when you cannot wait for the cron.
  4. Confirm the notification bell badge increments in **both** tabs within ~1s, with **no page refresh and no manual refetch** (the Network tab shows the `'notification'` WS frame or polling payload arriving, not a `GET /api/notifications`).
  5. Click the new notification; if it carries a `relatedJobId`, the URL gains `?job=<id>` and the `JobDrawer` opens (4b behavior, still intact).

- [ ] **Step 7: Record progress + commit the doc.** Update `progress.md` to mark Slice 4c complete (socket.io real-time notification delivery shipped; note the long-polling fallback and the production WS-upgrade-proxy follow-up), then commit only that doc change:
```bash
cd /home/weloin/Projects/job-vault && git add progress.md && git commit -m "docs(progress): record Slice 4c socket.io real-time notification delivery"
```
