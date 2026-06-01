# Slice 0 — Foundation (Design System + App Shell + Backend Schema) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the minimalist-ui design system (tokens, fonts, signature components), a real app shell, web placeholder pages, and the Drizzle `users` schema — so feature slices build on a locked foundation.

**Architecture:** Frontend design tokens live as scoped CSS variables (`[data-theme-scope="app"]`) bridged into Tailwind v4 utilities via `globals.css`. Signature presentational components (`GhostMeter`, `StatusChip`) are pure and unit-tested. Backend adds the `users` Drizzle table + first migration only; auth logic lands in Slice 1.

**Tech Stack:** Next.js 15, React 19, Tailwind v4 (CSS-first), shadcn/ui, `next/font` (Geist + Geist Mono), Vitest + React Testing Library; Express 5, Drizzle ORM, drizzle-kit, PostgreSQL.

**Design decisions (from spec `2026-06-01-app-redesign-express-next-minimalist-design.md`):**
- Base: warm-stone neutral, light + dark. Accent: muted indigo (`--primary`), flat.
- Status palette (reserved, never used as brand accent): ghost-active=emerald, ghost-stale=amber, ghost-ghosted=rose.
- Signature: **mono numerics** (Geist Mono) for counts/days/dates.
- Ghost thresholds (mirrors old app): `days <= 7` active · `days <= 14` stale · `days > 14` ghosted.
- 6 job statuses: `WISHLIST, APPLIED, INTERVIEWING, OFFER, REJECTED, ARCHIVED`.

---

## File Structure

**Frontend (`frontend-next/`):**
- Modify: `src/app/layout.tsx` — wire Geist + Geist Mono fonts
- Modify: `src/styles/globals.css` — bridge font + ghost-status tokens to Tailwind
- Modify: `src/styles/app/theme.css` — warm-stone + indigo + dark-mode tokens + status tokens
- Create: `src/lib/ghost.ts` — ghost threshold logic + types (shared, testable)
- Create: `src/lib/ghost.test.ts`
- Create: `src/components/kanban/ghost-meter.tsx` + `.test.tsx`
- Create: `src/lib/job-status.ts` — status enum + display metadata
- Create: `src/components/kanban/status-chip.tsx` + `.test.tsx`
- Modify: `src/components/layout/app/app-shell.tsx` — real minimalist header + sidebar
- Create: `src/components/layout/app/app-shell.test.tsx`
- Create: `src/components/shared/coming-soon.tsx` — web placeholder block
- Modify: `src/app/(web)/about/page.tsx` (and the 4 sibling web pages) — use ComingSoon

**Backend (`backend-express/`):**
- Modify: `src/db/schema/index.ts` — re-export users table
- Create: `src/db/schema/users.ts` — `users` Drizzle table
- Create: `src/db/schema/users.test.ts` — column-shape assertions
- Generated: `src/db/migrations/*` — via `drizzle-kit generate`

---

## Part A — Frontend Design System

### Task 1: Wire Geist + Geist Mono fonts

**Files:**
- Modify: `frontend-next/src/app/layout.tsx`

- [ ] **Step 1: Add the fonts to the root layout**

Replace the contents of `src/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/shared/providers'
import '@/styles/globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: { default: 'JobVault', template: '%s — JobVault' },
  description: 'Ghost-proof job application tracker.',
  metadataBase: new URL('http://localhost:8080'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd frontend-next && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd frontend-next
git add src/app/layout.tsx
git commit -m "feat(frontend-next): wire Geist + Geist Mono fonts in root layout"
```

---

### Task 2: App theme tokens (warm-stone + indigo + dark mode + status)

**Files:**
- Modify: `frontend-next/src/styles/app/theme.css`
- Modify: `frontend-next/src/styles/globals.css`

- [ ] **Step 1: Replace app theme tokens**

Replace the entire contents of `src/styles/app/theme.css` with:

```css
/* App surface — minimalist-ui: warm-stone neutral, muted indigo accent (flat). */
[data-theme-scope='app'] {
  --background: oklch(0.992 0.004 75);
  --foreground: oklch(0.21 0.01 60);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.21 0.01 60);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.21 0.01 60);
  --primary: oklch(0.55 0.12 270);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.96 0.005 75);
  --secondary-foreground: oklch(0.27 0.01 60);
  --muted: oklch(0.96 0.005 75);
  --muted-foreground: oklch(0.53 0.01 60);
  --accent: oklch(0.96 0.005 75);
  --accent-foreground: oklch(0.27 0.01 60);
  --destructive: oklch(0.6 0.22 25);
  --destructive-foreground: oklch(0.99 0 0);
  --border: oklch(0.91 0.005 75);
  --input: oklch(0.91 0.005 75);
  --ring: oklch(0.55 0.12 270);
  --radius: 0.5rem;

  /* Status palette — reserved for application health only. */
  --ghost-active: oklch(0.7 0.15 155);
  --ghost-stale: oklch(0.78 0.15 75);
  --ghost-ghosted: oklch(0.63 0.2 20);
}

/* Dark mode — toggled by `.dark` on <html> (wiring lands in Slice 1). */
.dark [data-theme-scope='app'] {
  --background: oklch(0.18 0.004 75);
  --foreground: oklch(0.95 0.005 75);
  --card: oklch(0.21 0.005 75);
  --card-foreground: oklch(0.95 0.005 75);
  --popover: oklch(0.21 0.005 75);
  --popover-foreground: oklch(0.95 0.005 75);
  --primary: oklch(0.65 0.13 270);
  --primary-foreground: oklch(0.15 0.01 270);
  --secondary: oklch(0.27 0.005 75);
  --secondary-foreground: oklch(0.95 0.005 75);
  --muted: oklch(0.27 0.005 75);
  --muted-foreground: oklch(0.66 0.01 75);
  --accent: oklch(0.27 0.005 75);
  --accent-foreground: oklch(0.95 0.005 75);
  --destructive: oklch(0.5 0.2 25);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.3 0.005 75);
  --input: oklch(0.3 0.005 75);
  --ring: oklch(0.65 0.13 270);

  --ghost-active: oklch(0.72 0.15 155);
  --ghost-stale: oklch(0.8 0.15 75);
  --ghost-ghosted: oklch(0.66 0.2 20);
}
```

- [ ] **Step 2: Bridge new tokens into Tailwind utilities**

In `src/styles/globals.css`, inside the existing `@theme inline { ... }` block, add these lines just before the closing `--radius-md` line:

```css
  --color-ghost-active: var(--ghost-active);
  --color-ghost-stale: var(--ghost-stale);
  --color-ghost-ghosted: var(--ghost-ghosted);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
```

- [ ] **Step 3: Apply the sans font to the body**

In `src/styles/globals.css`, change the `body` rule to add the font family:

```css
body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  font-feature-settings: 'rlig' 1, 'calt' 1;
}
```

- [ ] **Step 4: Verify the dev server renders without CSS errors**

Run: `cd frontend-next && npm run build`
Expected: build completes with no CSS/Tailwind errors.

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/styles/app/theme.css src/styles/globals.css
git commit -m "feat(frontend-next): minimalist app theme tokens (warm-stone, indigo, dark, status)"
```

---

### Task 3: Ghost threshold logic (`lib/ghost.ts`)

**Files:**
- Create: `frontend-next/src/lib/ghost.ts`
- Test: `frontend-next/src/lib/ghost.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ghost.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ghostLevel, ghostLabel, GHOST_ACTIVE_MAX, GHOST_STALE_MAX } from './ghost'

