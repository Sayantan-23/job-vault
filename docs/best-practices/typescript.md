# TypeScript Best Practices — JobVault

> Project-specific TypeScript conventions for `backend-express/` and `frontend-next/`.
> All code in both apps is TypeScript. JavaScript files are not allowed in source.

---

## 1. tsconfig.json — Required Compiler Options

Both apps must enable these flags. They're non-negotiable for review.

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",                  // backend uses NodeNext; frontend uses ESNext
    "moduleResolution": "bundler",       // frontend; backend uses "NodeNext"
    "lib": ["ES2022", "DOM"],            // frontend; backend omits "DOM"
    "strict": true,                      // enables all strict-* flags below
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,    // arr[0] is T | undefined — forces null-checks
    "noImplicitOverride": true,          // requires `override` keyword
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,  // { x?: number } cannot be assigned undefined explicitly
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "incremental": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }      // standard alias for both apps
  },
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

`noUncheckedIndexedAccess` is the most impactful flag — it catches the entire class of bugs where you assume an array element exists.

---

## 2. The Banned List

The reviewer will reject any of these:

| Anti-pattern | Use instead |
|---|---|
| `any` | `unknown` + narrowing, or a real type |
| `as SomeType` (type assertion) | Type guards, validation (Zod), or `satisfies` |
| `!` (non-null assertion) | Explicit null check, or restructure so it's truly impossible |
| `// @ts-ignore` / `// @ts-expect-error` without comment | Fix the underlying type. If unavoidable, use `@ts-expect-error` with a one-line justification |
| `Function` type | Specific signature: `(arg: T) => U` |
| `Object` / `{}` | `Record<string, unknown>` or a specific shape |
| `enum` | Use union of string literals: `type Status = 'todo' \| 'doing' \| 'done'` |
| Default exports (except where required by framework) | Named exports — better refactorability and IDE support |

Acceptable exceptions:
- `as const` (literal narrowing) — encouraged
- `satisfies` — encouraged for inferring the most specific type
- Default export in `app/page.tsx`, `app/layout.tsx` (Next.js requirement)
- `as Type` immediately following Zod parse where the discriminant is provably correct

---

## 3. Type vs Interface

- **`interface`**: declaration-merging cases, public API shapes, anything a consumer might extend
- **`type`**: unions, intersections, mapped types, conditional types, function types, tuples, anything with computed members

Default to `interface` for object shapes. Use `type` when you need union/computed power.

```ts
// Good
interface User { id: string; email: string }
type UserRole = 'admin' | 'user' | 'guest'
type UserWithRole = User & { role: UserRole }
```

---

## 4. Inference > Annotation

Annotate what TypeScript can't infer. Don't annotate what it can.

```ts
// Bad — annotation adds noise, no safety
const count: number = 0
const name: string = user.name

// Good — inferred
const count = 0
const name = user.name

// Required — function parameters and return types of public functions
export function getUser(id: string): Promise<User> { ... }

// Required — empty array/object initializers
const ids: string[] = []
const map: Record<string, User> = {}
```

**Always annotate public function signatures** (parameters AND return type). For internal helpers, return-type inference is fine.

---

## 5. Discriminated Unions for State

Whenever a value has multiple "shapes," model it as a discriminated union.

```ts
// Bad — easy to forget a check
interface FetchResult<T> {
  loading: boolean
  data?: T
  error?: Error
}

// Good — exhaustive, impossible to misuse
type FetchResult<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

function render(r: FetchResult<User>) {
  switch (r.status) {
    case 'idle':    return null
    case 'loading': return <Spinner />
    case 'success': return <UserCard user={r.data} />     // narrowed
    case 'error':   return <Error msg={r.error.message} /> // narrowed
  }
}
```

---

## 6. Zod Schemas as the Single Source of Truth

Define the schema once. Derive both the runtime validator and the TypeScript type from it.

```ts
import { z } from 'zod'

export const CreateJobDtoSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(120),
  sourceUrl: z.string().url().optional(),
})

export type CreateJobDto = z.infer<typeof CreateJobDtoSchema>
```

Backend: `validateBody(CreateJobDtoSchema)` middleware.
Frontend: `zodResolver(CreateJobDtoSchema)` in React Hook Form.
Same schema = identical validation rules. No drift possible.

---

## 7. Error Handling Types

Use Result-like patterns at boundaries. Throw for genuine exceptions; return for expected failures.

```ts
// Domain error type with discriminator
export class AppError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'UNAUTHORIZED'
      | 'VALIDATION_ERROR'
      | 'CONFLICT',
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Type-safe error mapping
const httpStatus: Record<AppError['code'], number> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
}
```

---

## 8. Branded Types for IDs

UUIDs are all `string` to TypeScript — easy to mix up. Brand them.

```ts
type Brand<T, B> = T & { readonly __brand: B }
export type UserId = Brand<string, 'UserId'>
export type JobId = Brand<string, 'JobId'>

// Constructor at the boundary (DB query, request handler)
export const asUserId = (s: string): UserId => s as UserId
```

Prevents `getUser(jobId)` from compiling.

