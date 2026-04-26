# Node / Express Best Practices — JobVault

> Project-specific Node 20+ / Express 5 / Drizzle / PostgreSQL conventions for `backend-express/`.
> All code is TypeScript. Plain JS is forbidden in source.

---

## 1. Layered Architecture

Each feature module has a strict three-layer separation:

```
src/modules/<feature>/
├── <feature>.router.ts       # HTTP — routes + middleware wiring only
├── <feature>.controller.ts   # HTTP — request/response shaping, error mapping
├── <feature>.service.ts      # Business logic — pure, framework-agnostic
├── <feature>.repository.ts   # Data access — Drizzle queries
├── <feature>.schema.ts       # Zod schemas for DTOs + inferred types
├── <feature>.types.ts        # Internal type declarations
└── <feature>.test.ts         # Co-located unit tests
```

**Rules:**
- Router knows about Controller. Nothing else.
- Controller knows about Service + Schema. Never about Drizzle or DB.
- Service knows about Repository + other Services + domain types. Never about Express (`req`, `res`).
- Repository knows about Drizzle and the schema. Returns plain objects, not DB rows leaking pg internals.

If a Controller calls Drizzle directly, the PR is rejected.

---

## 2. Project Structure

```
backend-express/
├── src/
│   ├── index.ts                      # Entry point
│   ├── app.ts                        # Express app factory (testable)
│   ├── config/
│   │   ├── env.ts                    # Zod-validated env vars
│   │   └── constants.ts
│   ├── db/
│   │   ├── client.ts                 # Drizzle client singleton
│   │   ├── schema/                   # Drizzle table definitions
│   │   │   ├── users.ts
│   │   │   ├── jobs.ts
│   │   │   └── index.ts              # re-exports
│   │   └── migrations/               # Drizzle Kit output
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logger.middleware.ts
│   │   ├── validate.middleware.ts
│   │   └── transform.middleware.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── job/
│   │   ├── dashboard/
│   │   ├── timeline/
│   │   ├── reminder/
│   │   ├── notification/
│   │   ├── storage/
│   │   ├── ai/
│   │   └── extension/
│   ├── shared/
│   │   ├── errors.ts                 # AppError class
│   │   ├── logger.ts                 # Pino instance
│   │   ├── async-handler.ts          # Wrapper for async route handlers
│   │   └── types.ts
│   └── jobs/                         # Cron jobs (node-cron)
│       └── scheduler.ts
├── test/
│   └── e2e/
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. App Factory Pattern

`app.ts` returns a configured Express app. `index.ts` boots the server.
This makes the app testable without binding a port.

```ts
// src/app.ts
export function createApp() {
  const app = express()
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }))
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(requestLogger)
  app.use('/api', apiRouter)
  app.use(notFoundHandler)
  app.use(errorHandler)        // MUST be last
  return app
}

// src/index.ts
const app = createApp()
const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'started'))
gracefulShutdown(server)
```

---

## 4. Middleware Order (memorize this)

The order matters. Wrong order = silent bugs.

```
1. helmet()                    — security headers FIRST
2. cors()                      — before any route processing
3. cookieParser()              — before middleware that reads req.cookies
4. express.json({ limit })     — body parsing
5. requestLogger               — log every request (with request ID)
6. /api router                 — your routes
   ├─ rate limiter (per route or global)
   ├─ authMiddleware (per protected route)
   ├─ validate(schema) (per route)
   ├─ controller
7. notFoundHandler             — 404 for unmatched routes
8. errorHandler                — MUST BE LAST. Catches all thrown errors.
```

---

## 5. Async Error Handling

Express 5 supports async handlers natively, but be explicit and consistent. Use a tiny wrapper to forward errors to the error middleware.

```ts
// src/shared/async-handler.ts
import type { RequestHandler } from 'express'

export const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
```

Usage:
```ts
router.post('/', asyncHandler(async (req, res) => {
  const dto = CreateJobDtoSchema.parse(req.body)
  const job = await jobService.create(req.user.id, dto)
  res.status(201).json({ data: job })
}))
```

**Never `try/catch` just to `res.status(500).json(...)` in handlers.** Throw and let the error middleware do its job.

---

## 6. Centralized Error Handling

```ts
// src/middleware/error.middleware.ts
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.id

  if (err instanceof AppError) {
    logger.warn({ err, requestId }, 'app error')
    return res.status(httpStatus[err.code]).json({
      statusCode: httpStatus[err.code],
      message: err.message,
      error: err.code,
    })
  }

  if (err instanceof ZodError) {
    logger.warn({ err, requestId }, 'validation error')
    return res.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: err.flatten(),
    })
  }

  logger.error({ err, requestId }, 'unhandled error')
  res.status(500).json({
    statusCode: 500,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    error: 'INTERNAL_ERROR',
  })
}
```

**The error format matches the existing Nest backend** — frontend code is unaffected.

---

## 7. Validation Middleware

```ts
// src/middleware/validate.middleware.ts
export const validate = <T extends z.ZodTypeAny>(schema: T, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) return next(result.error)
    req[source] = result.data       // attach parsed/coerced data
    next()
  }
