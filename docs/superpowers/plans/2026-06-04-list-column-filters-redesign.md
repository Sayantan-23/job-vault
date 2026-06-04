# List Column Filters Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move column-specific controls off the page header onto the columns (Notion-style): tap a header to sort (3-state cycle), a hover funnel opens a filter menu on the Status and Added columns (Added gets a real date-range filter), leaving only Search + Activity in the header.

**Architecture:** Mostly frontend, plus one small additive backend change (date-range query params on `GET /api/jobs`, no migration). A new anchored popover primitive (`@radix-ui/react-popover`) hosts the per-column menus. The single `isFiltered` predicate is split into `isBoardFiltered` (board-relevant: search+ghost) and `isListFiltered` (all list filters), fixing a prior nit. Sort becomes a 3-state cycle (`asc → desc → off→default createdAt desc`), with the Added column special-cased to a toggle.

**Tech Stack:** Express 5 + Drizzle (backend); Next.js 15 + React 19 + TanStack Query v5 + Tailwind v4 + Radix (frontend); Vitest + RTL; Zod.

**Spec:** `docs/superpowers/specs/2026-06-04-list-column-filters-redesign-design.md`

**Working dirs:** backend commands in `backend-express/`, frontend in `frontend-next/`. Branch: `slice-5-filters-search-list` (already checked out). **No `git push`. No "Claude" in commit messages.** Every styled element is its own component.

> **Green-tree caveat (like Slice 5):** Tasks 2–3 split `isFiltered`; the `jobs-workspace`/`jobs-toolbar` consumers aren't reconciled until Tasks 9–10, so a full `typecheck` is only guaranteed green from Task 10 on. Each task still runs and passes its **own** per-file tests. The full gate runs in Task 11.

---

## File map

**Backend — modify:** `backend-express/src/modules/jobs/jobs.schema.ts`, `jobs.repository.ts` (+ `jobs.repository.test.ts`, `jobs.router.test.ts`).

**Frontend — new:**
- `src/components/ui/anchored-popover.tsx` — anchored Radix popover.
- `src/components/jobs/column-funnel.tsx` — hover-reveal funnel trigger + active dot.
- `src/components/jobs/status-filter-menu.tsx` — status options menu.
- `src/components/jobs/date-range-menu.tsx` — From/To date-range menu.

**Frontend — modify:** `src/types/filters.ts`, `src/lib/filters.ts` (+ test), `src/hooks/use-job-filters.ts` (+ test), `src/components/jobs/jobs-table.tsx` (+ test), `jobs-toolbar.tsx` (+ test), `jobs-workspace.tsx` (+ test), `package.json` (+ lock).

**Frontend — remove:** `src/components/jobs/sort-control.tsx` + `sort-control.test.tsx`.

---

## Task 1: Backend date-range filter (`createdFrom`/`createdTo`)

**Files:**
- Modify: `backend-express/src/modules/jobs/jobs.schema.ts`
- Modify: `backend-express/src/modules/jobs/jobs.repository.ts`
- Test: `backend-express/src/modules/jobs/jobs.repository.test.ts`, `jobs.router.test.ts`

- [ ] **Step 1: Add the failing repo test** — append inside `describe('jobsRepository (real DB)', …)` in `jobs.repository.test.ts`:

```ts
  it('filters by createdAt date range, with createdTo inclusive of that day', async () => {
    const mk = (title: string, createdAt: Date) =>
      jobsRepository.create({
        userId, title, company: 'Range', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date(), createdAt,
      })
    await mk('Old', new Date('2020-06-15T12:00:00.000Z'))
    await mk('Mid', new Date('2022-06-15T12:00:00.000Z'))
    await mk('New', new Date('2024-06-15T12:00:00.000Z'))

    const q = (extra: Record<string, unknown>) =>
      jobsRepository.findAll(userId, { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc', search: 'Range', ...extra })

    expect((await q({ createdFrom: '2021-01-01' })).rows.map((r) => r.title).sort()).toEqual(['Mid', 'New'])
    expect((await q({ createdTo: '2023-01-01' })).rows.map((r) => r.title).sort()).toEqual(['Mid', 'Old'])
    expect((await q({ createdFrom: '2021-01-01', createdTo: '2023-01-01' })).rows.map((r) => r.title)).toEqual(['Mid'])
    // createdTo equal to a job's own day still includes it (end-of-day inclusive)
    expect((await q({ createdTo: '2022-06-15' })).rows.map((r) => r.title).sort()).toEqual(['Mid', 'Old'])
  })
```

- [ ] **Step 2: Run it — expect FAIL** (TS error: `createdFrom`/`createdTo` not on `JobQueryInput`)

Run: `cd backend-express && npm run test -- src/modules/jobs/jobs.repository.test.ts`
Expected: FAIL (unknown property / no filtering).

- [ ] **Step 3: Add the schema fields** — in `jobs.schema.ts`, add to `JobQuerySchema` (after `ghostFilter`):

```ts
  createdFrom: z.string().date().optional(),
  createdTo: z.string().date().optional(),
```

(`z.string().date()` validates `YYYY-MM-DD` and exists in Zod 3.23.8. `JobQueryInput` is inferred — no other change.)

- [ ] **Step 4: Apply the filter in the repository** — in `jobs.repository.ts`:

4a. Extend the drizzle import (add `gte`, `lte`):

```ts
import { and, or, eq, ilike, asc, desc, max, count, sql, gte, lte } from 'drizzle-orm'
```

4b. Add two conditions to the `where = and(...)` in `findAll` (after `ghostCondition(query.ghostFilter),`):