---

## 9. Module Organization

Within each app:

```
src/
├── modules/<feature>/        # Feature-scoped code
│   ├── *.controller.ts       # HTTP layer (backend)
│   ├── *.service.ts          # Business logic
│   ├── *.repository.ts       # Data access (backend)
│   ├── *.schema.ts           # Zod schemas + inferred types
│   ├── *.types.ts            # Pure type declarations
│   └── *.test.ts             # Co-located tests
├── shared/                   # Cross-feature utilities
│   ├── errors.ts
│   ├── logger.ts
│   └── types.ts
└── config/                   # Env validation, constants
```

**Rules:**
- Files import only from same module or `shared/`
- No reaching into another module's internals — only its exported public API
- One concept per file. If a file is > 300 lines, it's probably doing two things

---

## 10. Imports

- Use named imports always (except framework-required defaults)
- Use the `@/*` path alias for cross-module imports; relative for same-module
- Group imports: (1) node/runtime, (2) external packages, (3) internal `@/*`, (4) relative
- One blank line between groups

```ts
import { readFileSync } from 'node:fs'

import express from 'express'
import { z } from 'zod'

import { logger } from '@/shared/logger'
import { authMiddleware } from '@/modules/auth/auth.middleware'

import { jobService } from './job.service'
import type { CreateJobDto } from './job.schema'
```

---

## 11. `unknown` over `any` for Inputs

Anything from a network boundary is `unknown` until validated.

```ts
// Bad
function handle(req: { body: any }) { return req.body.email.toLowerCase() }

// Good
function handle(req: { body: unknown }) {
  const dto = LoginDtoSchema.parse(req.body)  // throws if invalid; returns LoginDto
  return dto.email.toLowerCase()
}
```

---

## 12. Async Patterns

- Use `async/await`. Avoid raw `.then()` chains except for fire-and-forget logging
- Always `await` promises (or explicitly `void` them with a comment)
- Wrap parallel calls in `Promise.all` — never serialize independent awaits

```ts
// Bad — serial
const user = await getUser(id)
const jobs = await getJobs(id)

// Good — parallel
const [user, jobs] = await Promise.all([getUser(id), getJobs(id)])
```

Use `Promise.allSettled` when partial failure is acceptable.

---

## 13. Avoiding `null | undefined` Drift

Pick one. Project convention: **`undefined` for "not present"**, **`null` only when an external system uses it** (Postgres rows, JSON APIs).

```ts
// Good
interface User { name: string; bio?: string }       // bio is undefined when absent
interface Row  { name: string; bio: string | null } // matches Postgres NULL
```

Convert at the boundary (repository layer): `bio: row.bio ?? undefined`.

---

## 14. Type Guards and Narrowing

Prefer type predicates over assertions.

```ts
// Bad
const isString = (x: unknown) => typeof x === 'string'
function f(x: unknown) {
  if (isString(x)) (x as string).toUpperCase()  // assertion needed
}

// Good
function isString(x: unknown): x is string {
  return typeof x === 'string'
}
function f(x: unknown) {
  if (isString(x)) x.toUpperCase()  // narrowed — no assertion
}
```

---

## 15. `satisfies` for Constrained Inference

`satisfies` checks shape without widening the inferred type.

```ts
// Bad — `as` lies. Now `colors.red` is type `string`, not `'#ff0000'`
const colors = { red: '#ff0000', blue: '#0000ff' } as Record<string, string>

// Good — checked AND inferred narrowly
const colors = { red: '#ff0000', blue: '#0000ff' } satisfies Record<string, string>
//        ^? { red: '#ff0000'; blue: '#0000ff' }
```

---

## 16. JSDoc for Public APIs Only

Don't document what the type already says. Document *why* and *gotchas*.

```ts
// Bad
/** Get a user by ID */
export function getUser(id: string): Promise<User> { ... }

// Good
/**
 * Looks up a user by ID. Throws AppError('NOT_FOUND') if missing.
 * Caller is responsible for ensuring the requesting user has access.
 */
export function getUser(id: UserId): Promise<User> { ... }
```

---

## 17. Test Type Safety

Tests run under the same strict config. Don't loosen it for tests. If a mock requires a partial type, use `Partial<T>` or a builder pattern, not `as`.

```ts
// Bad
const fakeUser = { id: '1' } as User

// Good
function buildUser(overrides: Partial<User> = {}): User {
  return { id: '1', email: 'a@b.c', name: 'A', ...overrides }
}
```

---

## 18. Reviewer Checklist (per PR)

- [ ] Zero `any` (verified by `tsc --noEmit` + ESLint `no-explicit-any`)
- [ ] Zero `!` non-null assertions (ESLint `no-non-null-assertion`)
- [ ] Zero `as Type` outside of Zod boundaries (ESLint `consistent-type-assertions`)
- [ ] Public function signatures fully annotated (params + return)
- [ ] No default exports (except framework files)
- [ ] Branded types for entity IDs
- [ ] Discriminated unions for any "multi-shape" value
- [ ] Inputs from network/disk parsed via Zod before use
