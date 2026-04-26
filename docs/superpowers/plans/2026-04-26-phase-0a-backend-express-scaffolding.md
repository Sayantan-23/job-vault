# Phase 0a — Backend Express Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the new `backend-express/` app — Node 20+ / Express 5 / Drizzle / PostgreSQL — with strict TypeScript, env validation, error handling, request logging, and a working `/api/health` endpoint, all booting under Docker Compose alongside Postgres.

**Architecture:** Layered structure (router → controller → service → repository) with no DI container; functions and object literals only. App created via a factory function for testability. Drizzle wired but with empty schema (modules add tables in later phases). All inputs validated by Zod. All errors funneled through a single error middleware that returns the project's standard `{ statusCode, message, error }` envelope.

**Tech Stack:** Node 20+, TypeScript 5.6 (strict + NodeNext ESM), Express 5, Drizzle ORM, `pg` driver, PostgreSQL 16 (existing), Pino logger, Zod, Vitest, Supertest, `tsx` for dev.

**Reference:** `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md` (sections 6, 8) and `docs/best-practices/express.md`. The legacy `backend/` (NestJS) directory remains untouched.

---

## File Structure (created by this plan)

```
backend-express/
├── .dockerignore                    # Task 13
├── .env.example                     # Task 4
├── .eslintrc.cjs                    # Task 2
├── .gitignore                       # Task 2
├── .prettierrc                      # Task 2
├── Dockerfile                       # Task 13
├── drizzle.config.ts                # Task 9
├── package.json                     # Task 1
├── README.md                        # Task 1
├── tsconfig.json                    # Task 2
├── vitest.config.ts                 # Task 2
└── src/
    ├── app.ts                       # Task 10  — Express app factory
    ├── index.ts                     # Task 12  — Boot + graceful shutdown
    ├── config/
    │   └── env.ts                   # Task 4   — Zod-validated env
    ├── db/
    │   ├── client.ts                # Task 9   — Drizzle client singleton
    │   └── schema/
    │       └── index.ts             # Task 9   — Empty re-export (filled in later phases)
    ├── middleware/
    │   ├── error.middleware.ts      # Task 7   — Centralized error handler
    │   └── logger.middleware.ts     # Task 8   — pino-http request logger
    ├── modules/
    │   └── health/
    │       ├── health.router.ts     # Task 11  — GET /api/health route
    │       └── health.test.ts       # Task 11  — Supertest integration test
    ├── shared/
    │   ├── errors.ts                # Task 6   — AppError class
    │   ├── errors.test.ts           # Task 6
    │   ├── async-handler.ts         # Task 6   — asyncHandler wrapper
    │   ├── async-handler.test.ts    # Task 6
    │   ├── logger.ts                # Task 5   — Pino instance
    │   └── api-router.ts            # Task 11  — Mounts feature routers under /api

(root)
└── docker-compose.yml               # Task 14  — postgres + backend-express service
```

Folder skeleton is created in **Task 3**; subsequent tasks fill it in.

---

## Task 1: Initialize project with package.json

**Files:**
- Create: `backend-express/package.json`
- Create: `backend-express/README.md`

- [ ] **Step 1: Create the project directory and enter it**

```bash
mkdir -p /home/weloin/Projects/job-vault/backend-express
cd /home/weloin/Projects/job-vault/backend-express
```

- [ ] **Step 2: Create `package.json`**

Write `backend-express/package.json` with this exact content:

```json
{
  "name": "jobvault-backend-express",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "JobVault backend API — Express + Drizzle + PostgreSQL",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint \"src/**/*.ts\"",
    "format": "prettier --write \"src/**/*.{ts,json}\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "drizzle-orm": "^0.36.4",
    "express": "^5.0.1",
    "express-rate-limit": "^7.4.1",
    "helmet": "^8.0.0",
    "pg": "^8.13.1",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.0",
    "@types/pg": "^8.11.10",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^8.16.0",
    "@typescript-eslint/parser": "^8.16.0",
    "drizzle-kit": "^0.30.0",
    "eslint": "^9.16.0",
    "pino-pretty": "^13.0.0",
    "prettier": "^3.4.1",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npm install
```

Expected: prints "added N packages" with no errors. A `node_modules/` and `package-lock.json` appear.

- [ ] **Step 4: Create a minimal `README.md`**

Write `backend-express/README.md`:

```markdown
# JobVault Backend (Express)

Node 20+ / Express 5 / Drizzle / PostgreSQL backend for JobVault.

## Scripts

- `npm run dev` — start with watch mode (tsx)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled output
- `npm test` — run Vitest tests
- `npm run typecheck` — type-check without emitting
- `npm run lint` — lint source
- `npm run db:generate` — generate Drizzle migrations from schema
- `npm run db:migrate` — apply pending migrations

## Conventions

See:
- `docs/best-practices/express.md`
- `docs/best-practices/typescript.md`
- `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md`
```

- [ ] **Step 5: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/package.json backend-express/package-lock.json backend-express/README.md && \
git commit -m "chore(backend-express): initialize package.json and install dependencies"
```

---

## Task 2: TypeScript, ESLint, Prettier, Vitest, gitignore

**Files:**
- Create: `backend-express/tsconfig.json`
- Create: `backend-express/.eslintrc.cjs`
- Create: `backend-express/.prettierrc`
- Create: `backend-express/.gitignore`
- Create: `backend-express/vitest.config.ts`
- Modify: `backend-express/package.json` (add `@vitest/coverage-v8` devDep + `test:coverage` script + downgrade `@types/node` from `^22` to `^20` so it matches `engines.node >= 20`)

- [ ] **Step 0: Patch `package.json` to align with the configs added in this task**

This addresses Task 1's code-quality follow-ups (missing coverage provider; type stubs ahead of runtime engine pin).

Edit `backend-express/package.json`:
- In `scripts`, add a new entry **before** `"test:watch"`:
  ```json
  "test:coverage": "vitest run --coverage",
  ```
- In `devDependencies`, change `"@types/node": "^22.10.0"` to `"@types/node": "^20.17.0"`.
- In `devDependencies`, add `"@vitest/coverage-v8": "^2.1.8"` (must match `vitest`).

Then re-install to update the lockfile:

```bash
cd /home/weloin/Projects/job-vault/.worktrees/phase-0a-backend-scaffolding/backend-express && npm install
```

Expected: lockfile updated; `@vitest/coverage-v8` resolves; `@types/node` downgrades cleanly.

- [ ] **Step 1: Create `tsconfig.json`**

Write `backend-express/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "incremental": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Create `.gitignore`**

Write `backend-express/.gitignore`:

```
node_modules
dist
.env
.env.local
*.log
.DS_Store
coverage
.vitest-cache
```

- [ ] **Step 3: Create `.prettierrc`**

Write `backend-express/.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 4: Create `.eslintrc.cjs`**

Write `backend-express/.eslintrc.cjs` (CJS because ESLint loads it before our ESM resolver):

```js
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': 'error',
    'no-default-export': 'off',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

Write `backend-express/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

- [ ] **Step 6: Verify configs are valid**

```bash
cd /home/weloin/Projects/job-vault/backend-express && \
  npx tsc --noEmit && echo "tsc OK"
```

Expected: `tsc OK` (no error — there are no source files yet, so tsc has nothing to complain about).

- [ ] **Step 7: Commit**

```bash
cd /home/weloin/Projects/job-vault/.worktrees/phase-0a-backend-scaffolding && \
git add backend-express/tsconfig.json backend-express/.gitignore backend-express/.prettierrc backend-express/.eslintrc.cjs backend-express/vitest.config.ts backend-express/package.json backend-express/package-lock.json && \
git commit -m "chore(backend-express): add TypeScript, ESLint, Prettier, Vitest configs and align deps"
```

---

## Task 3: Folder skeleton

**Files:**
- Create: `backend-express/src/` directory tree (empty)

- [ ] **Step 1: Create the folder structure**

```bash
cd /home/weloin/Projects/job-vault/backend-express && \
mkdir -p src/config src/db/schema src/middleware src/modules/health src/shared
```

- [ ] **Step 2: Add `.gitkeep` to empty subfolders so git tracks them**

```bash
cd /home/weloin/Projects/job-vault/backend-express && \
touch src/config/.gitkeep src/db/schema/.gitkeep src/middleware/.gitkeep src/modules/health/.gitkeep src/shared/.gitkeep
```

- [ ] **Step 3: Verify the tree**

```bash
cd /home/weloin/Projects/job-vault/backend-express && \
find src -type f -o -type d | sort
```

Expected:
```
src
src/config
src/config/.gitkeep
src/db
src/db/schema
src/db/schema/.gitkeep
src/middleware
src/middleware/.gitkeep
src/modules
src/modules/health
src/modules/health/.gitkeep
src/shared
src/shared/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/src && \
git commit -m "chore(backend-express): scaffold src folder structure"
```

---

## Task 4: Env validation with Zod

**Files:**
- Create: `backend-express/src/config/env.ts`
- Create: `backend-express/src/config/env.test.ts`
- Create: `backend-express/.env.example`
- Delete: `backend-express/src/config/.gitkeep`

- [ ] **Step 1: Write the failing test**

Write `backend-express/src/config/env.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseEnv } from './env.js'