```

Usage:
```ts
router.post('/', validate(CreateJobDtoSchema), asyncHandler(jobController.create))
```

---

## 8. Response Envelope

Wrap success responses in `{ data, meta? }` via a small middleware (or do it in controllers — pick one and stick with it).

**Project convention: controllers return raw data; a `transformResponse` helper wraps it.**

```ts
// In controller
res.status(200).json({ data: jobs, meta: { page, total } })
```

This matches the existing Nest `TransformInterceptor` so the frontend contract is unchanged.

---

## 9. Auth Middleware (JWT Cookies)

```ts
export const authMiddleware: RequestHandler = (req, _res, next) => {
  const token = req.cookies['accessToken']
  if (!token) throw new AppError('UNAUTHORIZED', 'No token')

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.user = { id: payload.sub as UserId, email: payload.email }
    next()
  } catch (err) {
    throw new AppError('UNAUTHORIZED', 'Invalid token', err)
  }
}
```

Augment `Request` with the user via module declaration:

```ts
// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: UserId; email: string }
      id: string  // request ID
    }
  }
}
```

---

## 10. Cookie Settings (Security)

```ts
res.cookie('accessToken', accessToken, {
  httpOnly: true,                                      // not readable by JS
  secure: env.NODE_ENV === 'production',               // HTTPS only in prod
  sameSite: env.NODE_ENV === 'production' ? 'lax' : 'lax',
  maxAge: 15 * 60 * 1000,                              // 15 min
  path: '/',
})
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,                     // 7 days
  path: '/api/auth',                                   // ONLY sent to /api/auth/*
})
```

**`refreshToken` path scoping** prevents the token from being sent on every API request — only refresh endpoints see it.

---

## 11. Refresh Token Rotation

Each refresh issues a new refresh token AND invalidates the old one (stored hashed in DB). If an old refresh token is reused, treat it as theft and force logout on all sessions.

```ts
// Pseudocode
async refresh(oldRefreshToken: string) {
  const user = await userRepository.findByRefreshTokenHash(hash(oldRefreshToken))
  if (!user) throw new AppError('UNAUTHORIZED', 'Refresh token reuse detected')
  await userRepository.clearRefreshToken(user.id)

  const newAccess = signAccess(user)
  const newRefresh = signRefresh(user)
  await userRepository.setRefreshTokenHash(user.id, hash(newRefresh))
  return { accessToken: newAccess, refreshToken: newRefresh }
}
```

---

## 12. Security Middleware Stack

Required, in this order:

```ts
app.use(helmet())                               // ~12 security headers
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }))
app.use(rateLimit({ windowMs: 15*60_000, max: 1000 }))   // global; lower per-route for auth
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))         // prevents giant payloads
```

**Per-route stricter limits** for sensitive endpoints:

```ts
const authLimiter = rateLimit({ windowMs: 15*60_000, max: 20 })
authRouter.post('/login', authLimiter, validate(LoginDtoSchema), asyncHandler(authController.login))
```

---

## 13. Logging (Pino)

Structured JSON logs with request IDs. Every log line ties back to a request.

```ts
// src/shared/logger.ts
import pino from 'pino'
export const logger = pino({
  level: env.LOG_LEVEL ?? 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash'],
})

// src/middleware/logger.middleware.ts
import pinoHttp from 'pino-http'
export const requestLogger = pinoHttp({
  logger,
  genReqId: () => crypto.randomUUID(),
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
})
```

**Never `console.log` in committed code.** Always use `logger`.
**Always redact secrets** — passwords, tokens, API keys.

---

## 14. Database Layer (Drizzle)

### Client singleton

```ts
// src/db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import { env } from '@/config/env'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
})
export const db = drizzle(pool, { schema })
export type Db = typeof db
```

### Repository pattern

```ts
// src/modules/job/job.repository.ts
import { eq, and } from 'drizzle-orm'
import { db } from '@/db/client'
import { jobs } from '@/db/schema'