```ts
    query.createdFrom ? gte(jobs.createdAt, new Date(`${query.createdFrom}T00:00:00.000Z`)) : undefined,
    query.createdTo ? lte(jobs.createdAt, new Date(`${query.createdTo}T23:59:59.999Z`)) : undefined,
```

- [ ] **Step 5: Run the repo test — expect PASS**

Run: `cd backend-express && npm run test -- src/modules/jobs/jobs.repository.test.ts`
Expected: PASS (requires the real Postgres dev DB running, like the other repo tests).

- [ ] **Step 6: Extend the router forwarding test** — in `jobs.router.test.ts`, replace the `forwards search/status/sort filters` test body's request + assertion to include the date params:

```ts
  it('forwards search/status/sort/date filters to the repository', async () => {
    repo.findAll.mockResolvedValue({ rows: [], total: 0 })
    await request(app)
      .get('/api/jobs?search=rust&status=APPLIED&sortBy=updatedAt&sortOrder=asc&createdFrom=2022-01-01&createdTo=2022-12-31')
      .set('Cookie', [cookie])
    expect(repo.findAll).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        search: 'rust', status: 'APPLIED', sortBy: 'updatedAt', sortOrder: 'asc',
        createdFrom: '2022-01-01', createdTo: '2022-12-31',
      }),
    )
  })
```

> The file authenticates with a module-level `cookie` string set in `beforeAll` and passed as `.set('Cookie', [cookie])` — match that exactly (the test renaming to "…/date filters" is the only change to the existing test).

- [ ] **Step 7: Run the router test — expect PASS**

Run: `cd backend-express && npm run test -- src/modules/jobs/jobs.router.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend-express/src/modules/jobs/jobs.schema.ts backend-express/src/modules/jobs/jobs.repository.ts backend-express/src/modules/jobs/jobs.repository.test.ts backend-express/src/modules/jobs/jobs.router.test.ts
git commit -m "feat(backend-express): createdAt date-range filter (createdFrom/createdTo) on GET /api/jobs"
```

---

## Task 2: Frontend filter model — date range + isFiltered split

**Files:**
- Modify: `frontend-next/src/types/filters.ts`
- Modify: `frontend-next/src/lib/filters.ts`
- Test: `frontend-next/src/lib/filters.test.ts`

- [ ] **Step 1: Update the failing test `src/lib/filters.test.ts`**

1a. Replace the `isFiltered` import + its `describe('isFiltered', …)` block with the split predicates:

```ts
import { parseFilters, isBoardFiltered, isListFiltered, buildListQuery, buildBoardQuery } from './filters'
import { DEFAULT_FILTERS } from '@/types/filters'

describe('isBoardFiltered / isListFiltered', () => {
  it('board cares only about search + ghost', () => {
    expect(isBoardFiltered(DEFAULT_FILTERS)).toBe(false)
    expect(isBoardFiltered({ ...DEFAULT_FILTERS, status: 'APPLIED' })).toBe(false)        // status doesn't affect the board
    expect(isBoardFiltered({ ...DEFAULT_FILTERS, createdFrom: '2022-01-01' })).toBe(false) // nor does a date range
    expect(isBoardFiltered({ ...DEFAULT_FILTERS, search: 'x' })).toBe(true)
    expect(isBoardFiltered({ ...DEFAULT_FILTERS, ghost: 'ghost' })).toBe(true)
  })
  it('list counts every list filter', () => {
    expect(isListFiltered(DEFAULT_FILTERS)).toBe(false)
    expect(isListFiltered({ ...DEFAULT_FILTERS, status: 'APPLIED' })).toBe(true)
    expect(isListFiltered({ ...DEFAULT_FILTERS, createdFrom: '2022-01-01' })).toBe(true)
    expect(isListFiltered({ ...DEFAULT_FILTERS, createdTo: '2022-12-31' })).toBe(true)
    expect(isListFiltered({ ...DEFAULT_FILTERS, sortBy: 'title' })).toBe(false) // sort isn't a "filter"
  })
})
```

1b. Add date-range cases to `parseFilters` and `buildListQuery`/`buildBoardQuery` describes:

```ts
describe('parseFilters date range', () => {
  it('reads from/to as createdFrom/createdTo when well-formed', () => {
    const f = parseFilters(new URLSearchParams('from=2022-01-01&to=2022-12-31'))
    expect(f.createdFrom).toBe('2022-01-01')
    expect(f.createdTo).toBe('2022-12-31')
  })
  it('ignores malformed dates', () => {
    const f = parseFilters(new URLSearchParams('from=nope&to=2022/12/31'))
    expect(f.createdFrom).toBeUndefined()
    expect(f.createdTo).toBeUndefined()
  })
})

describe('buildListQuery date range', () => {
  it('maps from/to to createdFrom/createdTo', () => {
    const p = new URLSearchParams(buildListQuery({ ...DEFAULT_FILTERS, createdFrom: '2022-01-01', createdTo: '2022-12-31' }).replace(/^\?/, ''))
    expect(p.get('createdFrom')).toBe('2022-01-01')
    expect(p.get('createdTo')).toBe('2022-12-31')
  })
})

describe('buildBoardQuery ignores date range', () => {
  it('never emits createdFrom/createdTo', () => {
    const qs = buildBoardQuery({ search: 'x', ghost: 'all' })
    expect(qs).not.toMatch(/created/i)
  })
})
```

> Keep the existing `parseFilters`/`buildListQuery` describes; just add these.

- [ ] **Step 2: Run it — expect FAIL** (`isBoardFiltered`/`isListFiltered` not exported; `createdFrom` not on type)

