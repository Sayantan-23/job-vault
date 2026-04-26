# Next.js (App Router) Best Practices — JobVault

> Project-specific Next.js 15 + React 19 conventions for `frontend-next/`.
> Uses App Router exclusively. Pages Router is forbidden.

---

## 1. Server Components by Default

Every component is a Server Component unless it explicitly needs to be a Client Component.

**Use a Server Component when** (default):
- Fetching data from the backend
- Rendering static or read-only UI
- Accessing server-only resources (cookies, headers, env vars)
- The component has no interactivity, state, or browser APIs

**Use a Client Component (`'use client'`) when**:
- You need `useState`, `useEffect`, `useReducer`, etc.
- You need event handlers (`onClick`, `onChange`, etc.)
- You use browser-only APIs (`window`, `document`, `localStorage`)
- You use a library that requires client-side React (TanStack Query, dnd-kit, GSAP)
- You need React Context

**Push `'use client'` as far down the tree as possible.** A page can be a Server Component that renders a small Client Component island for the interactive parts.

```tsx
// ❌ Bad — entire page is client-side
'use client'
export default function JobsPage() {
  const { data } = useQuery(...)
  return <div>{/* everything */}</div>
}

// ✅ Good — Server Component fetches + renders shell;
//          Client Component handles only interactive parts
export default async function JobsPage() {
  const initialJobs = await fetchJobsServer()
  return (
    <div>
      <h1>Jobs</h1>
      <JobsBoardClient initial={initialJobs} />  {/* 'use client' inside */}
    </div>
  )
}
```

---

## 2. Folder Structure

```
frontend-next/
├── src/
│   ├── app/                          # Routes (App Router)
│   │   ├── layout.tsx                # Root layout (server)
│   │   ├── page.tsx                  # / (landing — placeholder)
│   │   ├── (web)/                    # Route group: public pages (no auth)
│   │   │   ├── layout.tsx
│   │   │   ├── about/page.tsx
│   │   │   └── ...
│   │   ├── (auth)/                   # Route group: login/register
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── app/                      # Authenticated app
│   │   │   ├── layout.tsx            # Auth-required layout
│   │   │   ├── dashboard/
│   │   │   ├── jobs/
│   │   │   └── ...
│   │   └── api/                      # (Empty — backend is Express)
│   ├── components/
│   │   ├── ui/                       # shadcn/ui generated components
│   │   ├── kanban/                   # Feature-scoped client components
│   │   ├── job/
│   │   └── shared/                   # Cross-feature
│   ├── hooks/                        # React hooks (replace Vue composables)
│   ├── lib/
│   │   ├── api.ts                    # fetch wrapper
│   │   ├── auth-server.ts            # Server-side auth helpers
│   │   ├── query-client.ts           # TanStack Query setup
│   │   └── utils.ts                  # cn() + misc
│   ├── types/                        # Shared types (mirror backend Zod schemas)
│   ├── schemas/                      # Zod schemas used by forms
│   └── middleware.ts                 # Next.js middleware (auth)
├── public/
└── next.config.ts
```

**Route groups** `(name)` don't appear in the URL but share a layout — perfect for grouping `(auth)` pages with their own layout.

---

## 3. Data Fetching Strategy

| Where | What to use |
|---|---|
| Server Components | Native `fetch()` with caching options, or call a server-side helper that uses Drizzle/our backend |
| Client Components | TanStack Query (React Query v5) |
| Mutations | TanStack Query `useMutation` with cookie-based auth |
| Forms | React Hook Form + Zod resolver, submit via `useMutation` |
| Real-time updates | TanStack Query refetch intervals (notifications poll every 60s) |

**Never** call `fetch()` directly from Client Components — go through TanStack Query so caching, retries, and dedup work correctly.

### Server-side fetching pattern

```tsx
// app/app/dashboard/page.tsx — Server Component
import { cookies } from 'next/headers'
import { apiServer } from '@/lib/api-server'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const initialBoard = await apiServer.get('/dashboard/kanban', { cookieStore })
  return <DashboardClient initialBoard={initialBoard} />
}
```