describe('parseEnv', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    CORS_ORIGINS: 'http://localhost:8080',
    DATABASE_URL: 'postgres://user:pw@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(32),
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    LOG_LEVEL: 'info',
  }

  it('parses a valid environment', () => {
    const env = parseEnv(validEnv)
    expect(env.PORT).toBe(3000)
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:8080'])
    expect(env.NODE_ENV).toBe('development')
  })

  it('splits CORS_ORIGINS by comma', () => {
    const env = parseEnv({ ...validEnv, CORS_ORIGINS: 'http://a.com,http://b.com' })
    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com'])
  })

  it('throws when DATABASE_URL is missing', () => {
    const broken: Record<string, string> = { ...validEnv }
    delete broken.DATABASE_URL
    expect(() => parseEnv(broken)).toThrowError(/DATABASE_URL/)
  })

  it('throws when JWT_SECRET is shorter than 32 chars', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrowError(/JWT_SECRET/)
  })

  it('throws when PORT is not a positive integer', () => {
    expect(() => parseEnv({ ...validEnv, PORT: 'abc' })).toThrowError(/PORT/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/config/env.test.ts
```

Expected: FAIL — `Cannot find module './env.js'`

- [ ] **Step 3: Implement `env.ts`**

Delete the placeholder and write the file:

```bash
rm /home/weloin/Projects/job-vault/backend-express/src/config/.gitkeep
```

Write `backend-express/src/config/env.ts`. Note that `getEnv()` is **lazy** — it does not call `parseEnv(process.env)` at module-load time. This is critical so tests can import `parseEnv` and test it with explicit objects without the test process needing every env var set:

```ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment:\n${issues}`)
  }
  return result.data
}

let _env: Env | undefined
/** Lazily reads and validates `process.env` on first call; caches the result. */
export function getEnv(): Env {
  if (!_env) _env = parseEnv(process.env)
  return _env
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/config/env.test.ts
```

Expected: PASS — 5 tests pass.

(The test imports `parseEnv` only and supplies its own object, so module load does not touch `process.env`. `getEnv()` is exercised in Step 5.)

- [ ] **Step 5: Add a test for `getEnv()` lazy behavior**

Update the imports at the top of `backend-express/src/config/env.test.ts` to also import `vi`:

```ts
import { describe, it, expect, vi } from 'vitest'
```

Then append this block at the bottom of the file (do **not** add a top-level `import` for `getEnv` — use a dynamic import after `vi.resetModules()` so the module's cache state is reset per-test):

```ts
describe('getEnv', () => {
  it('throws when the real process.env is invalid', async () => {
    const original = { ...process.env }
    delete process.env.DATABASE_URL
    delete process.env.JWT_SECRET
    delete process.env.CORS_ORIGINS
    try {
      vi.resetModules()
      const fresh = await import('./env.js')
      expect(() => fresh.getEnv()).toThrow(/Invalid environment/)
    } finally {
      Object.assign(process.env, original)
    }
  })
})
```

Run:
```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/config/env.test.ts
```

Expected: PASS — 6 tests pass.

- [ ] **Step 6: Create `.env.example`**

Write `backend-express/.env.example`:

```bash
# App
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:8080

# Database (compose into a single URL — used by Drizzle and pg)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobvault

# JWT (at least 32 chars; generate with: openssl rand -hex 32)
JWT_SECRET=replace-me-with-32-plus-character-random-string-please
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth (optional in Phase 0; required in Phase 1)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Cloudinary (optional until Phase 6)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Gemini (optional until Phase 6)
GEMINI_API_KEY=

# Logging
LOG_LEVEL=info
```

- [ ] **Step 7: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/src/config/env.ts backend-express/src/config/env.test.ts backend-express/.env.example && \
git rm backend-express/src/config/.gitkeep 2>/dev/null || true && \
git commit -m "feat(backend-express): add Zod-validated environment with lazy getter"
```

---

## Task 5: Pino logger

**Files:**
- Create: `backend-express/src/shared/logger.ts`

- [ ] **Step 1: Implement the logger**

Write `backend-express/src/shared/logger.ts`:

```ts
import pino from 'pino'
import { getEnv } from '@/config/env.js'

function createLogger() {
  const env = getEnv()
  return pino({
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
        '*.refreshToken',
        '*.accessToken',
      ],
      censor: '[REDACTED]',
    },
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
        : undefined,
  })
}

export const logger = createLogger()
export type Logger = typeof logger
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx tsc --noEmit
```

Expected: no errors. (Logger isn't usable without env vars set yet — that's fine; it's only constructed when imported.)

- [ ] **Step 3: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/src/shared/logger.ts && \
git commit -m "feat(backend-express): add Pino logger with secret redaction"
```

---

## Task 6: AppError class and asyncHandler utility

**Files:**
- Create: `backend-express/src/shared/errors.ts`
- Create: `backend-express/src/shared/errors.test.ts`
- Create: `backend-express/src/shared/async-handler.ts`
- Create: `backend-express/src/shared/async-handler.test.ts`
- Delete: `backend-express/src/shared/.gitkeep`

- [ ] **Step 1: Write failing test for `AppError`**

Write `backend-express/src/shared/errors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { AppError, httpStatusForCode, type AppErrorCode } from './errors.js'

describe('AppError', () => {
  it('captures code and message', () => {
    const err = new AppError('NOT_FOUND', 'job missing')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('job missing')
    expect(err.name).toBe('AppError')
    expect(err).toBeInstanceOf(Error)
  })

  it('preserves the cause', () => {
    const cause = new Error('underlying')
    const err = new AppError('INTERNAL_ERROR', 'wrap', cause)
    expect(err.cause).toBe(cause)
  })
})

describe('httpStatusForCode', () => {
  const cases: Array<[AppErrorCode, number]> = [
    ['NOT_FOUND', 404],
    ['UNAUTHORIZED', 401],
    ['FORBIDDEN', 403],
    ['VALIDATION_ERROR', 400],
    ['CONFLICT', 409],
    ['RATE_LIMITED', 429],
    ['INTERNAL_ERROR', 500],
  ]
  it.each(cases)('maps %s -> %i', (code, status) => {
    expect(httpStatusForCode(code)).toBe(status)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/shared/errors.test.ts
```

Expected: FAIL — `Cannot find module './errors.js'`

- [ ] **Step 3: Implement `errors.ts`**

```bash
rm /home/weloin/Projects/job-vault/backend-express/src/shared/.gitkeep
```

Write `backend-express/src/shared/errors.ts`:

```ts
export type AppErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
}

export function httpStatusForCode(code: AppErrorCode): number {
  return STATUS_BY_CODE[code]
}

export class AppError extends Error {
  public readonly code: AppErrorCode
  public override readonly cause?: unknown

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    if (cause !== undefined) this.cause = cause
  }
}
```

- [ ] **Step 4: Run the errors test to verify it passes**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/shared/errors.test.ts
```

Expected: PASS — 9 tests pass (2 + 7 from `it.each`).

- [ ] **Step 5: Write failing test for `asyncHandler`**

Write `backend-express/src/shared/async-handler.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { asyncHandler } from './async-handler.js'

function makeReqRes(): { req: Request; res: Response; next: NextFunction } {
  const req = {} as Request
  const res = {} as Response
  const next = vi.fn() as unknown as NextFunction
  return { req, res, next }
}

describe('asyncHandler', () => {
  it('invokes next(err) when the handler rejects', async () => {
    const { req, res, next } = makeReqRes()
    const failing = asyncHandler(async () => {
      throw new Error('boom')
    })
    await failing(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    const arg = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    expect(arg).toBeInstanceOf(Error)
    expect((arg as Error).message).toBe('boom')
  })

  it('does not call next when the handler resolves', async () => {
    const { req, res, next } = makeReqRes()
    const ok = asyncHandler(async () => {
      // no-op
    })
    await ok(req, res, next)
    expect(next).not.toHaveBeenCalled()
  })

  it('also works for synchronous throws', async () => {
    const { req, res, next } = makeReqRes()
    const sync = asyncHandler(() => {
      throw new Error('sync-boom')
    })
    await sync(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/shared/async-handler.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement `async-handler.ts`**

Write `backend-express/src/shared/async-handler.ts`:

```ts
import type { Request, Response, NextFunction, RequestHandler } from 'express'

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => unknown

export const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next)
  }
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/shared/async-handler.test.ts
```

Expected: PASS — 3 tests pass.

- [ ] **Step 9: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/src/shared/errors.ts backend-express/src/shared/errors.test.ts backend-express/src/shared/async-handler.ts backend-express/src/shared/async-handler.test.ts && \
git rm backend-express/src/shared/.gitkeep 2>/dev/null || true && \
git commit -m "feat(backend-express): add AppError class and asyncHandler utility"
```

---

## Task 7: Centralized error middleware

**Files:**
- Create: `backend-express/src/middleware/error.middleware.ts`
- Create: `backend-express/src/middleware/error.middleware.test.ts`
- Delete: `backend-express/src/middleware/.gitkeep`

- [ ] **Step 1: Write the failing test**

Write `backend-express/src/middleware/error.middleware.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { z } from 'zod'
import { AppError } from '@/shared/errors.js'

let app: express.Express

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  process.env.PORT = '3000'
  process.env.CORS_ORIGINS = 'http://localhost:8080'
  process.env.DATABASE_URL = 'postgres://x:x@x:5432/x'
  process.env.JWT_SECRET = 'a'.repeat(32)
  process.env.LOG_LEVEL = 'silent'
  const { errorHandler, notFoundHandler } = await import('./error.middleware.js')

  app = express()
  app.get('/app-error', () => {
    throw new AppError('NOT_FOUND', 'job missing')
  })
  app.get('/zod-error', () => {
    z.object({ a: z.string() }).parse({})
  })
  app.get('/raw-error', () => {
    throw new Error('boom')
  })
  app.use(notFoundHandler)
  app.use(errorHandler)
})

describe('errorHandler', () => {
  it('formats AppError with the correct status and envelope', async () => {
    const res = await request(app).get('/app-error')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      statusCode: 404,
      message: 'job missing',
      error: 'NOT_FOUND',
    })
  })

  it('formats ZodError as 400 VALIDATION_ERROR with details', async () => {
    const res = await request(app).get('/zod-error')
    expect(res.status).toBe(400)
    expect(res.body.statusCode).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
    expect(res.body.details).toBeDefined()
  })

  it('formats unknown errors as 500 INTERNAL_ERROR', async () => {
    const res = await request(app).get('/raw-error')
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('INTERNAL_ERROR')
  })
})

describe('notFoundHandler', () => {
  it('returns 404 NOT_FOUND for unmatched routes', async () => {
    const res = await request(app).get('/this-route-does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      statusCode: 404,
      message: 'Route not found',
      error: 'NOT_FOUND',
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/middleware/error.middleware.test.ts
```

Expected: FAIL — module `./error.middleware.js` not found.

- [ ] **Step 3: Implement the middleware**

```bash
rm /home/weloin/Projects/job-vault/backend-express/src/middleware/.gitkeep
```

Write `backend-express/src/middleware/error.middleware.ts`:

```ts
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError, httpStatusForCode } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'
import { getEnv } from '@/config/env.js'

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: 'Route not found',
    error: 'NOT_FOUND',
  })
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const status = httpStatusForCode(err.code)
    if (status >= 500) logger.error({ err }, 'app error (5xx)')
    else logger.warn({ err }, 'app error')
    res.status(status).json({
      statusCode: status,
      message: err.message,
      error: err.code,
    })
    return
  }

  if (err instanceof ZodError) {
    logger.warn({ err: err.issues }, 'validation error')
    res.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: err.flatten(),
    })
    return
  }

  logger.error({ err }, 'unhandled error')
  const env = getEnv()
  res.status(500).json({
    statusCode: 500,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : (err as Error).message,
    error: 'INTERNAL_ERROR',
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/middleware/error.middleware.test.ts
```

Expected: PASS — 4 tests pass.

> Note: Express 5 forwards thrown errors from synchronous handlers automatically. Async handlers still need `asyncHandler` (added in Task 6). The test uses synchronous throws to keep the middleware test focused on error formatting.

- [ ] **Step 5: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/src/middleware/error.middleware.ts backend-express/src/middleware/error.middleware.test.ts && \
git rm backend-express/src/middleware/.gitkeep 2>/dev/null || true && \
git commit -m "feat(backend-express): add error and notFound middleware with standard envelope"
```

---

## Task 8: Request logger middleware (pino-http)

**Files:**
- Create: `backend-express/src/middleware/logger.middleware.ts`

- [ ] **Step 1: Implement**

Write `backend-express/src/middleware/logger.middleware.ts`:

```ts
import pinoHttp from 'pino-http'
import { randomUUID } from 'node:crypto'
import { logger } from '@/shared/logger.js'

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id']
    const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID()
    res.setHeader('x-request-id', id)
    return id
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
})
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/src/middleware/logger.middleware.ts && \
git commit -m "feat(backend-express): add pino-http request logger with request IDs"
```

---

## Task 9: Drizzle setup (client + empty schema + config)

**Files:**
- Create: `backend-express/src/db/client.ts`
- Create: `backend-express/src/db/schema/index.ts`
- Create: `backend-express/drizzle.config.ts`
- Delete: `backend-express/src/db/schema/.gitkeep`

- [ ] **Step 1: Implement the empty schema barrel**

```bash
rm /home/weloin/Projects/job-vault/backend-express/src/db/schema/.gitkeep
```

Write `backend-express/src/db/schema/index.ts`:

```ts
// Tables are added in later phases (Phase 1: users, Phase 2: jobs, etc.)
// Drizzle requires this file even when empty so its `schema` import resolves.
export {}
```

- [ ] **Step 2: Implement the Drizzle client singleton**

Write `backend-express/src/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { getEnv } from '@/config/env.js'
import * as schema from './schema/index.js'

const { Pool } = pg

let _pool: pg.Pool | undefined
let _db: ReturnType<typeof drizzle> | undefined

function getPool(): pg.Pool {
  if (_pool) return _pool
  const env = getEnv()
  _pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
  })
  return _pool
}

export function getDb() {
  if (_db) return _db
  _db = drizzle(getPool(), { schema })
  return _db
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end()
    _pool = undefined
    _db = undefined
  }
}

export type Db = ReturnType<typeof getDb>
```

- [ ] **Step 3: Implement the Drizzle Kit config**

Write `backend-express/drizzle.config.ts`:

```ts
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL must be set for drizzle-kit')

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
```

- [ ] **Step 4: Install `dotenv` (used only by drizzle-kit at the command line)**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npm install --save-dev dotenv
```

Expected: dotenv added to devDependencies.

- [ ] **Step 5: Verify everything still compiles**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/src/db/client.ts backend-express/src/db/schema/index.ts backend-express/drizzle.config.ts backend-express/package.json backend-express/package-lock.json && \
git rm backend-express/src/db/schema/.gitkeep 2>/dev/null || true && \
git commit -m "feat(backend-express): wire Drizzle client and Drizzle Kit config"
```

---

## Task 10: Express app factory (`app.ts`)

**Files:**
- Create: `backend-express/src/app.ts`

- [ ] **Step 1: Implement the factory**

Write `backend-express/src/app.ts`:

```ts
import express, { type Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { getEnv } from '@/config/env.js'
import { requestLogger } from '@/middleware/logger.middleware.js'
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware.js'
import { apiRouter } from '@/shared/api-router.js'

export function createApp(): Express {
  const env = getEnv()
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  )
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(requestLogger)

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60_000,
      max: 1_000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  )

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
```

- [ ] **Step 2: This file references `apiRouter` which doesn't exist yet — Task 11 creates it. Skip compile-check until Task 11.**

(No commit yet — see Task 11 for the combined commit.)

---

## Task 11: Health endpoint and `/api` router mount

**Files:**
- Create: `backend-express/src/shared/api-router.ts`
- Create: `backend-express/src/modules/health/health.router.ts`
- Create: `backend-express/src/modules/health/health.test.ts`
- Delete: `backend-express/src/modules/health/.gitkeep`

- [ ] **Step 1: Write the failing test**

Write `backend-express/src/modules/health/health.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

let app: Express

beforeAll(async () => {
  process.env.NODE_ENV = 'test'
  process.env.PORT = '3000'
  process.env.CORS_ORIGINS = 'http://localhost:8080'
  process.env.DATABASE_URL = 'postgres://x:x@x:5432/x'
  process.env.JWT_SECRET = 'a'.repeat(32)
  process.env.LOG_LEVEL = 'silent'
  const mod = await import('@/app.js')
  app = mod.createApp()
})

describe('GET /api/health', () => {
  it('returns 200 with status ok and a timestamp', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
    expect(typeof res.body.data.timestamp).toBe('string')
    expect(new Date(res.body.data.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('sends a request ID header', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-request-id']).toBeDefined()
  })
})

describe('CORS preflight', () => {
  it('responds to OPTIONS with the configured origin and credentials', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:8080')
      .set('Access-Control-Request-Method', 'GET')
    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8080')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/modules/health/health.test.ts
```

Expected: FAIL — module `@/shared/api-router.js` not found (because Task 10's `app.ts` imports it).

- [ ] **Step 3: Implement the health router**

```bash
rm /home/weloin/Projects/job-vault/backend-express/src/modules/health/.gitkeep
```

Write `backend-express/src/modules/health/health.router.ts`:

```ts
import { Router, type Request, type Response } from 'express'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  })
})

export { router as healthRouter }
```

- [ ] **Step 4: Implement the api router**

Write `backend-express/src/shared/api-router.ts`:

```ts
import { Router } from 'express'
import { healthRouter } from '@/modules/health/health.router.js'

const router = Router()

router.use('/health', healthRouter)

export { router as apiRouter }
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npx vitest run src/modules/health/health.test.ts
```

Expected: PASS — 3 tests pass.

- [ ] **Step 6: Run the full test suite to confirm nothing regressed**

```bash
cd /home/weloin/Projects/job-vault/backend-express && npm test
```

Expected: PASS — all tests in all files pass.

- [ ] **Step 7: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/src/app.ts backend-express/src/shared/api-router.ts backend-express/src/modules/health/health.router.ts backend-express/src/modules/health/health.test.ts && \
git rm backend-express/src/modules/health/.gitkeep 2>/dev/null || true && \
git commit -m "feat(backend-express): add Express app factory and /api/health endpoint"
```

---

## Task 12: Entry point (`index.ts`) with graceful shutdown

**Files:**
- Create: `backend-express/src/index.ts`

- [ ] **Step 1: Implement**

Write `backend-express/src/index.ts`:

```ts
import 'dotenv/config'
import { createApp } from './app.js'
import { getEnv } from './config/env.js'
import { logger } from './shared/logger.js'
import { closeDb } from './db/client.js'

const env = getEnv()
const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'backend-express started')
})

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  const forceExit = setTimeout(() => {
    logger.error('forced exit after 10s')
    process.exit(1)
  }, 10_000)
  forceExit.unref()

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

- [ ] **Step 2: Install `dotenv` for runtime use too**

It was already added in Task 9 step 4 (devDependency). Move it to dependencies:

```bash
cd /home/weloin/Projects/job-vault/backend-express && \
  npm uninstall dotenv && npm install dotenv
```

Expected: `dotenv` now in `dependencies` (not `devDependencies`).

- [ ] **Step 3: Smoke test locally (without Docker yet)**

Create a `.env` file (gitignored) so the server can boot. We need a real Postgres to be reachable — temporarily start the legacy backend's compose file:

```bash
cd /home/weloin/Projects/job-vault/backend && docker compose up -d postgres
```

Wait until `docker compose ps` shows `(healthy)` for postgres.

Then create the env file:

```bash
cd /home/weloin/Projects/job-vault/backend-express && \
cat > .env <<'EOF'
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobvault
JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
LOG_LEVEL=info
EOF
```

Boot:
```bash
cd /home/weloin/Projects/job-vault/backend-express && npm run dev
```

Expected: `backend-express started` log line, no errors. Server listening on 3000.

In a second terminal:
```bash
curl -s http://localhost:3000/api/health | head -c 200
```

Expected (similar):
```json
{"data":{"status":"ok","timestamp":"2026-04-26T..."}}
```

Stop the dev server (Ctrl-C). Stop the legacy postgres:
```bash
cd /home/weloin/Projects/job-vault/backend && docker compose down
```

- [ ] **Step 4: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/src/index.ts backend-express/package.json backend-express/package-lock.json && \
git commit -m "feat(backend-express): add entry point with graceful shutdown"
```

---

## Task 13: Dockerfile and `.dockerignore`

**Files:**
- Create: `backend-express/Dockerfile`
- Create: `backend-express/.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

Write `backend-express/.dockerignore`:

```
node_modules
dist
.env
.env.local
*.log
.git
.vitest-cache
coverage
```

- [ ] **Step 2: Create the Dockerfile**

Write `backend-express/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7

# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ---------- Deps (full) ----------
FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Development ----------
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------- Build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- Production ----------
FROM base AS production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 3: Verify the Dockerfile builds the production stage**

```bash
cd /home/weloin/Projects/job-vault/backend-express && \
docker build --target production -t jobvault-backend-express:test .
```

Expected: build completes successfully. (May take 2-3 minutes the first time.)

- [ ] **Step 4: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add backend-express/Dockerfile backend-express/.dockerignore && \
git commit -m "chore(backend-express): add multi-stage Dockerfile"
```

---

## Task 14: Root `docker-compose.yml`

**Files:**
- Create: `docker-compose.yml` (at repo root)

- [ ] **Step 1: Write `docker-compose.yml`**

Write `/home/weloin/Projects/job-vault/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-jobvault}
    ports:
      - "${DB_PORT_EXTERNAL:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - jobvault-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend-express:
    build:
      context: ./backend-express
      dockerfile: Dockerfile
      target: development
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    volumes:
      - ./backend-express:/app
      - /app/node_modules
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
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - jobvault-network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  jobvault-network:
    driver: bridge
```

- [ ] **Step 2: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add docker-compose.yml && \
git commit -m "chore: add root docker-compose with postgres + backend-express"
```

---

## Task 15: End-to-end smoke test under Docker Compose

**Files:** none — verification only.

- [ ] **Step 1: Bring the stack up**

```bash
cd /home/weloin/Projects/job-vault && \
docker compose up -d --build
```

Expected: Both services start. `docker compose ps` shows `postgres` healthy and `backend-express` running.

- [ ] **Step 2: Watch logs briefly to confirm startup**

```bash
cd /home/weloin/Projects/job-vault && \
docker compose logs --tail=50 backend-express
```

Expected: a `backend-express started` log line and no errors.

- [ ] **Step 3: Hit the health endpoint**

```bash
curl -i http://localhost:3000/api/health
```

Expected:
- HTTP/1.1 200 OK
- Headers include `x-request-id: <uuid>`
- Body: `{"data":{"status":"ok","timestamp":"..."}}`

- [ ] **Step 4: Hit a non-existent route to verify the 404 envelope**

```bash
curl -i http://localhost:3000/api/does-not-exist
```

Expected:
- HTTP/1.1 404 Not Found
- Body: `{"statusCode":404,"message":"Route not found","error":"NOT_FOUND"}`

- [ ] **Step 5: Verify the request-ID round-trip**

```bash
curl -s -H 'x-request-id: my-trace-123' -i http://localhost:3000/api/health | grep -i x-request-id
```

Expected: `x-request-id: my-trace-123` (request ID is honored when supplied).

- [ ] **Step 6: Bring the stack down**

```bash
cd /home/weloin/Projects/job-vault && \
docker compose down
```

Expected: containers stopped and removed; volume retained.

- [ ] **Step 7: No commit — Task 15 is verification only.**

---

## Task 16: Update `progress.md` and final repo-level commit

**Files:**
- Modify: `progress.md`

- [ ] **Step 1: Mark Phase 0a as done in `progress.md`**

Add a new section at the top of `progress.md` (just under the "Last Updated" line). Open the file, locate the line `> **Last Updated**: 2026-02-22`, and immediately after the existing `> **Design Style**:` line add:

```markdown

---

## Migration Phase 0a — Backend Express Scaffolding (NEW)

> **Plan**: `docs/superpowers/plans/2026-04-26-phase-0a-backend-express-scaffolding.md`
> **Spec**: `docs/superpowers/specs/2026-04-26-nest-to-express-nuxt-to-next-migration-design.md`

- [x] backend-express scaffolded (Express 5 + Drizzle + Pino + Zod + TS strict)
- [x] /api/health responds 200 under Docker Compose
- [x] Root docker-compose.yml runs postgres + backend-express
```

- [ ] **Step 2: Commit**

```bash
cd /home/weloin/Projects/job-vault && \
git add progress.md && \
git commit -m "docs: mark Phase 0a (backend-express scaffolding) complete in progress.md"
```

---

## Verification Checklist (run before claiming done)

- [ ] `cd backend-express && npm test` — all tests pass
- [ ] `cd backend-express && npm run typecheck` — no errors
- [ ] `cd backend-express && npm run lint` — no errors
- [ ] `cd backend-express && npm run build` — `dist/` is produced
- [ ] `docker compose up -d --build` from repo root brings up postgres + backend-express
- [ ] `curl http://localhost:3000/api/health` returns the expected envelope
- [ ] No secrets in git (no `.env`, no real JWT secret in `docker-compose.yml`)
- [ ] All commits are atomic (one feature/concept per commit)
- [ ] `progress.md` reflects Phase 0a as done
- [ ] No legacy code (`backend/`, `frontend/`, `plans/`, `docs/`) was modified

---

## Notes for the Reviewer

- The plan deliberately avoids creating any feature modules other than `health` — those are added phase-by-phase (Auth in Phase 1, Job in Phase 2, etc.) so each phase produces a reviewable, demoable PR.
- Drizzle's `schema/index.ts` is intentionally empty; the first table (`users`) lands in Phase 1.
- `getEnv()` is lazy so tests can assert validation behavior without polluting the module-load cache.
- Standards enforced by this plan match `docs/best-practices/express.md` and `docs/best-practices/typescript.md`.
- No business modules are added here, so the layered architecture rules (router/controller/service/repository) get demonstrated in Phase 1 (Auth), where the reviewer first sees the full pattern in use.