Run: `npm run test -- src/lib/filters.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add the type fields** — in `src/types/filters.ts`, add to `JobFilters` (after `status?`):

```ts
  createdFrom?: string
  createdTo?: string
```

- [ ] **Step 4: Update `src/lib/filters.ts`**

4a. Add a `YYYY-MM-DD` guard near the other `as*` helpers:

```ts
function asYmd(v: string | null): string | undefined {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined
}
```

4b. In `parseFilters`, add the two fields to the returned object (after the `status` spread):

```ts
  const createdFrom = asYmd(params.get('from'))
  const createdTo = asYmd(params.get('to'))
```
and in the returned literal:
```ts
    ...(createdFrom ? { createdFrom } : {}),
    ...(createdTo ? { createdTo } : {}),
```

4c. In `buildListQuery`, add (after the `page` line, before `const qs`):

```ts
  if (f.createdFrom) p.set('createdFrom', f.createdFrom)
  if (f.createdTo) p.set('createdTo', f.createdTo)
```

4d. Replace the `isFiltered` function with the two split predicates:

```ts
// Board reorder-suppression + board "matching" count: only filters the board endpoint honors.
export function isBoardFiltered(f: JobFilters): boolean {
  return f.search !== '' || f.ghost !== 'all'
}

// List reset / empty-state / "matching" count: every filter the list endpoint honors.
export function isListFiltered(f: JobFilters): boolean {
  return (
    f.search !== '' ||
    f.status !== undefined ||
    f.ghost !== 'all' ||
    f.createdFrom !== undefined ||
    f.createdTo !== undefined
  )
}
```

- [ ] **Step 5: Run it — expect PASS**

Run: `npm run test -- src/lib/filters.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend-next/src/types/filters.ts frontend-next/src/lib/filters.ts frontend-next/src/lib/filters.test.ts
git commit -m "feat(frontend-next): date-range filter model + split isFiltered into board/list predicates"
```

---

## Task 3: `useJobFilters` — `cycleSort`, `setDateRange`, split predicates

**Files:**
- Modify: `frontend-next/src/hooks/use-job-filters.ts`
- Test: `frontend-next/src/hooks/use-job-filters.test.tsx`

- [ ] **Step 1: Update the test `src/hooks/use-job-filters.test.tsx`**

1a. The hook no longer exposes `setSort`/`isFiltered`; it exposes `cycleSort`, `setDateRange`, `isBoardFiltered`, `isListFiltered`. Replace the two `setSort` describe-its with `cycleSort` ones, and add `setDateRange`:

```ts
  it('cycleSort: a non-default column goes inactive -> asc -> desc -> off(default)', () => {
    const { result, rerender } = renderHook(() => useJobFilters())
    act(() => result.current.cycleSort('company'))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('sort')).toBe('company')
    expect(new URL(lastUrl(), 'http://x').searchParams.get('dir')).toBe('asc')

    searchParams.set('sort', 'company'); searchParams.set('dir', 'asc'); rerender()
    act(() => result.current.cycleSort('company'))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('sort')).toBe('company')
    expect(new URL(lastUrl(), 'http://x').searchParams.has('dir')).toBe(false) // desc (omitted)

    searchParams.delete('dir'); rerender() // now sort=company, desc
    act(() => result.current.cycleSort('company'))
    const off = new URL(lastUrl(), 'http://x').searchParams
    expect(off.has('sort')).toBe(false) // off -> default createdAt desc
    expect(off.has('dir')).toBe(false)
  })

  it('cycleSort: the Added (createdAt) column toggles asc<->desc', () => {
    const { result, rerender } = renderHook(() => useJobFilters())
    act(() => result.current.cycleSort('createdAt')) // default desc -> asc
    expect(new URL(lastUrl(), 'http://x').searchParams.get('sort')).toBe('createdAt')
    expect(new URL(lastUrl(), 'http://x').searchParams.get('dir')).toBe('asc')

    searchParams.set('sort', 'createdAt'); searchParams.set('dir', 'asc'); rerender()
    act(() => result.current.cycleSort('createdAt')) // asc -> default desc (cleared)
    const back = new URL(lastUrl(), 'http://x').searchParams
    expect(back.has('sort')).toBe(false)
    expect(back.has('dir')).toBe(false)
  })

  it('setDateRange sets/clears from+to, resets page, preserves view', () => {
    searchParams.set('page', '3'); searchParams.set('view', 'board')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setDateRange('2022-01-01', '2022-12-31'))
    let u = new URL(lastUrl(), 'http://x')
    expect(u.searchParams.get('from')).toBe('2022-01-01')
    expect(u.searchParams.get('to')).toBe('2022-12-31')
    expect(u.searchParams.has('page')).toBe(false)
    expect(u.searchParams.get('view')).toBe('board')
    act(() => result.current.setDateRange(undefined, undefined))
    u = new URL(lastUrl(), 'http://x')
    expect(u.searchParams.has('from')).toBe(false)
    expect(u.searchParams.has('to')).toBe(false)
  })
```

1b. Update the existing `resetAll` test to also seed `from`/`to` and assert they clear (add two lines):

```ts
    searchParams.set('from', '2022-01-01')
    // ...inside the assertion block:
    expect(url.searchParams.has('from')).toBe(false)
```

- [ ] **Step 2: Run it — expect FAIL** (`cycleSort`/`setDateRange` undefined)

Run: `npm run test -- src/hooks/use-job-filters.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite `src/hooks/use-job-filters.ts`**