### Client-side hydration pattern

```tsx
'use client'
import { useQuery } from '@tanstack/react-query'

export function DashboardClient({ initialBoard }: Props) {
  const { data } = useQuery({
    queryKey: ['kanban'],
    queryFn: () => apiClient.get('/dashboard/kanban'),
    initialData: initialBoard,         // hydrate from SSR
    staleTime: 30_000,
  })
  return <KanbanBoard board={data} />
}
```

---

## 4. Caching

Next.js App Router has four cache layers. Be explicit about which you want.

| Cache | Default | When to use |
|---|---|---|
| Request memoization | On (per request) | Always — automatic |
| Data Cache (`fetch` cache) | Off in dev, opt-in in prod | Public, infrequently-changing data |
| Full Route Cache | On for static routes | Public pages with no per-user data |
| Router Cache | On (client) | Always — automatic |

**For authenticated, per-user data (most of JobVault), opt out:**

```tsx
const res = await fetch(url, {
  cache: 'no-store',                       // every request, fresh
  // OR
  next: { revalidate: 60 },                // ISR — cache 60s
  // OR
  next: { tags: ['jobs'] },                // tag-based revalidation
})
```

**Default for our backend calls: `cache: 'no-store'`** — these are user-specific and shouldn't be cached at the framework layer (TanStack Query handles client caching).

---

## 5. Layouts and Loading States

Every route segment can define:

| File | Purpose |
|---|---|
| `layout.tsx` | Wrapping UI shared by all child routes |
| `loading.tsx` | Suspense fallback shown while route is loading |
| `error.tsx` | Error boundary (must be `'use client'`) |
| `not-found.tsx` | Custom 404 |
| `template.tsx` | Like layout but re-mounts on navigation (rarely needed) |

**Use `loading.tsx` instead of manual `<Spinner />` — it integrates with React Suspense and streaming.**

```tsx
// app/app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />
}
```

---

## 6. Metadata API for SEO