describe('ghostLevel', () => {
  it('returns "active" at and below the active threshold', () => {
    expect(ghostLevel(0)).toBe('active')
    expect(ghostLevel(GHOST_ACTIVE_MAX)).toBe('active')
  })
  it('returns "stale" between active and stale thresholds', () => {
    expect(ghostLevel(GHOST_ACTIVE_MAX + 1)).toBe('stale')
    expect(ghostLevel(GHOST_STALE_MAX)).toBe('stale')
  })
  it('returns "ghosted" above the stale threshold', () => {
    expect(ghostLevel(GHOST_STALE_MAX + 1)).toBe('ghosted')
  })
})

describe('ghostLabel', () => {
  it('describes activity recency', () => {
    expect(ghostLabel(0)).toBe('Active today')
    expect(ghostLabel(1)).toBe('Last activity: 1 day ago')
    expect(ghostLabel(5)).toBe('Last activity: 5 days ago')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/lib/ghost.test.ts`
Expected: FAIL — cannot resolve module `./ghost`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ghost.ts`:

```ts
export const GHOST_ACTIVE_MAX = 7
export const GHOST_STALE_MAX = 14

export type GhostLevel = 'active' | 'stale' | 'ghosted'

export function ghostLevel(days: number): GhostLevel {
  if (days <= GHOST_ACTIVE_MAX) return 'active'
  if (days <= GHOST_STALE_MAX) return 'stale'
  return 'ghosted'
}

export function ghostLabel(days: number): string {
  if (days === 0) return 'Active today'
  if (days === 1) return 'Last activity: 1 day ago'
  return `Last activity: ${days} days ago`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/lib/ghost.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/lib/ghost.ts src/lib/ghost.test.ts
git commit -m "feat(frontend-next): ghost threshold logic"
```

---

### Task 4: GhostMeter signature component

**Files:**
- Create: `frontend-next/src/components/kanban/ghost-meter.tsx`
- Test: `frontend-next/src/components/kanban/ghost-meter.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/kanban/ghost-meter.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GhostMeter } from './ghost-meter'

describe('GhostMeter', () => {
  it('renders the day count in a mono numeric', () => {
    render(<GhostMeter days={5} />)
    expect(screen.getByText('5d')).toBeInTheDocument()
  })

  it('applies the active color for fresh applications', () => {
    render(<GhostMeter days={3} />)
    expect(screen.getByTestId('ghost-meter').className).toContain('text-ghost-active')
  })

  it('applies the stale color in the warning range', () => {
    render(<GhostMeter days={10} />)
    expect(screen.getByTestId('ghost-meter').className).toContain('text-ghost-stale')
  })

  it('applies the ghosted color past the stale threshold', () => {
    render(<GhostMeter days={30} />)
    expect(screen.getByTestId('ghost-meter').className).toContain('text-ghost-ghosted')
  })

  it('exposes an accessible activity label', () => {
    render(<GhostMeter days={1} />)
    expect(screen.getByLabelText('Last activity: 1 day ago')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/kanban/ghost-meter.test.tsx`
Expected: FAIL — cannot resolve `./ghost-meter`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/kanban/ghost-meter.tsx`:

```tsx
import { Clock, Timer, Ghost } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ghostLevel, ghostLabel, type GhostLevel } from '@/lib/ghost'

const LEVEL_STYLES: Record<GhostLevel, string> = {
  active: 'text-ghost-active',
  stale: 'text-ghost-stale',
  ghosted: 'text-ghost-ghosted',
}

const LEVEL_ICON = {
  active: Clock,
  stale: Timer,
  ghosted: Ghost,
} as const

export function GhostMeter({ days }: { days: number }) {
  const level = ghostLevel(days)
  const Icon = LEVEL_ICON[level]
  return (
    <div
      data-testid="ghost-meter"
      aria-label={ghostLabel(days)}
      className={cn('inline-flex items-center gap-1', LEVEL_STYLES[level])}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="font-mono text-xs font-medium tabular-nums">{days}d</span>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/components/kanban/ghost-meter.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/components/kanban/ghost-meter.tsx src/components/kanban/ghost-meter.test.tsx
git commit -m "feat(frontend-next): GhostMeter signature component"
```

---

### Task 5: Job status metadata + StatusChip

**Files:**
- Create: `frontend-next/src/lib/job-status.ts`
- Create: `frontend-next/src/components/kanban/status-chip.tsx`
- Test: `frontend-next/src/components/kanban/status-chip.test.tsx`

- [ ] **Step 1: Write the status metadata (no test — pure constant table)**

Create `src/lib/job-status.ts`:

```ts
export const JOB_STATUSES = [
  'WISHLIST',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'ARCHIVED',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

interface StatusMeta {
  label: string
  /** Tailwind classes for the chip surface. */
  className: string
}

export const STATUS_META: Record<JobStatus, StatusMeta> = {
  WISHLIST: { label: 'Wishlist', className: 'bg-muted text-muted-foreground' },
  APPLIED: { label: 'Applied', className: 'bg-primary/10 text-primary' },
  INTERVIEWING: { label: 'Interviewing', className: 'bg-ghost-active/15 text-ghost-active' },
  OFFER: { label: 'Offer', className: 'bg-ghost-active/20 text-ghost-active' },
  REJECTED: { label: 'Rejected', className: 'bg-ghost-ghosted/15 text-ghost-ghosted' },
  ARCHIVED: { label: 'Archived', className: 'bg-muted text-muted-foreground' },
}
```

- [ ] **Step 2: Write the failing test**

Create `src/components/kanban/status-chip.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusChip } from './status-chip'

describe('StatusChip', () => {
  it('renders the human label for a status', () => {
    render(<StatusChip status="INTERVIEWING" />)
    expect(screen.getByText('Interviewing')).toBeInTheDocument()
  })

  it('renders an uppercase mono code for the terminal look', () => {
    render(<StatusChip status="WISHLIST" />)
    expect(screen.getByTestId('status-chip').className).toContain('uppercase')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/kanban/status-chip.test.tsx`
Expected: FAIL — cannot resolve `./status-chip`.

- [ ] **Step 4: Write minimal implementation**

Create `src/components/kanban/status-chip.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { STATUS_META, type JobStatus } from '@/lib/job-status'

export function StatusChip({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      data-testid="status-chip"
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/components/kanban/status-chip.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd frontend-next
git add src/lib/job-status.ts src/components/kanban/status-chip.tsx src/components/kanban/status-chip.test.tsx
git commit -m "feat(frontend-next): job-status metadata + StatusChip signature component"
```

---

### Task 6: Minimalist AppShell (header + sidebar)

**Files:**
- Modify: `frontend-next/src/components/layout/app/app-shell.tsx`
- Test: `frontend-next/src/components/layout/app/app-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/layout/app/app-shell.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from './app-shell'

describe('AppShell', () => {
  it('renders the primary navigation links', () => {
    render(<AppShell>content</AppShell>)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/app/dashboard')
    expect(screen.getByRole('link', { name: 'Timeline' })).toHaveAttribute('href', '/app/timeline')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/app/settings')
  })

  it('renders its children in the main region', () => {
    render(<AppShell>hello-region</AppShell>)
    expect(screen.getByRole('main')).toHaveTextContent('hello-region')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/layout/app/app-shell.test.tsx`
Expected: FAIL — current AppShell has no nav links / no `main` role match for the assertions.

- [ ] **Step 3: Write the implementation**

Replace the contents of `src/components/layout/app/app-shell.tsx` with:

```tsx
import type { ReactNode } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Clock, Settings } from 'lucide-react'

const NAV = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/timeline', label: 'Timeline', icon: Clock },
  { href: '/app/settings', label: 'Settings', icon: Settings },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-60 shrink-0 border-r border-border flex flex-col">
        <div className="h-14 flex items-center px-5 font-semibold tracking-tight">JobVault</div>
        <nav className="flex flex-col gap-0.5 px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-border flex items-center justify-end gap-3 px-6">
          <span className="text-sm text-muted-foreground">Account (Slice 1)</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/components/layout/app/app-shell.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd frontend-next
git add src/components/layout/app/app-shell.tsx src/components/layout/app/app-shell.test.tsx
git commit -m "feat(frontend-next): minimalist AppShell with sidebar nav"
```

---

### Task 7: Web placeholder pages (ComingSoon)

**Files:**
- Create: `frontend-next/src/components/shared/coming-soon.tsx`
- Test: `frontend-next/src/components/shared/coming-soon.test.tsx`
- Modify: `frontend-next/src/app/(web)/about/page.tsx`, `faq/page.tsx`, `contact/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/shared/coming-soon.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComingSoon } from './coming-soon'

describe('ComingSoon', () => {
  it('shows the page title and a coming-soon note', () => {
    render(<ComingSoon title="About" />)
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-next && npx vitest run src/components/shared/coming-soon.test.tsx`
Expected: FAIL — cannot resolve `./coming-soon`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/shared/coming-soon.tsx`:

```tsx
export function ComingSoon({ title }: { title: string }) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">
        This page is coming soon. The public site is being redesigned.
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-next && npx vitest run src/components/shared/coming-soon.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Point each web page at ComingSoon**

Replace the contents of `src/app/(web)/about/page.tsx` with:

```tsx
import type { Metadata } from 'next'
import { ComingSoon } from '@/components/shared/coming-soon'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return <ComingSoon title="About" />
}
```

Repeat for the other four, changing the title and component name each time:
- `src/app/(web)/faq/page.tsx` → `title="FAQ"`, function `FaqPage`
- `src/app/(web)/contact/page.tsx` → `title="Contact"`, function `ContactPage`
- `src/app/(web)/privacy/page.tsx` → `title="Privacy Policy"`, function `PrivacyPage`
- `src/app/(web)/terms/page.tsx` → `title="Terms & Conditions"`, function `TermsPage`

- [ ] **Step 6: Verify typecheck + full test suite + build**

Run: `cd frontend-next && npm run typecheck && npm run test && npm run build`
Expected: typecheck clean, all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
cd frontend-next
git add src/components/shared/coming-soon.tsx src/components/shared/coming-soon.test.tsx "src/app/(web)"
git commit -m "feat(frontend-next): web placeholder pages via ComingSoon"
```

---

## Part B — Backend `users` Schema

### Task 8: Drizzle `users` table

**Files:**
- Create: `backend-express/src/db/schema/users.ts`
- Modify: `backend-express/src/db/schema/index.ts`
- Test: `backend-express/src/db/schema/users.test.ts`

> Mirrors the existing NestJS `User` entity: `id` (uuid pk), `createdAt`/`updatedAt` (timestamptz), `name`, unique `email`, nullable `passwordHash`, unique nullable `googleId`, `isEmailVerified` (default false), nullable `masterResumeUrl`, nullable `masterProfileJson` (jsonb), nullable `preferences` (jsonb), nullable `refreshTokenHash`.

- [ ] **Step 1: Write the failing test**

Create `src/db/schema/users.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getTableColumns } from 'drizzle-orm'
import { users } from './users.js'

describe('users table', () => {
  it('defines the expected columns', () => {
    const cols = Object.keys(getTableColumns(users)).sort()
    expect(cols).toEqual(
      [
        'createdAt',
        'email',
        'googleId',
        'id',
        'isEmailVerified',
        'masterProfileJson',
        'masterResumeUrl',
        'name',
        'passwordHash',
        'preferences',
        'refreshTokenHash',
        'updatedAt',
      ].sort(),
    )
  })

  it('makes email and id not null', () => {
    const cols = getTableColumns(users)
    expect(cols.id.notNull).toBe(true)
    expect(cols.email.notNull).toBe(true)
    expect(cols.passwordHash.notNull).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-express && npx vitest run src/db/schema/users.test.ts`
Expected: FAIL — cannot resolve `./users.js`.

- [ ] **Step 3: Write the schema**

Create `src/db/schema/users.ts`:

```ts
import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  defaultView?: 'kanban' | 'list'
}

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  masterResumeUrl: text('master_resume_url'),
  masterProfileJson: jsonb('master_profile_json').$type<Record<string, unknown>>(),
  preferences: jsonb('preferences').$type<UserPreferences>(),
  refreshTokenHash: text('refresh_token_hash'),
})

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
```

- [ ] **Step 4: Re-export from the schema barrel**

Replace the contents of `src/db/schema/index.ts` with:

```ts
// Drizzle schema barrel — one re-export per table.
export * from './users.js'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend-express && npx vitest run src/db/schema/users.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Verify typecheck**

Run: `cd backend-express && npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd backend-express
git add src/db/schema/users.ts src/db/schema/index.ts src/db/schema/users.test.ts
git commit -m "feat(backend-express): add users Drizzle table schema"
```

---

### Task 9: Generate and apply the users migration

**Files:**
- Generated: `backend-express/src/db/migrations/*`

> Requires a running Postgres. Use the project's `docker-compose up postgres` (or the dev DB pointed at by `DATABASE_URL`).

- [ ] **Step 1: Ensure Postgres is running and env is set**

Run: `cd /home/weloin/Projects/job-vault && docker-compose up -d postgres`
Confirm `backend-express/.env` has a valid `DATABASE_URL` (and `JWT_SECRET` ≥ 32 chars so env validation passes).

- [ ] **Step 2: Generate the migration from the schema**

Run: `cd backend-express && npm run db:generate`
Expected: a new SQL file appears under `src/db/migrations/` creating the `users` table with the unique constraints on `email` and `google_id`.

- [ ] **Step 3: Apply the migration**

Run: `cd backend-express && npm run db:migrate`
Expected: migration applies with no error.

- [ ] **Step 4: Verify the table exists**

Run: `docker-compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "\d users"`
(substitute the compose env values; or use any psql client against `DATABASE_URL`)
Expected: the `users` table is listed with all columns and unique indexes on `email` and `google_id`.

- [ ] **Step 5: Commit the generated migration**

```bash
cd backend-express
git add src/db/migrations
git commit -m "feat(backend-express): generate users table migration"
```

---

## Verification (end of Slice 0)

- [ ] **Frontend:** `cd frontend-next && npm run typecheck && npm run lint && npm run test && npm run build` — all green.
- [ ] **Backend:** `cd backend-express && npm run typecheck && npm run lint && npm run test` — all green.
- [ ] **Manual smoke (frontend):** `npm run dev`, open `/app/dashboard` — sidebar nav (Dashboard/Timeline/Settings) renders in warm-stone + indigo; toggle `<html class="dark">` in devtools to confirm dark mode tokens apply only within the app scope. Open `/about` — shows the ComingSoon placeholder.
- [ ] **Manual smoke (backend):** `users` table exists in Postgres with unique `email`/`google_id`.
- [ ] **Update `progress.md`:** mark a new "Slice 0 — Foundation" section complete.

---

## Self-Review Notes (author)

- **Spec coverage:** design tokens (§3) → Tasks 1–2; mono-numeric signature → Tasks 1,4,5; GhostMeter + StatusChip signature components (§3) → Tasks 4–5; AppShell (§5) → Task 6; web placeholders (§5) → Task 7; Drizzle `users` (§4, §6 Slice 0) → Tasks 8–9. Auth logic intentionally deferred to Slice 1.
- **Type consistency:** `ghostLevel`/`GhostLevel`/`ghostLabel` consistent across Tasks 3–4; `JobStatus`/`STATUS_META` consistent across Task 5; `users`/`UserRow` consistent across Tasks 8–9.
- **No placeholders:** every code step shows complete code; the only "coming soon" text is the intended product copy in Task 7.