```ts
'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseFilters, isBoardFiltered as computeBoardFiltered, isListFiltered as computeListFiltered } from '@/lib/filters'
import type { GhostFilter, JobFilters, SortField } from '@/types/filters'
import type { JobStatus } from '@/lib/job-status'

export interface UseJobFilters {
  filters: JobFilters
  isBoardFiltered: boolean
  isListFiltered: boolean
  setSearch: (value: string) => void
  setStatus: (value: JobStatus | undefined) => void
  setGhost: (value: GhostFilter) => void
  setDateRange: (from?: string, to?: string) => void
  /** Tap-to-sort 3-state cycle: asc -> desc -> off(default createdAt desc); createdAt toggles asc<->desc. */
  cycleSort: (field: SortField) => void
  setPage: (page: number) => void
  resetAll: () => void
}

const FILTER_KEYS = ['search', 'status', 'ghost', 'sort', 'dir', 'page', 'from', 'to'] as const

export function useJobFilters(): UseJobFilters {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = parseFilters(searchParams)

  const commit = useCallback(
    (mutate: (p: URLSearchParams) => void, resetPage = true) => {
      const p = new URLSearchParams(searchParams.toString())
      mutate(p)
      if (resetPage) p.delete('page')
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const setSearch = useCallback(
    (value: string) => commit((p) => { const t = value.trim(); if (t) p.set('search', t); else p.delete('search') }),
    [commit],
  )
  const setStatus = useCallback(
    (value: JobStatus | undefined) => commit((p) => { if (value) p.set('status', value); else p.delete('status') }),
    [commit],
  )
  const setGhost = useCallback(
    (value: GhostFilter) => commit((p) => { if (value !== 'all') p.set('ghost', value); else p.delete('ghost') }),
    [commit],
  )
  const setDateRange = useCallback(
    (from?: string, to?: string) => commit((p) => {
      if (from) p.set('from', from); else p.delete('from')
      if (to) p.set('to', to); else p.delete('to')
    }),
    [commit],
  )
  const cycleSort = useCallback(
    (field: SortField) =>
      commit((p) => {
        const f = parseFilters(searchParams)
        if (field === 'createdAt') {
          // Added is the default sort: toggle asc <-> desc (off == cleared default desc).
          if (f.sortBy === 'createdAt' && f.sortOrder === 'asc') {
            p.delete('sort'); p.delete('dir')
          } else {
            p.set('sort', 'createdAt'); p.set('dir', 'asc')
          }
          return
        }
        if (f.sortBy !== field) {           // inactive -> asc
          p.set('sort', field); p.set('dir', 'asc')
        } else if (f.sortOrder === 'asc') { // asc -> desc (dir omitted = default desc)
          p.set('sort', field); p.delete('dir')
        } else {                            // desc -> off -> default createdAt desc
          p.delete('sort'); p.delete('dir')
        }
      }),
    [commit, searchParams],
  )
  const setPage = useCallback(
    (page: number) => commit((p) => { if (page > 1) p.set('page', String(page)); else p.delete('page') }, false),
    [commit],
  )
  const resetAll = useCallback(
    () => commit((p) => { for (const k of FILTER_KEYS) p.delete(k) }, false),
    [commit],
  )

  return {
    filters,
    isBoardFiltered: computeBoardFiltered(filters),
    isListFiltered: computeListFiltered(filters),
    setSearch,
    setStatus,
    setGhost,
    setDateRange,
    cycleSort,
    setPage,
    resetAll,
  }
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npm run test -- src/hooks/use-job-filters.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/hooks/use-job-filters.ts frontend-next/src/hooks/use-job-filters.test.tsx
git commit -m "feat(frontend-next): useJobFilters cycleSort (3-state) + setDateRange + board/list predicates"
```

---

## Task 4: Anchored popover primitive

**Files:**
- Modify: `frontend-next/package.json` (+ `package-lock.json`)
- Create: `frontend-next/src/components/ui/anchored-popover.tsx`

- [ ] **Step 1: Install the dependency**

Run: `cd frontend-next && npm install @radix-ui/react-popover`
Expected: adds `@radix-ui/react-popover` to dependencies + lockfile.

- [ ] **Step 2: Create `src/components/ui/anchored-popover.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

export const AnchoredPopover = PopoverPrimitive.Root
export const AnchoredPopoverTrigger = PopoverPrimitive.Trigger
export const AnchoredPopoverClose = PopoverPrimitive.Close

// A popover anchored to its trigger (unlike ui/popover.tsx, which is pinned
// top-right for the notification bell). Behavior from Radix; presentation ours.
export function AnchoredPopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-theme-scope="app"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'z-50 w-60 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-lg focus:outline-none',
          'origin-[var(--radix-popover-content-transform-origin)] data-[state=open]:animate-jv-surface-in data-[state=closed]:animate-jv-surface-out',
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}
```

- [ ] **Step 3: Typecheck (no test for the thin wrapper)**

Run: `cd frontend-next && npm run typecheck`
Expected: PASS (resolves `@radix-ui/react-popover`).

- [ ] **Step 4: Commit**

```bash
git add frontend-next/package.json frontend-next/package-lock.json frontend-next/src/components/ui/anchored-popover.tsx
git commit -m "feat(frontend-next): anchored popover primitive (@radix-ui/react-popover)"
```

> When running the Docker stack after this, use `docker compose up -d --build --force-recreate --renew-anon-volumes` so the new dep is installed in the container (per CLAUDE.md).

---

## Task 5: `StatusFilterMenu`