Every page exports `metadata` (static) or `generateMetadata` (dynamic).

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — JobVault',
  description: 'Track your job applications.',
}
```

Set defaults in `app/layout.tsx` with `metadataBase` and `title.template`.

---

## 7. Middleware (Auth)

`src/middleware.ts` runs at the edge for every request matching the matcher.

**JobVault auth middleware responsibilities:**
1. Read `accessToken` cookie
2. If missing → for `/app/*` routes, redirect to `/login`
3. If present but expired → call `POST /api/auth/refresh`; on success, set new cookies and proceed; on failure, clear cookies and redirect
4. Pass through public routes (`/`, `/(web)/*`, `/(auth)/*`)

```ts
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const isAppRoute = req.nextUrl.pathname.startsWith('/app')
  if (!isAppRoute) return NextResponse.next()

  const accessToken = req.cookies.get('accessToken')?.value
  if (accessToken && !isExpired(accessToken)) return NextResponse.next()

  const refreshToken = req.cookies.get('refreshToken')?.value
  if (refreshToken) {
    const refreshed = await tryRefresh(refreshToken)
    if (refreshed) {
      const res = NextResponse.next()
      setAuthCookies(res, refreshed)
      return res
    }
  }

  return NextResponse.redirect(new URL('/login', req.url))
}

export const config = {
  matcher: ['/app/:path*'],
}
```

**Don't put business logic in middleware.** Keep it to redirects and header/cookie manipulation. Middleware runs on every request — must be fast.

---

## 8. Environment Variables

| Prefix | Available | Use |
|---|---|---|
| `NEXT_PUBLIC_*` | Browser + server | Anything safe to expose (API base URL) |
| (no prefix) | Server only | Secrets, internal endpoints |

```ts
// src/config/env.ts — validate at build time
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url(),
  // server-only
  INTERNAL_API_KEY: z.string().min(1).optional(),
})
export const env = envSchema.parse(process.env)
```

**Never inline `process.env.X` in components** — go through the validated `env` object.

---

## 9. Error Boundaries

Every route segment that can fail needs an `error.tsx`. It MUST be a Client Component.

```tsx
'use client'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)  // forward to your error tracker
  }, [error])

  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

**Place a `global-error.tsx`** at the root for catastrophic errors that escape route boundaries.

---

## 10. Image Optimization

Always use `next/image`, never `<img>`. Provide `width`, `height`, and `alt`.

```tsx
import Image from 'next/image'

<Image src="/logo.svg" alt="JobVault" width={120} height={32} priority />
```

Mark above-the-fold images with `priority`. Remote hosts must be allowlisted in `next.config.ts`:

```ts
images: { remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }] }
```

---

## 11. Server Actions (Sparingly)

Server Actions are great for form submissions, but **for JobVault we mostly use the Express backend instead**. Use Server Actions only when:
- The action lives entirely server-side (no need for an Express endpoint)
- You're forwarding form data to the Express backend with pre-processing

Don't duplicate Express endpoints as Server Actions — pick one path per operation.

---

## 12. Forms — React Hook Form + Zod + shadcn/ui

shadcn/ui ships a `<Form>` wrapper that integrates RHF + Zod. Use it.

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginDtoSchema, type LoginDto } from '@/schemas/auth'

export function LoginForm() {
  const form = useForm<LoginDto>({
    resolver: zodResolver(LoginDtoSchema),
    defaultValues: { email: '', password: '' },
  })
  const onSubmit = (values: LoginDto) => loginMutation.mutate(values)
  return <Form {...form}>...</Form>
}
```

**Use the same Zod schema on the backend.** If the backend rejects, the error message format from Zod matches what the form expects.

---

## 13. shadcn/ui Conventions

- Components live in `src/components/ui/` after `npx shadcn@latest add <component>`
- Edit them freely — you own the code
- Use the `cn()` helper for conditional classes
- Theme tokens go in `globals.css` as CSS variables (`--background`, `--primary`, etc.)
- Glassmorphism: extend Tailwind config with `backdrop-blur` utilities; reuse the existing palette

---

## 14. Routing Conventions

| URL | File |
|---|---|
| `/` | `app/page.tsx` (landing — empty placeholder) |
| `/about` | `app/(web)/about/page.tsx` |
| `/login` | `app/(auth)/login/page.tsx` |
| `/app/dashboard` | `app/app/dashboard/page.tsx` |
| `/app/jobs/[id]` | `app/app/jobs/[id]/page.tsx` |

**Dynamic segments** are typed as `params: Promise<{ id: string }>` in Next 15:

```tsx
export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  ...
}
```

---

## 15. State Management

**No global state library** (no Redux, no Zustand) unless we hit a real need.

| State type | Solution |
|---|---|
| Server state | TanStack Query |
| URL state (filters, search) | `useSearchParams` + `router.push` |
| Form state | React Hook Form |
| Local UI state (modal open, dropdown) | `useState` |
| Cross-component UI state (toast queue) | React Context with a small Provider |

If you reach for Zustand, justify it in the PR description.

---

## 16. Performance

- **No client-side JavaScript for static content** — Server Components by default
- **Use `loading.tsx`** to stream — don't block on data
- **Use `React.lazy` + `Suspense`** for heavy client-only components (TipTap editor, large charts)
- **Bundle analysis**: `next build` output + `@next/bundle-analyzer` quarterly
- **No barrel files (`index.ts` re-exports)** — they break tree-shaking

---

## 17. Reviewer Checklist (per PR)

- [ ] No `'use client'` at the top of files that don't actually need it
- [ ] All `fetch()` calls in Server Components have an explicit `cache` option
- [ ] Forms use RHF + Zod resolver (not manual state)
- [ ] Mutations go through TanStack Query, not raw fetch
- [ ] All routes have `loading.tsx` and `error.tsx` (where appropriate)
- [ ] All pages export `metadata`
- [ ] No `any` (see typescript.md)
- [ ] No `<img>` tags (use `next/image`)
- [ ] No barrel files