export const jobRepository = {
  async findByUser(userId: UserId): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.userId, userId))
  },

  async create(userId: UserId, data: NewJob): Promise<Job> {
    const [created] = await db.insert(jobs).values({ ...data, userId }).returning()
    if (!created) throw new AppError('INTERNAL_ERROR', 'Insert returned no row')
    return created
  },
}
```

### Transactions

Use a transaction whenever > 1 write must succeed together.

```ts
async moveJob(userId: UserId, jobId: JobId, newStatus: JobStatus) {
  return db.transaction(async (tx) => {
    const [job] = await tx.update(jobs)
      .set({ status: newStatus })
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
      .returning()
    if (!job) throw new AppError('NOT_FOUND', 'Job not found')

    await tx.insert(timelineEvents).values({
      jobId, userId, type: 'STATUS_CHANGED', payload: { to: newStatus },
    })
    return job
  })
}
```

### User scoping (CRITICAL)

**Every query that touches user-owned data MUST filter by `userId`.** No exceptions.

```ts
// ❌ NEVER
db.select().from(jobs).where(eq(jobs.id, jobId))

// ✅ ALWAYS
db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
```

Add a lint rule or code-review checklist item to enforce this.

---

## 15. Migrations

- Migrations live in `src/db/migrations/`, generated by `drizzle-kit generate`
- Migrations are committed to git
- Never edit a migration after it's been merged — write a new one
- Run `drizzle-kit migrate` on app startup in dev; in prod, run as a separate step before deploy

```ts
// scripts/migrate.ts
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db } from '@/db/client'

await migrate(db, { migrationsFolder: './src/db/migrations' })
```

---

## 16. Environment Variables

Validate at startup. Fail loudly if any required var is missing or malformed.

```ts
// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().transform(s => s.split(',')),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().url(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace']).default('info'),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment:', result.error.flatten())
  process.exit(1)
}
export const env = result.data
```

`.env` is gitignored. `.env.example` is committed with placeholder values.

---

## 17. Graceful Shutdown

Listen for `SIGTERM`/`SIGINT`, finish in-flight requests, close DB connections.

```ts
function gracefulShutdown(server: http.Server) {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down')
    server.close(async () => {
      await pool.end()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()  // force-exit after 10s
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
```

---

## 18. Testing

| Layer | Tool | What to test |
|---|---|---|
| Unit (services) | Vitest | Business logic with mocked repository |
| Unit (repositories) | Vitest + test DB | Drizzle queries against a real test DB |
| Integration | Vitest + Supertest | Full HTTP round-trip with real DB |
| E2E | Playwright | Cross-app flows (frontend talking to backend) |

**Use a real Postgres for integration tests** (testcontainers or a `docker-compose.test.yml`). Never mock the DB. Mocked SQL passes; real SQL breaks — keep that gap small.

```ts
// Example integration test
import request from 'supertest'
import { createApp } from '@/app'

const app = createApp()
test('POST /api/auth/login → 200', async () => {
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'a@b.c', password: 'pw' })
    .expect(200)
    .expect('set-cookie', /accessToken=/)
})
```

---

## 19. Cron Jobs

Use `node-cron` in a dedicated `src/jobs/` folder. Each job is a pure function called by the scheduler.

```ts
// src/jobs/scheduler.ts
import cron from 'node-cron'
import { updateGhostDays } from './ghost-days'
import { processPendingReminders } from './reminders'

export function startSchedulers() {
  cron.schedule('0 2 * * *', () => safeRun(updateGhostDays))   // daily 2am
  cron.schedule('*/10 * * * *', () => safeRun(processPendingReminders))  // every 10min
}

async function safeRun(fn: () => Promise<void>) {
  try { await fn() } catch (err) { logger.error({ err }, 'cron failed') }
}
```

**Cron jobs MUST catch their own errors.** An unhandled rejection in a cron will crash the process.

---

## 20. Reviewer Checklist (per PR)

- [ ] Three-layer separation respected (no Drizzle in controllers, no Express types in services)
- [ ] All async route handlers use `asyncHandler`
- [ ] All inputs validated via Zod middleware
- [ ] All user-data queries filter by `userId`
- [ ] No `console.log` (uses `logger`)
- [ ] No raw `try/catch` for the purpose of converting to HTTP — throw `AppError`
- [ ] Refresh token endpoint is the only place reading the `refreshToken` cookie
- [ ] New env vars are added to `env.ts` schema AND `.env.example`
- [ ] Drizzle migrations generated, committed, and applied cleanly
- [ ] Tests cover the happy path + at least one error case per endpoint