**Files:**
- Create: `frontend-next/src/components/jobs/status-filter-menu.tsx`
- Test: `frontend-next/src/components/jobs/status-filter-menu.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusFilterMenu } from './status-filter-menu'

describe('StatusFilterMenu', () => {
  it('renders All statuses + the 6 statuses and marks the active one', () => {
    render(<StatusFilterMenu value="APPLIED" onChange={vi.fn()} />)
    expect(screen.getByRole('option', { name: /all statuses/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /applied/i })).toHaveAttribute('aria-selected', 'true')
  })
  it('calls onChange with the chosen status, and undefined for All', () => {
    const onChange = vi.fn()
    render(<StatusFilterMenu value={undefined} onChange={onChange} />)
    fireEvent.click(screen.getByRole('option', { name: /^interviewing$/i }))
    expect(onChange).toHaveBeenCalledWith('INTERVIEWING')
    fireEvent.click(screen.getByRole('option', { name: /all statuses/i }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (module not found)

Run: `npm run test -- src/components/jobs/status-filter-menu.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create `src/components/jobs/status-filter-menu.tsx`**

```tsx
'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JOB_STATUSES, STATUS_META, type JobStatus } from '@/lib/job-status'

const OPTIONS: ReadonlyArray<{ value: JobStatus | undefined; label: string }> = [
  { value: undefined, label: 'All statuses' },
  ...JOB_STATUSES.map((s) => ({ value: s as JobStatus, label: STATUS_META[s].label })),
]

export function StatusFilterMenu({
  value,
  onChange,
}: {
  value: JobStatus | undefined
  onChange: (value: JobStatus | undefined) => void
}) {
  return (
    <div role="listbox" aria-label="Filter by status" className="flex flex-col">
      {OPTIONS.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.label}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent',
              selected ? 'font-medium' : '',
            )}
          >
            {o.label}
            {selected ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
          </button>
        )
      })}
    </div>
  )
}
```

> The popover closes on selection via the `ColumnFunnel` wrapper (Task 7) — keeping the menu controlled-from-outside makes it independently testable here.

- [ ] **Step 4: Run it — expect PASS**

Run: `npm run test -- src/components/jobs/status-filter-menu.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/jobs/status-filter-menu.tsx frontend-next/src/components/jobs/status-filter-menu.test.tsx
git commit -m "feat(frontend-next): StatusFilterMenu (single-select status options)"
```

---

## Task 6: `DateRangeMenu`

**Files:**
- Create: `frontend-next/src/components/jobs/date-range-menu.tsx`
- Test: `frontend-next/src/components/jobs/date-range-menu.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangeMenu } from './date-range-menu'

describe('DateRangeMenu', () => {
  it('applies the chosen From/To range', () => {
    const onApply = vi.fn()
    render(<DateRangeMenu onApply={onApply} />)
    fireEvent.change(screen.getByLabelText(/from/i), { target: { value: '2022-01-01' } })
    fireEvent.change(screen.getByLabelText(/to/i), { target: { value: '2022-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))
    expect(onApply).toHaveBeenCalledWith('2022-01-01', '2022-12-31')
  })
  it('clears to undefined', () => {
    const onApply = vi.fn()
    render(<DateRangeMenu from="2022-01-01" to="2022-12-31" onApply={onApply} />)
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onApply).toHaveBeenCalledWith(undefined, undefined)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (module not found)

Run: `npm run test -- src/components/jobs/date-range-menu.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create `src/components/jobs/date-range-menu.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function DateRangeMenu({
  from,
  to,
  onApply,
}: {
  from?: string
  to?: string
  onApply: (from?: string, to?: string) => void
}) {
  const [localFrom, setLocalFrom] = useState(from ?? '')
  const [localTo, setLocalTo] = useState(to ?? '')

  return (
    <div className="flex flex-col gap-2 p-1.5">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        From
        <Input
          type="date"
          value={localFrom}
          max={localTo || undefined}
          onChange={(e) => setLocalFrom(e.target.value)}
          className="h-9"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        To
        <Input
          type="date"
          value={localTo}
          min={localFrom || undefined}
          onChange={(e) => setLocalTo(e.target.value)}
          className="h-9"
        />
      </label>
      <div className="mt-1 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setLocalFrom(''); setLocalTo(''); onApply(undefined, undefined) }}
        >
          Clear
        </Button>
        <Button type="button" size="sm" onClick={() => onApply(localFrom || undefined, localTo || undefined)}>
          Apply
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npm run test -- src/components/jobs/date-range-menu.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/jobs/date-range-menu.tsx frontend-next/src/components/jobs/date-range-menu.test.tsx
git commit -m "feat(frontend-next): DateRangeMenu (From/To native date inputs + Apply/Clear)"
```

---

## Task 7: `ColumnFunnel` (hover-reveal trigger + anchored menu)

**Files:**
- Create: `frontend-next/src/components/jobs/column-funnel.tsx`
- Test: `frontend-next/src/components/jobs/column-funnel.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColumnFunnel } from './column-funnel'

describe('ColumnFunnel', () => {
  it('opens the menu content on click', () => {
    render(<ColumnFunnel label="Filter by status"><div>MENU BODY</div></ColumnFunnel>)
    expect(screen.queryByText('MENU BODY')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /filter by status/i }))
    expect(screen.getByText('MENU BODY')).toBeInTheDocument()
  })
  it('marks the trigger active when a filter is applied', () => {
    render(<ColumnFunnel label="Filter by status" active><div>x</div></ColumnFunnel>)
    expect(screen.getByRole('button', { name: /filter by status/i })).toHaveAttribute('data-active', 'true')
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (module not found)

Run: `npm run test -- src/components/jobs/column-funnel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create `src/components/jobs/column-funnel.tsx`**

```tsx
'use client'

import type { ReactNode } from 'react'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AnchoredPopover,
  AnchoredPopoverTrigger,
  AnchoredPopoverContent,
} from '@/components/ui/anchored-popover'

// A per-column filter trigger: a funnel that is hidden until the header is
// hovered (or the button is focused), with a dot when a filter is active. The
// menu body is passed as children and rendered in an anchored popover.
export function ColumnFunnel({
  label,
  active = false,
  children,
}: {
  label: string
  active?: boolean
  children: ReactNode
}) {
  return (
    <AnchoredPopover>
      <AnchoredPopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-active={active}
          className={cn(
            'relative inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-opacity hover:text-foreground focus-visible:opacity-100 data-[state=open]:opacity-100',
            active ? 'text-foreground opacity-100' : 'opacity-0 group-hover/header:opacity-100',
          )}
        >
          <Filter className="size-3.5" aria-hidden="true" />
          {active ? (
            <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary" aria-hidden="true" />
          ) : null}
        </button>
      </AnchoredPopoverTrigger>
      <AnchoredPopoverContent>{children}</AnchoredPopoverContent>
    </AnchoredPopover>
  )
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npm run test -- src/components/jobs/column-funnel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/jobs/column-funnel.tsx frontend-next/src/components/jobs/column-funnel.test.tsx
git commit -m "feat(frontend-next): ColumnFunnel — hover-reveal anchored filter trigger with active dot"
```

---

## Task 8: `JobsTable` — cycle-sort wiring + Status/Added funnels

**Files:**
- Modify: `frontend-next/src/components/jobs/jobs-table.tsx`
- Test: `frontend-next/src/components/jobs/jobs-table.test.tsx`

- [ ] **Step 1: Update the test `src/components/jobs/jobs-table.test.tsx`**

1a. Extend the `base` props and add funnel coverage. Replace the `base` const and add tests:

```ts
const base = {
  sortBy: 'createdAt' as const, sortOrder: 'desc' as const, loading: false, isFiltered: false,
  onReset: vi.fn(), status: undefined, onStatus: vi.fn(), createdFrom: undefined, createdTo: undefined, onDateRange: vi.fn(),
}

// ...existing render/sort/empty tests keep working with {...base} ...

it('opens the Status filter menu from its column funnel', () => {
  render(<JobsTable jobs={[JOB]} onSort={vi.fn()} {...base} />)
  fireEvent.click(screen.getByRole('button', { name: /filter by status/i }))
  expect(screen.getByRole('option', { name: /all statuses/i })).toBeInTheDocument()
})

it('opens the Added date-range menu from its column funnel', () => {
  render(<JobsTable jobs={[JOB]} onSort={vi.fn()} {...base} />)
  fireEvent.click(screen.getByRole('button', { name: /filter by date added/i }))
  expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
})
```

> The existing "clicking the Company header sorts by company" test still calls `onSort('company')` — `onSort` is now wired to `cycleSort`, but the prop name is unchanged, so the assertion holds.

- [ ] **Step 2: Run it — expect FAIL** (no funnels; `status`/`onDateRange` props unused → TS error in test)

Run: `npm run test -- src/components/jobs/jobs-table.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update `src/components/jobs/jobs-table.tsx`**

3a. Add imports (top, after the existing ones):

```tsx
import { ColumnFunnel } from './column-funnel'
import { StatusFilterMenu } from './status-filter-menu'
import { DateRangeMenu } from './date-range-menu'
import type { JobStatus } from '@/lib/job-status'
```

3b. Replace the `Header` component to add the `group/header`, the Status funnel, and the Added funnel. The header now needs the filter props, so change its signature and body:

```tsx
function Header({
  sortBy,
  sortOrder,
  onSort,
  status,
  onStatus,
  createdFrom,
  createdTo,
  onDateRange,
}: {
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (f: SortField) => void
  status: JobStatus | undefined
  onStatus: (v: JobStatus | undefined) => void
  createdFrom?: string
  createdTo?: string
  onDateRange: (from?: string, to?: string) => void
}) {
  return (
    <div className={cn(GRID, 'group/header border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground')}>
      <SortHeader label="Title" field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <SortHeader label="Company" field="company" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <span className="hidden md:block">Location</span>
      <span className="inline-flex items-center gap-1">
        Status
        <ColumnFunnel label="Filter by status" active={status !== undefined}>
          <StatusFilterMenu value={status} onChange={onStatus} />
        </ColumnFunnel>
      </span>
      <SortHeader label="Ghost" field="lastActivityAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <span className="hidden items-center gap-1 md:inline-flex">
        <SortHeader label="Added" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
        <ColumnFunnel label="Filter by date added" active={createdFrom !== undefined || createdTo !== undefined}>
          <DateRangeMenu from={createdFrom} to={createdTo} onApply={onDateRange} />
        </ColumnFunnel>
      </span>
    </div>
  )
}
```

> Note the Added cell is now a wrapping `<span class="hidden ... md:inline-flex">` containing the `SortHeader` + funnel; that single span is the grid cell (replacing the bare `SortHeader ... className="hidden md:inline-flex"`). The Status cell wraps its label + funnel similarly. Selecting a status / applying a date closes the popover via `ColumnFunnel`'s anchored popover (clicking an option, or `Apply`, then the user dismisses; to auto-close on select, wrap the option/Apply in `AnchoredPopoverClose` — optional, omitted here to keep the menus independently testable).

3c. Extend `JobsTable`'s props and pass them to `Header`. Update the prop type and the `<Header .../>` call:

```tsx
export function JobsTable({
  jobs,
  sortBy,
  sortOrder,
  onSort,
  loading,
  isFiltered,
  onReset,
  status,
  onStatus,
  createdFrom,
  createdTo,
  onDateRange,
}: {
  jobs: Job[]
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  loading: boolean
  isFiltered: boolean
  onReset: () => void
  status: JobStatus | undefined
  onStatus: (value: JobStatus | undefined) => void
  createdFrom?: string
  createdTo?: string
  onDateRange: (from?: string, to?: string) => void
}) {
```

and the header render inside the returned table:

```tsx
        <Header
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
          status={status}
          onStatus={onStatus}
          createdFrom={createdFrom}
          createdTo={createdTo}
          onDateRange={onDateRange}
        />
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npm run test -- src/components/jobs/jobs-table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/jobs/jobs-table.tsx frontend-next/src/components/jobs/jobs-table.test.tsx
git commit -m "feat(frontend-next): per-column funnels on Status + Added; cycle-sort headers"
```

---

## Task 9: `JobsToolbar` — Search + Activity only; delete `SortControl`

**Files:**
- Modify: `frontend-next/src/components/jobs/jobs-toolbar.tsx`
- Test: `frontend-next/src/components/jobs/jobs-toolbar.test.tsx`
- Delete: `frontend-next/src/components/jobs/sort-control.tsx`, `sort-control.test.tsx`

- [ ] **Step 1: Rewrite the test `src/components/jobs/jobs-toolbar.test.tsx`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobsToolbar } from './jobs-toolbar'
import { DEFAULT_FILTERS } from '@/types/filters'

const handlers = { onSearch: vi.fn(), onGhost: vi.fn(), onReset: vi.fn() }

describe('JobsToolbar', () => {
  it('renders only search + activity (no status select, no sort control)', () => {
    render(<JobsToolbar filters={DEFAULT_FILTERS} showReset={false} {...handlers} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by activity/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/filter by status/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sort by/i)).not.toBeInTheDocument()
  })
  it('shows Clear all only when showReset and calls onReset', () => {
    const onReset = vi.fn()
    const { rerender } = render(<JobsToolbar filters={DEFAULT_FILTERS} showReset={false} {...handlers} onReset={onReset} />)
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
    rerender(<JobsToolbar filters={DEFAULT_FILTERS} showReset {...handlers} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(onReset).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (old toolbar takes `view`/`isFiltered`/`onStatus`/`onSort`)

Run: `npm run test -- src/components/jobs/jobs-toolbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite `src/components/jobs/jobs-toolbar.tsx`**

```tsx
'use client'

import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SearchInput } from './search-input'
import { GHOST_OPTIONS, type GhostFilter, type JobFilters } from '@/types/filters'

export function JobsToolbar({
  filters,
  showReset,
  onSearch,
  onGhost,
  onReset,
}: {
  filters: JobFilters
  showReset: boolean
  onSearch: (value: string) => void
  onGhost: (value: GhostFilter) => void
  onReset: () => void
}) {
  // A Fragment so each control is a direct flex item of the page-header actions row.
  return (
    <>
      <SearchInput value={filters.search} onChange={onSearch} />
      <Select
        aria-label="Filter by activity"
        value={filters.ghost}
        onChange={(e) => onGhost(e.target.value as GhostFilter)}
        className="h-10 w-40 shrink-0"
      >
        {GHOST_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      {showReset ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="shrink-0">
          Clear all
        </Button>
      ) : null}
    </>
  )
}
```

- [ ] **Step 4: Delete the now-unused `SortControl`**

```bash
git rm frontend-next/src/components/jobs/sort-control.tsx frontend-next/src/components/jobs/sort-control.test.tsx
```

- [ ] **Step 5: Run it — expect PASS**

Run: `npm run test -- src/components/jobs/jobs-toolbar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend-next/src/components/jobs/jobs-toolbar.tsx frontend-next/src/components/jobs/jobs-toolbar.test.tsx
git commit -m "feat(frontend-next): trim JobsToolbar to Search + Activity + Clear all; remove SortControl"
```

---

## Task 10: Wire `JobsWorkspace`

**Files:**
- Modify: `frontend-next/src/components/jobs/jobs-workspace.tsx`
- Test: `frontend-next/src/components/jobs/jobs-workspace.test.tsx`

- [ ] **Step 1: Update the test `src/components/jobs/jobs-workspace.test.tsx`**

The existing 5 tests should still pass after wiring, but the toolbar no longer renders status/sort. Add a regression that the header has no status select and that the table funnel exists. Append:

```ts
  it('keeps status filtering on the column funnel, not the header', () => {
    render(<JobsWorkspace initialJobs={PAGE} initialBoard={EMPTY_BOARD} />, { wrapper })
    // header: search + activity only
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.queryByLabelText(/filter by status/i + '')).toBeTruthy() // the column funnel button exists in the list table
  })
```

> If that assertion is awkward, a simpler check: `expect(screen.getByRole('button', { name: /filter by status/i })).toBeInTheDocument()` (the Status column funnel renders in the default list view). Keep the existing default-list / board / toggle / add-modal tests unchanged.

- [ ] **Step 2: Run it — expect FAIL** (workspace still uses `isFiltered`/`setSort`/old toolbar props)

Run: `npm run test -- src/components/jobs/jobs-workspace.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update `src/components/jobs/jobs-workspace.tsx`**

3a. Replace the `useJobFilters` destructure (line ~47):

```tsx
  const {
    filters, isBoardFiltered, isListFiltered,
    setSearch, setStatus, setGhost, setDateRange, cycleSort, setPage, resetAll,
  } = useJobFilters()
  const boardFilters = { search: filters.search, ghost: filters.ghost }
```

3b. The header count label + the actions: `count` uses the per-view predicate. Replace the `count` line and the `actions` toolbar usage + the description:

```tsx
  const count = view === 'board' ? board.stats.totalJobs : page.meta.total
  const filtered = view === 'board' ? isBoardFiltered : isListFiltered
  const showReset = isListFiltered || filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc' || filters.page > 1
```

In `actions`, replace the `<JobsToolbar .../>` call with the trimmed props:

```tsx
      <JobsToolbar filters={filters} showReset={showReset} onSearch={setSearch} onGhost={setGhost} onReset={resetAll} />
```

In the `PageHeader` description, use `filtered`:

```tsx
              <span className="font-mono tabular-nums">{count}</span> {filtered ? 'matching' : 'tracked'}
```

3c. Board branch — feed `isBoardFiltered`:

```tsx
            <KanbanBoard board={board} filters={boardFilters} isFiltered={isBoardFiltered} />
```

3d. List branch — pass cycle-sort + the column-filter props + `isListFiltered`:

```tsx
            <JobsTable
              jobs={page.data}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={cycleSort}
              loading={listQuery.isLoading}
              isFiltered={isListFiltered}
              onReset={resetAll}
              status={filters.status}
              onStatus={setStatus}
              createdFrom={filters.createdFrom}
              createdTo={filters.createdTo}
              onDateRange={setDateRange}
            />
            <JobsPagination meta={page.meta} onPage={setPage} />
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npm run test -- src/components/jobs/jobs-workspace.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-next/src/components/jobs/jobs-workspace.tsx frontend-next/src/components/jobs/jobs-workspace.test.tsx
git commit -m "feat(frontend-next): wire column filters + cycle-sort; board uses isBoardFiltered, list uses isListFiltered"
```

---

## Task 11: Full verification gate + progress.md

**Files:**
- Modify: `progress.md`

- [ ] **Step 1: Backend gate**

Run: `cd backend-express && npm run typecheck && npm run lint && npm run test`
Expected: PASS (incl. the new date-range repo + router tests; repo tests need the dev Postgres up).

- [ ] **Step 2: Frontend typecheck + lint**

Run: `cd frontend-next && npm run typecheck && npm run lint`
Expected: PASS. (If any leftover `isFiltered`/`setSort`/`SortControl` reference is flagged — e.g. an import of the deleted file — remove it.)

- [ ] **Step 3: Frontend tests**

Run: `cd frontend-next && npm run test`
Expected: PASS — all suites, including the new `status-filter-menu`, `date-range-menu`, `column-funnel`, and updated `filters`/`use-job-filters`/`jobs-table`/`jobs-toolbar`/`jobs-workspace`. Confirm `sort-control.test.tsx` is gone.

- [ ] **Step 4: Production build (Docker)**

Run (repo root): `docker build --target production ./frontend-next`
Expected: build succeeds (resolves `@radix-ui/react-popover`).

- [ ] **Step 5: Live smoke (manual, after the gate is green)**

```bash
docker compose up -d --build --force-recreate --renew-anon-volumes   # picks up the new dep
```
Through `:8080`, on `/app/jobs` (List): header shows only Search + Activity; tapping **Company** cycles asc → desc → off (arrow returns to **Added ▼**); hovering the header reveals funnels on **Status** and **Added**; the Status funnel filters; the Added funnel's From/To narrows by created date and shows an active dot; **Clear all** appears when any filter/sort is active and resets. On the Board: a status- or date-only filter does **not** show the "Reordering paused" hint (only search/ghost do).

- [ ] **Step 6: Update `progress.md`** — under the Slice 5 section, append:

```markdown
### Slice 5 follow-up — List column filters (Notion-style) (2026-06-04)
- Filters moved off the header onto the columns: **Search + Activity** are the only header controls; **Status** filter + **Added date-range** live in per-column hover **funnels** (new `@radix-ui/react-popover` anchored popover); tap a column to sort with a **3-state cycle** (asc → desc → off→default `createdAt` desc; Added toggles).
- Backend (additive, no migration): `createdFrom`/`createdTo` on `GET /api/jobs` (schema + repo SQL, end-of-day inclusive `createdTo`).
- `isFiltered` split into `isBoardFiltered` (search+ghost) and `isListFiltered` (all list filters) — also fixes the earlier nit where a status-only filter paused board reordering. `SortControl` removed.
- [x] Backend typecheck+lint+tests; frontend typecheck+lint+tests + Docker prod build — all green.
- [ ] Manual browser pass + merge to master (user merges).
```

- [ ] **Step 7: Commit**

```bash
git add progress.md
git commit -m "docs(progress): list column filters follow-up (per-column funnels, 3-state sort, date range)"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** §3 backend → Task 1; §4 model/URL/split → Tasks 2–3; §5 anchored popover → Task 4; §6 column menus → Tasks 5–8; §7 header/toolbar → Tasks 9–10; §9 tests → every task. Out-of-scope items (per-column text filters, Location, multi-select) are not implemented (correct).
- **Type consistency:** `cycleSort`/`setDateRange`/`isBoardFiltered`/`isListFiltered` are defined in Task 3 and consumed in Tasks 8–10; `JobsTable`'s new props (`status`/`onStatus`/`createdFrom`/`createdTo`/`onDateRange`) defined in Task 8 and passed in Task 10; `JobsToolbar`'s new shape (`filters`/`showReset`/`onSearch`/`onGhost`/`onReset`) defined in Task 9 and used in Task 10.
- **Green-tree caveat** (Tasks 2–3 → 10) noted in the header; per-file tests pass per task, full typecheck green from Task 10, gate in Task 11.
- **No backend migration** — `createdAt` already exists; only the query schema + repo WHERE change.
