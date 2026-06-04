# Slice 5 — Filters + Search + List View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL-synced search, status/ghost filters, sorting, and pagination across both the Board and List views of `/app/jobs`, with all filtering done server-side, and replace the plain list with a borderless, column-aligned, sortable list.

**Architecture:** Frontend-only. Both backend endpoints already implement and validate the full filter surface (`GET /api/jobs` → `{data, meta}` with page/limit/sortBy/sortOrder/search/status/ghostFilter; `GET /api/dashboard/kanban` → `{data:{columns,stats}}` with search/status/ghostFilter). A single `useJobFilters()` hook is the only place the URL↔filter mapping lives; `parseFilters` is shared by the SSR page and the client hook so query keys match on first render. Filter-encoded query keys nest under the existing `['jobs']` / `['dashboard','kanban']` prefixes so current mutation invalidations keep working. The board uses a "hybrid" drag rule (cross-column status changes stay enabled while filtered; within-column reordering is suppressed) implemented as a pure `resolveDrop` helper.

**Tech Stack:** Next.js 15 (App Router) + React 19, TanStack Query v5 (`keepPreviousData`), Tailwind v4, Vitest + React Testing Library. Strict TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-04-slice-5-filters-search-list-design.md`

**Working dir for all commands:** `frontend-next/`. Per-test command: `npm run test -- <path>` (Vitest). Full gate: `npm run typecheck && npm run lint && npm run test && npm run build`.

**Conventions:** Commit per task. Commit messages: conventional-commits, **no "Claude"**, no Co-Authored-By trailer. Do **not** `git push`. Every styled element is its own component (no inline styled markup).

---

## File map

**New**
- `src/types/filters.ts` — filter/pagination types + option tables.
- `src/lib/filters.ts` — `parseFilters`, `isFiltered`, `buildListQuery`, `buildBoardQuery` (pure).
- `src/hooks/use-debounced-value.ts` — debounce hook.
- `src/hooks/use-job-filters.ts` — URL↔filter state hook.
- `src/components/jobs/search-input.tsx` — debounced search + Cmd/⌘K + clear.
- `src/components/jobs/sort-control.tsx` — sort field select + direction toggle.
- `src/components/jobs/jobs-toolbar.tsx` — the FilterBar (per-view controls + reset).
- `src/components/jobs/jobs-table.tsx` — borderless aligned sortable list (replaces `jobs-list.tsx`).
- `src/components/jobs/jobs-pagination.tsx` — prev/next + range.
- `src/components/kanban/reorder-paused-hint.tsx` — board hint when filtered.

**Modified**
- `src/lib/query-keys.ts` — add `jobsListKey`, `kanbanKey`.
- `src/lib/relative-time.ts` — add `shortDate`.
- `src/lib/dashboard-defaults.ts` — add `EMPTY_JOBS_PAGE`.
- `src/lib/api-client.ts` — add `getPage` (preserve `meta`).
- `src/lib/api-server.ts` — add `getPage`.
- `src/hooks/use-jobs.ts` — filter-aware `useJobs` returning `Paginated<Job>`.
- `src/hooks/use-dashboard.ts` — filter-aware `useKanban`.
- `src/components/kanban/kanban-board.tsx` — controlled board, active-key optimistic writes, hybrid-drag via `resolveDrop`, hint.
- `src/lib/kanban.ts` — add `isStatus` + `resolveDrop` (pure).
- `src/components/jobs/jobs-workspace.tsx` — own filters + both queries; wire toolbar/table/pagination/board.
- `src/app/app/jobs/page.tsx` — parse filter searchParams, filtered SSR fetch, seed keys.

**Removed**
- `src/components/jobs/jobs-list.tsx` + `src/components/jobs/jobs-list.test.tsx`.

---

## Task 1: Filter types + pure filter logic

**Files:**
- Create: `src/types/filters.ts`
- Create: `src/lib/filters.ts`
- Test: `src/lib/filters.test.ts`

- [ ] **Step 1: Write `src/types/filters.ts`** (pure type declarations + option tables — no logic, so no test needed for this file)

```ts
import type { JobStatus } from '@/lib/job-status'

export type GhostFilter = 'all' | 'active' | 'stale' | 'ghost'
export type SortField = 'title' | 'company' | 'createdAt' | 'updatedAt' | 'lastActivityAt'
export type SortOrder = 'asc' | 'desc'

export interface JobFilters {
  search: string
  status?: JobStatus
  ghost: GhostFilter
  sortBy: SortField
  sortOrder: SortOrder
  page: number
}

export interface PageMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Paginated<T> {
  data: T[]
  meta: PageMeta
}

// The unfiltered defaults. Mirrors the backend's GET /api/jobs defaults exactly
// (sortBy=createdAt, sortOrder=desc, page=1) so an unfiltered URL is bare.
export const DEFAULT_FILTERS: JobFilters = {
  search: '',
  ghost: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
}

// Sort fields exposed in the List UI: a strict subset of the backend SORT_FIELDS
// (kanbanOrder is intentionally excluded — not a meaningful user-facing sort).
export const SORT_OPTIONS: ReadonlyArray<{ value: SortField; label: string }> = [
  { value: 'createdAt', label: 'Date added' },
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'lastActivityAt', label: 'Last activity' },
  { value: 'title', label: 'Title' },
  { value: 'company', label: 'Company' },
]

export const GHOST_OPTIONS: ReadonlyArray<{ value: GhostFilter; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'active', label: 'Active (≤7d)' },
  { value: 'stale', label: 'Stale (8–14d)' },
  { value: 'ghost', label: 'Ghosted (>14d)' },
]
```

- [ ] **Step 2: Write the failing test `src/lib/filters.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseFilters, isFiltered, buildListQuery, buildBoardQuery } from './filters'
import { DEFAULT_FILTERS } from '@/types/filters'

describe('parseFilters', () => {
  it('returns defaults for empty params', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS)
  })

  it('reads URL param names and coerces page', () => {
    const f = parseFilters(new URLSearchParams('search=rust&status=APPLIED&ghost=stale&sort=company&dir=asc&page=3'))
    expect(f).toEqual({ search: 'rust', status: 'APPLIED', ghost: 'stale', sortBy: 'company', sortOrder: 'asc', page: 3 })
  })

  it('falls back to defaults for invalid enum/page values', () => {
    const f = parseFilters(new URLSearchParams('status=NOPE&ghost=weird&sort=bogus&dir=sideways&page=0'))
    expect(f.status).toBeUndefined()
    expect(f.ghost).toBe('all')
    expect(f.sortBy).toBe('createdAt')
    expect(f.sortOrder).toBe('desc')
    expect(f.page).toBe(1)
  })

  it('trims search', () => {
    expect(parseFilters(new URLSearchParams('search=%20%20hi%20%20')).search).toBe('hi')
  })
})

describe('isFiltered', () => {
  it('is false for defaults and true for any narrowing filter', () => {
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false)
    expect(isFiltered({ ...DEFAULT_FILTERS, search: 'x' })).toBe(true)
    expect(isFiltered({ ...DEFAULT_FILTERS, status: 'APPLIED' })).toBe(true)
    expect(isFiltered({ ...DEFAULT_FILTERS, ghost: 'ghost' })).toBe(true)
  })

  it('ignores sort/page (they are not narrowing filters)', () => {
    expect(isFiltered({ ...DEFAULT_FILTERS, sortBy: 'title', sortOrder: 'asc', page: 4 })).toBe(false)
  })
})

describe('buildListQuery', () => {
  it('is empty for defaults', () => {
    expect(buildListQuery(DEFAULT_FILTERS)).toBe('')
  })

  it('maps URL state to API param names, omitting defaults', () => {
    const qs = buildListQuery({ search: 'rust', status: 'APPLIED', ghost: 'stale', sortBy: 'company', sortOrder: 'asc', page: 2 })
    const p = new URLSearchParams(qs.replace(/^\?/, ''))
    expect(p.get('search')).toBe('rust')
    expect(p.get('status')).toBe('APPLIED')
    expect(p.get('ghostFilter')).toBe('stale')
    expect(p.get('sortBy')).toBe('company')
    expect(p.get('sortOrder')).toBe('asc')
    expect(p.get('page')).toBe('2')
  })
})

describe('buildBoardQuery', () => {
  it('includes only search + ghostFilter, omitting defaults', () => {
    expect(buildBoardQuery({ search: '', ghost: 'all' })).toBe('')
    const qs = buildBoardQuery({ search: 'acme', ghost: 'active' })
    const p = new URLSearchParams(qs.replace(/^\?/, ''))
    expect(p.get('search')).toBe('acme')
    expect(p.get('ghostFilter')).toBe('active')
    expect(p.has('status')).toBe(false)
    expect(p.has('sortBy')).toBe(false)
  })
})
```

- [ ] **Step 3: Run the test — expect FAIL** (`./filters` not found)

Run: `npm run test -- src/lib/filters.test.ts`
Expected: FAIL (cannot resolve `./filters`).

- [ ] **Step 4: Write `src/lib/filters.ts`**

```ts
import { JOB_STATUSES, type JobStatus } from '@/lib/job-status'
import { DEFAULT_FILTERS, type GhostFilter, type JobFilters, type SortField, type SortOrder } from '@/types/filters'

const GHOST_VALUES: readonly string[] = ['all', 'active', 'stale', 'ghost']
const SORT_VALUES: readonly string[] = ['title', 'company', 'createdAt', 'updatedAt', 'lastActivityAt']

function asGhost(v: string | null): GhostFilter {
  return v && GHOST_VALUES.includes(v) ? (v as GhostFilter) : 'all'
}
function asSortField(v: string | null): SortField {
  return v && SORT_VALUES.includes(v) ? (v as SortField) : 'createdAt'
}
function asSortOrder(v: string | null): SortOrder {
  return v === 'asc' ? 'asc' : 'desc'
}
function asStatus(v: string | null): JobStatus | undefined {
  return v && (JOB_STATUSES as readonly string[]).includes(v) ? (v as JobStatus) : undefined
}
function asPage(v: string | null): number {
  const n = v ? Number.parseInt(v, 10) : 1
  return Number.isFinite(n) && n >= 1 ? n : 1
}

// Reads filter state from URL query params, falling back to defaults. `params`
// is anything with `.get(name)` — URLSearchParams or Next's ReadonlyURLSearchParams.
export function parseFilters(params: { get(name: string): string | null }): JobFilters {
  const status = asStatus(params.get('status'))
  return {
    search: params.get('search')?.trim() ?? '',
    ...(status ? { status } : {}),
    ghost: asGhost(params.get('ghost')),
    sortBy: asSortField(params.get('sort')),
    sortOrder: asSortOrder(params.get('dir')),
    page: asPage(params.get('page')),
  }
}

// True when a *narrowing* filter is active. Sort/page are not "filters" here —
// an active sort must not pause board reorder.
export function isFiltered(f: JobFilters): boolean {
  return f.search !== '' || f.status !== undefined || f.ghost !== 'all'
}

// Builds the `/api/jobs` query string (URL names → API names), defaults omitted.
export function buildListQuery(f: JobFilters): string {
  const p = new URLSearchParams()
  if (f.search) p.set('search', f.search)
  if (f.status) p.set('status', f.status)
  if (f.ghost !== DEFAULT_FILTERS.ghost) p.set('ghostFilter', f.ghost)
  if (f.sortBy !== DEFAULT_FILTERS.sortBy) p.set('sortBy', f.sortBy)
  if (f.sortOrder !== DEFAULT_FILTERS.sortOrder) p.set('sortOrder', f.sortOrder)
  if (f.page !== DEFAULT_FILTERS.page) p.set('page', String(f.page))
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

// Builds the `/api/dashboard/kanban` query string (only search + ghostFilter).
export function buildBoardQuery(f: { search: string; ghost: GhostFilter }): string {
  const p = new URLSearchParams()
  if (f.search) p.set('search', f.search)
  if (f.ghost !== 'all') p.set('ghostFilter', f.ghost)
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}
```

- [ ] **Step 5: Run the test — expect PASS**

Run: `npm run test -- src/lib/filters.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/types/filters.ts src/lib/filters.ts src/lib/filters.test.ts
git commit -m "feat(frontend-next): filter types + pure URL<->API filter mapping (Slice 5)"
```

---

## Task 2: `useDebouncedValue` hook

**Files:**
- Create: `src/hooks/use-debounced-value.ts`
- Test: `src/hooks/use-debounced-value.test.ts`

- [ ] **Step 1: Write the failing test `src/hooks/use-debounced-value.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from './use-debounced-value'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300))
    expect(result.current).toBe('a')
  })

  it('updates only after the delay, collapsing rapid changes', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'ab' })
    rerender({ v: 'abc' })
    expect(result.current).toBe('a') // not yet elapsed
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('abc') // only the last value lands
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL** (module not found)

Run: `npm run test -- src/hooks/use-debounced-value.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `src/hooks/use-debounced-value.ts`**

```ts
'use client'

import { useEffect, useState } from 'react'

// Returns `value` delayed by `delayMs`; rapid changes within the window collapse
// to the final value (the timer resets on each change).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/hooks/use-debounced-value.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-debounced-value.ts src/hooks/use-debounced-value.test.ts
git commit -m "feat(frontend-next): useDebouncedValue hook (Slice 5)"
```

---

## Task 3: Query keys + date helper + empty-page default

**Files:**
- Modify: `src/lib/query-keys.ts`
- Modify: `src/lib/relative-time.ts`
- Modify: `src/lib/dashboard-defaults.ts`
- Test: `src/lib/query-keys.test.ts` (new), `src/lib/relative-time.test.ts` (extend)

- [ ] **Step 1: Write the failing test `src/lib/query-keys.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { JOBS_KEY, DASHBOARD_KANBAN_KEY, jobsListKey, kanbanKey } from './query-keys'
import { DEFAULT_FILTERS } from '@/types/filters'

describe('jobsListKey', () => {
  it('nests under the JOBS_KEY prefix so prefix-invalidation still matches', () => {
    const key = jobsListKey(DEFAULT_FILTERS)
    expect(key.slice(0, JOBS_KEY.length)).toEqual([...JOBS_KEY])
    expect(key[1]).toBe('list')
  })

  it('differs when any filter differs', () => {
    expect(jobsListKey(DEFAULT_FILTERS)).not.toEqual(jobsListKey({ ...DEFAULT_FILTERS, page: 2 }))
  })
})

describe('kanbanKey', () => {
  it('nests under the DASHBOARD_KANBAN_KEY prefix', () => {
    const key = kanbanKey({ search: '', ghost: 'all' })
    expect(key.slice(0, DASHBOARD_KANBAN_KEY.length)).toEqual([...DASHBOARD_KANBAN_KEY])
  })

  it('differs when search or ghost differs', () => {
    expect(kanbanKey({ search: '', ghost: 'all' })).not.toEqual(kanbanKey({ search: 'x', ghost: 'all' }))
    expect(kanbanKey({ search: '', ghost: 'all' })).not.toEqual(kanbanKey({ search: '', ghost: 'ghost' }))
  })
})
```

- [ ] **Step 2: Add the test to `src/lib/relative-time.test.ts`** (append inside the file; keep existing tests)

```ts
import { shortDate } from './relative-time'

describe('shortDate', () => {
  it('formats an ISO date as "Mon D"', () => {
    expect(shortDate('2026-05-28T10:00:00.000Z')).toMatch(/May\s+28/)
  })
  it('returns an em dash for empty/invalid input', () => {
    expect(shortDate('')).toBe('—')
    expect(shortDate('not-a-date')).toBe('—')
  })
})
```

> Note: if the file uses top-of-file imports, move `import { shortDate } ...` up with the existing imports rather than mid-file.

- [ ] **Step 3: Run the tests — expect FAIL** (`jobsListKey`/`kanbanKey`/`shortDate` not exported)

Run: `npm run test -- src/lib/query-keys.test.ts src/lib/relative-time.test.ts`
Expected: FAIL.

- [ ] **Step 4: Edit `src/lib/query-keys.ts`** — append:

```ts
import type { JobFilters, GhostFilter } from '@/types/filters'

// Filtered list cache key. Nested under ['jobs', ...] so existing
// invalidateQueries({ queryKey: JOBS_KEY }) (prefix match) still refreshes it.
export const jobsListKey = (f: JobFilters) =>
  ['jobs', 'list', f.search, f.status ?? null, f.ghost, f.sortBy, f.sortOrder, f.page] as const

// Filtered board cache key. Nested under ['dashboard','kanban', ...] so existing
// prefix invalidations still match.
export const kanbanKey = (f: { search: string; ghost: GhostFilter }) =>
  ['dashboard', 'kanban', f.search, f.ghost] as const
```

- [ ] **Step 5: Edit `src/lib/relative-time.ts`** — append:

```ts
// Short calendar date, e.g. "May 28". Returns an em dash for empty/invalid input.
export function shortDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
```

- [ ] **Step 6: Edit `src/lib/dashboard-defaults.ts`** — add an empty paginated page (read the file first; append alongside `EMPTY_BOARD`/`EMPTY_STATS`):

```ts
import type { Paginated } from '@/types/filters'
import type { Job } from '@/types/job'

export const EMPTY_JOBS_PAGE: Paginated<Job> = {
  data: [],
  meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
}
```

- [ ] **Step 7: Run the tests — expect PASS**

Run: `npm run test -- src/lib/query-keys.test.ts src/lib/relative-time.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/query-keys.ts src/lib/query-keys.test.ts src/lib/relative-time.ts src/lib/relative-time.test.ts src/lib/dashboard-defaults.ts
git commit -m "feat(frontend-next): filter-encoded query keys, shortDate, empty jobs page (Slice 5)"
```

---

## Task 4: Envelope-preserving fetch (`getPage`)

**Files:**
- Modify: `src/lib/api-client.ts`
- Modify: `src/lib/api-server.ts`
- Test: `src/lib/api-client.test.ts` (extend)

> `api-server` is server-only (forwards cookies via `next/headers`) and is untested today by codebase convention; its `getPage` mirrors `api-client`'s and is covered by the page.tsx SSR path + the live smoke. Only `api-client.getPage` gets a unit test.

- [ ] **Step 1: Add the failing test to `src/lib/api-client.test.ts`** (new `it` inside the existing `describe('apiClient', …)`)

```ts
  it('getPage returns the full {data, meta} envelope without unwrapping', async () => {
    mockFetch({ status: 200, body: { data: [{ id: 'j1' }], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } } })
    const page = await apiClient.getPage<{ id: string }>('/api/jobs')
    expect(page.data[0]?.id).toBe('j1')
    expect(page.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 })
  })
```

- [ ] **Step 2: Run the test — expect FAIL** (`apiClient.getPage` is not a function)

Run: `npm run test -- src/lib/api-client.test.ts`
Expected: FAIL.

- [ ] **Step 3: Edit `src/lib/api-client.ts`**

3a. Add the type import at the top (after the existing comment block / `API_BASE`):

```ts
import type { Paginated } from '@/types/filters'
```

3b. Change the `request` signature to accept a trailing `unwrap` flag and thread it through the retry recursion. Replace the signature line and the retry-recursion line:

```ts
// signature — add `unwrap = true` as the LAST param:
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
  isRetry = false,
  unwrap = true,
): Promise<T> {
```

```ts
// retry recursion — propagate `unwrap`:
    if (refreshed) return request<T>(method, path, body, init, true, unwrap)
```

3c. Change the success unwrap block at the end of `request`:

```ts
  if (unwrap && payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as SuccessEnvelope<T>).data
  }
  return payload as T
```

3d. Add `getPage` to the exported `apiClient` object (alongside `get`):

```ts
  getPage: <T>(path: string, init?: RequestInit) =>
    request<Paginated<T>>('GET', path, undefined, init, false, false),
```

- [ ] **Step 4: Run the test — expect PASS** (and confirm the existing refresh/unwrap tests still pass)

Run: `npm run test -- src/lib/api-client.test.ts`
Expected: PASS (all cases, including the existing silent-refresh tests).

- [ ] **Step 5: Edit `src/lib/api-server.ts`** (mirror)

5a. Add the import at the top:

```ts
import type { Paginated } from '@/types/filters'
```

5b. Change the `request` signature to add a trailing `unwrap = true`:

```ts
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
  unwrap = true,
): Promise<T> {
```

5c. Change the success unwrap block:

```ts
  if (unwrap && payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as SuccessEnvelope<T>).data
  }
  return payload as T
```

5d. Add `getPage` to the exported `apiServer` object:

```ts
  getPage: <T>(path: string, init?: RequestInit) =>
    request<Paginated<T>>('GET', path, undefined, init, false),
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/api-client.ts src/lib/api-client.test.ts src/lib/api-server.ts
git commit -m "feat(frontend-next): apiClient/apiServer.getPage preserve pagination meta (Slice 5)"
```

---

## Task 5: Filter-aware `useJobs`

**Files:**
- Modify: `src/hooks/use-jobs.ts`
- Test: `src/hooks/use-jobs.test.tsx` (update the existing `useJobs` test + its api-client mock)

- [ ] **Step 1: Update the test `src/hooks/use-jobs.test.tsx`**

1a. Add `getPage` to the api-client mock factory (the `vi.mock('@/lib/api-client', …)` block):

```ts
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), getPage: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))
```

1b. Replace the entire `describe('useJobs', …)` block with:

```ts
import { DEFAULT_FILTERS } from '@/types/filters'

describe('useJobs', () => {
  it('fetches the filtered page from /api/jobs and returns {data, meta}', async () => {
    api.getPage.mockResolvedValue({ data: [{ id: 'j1', title: 'SWE' }], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } })
    const { result } = renderHook(() => useJobs(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.data?.data[0]?.id).toBe('j1'))
    expect(api.getPage).toHaveBeenCalledWith('/api/jobs')
    expect(result.current.data?.meta.total).toBe(1)
  })

  it('appends the built query string for active filters', async () => {
    api.getPage.mockResolvedValue({ data: [], meta: { total: 0, page: 2, limit: 20, totalPages: 0 } })
    renderHook(() => useJobs({ ...DEFAULT_FILTERS, search: 'rust', page: 2 }), { wrapper })
    await waitFor(() => expect(api.getPage).toHaveBeenCalled())
    expect(api.getPage).toHaveBeenCalledWith('/api/jobs?search=rust&page=2')
  })
})
```

> Keep the `import { DEFAULT_FILTERS }` with the other top imports rather than mid-file. The mutation `describe` blocks are unchanged.

- [ ] **Step 2: Run the test — expect FAIL** (`useJobs` still takes `initialData?: Job[]` and calls `apiClient.get`)

Run: `npm run test -- src/hooks/use-jobs.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Edit `src/hooks/use-jobs.ts`**

3a. Update imports (top of file):

```ts
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { JOBS_KEY, jobKey, jobsListKey, DASHBOARD_KANBAN_KEY, DASHBOARD_STATS_KEY } from '@/lib/query-keys'
import { buildListQuery } from '@/lib/filters'
import type { Job, ScrapeResult } from '@/types/job'
import type { JobFilters, Paginated } from '@/types/filters'
import type { ManualJobValues, UpdateJobValues } from '@/schemas/job'

export { JOBS_KEY, jobKey }
```

3b. Replace the `useJobs` function:

```ts
export function useJobs(filters: JobFilters, initialData?: Paginated<Job>) {
  return useQuery({
    queryKey: jobsListKey(filters),
    queryFn: () => apiClient.getPage<Job>(`/api/jobs${buildListQuery(filters)}`),
    // Keep showing the previous page while the next one loads (no empty flash on
    // paging/sorting/filtering).
    placeholderData: keepPreviousData,
    // Always refetch on mount: a server render that came back empty due to a
    // just-expired access token re-runs here and silently refreshes the session.
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}
```

> Leave `useJob`, `useCreateJob`, `useScrapeJob`, `useUpdateJob`, `useDeleteJob` unchanged — they still invalidate `JOBS_KEY` (prefix), which now also matches every `jobsListKey(...)` variant.

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/hooks/use-jobs.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-jobs.ts src/hooks/use-jobs.test.tsx
git commit -m "feat(frontend-next): filter-aware useJobs returns paginated {data, meta} (Slice 5)"
```

---

## Task 6: Filter-aware `useKanban`

**Files:**
- Modify: `src/hooks/use-dashboard.ts`
- Test: `src/hooks/use-dashboard.test.tsx` (update the `useKanban` test)

- [ ] **Step 1: Update the `useKanban` test in `src/hooks/use-dashboard.test.tsx`**

Replace the `describe('useKanban', …)` block with:

```ts
describe('useKanban', () => {
  it('fetches the board from /api/dashboard/kanban for default filters', async () => {
    api.get.mockResolvedValue({ columns: [], stats: { totalJobs: 0 } })
    const { result } = renderHook(() => useKanban({ search: '', ghost: 'all' }), { wrapper })
    await waitFor(() => expect(result.current.data?.stats.totalJobs).toBe(0))
    expect(api.get).toHaveBeenCalledWith('/api/dashboard/kanban')
  })

  it('appends search + ghostFilter when filtered', async () => {
    api.get.mockResolvedValue({ columns: [], stats: { totalJobs: 0 } })
    renderHook(() => useKanban({ search: 'acme', ghost: 'ghost' }), { wrapper })
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(api.get).toHaveBeenCalledWith('/api/dashboard/kanban?search=acme&ghostFilter=ghost')
  })
})
```

> The `useMoveJob` and `useStats` describe blocks are unchanged.

- [ ] **Step 2: Run the test — expect FAIL** (`useKanban()` currently takes `initialData?` only and ignores filters)

Run: `npm run test -- src/hooks/use-dashboard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Edit `src/hooks/use-dashboard.ts`**

3a. Update imports (top of file):

```ts
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { DASHBOARD_KANBAN_KEY, DASHBOARD_STATS_KEY, JOBS_KEY, kanbanKey } from '@/lib/query-keys'
import { buildBoardQuery } from '@/lib/filters'
import type { KanbanBoard, DashboardStats } from '@/types/dashboard'
import type { GhostFilter } from '@/types/filters'
import type { JobStatus } from '@/lib/job-status'
```

3b. Replace the `useKanban` function:

```ts
export function useKanban(filters: { search: string; ghost: GhostFilter }, initialData?: KanbanBoard) {
  return useQuery({
    queryKey: kanbanKey(filters),
    queryFn: () => apiClient.get<KanbanBoard>(`/api/dashboard/kanban${buildBoardQuery(filters)}`),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}
```

> `useStats` and `useMoveJob` are unchanged. `useMoveJob.onSettled` keeps invalidating `DASHBOARD_KANBAN_KEY` (prefix) — which matches every `kanbanKey(...)` variant.

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/hooks/use-dashboard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-dashboard.ts src/hooks/use-dashboard.test.tsx
git commit -m "feat(frontend-next): filter-aware useKanban (search + ghost, server-driven) (Slice 5)"
```

---

## Task 7: `useJobFilters` (URL ↔ filter state)

**Files:**
- Create: `src/hooks/use-job-filters.ts`
- Test: `src/hooks/use-job-filters.test.tsx`

- [ ] **Step 1: Write the failing test `src/hooks/use-job-filters.test.tsx`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { replace, searchParams } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => searchParams,
}))

import { useJobFilters } from './use-job-filters'

beforeEach(() => {
  vi.clearAllMocks()
  for (const k of ['search', 'status', 'ghost', 'sort', 'dir', 'page', 'view', 'job']) searchParams.delete(k)
})

function lastUrl(): string {
  const calls = replace.mock.calls
  return String(calls[calls.length - 1]?.[0] ?? '')
}

describe('useJobFilters', () => {
  it('parses defaults and reports not-filtered', () => {
    const { result } = renderHook(() => useJobFilters())
    expect(result.current.filters.sortBy).toBe('createdAt')
    expect(result.current.isFiltered).toBe(false)
  })

  it('setSearch writes search and emits scroll:false', () => {
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setSearch('rust'))
    expect(lastUrl()).toBe('/app/jobs?search=rust')
    expect(replace).toHaveBeenLastCalledWith('/app/jobs?search=rust', { scroll: false })
  })

  it('setSearch with blank clears the param', () => {
    searchParams.set('search', 'old')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setSearch('   '))
    expect(lastUrl()).toBe('/app/jobs')
  })

  it('preserves view and job params', () => {
    searchParams.set('view', 'board')
    searchParams.set('job', 'j1')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setGhost('ghost'))
    const url = new URL(lastUrl(), 'http://x')
    expect(url.searchParams.get('view')).toBe('board')
    expect(url.searchParams.get('job')).toBe('j1')
    expect(url.searchParams.get('ghost')).toBe('ghost')
  })

  it('changing a filter resets page to 1 (drops the page param)', () => {
    searchParams.set('page', '4')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setStatus('APPLIED'))
    const url = new URL(lastUrl(), 'http://x')
    expect(url.searchParams.has('page')).toBe(false)
    expect(url.searchParams.get('status')).toBe('APPLIED')
  })

  it('setPage sets page but does NOT reset it', () => {
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setPage(3))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('page')).toBe('3')
    act(() => result.current.setPage(1))
    expect(new URL(lastUrl(), 'http://x').searchParams.has('page')).toBe(false) // page 1 is the default
  })

  it('setSort sets a new field (default dir) and toggles dir on the active field', () => {
    const { result, rerender } = renderHook(() => useJobFilters())
    act(() => result.current.setSort('company'))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('sort')).toBe('company')
    expect(new URL(lastUrl(), 'http://x').searchParams.has('dir')).toBe(false) // desc default → omitted
    // Simulate the URL now reflecting sort=company, then re-click the same field.
    searchParams.set('sort', 'company')
    rerender()
    act(() => result.current.setSort('company'))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('dir')).toBe('asc')
  })

  it('resetAll clears filter params but keeps view/job', () => {
    searchParams.set('search', 'x')
    searchParams.set('status', 'APPLIED')
    searchParams.set('view', 'board')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.resetAll())
    const url = new URL(lastUrl(), 'http://x')
    expect(url.searchParams.has('search')).toBe(false)
    expect(url.searchParams.has('status')).toBe(false)
    expect(url.searchParams.get('view')).toBe('board')
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL** (module not found)

Run: `npm run test -- src/hooks/use-job-filters.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `src/hooks/use-job-filters.ts`**

```ts
'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseFilters, isFiltered as computeIsFiltered } from '@/lib/filters'
import type { GhostFilter, JobFilters, SortField } from '@/types/filters'
import type { JobStatus } from '@/lib/job-status'

export interface UseJobFilters {
  filters: JobFilters
  isFiltered: boolean
  setSearch: (value: string) => void
  setStatus: (value: JobStatus | undefined) => void
  setGhost: (value: GhostFilter) => void
  /** Sets `field` (desc by default), or toggles direction when `field` is already active. */
  setSort: (field: SortField) => void
  setPage: (page: number) => void
  resetAll: () => void
}

const FILTER_KEYS = ['search', 'status', 'ghost', 'sort', 'dir', 'page'] as const

export function useJobFilters(): UseJobFilters {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = parseFilters(searchParams)

  // Clones the current params, applies `mutate`, optionally resets page, and
  // replaces the URL — always preserving non-filter params (view/job).
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
  const setSort = useCallback(
    (field: SortField) =>
      commit((p) => {
        const current = parseFilters(searchParams)
        const nextOrder = current.sortBy === field && current.sortOrder === 'desc' ? 'asc' : 'desc'
        if (field === 'createdAt') p.delete('sort')
        else p.set('sort', field)
        if (nextOrder === 'asc') p.set('dir', 'asc')
        else p.delete('dir')
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
    isFiltered: computeIsFiltered(filters),
    setSearch,
    setStatus,
    setGhost,
    setSort,
    setPage,
    resetAll,
  }
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/hooks/use-job-filters.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-job-filters.ts src/hooks/use-job-filters.test.tsx
git commit -m "feat(frontend-next): useJobFilters — single URL<->filter source of truth (Slice 5)"
```

---

## Task 8: `SearchInput` (debounced + Cmd/⌘K + clear)

**Files:**
- Create: `src/components/jobs/search-input.tsx`
- Test: `src/components/jobs/search-input.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/jobs/search-input.test.tsx`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SearchInput } from './search-input'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('SearchInput', () => {
  it('debounces input and calls onChange once with the final value', () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'ru' } })
    fireEvent.change(input, { target: { value: 'rust' } })
    expect(onChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('rust')
  })

  it('shows a clear button when non-empty and clears on click', () => {
    const onChange = vi.fn()
    render(<SearchInput value="rust" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('focuses the input on Cmd/Ctrl+K', () => {
    render(<SearchInput value="" onChange={vi.fn()} />)
    const input = screen.getByRole('searchbox')
    expect(input).not.toHaveFocus()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(input).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL** (module not found)

Run: `npm run test -- src/components/jobs/search-input.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `src/components/jobs/search-input.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search jobs…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [local, setLocal] = useState(value)
  const debounced = useDebouncedValue(local, 300)
  const ref = useRef<HTMLInputElement>(null)

  // Keep the field in sync when the URL value changes externally (back/forward, reset).
  useEffect(() => setLocal(value), [value])

  // Push the debounced value up, but never echo a value already in the URL
  // (prevents a write loop).
  useEffect(() => {
    if (debounced !== value) onChange(debounced)
  }, [debounced, value, onChange])

  // Cmd/Ctrl+K focuses the search field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        ref={ref}
        type="search"
        role="searchbox"
        aria-label="Search jobs"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="pl-9 pr-9"
      />
      {local ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setLocal(''); onChange('') }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
```

> `<input type="search">` already has the implicit ARIA role `searchbox`; the explicit `role` keeps the query unambiguous in jsdom.

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/components/jobs/search-input.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/jobs/search-input.tsx src/components/jobs/search-input.test.tsx
git commit -m "feat(frontend-next): SearchInput — debounced search with Cmd/K focus + clear (Slice 5)"
```

---

## Task 9: `SortControl` (field select + direction toggle)

**Files:**
- Create: `src/components/jobs/sort-control.tsx`
- Test: `src/components/jobs/sort-control.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/jobs/sort-control.test.tsx`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SortControl } from './sort-control'

describe('SortControl', () => {
  it('calls onSort with the chosen field', () => {
    const onSort = vi.fn()
    render(<SortControl sortBy="createdAt" sortOrder="desc" onSort={onSort} />)
    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: 'company' } })
    expect(onSort).toHaveBeenCalledWith('company')
  })

  it('toggles direction by calling onSort with the active field', () => {
    const onSort = vi.fn()
    render(<SortControl sortBy="company" sortOrder="asc" onSort={onSort} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle sort direction/i }))
    expect(onSort).toHaveBeenCalledWith('company')
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL** (module not found)

Run: `npm run test -- src/components/jobs/sort-control.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `src/components/jobs/sort-control.tsx`**

```tsx
'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SORT_OPTIONS, type SortField, type SortOrder } from '@/types/filters'

export function SortControl({
  sortBy,
  sortOrder,
  onSort,
}: {
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
}) {
  const DirIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown
  return (
    <div className="flex items-center gap-1.5">
      <Select
        aria-label="Sort by"
        value={sortBy}
        onChange={(e) => onSort(e.target.value as SortField)}
        className="h-10 w-40"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Toggle sort direction"
        onClick={() => onSort(sortBy)}
      >
        <DirIcon className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/components/jobs/sort-control.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/jobs/sort-control.tsx src/components/jobs/sort-control.test.tsx
git commit -m "feat(frontend-next): SortControl — field select + direction toggle (Slice 5)"
```

---

## Task 10: `JobsToolbar` (the FilterBar)

**Files:**
- Create: `src/components/jobs/jobs-toolbar.tsx`
- Test: `src/components/jobs/jobs-toolbar.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/jobs/jobs-toolbar.test.tsx`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobsToolbar } from './jobs-toolbar'
import { DEFAULT_FILTERS } from '@/types/filters'

const noop = vi.fn()
const handlers = { onSearch: noop, onStatus: noop, onGhost: noop, onSort: noop, onReset: noop }

describe('JobsToolbar', () => {
  it('list view shows search, status, ghost, and sort', () => {
    render(<JobsToolbar view="list" filters={DEFAULT_FILTERS} isFiltered={false} {...handlers} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by activity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
  })

  it('board view shows search + ghost only (no status, no sort)', () => {
    render(<JobsToolbar view="board" filters={DEFAULT_FILTERS} isFiltered={false} {...handlers} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by activity/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/filter by status/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sort by/i)).not.toBeInTheDocument()
  })

  it('shows Reset only when filtered and calls onReset', () => {
    const onReset = vi.fn()
    const { rerender } = render(
      <JobsToolbar view="list" filters={DEFAULT_FILTERS} isFiltered={false} {...handlers} onReset={onReset} />,
    )
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    rerender(
      <JobsToolbar view="list" filters={{ ...DEFAULT_FILTERS, status: 'APPLIED' }} isFiltered {...handlers} onReset={onReset} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL** (module not found)

Run: `npm run test -- src/components/jobs/jobs-toolbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `src/components/jobs/jobs-toolbar.tsx`**

```tsx
'use client'

import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SearchInput } from './search-input'
import { SortControl } from './sort-control'
import { JOB_STATUSES, STATUS_META, type JobStatus } from '@/lib/job-status'
import { GHOST_OPTIONS, type GhostFilter, type JobFilters, type SortField } from '@/types/filters'

export function JobsToolbar({
  view,
  filters,
  isFiltered,
  onSearch,
  onStatus,
  onGhost,
  onSort,
  onReset,
}: {
  view: 'board' | 'list'
  filters: JobFilters
  isFiltered: boolean
  onSearch: (value: string) => void
  onStatus: (value: JobStatus | undefined) => void
  onGhost: (value: GhostFilter) => void
  onSort: (field: SortField) => void
  onReset: () => void
}) {
  const isList = view === 'list'
  // Reset is offered for any non-default state (narrowing filters OR a custom sort/page).
  const hasAny =
    isFiltered || filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc' || filters.page > 1

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
      <SearchInput value={filters.search} onChange={onSearch} />

      {isList ? (
        <Select
          aria-label="Filter by status"
          value={filters.status ?? ''}
          onChange={(e) => onStatus(e.target.value ? (e.target.value as JobStatus) : undefined)}
          className="h-10 w-44"
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </Select>
      ) : null}

      <Select
        aria-label="Filter by activity"
        value={filters.ghost}
        onChange={(e) => onGhost(e.target.value as GhostFilter)}
        className="h-10 w-40"
      >
        {GHOST_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>

      {isList ? <SortControl sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={onSort} /> : null}

      {hasAny ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="ml-auto">
          Reset
        </Button>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/components/jobs/jobs-toolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/jobs/jobs-toolbar.tsx src/components/jobs/jobs-toolbar.test.tsx
git commit -m "feat(frontend-next): JobsToolbar — per-view FilterBar (search/status/ghost/sort/reset) (Slice 5)"
```

---

## Task 11: `JobsTable` (borderless aligned sortable list) + remove `JobsList`

**Files:**
- Create: `src/components/jobs/jobs-table.tsx`
- Test: `src/components/jobs/jobs-table.test.tsx`
- Delete: `src/components/jobs/jobs-list.tsx`, `src/components/jobs/jobs-list.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/jobs/jobs-table.test.tsx`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobsTable } from './jobs-table'
import type { Job } from '@/types/job'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => new URLSearchParams(),
}))

const JOB: Job = {
  id: 'j1', createdAt: '2026-05-28T00:00:00.000Z', updatedAt: '', userId: 'u1',
  title: 'Staff Engineer', company: 'Acme', location: 'Remote', salaryRange: null,
  sourceUrl: null, snapshotMarkdown: null, status: 'WISHLIST', kanbanOrder: 1,
  lastActivityAt: null, ghostDays: 3, notes: null,
}

const base = { sortBy: 'createdAt' as const, sortOrder: 'desc' as const, loading: false, isFiltered: false, onReset: vi.fn() }

describe('JobsTable', () => {
  it('renders a row linking to the drawer via ?job=', () => {
    render(<JobsTable jobs={[JOB]} onSort={vi.fn()} {...base} />)
    const link = screen.getByRole('link', { name: /staff engineer/i })
    expect(link).toHaveAttribute('href', '/app/jobs?job=j1')
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByTestId('status-chip')).toBeInTheDocument()
    expect(screen.getByTestId('ghost-meter')).toBeInTheDocument()
  })

  it('clicking the Company header sorts by company', () => {
    const onSort = vi.fn()
    render(<JobsTable jobs={[JOB]} onSort={onSort} {...base} />)
    fireEvent.click(screen.getByRole('button', { name: /company/i }))
    expect(onSort).toHaveBeenCalledWith('company')
  })

  it('shows a filtered-empty state with a Reset action', () => {
    const onReset = vi.fn()
    render(<JobsTable jobs={[]} onSort={vi.fn()} {...base} isFiltered onReset={onReset} />)
    expect(screen.getByText(/no jobs match/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalled()
  })

  it('shows the initial-empty state when not filtered', () => {
    render(<JobsTable jobs={[]} onSort={vi.fn()} {...base} />)
    expect(screen.getByText(/no jobs yet/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL** (module not found)

Run: `npm run test -- src/components/jobs/jobs-table.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `src/components/jobs/jobs-table.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/kanban/status-chip'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import { shortDate } from '@/lib/relative-time'
import type { Job } from '@/types/job'
import type { SortField, SortOrder } from '@/types/filters'

const GRID = 'grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-4'

function SortHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  className,
}: {
  label: string
  field: SortField
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  className?: string
}) {
  const active = sortBy === field
  const Icon = sortOrder === 'asc' ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn('inline-flex items-center gap-1 text-left transition-colors hover:text-foreground', active ? 'text-foreground' : '', className)}
    >
      {label}
      {active ? <Icon className="size-3" aria-label={sortOrder === 'asc' ? 'sorted ascending' : 'sorted descending'} /> : null}
    </button>
  )
}

function Header({ sortBy, sortOrder, onSort }: { sortBy: SortField; sortOrder: SortOrder; onSort: (f: SortField) => void }) {
  return (
    <div className={cn(GRID, 'border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground')}>
      <SortHeader label="Title" field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <SortHeader label="Company" field="company" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <span>Location</span>
      <span>Status</span>
      <SortHeader label="Ghost" field="lastActivityAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <SortHeader label="Added" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
    </div>
  )
}

export function JobsTable({
  jobs,
  sortBy,
  sortOrder,
  onSort,
  loading,
  isFiltered,
  onReset,
}: {
  jobs: Job[]
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  loading: boolean
  isFiltered: boolean
  onReset: () => void
}) {
  const searchParams = useSearchParams()
  const hrefFor = (id: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set('job', id)
    return `/app/jobs?${p.toString()}`
  }

  if (loading && jobs.length === 0) {
    return (
      <div className="rounded-xl border border-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse border-b border-border bg-muted/30 last:border-b-0" />
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        {isFiltered ? (
          <>
            <p className="text-sm font-medium">No jobs match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try widening or clearing them.</p>
            <Button type="button" variant="outline" size="sm" onClick={onReset} className="mt-4">Reset filters</Button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">No jobs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add your first application to start tracking it.</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <div className="min-w-[680px]">
        <Header sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
        <ul className="divide-y divide-border">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link href={hrefFor(job.id)} scroll={false} className={cn(GRID, 'px-4 py-3 text-sm transition-colors hover:bg-accent')}>
                <span className="truncate font-medium">{job.title}</span>
                <span className="truncate text-muted-foreground">{job.company}</span>
                <span className="truncate text-muted-foreground">{job.location ?? '—'}</span>
                <StatusChip status={job.status} />
                <GhostMeter days={job.ghostDays} />
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{shortDate(job.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/components/jobs/jobs-table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Delete the obsolete `JobsList`**

```bash
git rm src/components/jobs/jobs-list.tsx src/components/jobs/jobs-list.test.tsx
```

> `JobsList`'s only importer is `jobs-workspace.tsx`, rewired in Task 14. Removing it now will make `jobs-workspace.tsx` fail to typecheck until then — that's expected; the gate runs in Task 16. (If you prefer a green tree at every commit, defer this `git rm` into Task 14's commit.)

- [ ] **Step 6: Commit**

```bash
git add src/components/jobs/jobs-table.tsx src/components/jobs/jobs-table.test.tsx
git commit -m "feat(frontend-next): JobsTable — borderless aligned sortable list; remove JobsList (Slice 5)"
```

---

## Task 12: `JobsPagination`

**Files:**
- Create: `src/components/jobs/jobs-pagination.tsx`
- Test: `src/components/jobs/jobs-pagination.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/jobs/jobs-pagination.test.tsx`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobsPagination } from './jobs-pagination'

describe('JobsPagination', () => {
  it('renders the range and pages on Next', () => {
    const onPage = vi.fn()
    render(<JobsPagination meta={{ total: 47, page: 1, limit: 20, totalPages: 3 }} onPage={onPage} />)
    expect(screen.getByText(/1\s*–\s*20 of 47/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onPage).toHaveBeenCalledWith(2)
  })

  it('disables Next on the last page and computes a partial final range', () => {
    render(<JobsPagination meta={{ total: 47, page: 3, limit: 20, totalPages: 3 }} onPage={vi.fn()} />)
    expect(screen.getByText(/41\s*–\s*47 of 47/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('renders nothing when there is a single page', () => {
    const { container } = render(<JobsPagination meta={{ total: 5, page: 1, limit: 20, totalPages: 1 }} onPage={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL** (module not found)

Run: `npm run test -- src/components/jobs/jobs-pagination.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `src/components/jobs/jobs-pagination.tsx`**

```tsx
'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PageMeta } from '@/types/filters'

export function JobsPagination({ meta, onPage }: { meta: PageMeta; onPage: (page: number) => void }) {
  if (meta.totalPages <= 1) return null
  const from = (meta.page - 1) * meta.limit + 1
  const to = Math.min(meta.page * meta.limit, meta.total)

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-4 text-sm text-muted-foreground">
      <span className="font-mono tabular-nums">
        {from}–{to} of {meta.total}
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Prev
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          Next <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/components/jobs/jobs-pagination.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/jobs/jobs-pagination.tsx src/components/jobs/jobs-pagination.test.tsx
git commit -m "feat(frontend-next): JobsPagination — prev/next + range footer (Slice 5)"
```

---

## Task 13: Hybrid board drag (`resolveDrop`) + controlled `KanbanBoard` + hint

**Files:**
- Modify: `src/lib/kanban.ts`
- Test: `src/lib/kanban.test.ts` (extend)
- Create: `src/components/kanban/reorder-paused-hint.tsx`
- Modify: `src/components/kanban/kanban-board.tsx`
- Test: `src/components/kanban/kanban-board.test.tsx` (update props)

- [ ] **Step 1: Add the failing `resolveDrop` tests to `src/lib/kanban.test.ts`** (append; reuse a small board fixture)

```ts
import { resolveDrop } from './kanban'
import type { KanbanBoard } from '@/types/dashboard'

function card(id: string, status: KanbanBoard['columns'][number]['status'], order: number) {
  return { id, title: id, company: 'C', location: null, ghostDays: 0, status, kanbanOrder: order, lastActivityAt: null, createdAt: '' }
}
function board(): KanbanBoard {
  return {
    columns: [
      { status: 'WISHLIST', jobs: [card('a', 'WISHLIST', 1), card('b', 'WISHLIST', 2)] },
      { status: 'APPLIED', jobs: [card('c', 'APPLIED', 1)] },
      { status: 'INTERVIEWING', jobs: [] },
      { status: 'OFFER', jobs: [] },
      { status: 'REJECTED', jobs: [] },
      { status: 'ARCHIVED', jobs: [] },
    ],
    stats: { totalJobs: 3, byStatus: { WISHLIST: 2, APPLIED: 1, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 3 },
  }
}

describe('resolveDrop', () => {
  it('moves cross-column (status change) when not filtered', () => {
    const b = board()
    const r = resolveDrop({ snapshot: b, board: b, activeId: 'a', overId: 'APPLIED', isFiltered: false })
    expect(r?.kind).toBe('move')
    if (r?.kind === 'move') expect(r.status).toBe('APPLIED')
  })

  it('cancels a within-column reorder while filtered', () => {
    const b = board()
    // origin of "a" is WISHLIST; dropping over sibling "b" (also WISHLIST) is a reorder.
    const r = resolveDrop({ snapshot: b, board: b, activeId: 'a', overId: 'b', isFiltered: true })
    expect(r).toEqual({ kind: 'cancel' })
  })

  it('allows a cross-column move while filtered, appended to the end', () => {
    const b = board()
    const r = resolveDrop({ snapshot: b, board: b, activeId: 'a', overId: 'APPLIED', isFiltered: true })
    expect(r?.kind).toBe('move')
    if (r?.kind === 'move') {
      expect(r.status).toBe('APPLIED')
      // appended after the only APPLIED card (order 1) → 2
      expect(r.kanbanOrder).toBe(2)
    }
  })

  it('uses the snapshot (origin) column, not the previewed board, to detect a reorder', () => {
    const snapshot = board()
    // Simulate onDragOver having already previewed "a" into APPLIED:
    const previewed = resolveDrop({ snapshot, board: snapshot, activeId: 'a', overId: 'APPLIED', isFiltered: false })
    expect(previewed?.kind).toBe('move')
    if (previewed?.kind !== 'move') return
    // Now the live board has "a" in APPLIED, but its ORIGIN (snapshot) is WISHLIST,
    // so while filtered this is still a cross-column move (allowed), not a reorder.
    const r = resolveDrop({ snapshot, board: previewed.board, activeId: 'a', overId: 'APPLIED', isFiltered: true })
    expect(r?.kind).toBe('move')
  })

  it('returns null for an unresolvable target', () => {
    const b = board()
    expect(resolveDrop({ snapshot: b, board: b, activeId: 'nope', overId: 'APPLIED', isFiltered: false })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL** (`resolveDrop` not exported)

Run: `npm run test -- src/lib/kanban.test.ts`
Expected: FAIL.

- [ ] **Step 3: Edit `src/lib/kanban.ts`** — add `isStatus`, the `DropResult` type, and `resolveDrop`:

```ts
import { JOB_STATUSES, type JobStatus } from '@/lib/job-status'
// (keep the existing `import type { KanbanBoard, KanbanCard } from '@/types/dashboard'`)

export function isStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value)
}

export type DropResult =
  | { kind: 'cancel' }
  | { kind: 'move'; board: KanbanBoard; status: JobStatus; kanbanOrder: number }

// Decides what a drag drop should do. `snapshot` is the board at drag-start
// (the origin truth); `board` is the current (possibly preview-moved) board;
// `overId` is a column status or a card id. While filtered, a within-column
// reorder is cancelled and a cross-column move is appended to the target's end.
export function resolveDrop(args: {
  snapshot: KanbanBoard
  board: KanbanBoard
  activeId: string
  overId: string
  isFiltered: boolean
}): DropResult | null {
  const { snapshot, board, activeId, overId, isFiltered } = args
  const targetStatus = isStatus(overId) ? overId : (findCard(board, overId)?.status ?? null)
  if (!targetStatus) return null
  const origin = findCard(snapshot, activeId)
  if (!origin) return null

  // Within-column reorder while filtered → suppressed (fractional order would be
  // computed against possibly-hidden neighbours).
  if (isFiltered && origin.status === targetStatus) return { kind: 'cancel' }

  const targetColumn = board.columns.find((c) => c.status === targetStatus)
  const overIsCard = !isStatus(overId)
  const overIndex = isFiltered
    ? (targetColumn?.jobs.length ?? 0) // force append-to-end when filtered (collision-safe)
    : overIsCard
      ? (targetColumn?.jobs.findIndex((j) => j.id === overId) ?? 0)
      : (targetColumn?.jobs.length ?? 0)

  const placed = moveCardToColumn(board, activeId, targetStatus, overIndex)
  const placedColumn = placed.columns.find((c) => c.status === targetStatus)
  const finalIndex = placedColumn?.jobs.findIndex((j) => j.id === activeId) ?? 0
  const siblings = (placedColumn?.jobs ?? []).filter((j) => j.id !== activeId)
  const kanbanOrder = calculateKanbanOrder(siblings, finalIndex)
  return { kind: 'move', board: placed, status: targetStatus, kanbanOrder }
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/lib/kanban.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `src/components/kanban/reorder-paused-hint.tsx`**

```tsx
import { Info } from 'lucide-react'

export function ReorderPausedHint() {
  return (
    <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Info className="size-3.5" aria-hidden="true" />
      Reordering is paused while filtered — clear filters to reorder.
    </p>
  )
}
```

- [ ] **Step 6: Update the `KanbanBoard` test props in `src/components/kanban/kanban-board.test.tsx`**

6a. Replace the render in the existing test and add a hint test:

```ts
const FILTERS = { search: '', ghost: 'all' as const }

describe('KanbanBoard', () => {
  it('renders all six columns and the seeded card', () => {
    render(<KanbanBoard board={BOARD} filters={FILTERS} isFiltered={false} />, { wrapper })
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('Wished')).toBeInTheDocument()
  })

  it('shows the reorder-paused hint when filtered', () => {
    render(<KanbanBoard board={BOARD} filters={{ search: 'x', ghost: 'all' }} isFiltered />, { wrapper })
    expect(screen.getByText(/reordering is paused/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Edit `src/components/kanban/kanban-board.tsx`** — controlled board, active-key writes, `resolveDrop`, hint.

7a. Update imports:

```tsx
'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMoveJob } from '@/hooks/use-dashboard'
import { kanbanKey } from '@/lib/query-keys'
import { findCard, moveCardToColumn, resolveDrop, isStatus } from '@/lib/kanban'
import { KanbanColumn } from './kanban-column'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import { ReorderPausedHint } from './reorder-paused-hint'
import type { GhostFilter } from '@/types/filters'
import type { KanbanBoard as Board, KanbanCard as Card } from '@/types/dashboard'
```

> Remove the now-unused `useKanban` import, the local `isStatus`/`resolveTargetStatus` (moved to `lib/kanban.ts` — but keep `resolveTargetStatus` logic via `resolveDrop`), `calculateKanbanOrder`, `JOB_STATUSES`, `JobStatus`, `DASHBOARD_KANBAN_KEY` imports if they become unused. Lint will flag leftovers.

7b. Replace the component body. The board is now **controlled** by the `board` prop (the parent owns the `useKanban` query); optimistic writes target the active `kanbanKey(filters)`:

```tsx
export function KanbanBoard({
  board,
  filters,
  isFiltered,
}: {
  board: Board
  filters: { search: string; ghost: GhostFilter }
  isFiltered: boolean
}) {
  const qc = useQueryClient()
  const move = useMoveJob()
  const key = kanbanKey(filters)
  const snapshot = useRef<Board | null>(null)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function setBoard(next: Board) {
    qc.setQueryData(key, next)
  }

  function onDragStart(event: DragStartEvent) {
    snapshot.current = board
    const located = findCard(board, String(event.active.id))
    if (located) {
      const col = board.columns.find((c) => c.status === located.status)
      setActiveCard(col?.jobs[located.index] ?? null)
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const targetStatus = isStatus(overId) ? overId : (findCard(board, overId)?.status ?? null)
    if (!targetStatus) return
    const from = findCard(board, activeId)
    if (!from || from.status === targetStatus) return // within-column handled on drag end
    const targetColumn = board.columns.find((c) => c.status === targetStatus)
    const index = targetColumn ? targetColumn.jobs.length : 0
    setBoard(moveCardToColumn(board, activeId, targetStatus, index))
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over) {
      if (snapshot.current) setBoard(snapshot.current)
      return
    }
    const result = resolveDrop({
      snapshot: snapshot.current ?? board,
      board,
      activeId: String(active.id),
      overId: String(over.id),
      isFiltered,
    })
    if (!result) return
    if (result.kind === 'cancel') {
      if (snapshot.current) setBoard(snapshot.current)
      return
    }
    setBoard(result.board)
    const before = snapshot.current
    move.mutate(
      { id: String(active.id), status: result.status, kanbanOrder: result.kanbanOrder },
      { onError: () => { if (before) setBoard(before) } },
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      {isFiltered ? <ReorderPausedHint /> : null}
      <div className="flex h-full gap-3 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <KanbanColumn key={column.status} column={column} />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="w-72 rounded-lg border border-border bg-card p-3 shadow-lg">
            <p className="truncate text-sm font-medium">{activeCard.title}</p>
            <p className="truncate text-xs text-muted-foreground">{activeCard.company}</p>
            <div className="mt-2">
              <GhostMeter days={activeCard.ghostDays} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 8: Run the tests — expect PASS**

Run: `npm run test -- src/lib/kanban.test.ts src/components/kanban/kanban-board.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/kanban.ts src/lib/kanban.test.ts src/components/kanban/reorder-paused-hint.tsx src/components/kanban/kanban-board.tsx src/components/kanban/kanban-board.test.tsx
git commit -m "feat(frontend-next): hybrid board drag — resolveDrop + controlled board + reorder-paused hint (Slice 5)"
```

---

## Task 14: Wire `JobsWorkspace`

**Files:**
- Modify: `src/components/jobs/jobs-workspace.tsx`
- Test: `src/components/jobs/jobs-workspace.test.tsx` (update for the new props + getPage mock)

- [ ] **Step 1: Update `src/components/jobs/jobs-workspace.test.tsx`**

1a. Add `getPage` to the api-client mock:

```ts
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), getPage: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))
```

1b. Add a `Paginated<Job>` initial page and update the beforeEach mock + every render call to pass it:

```ts
import type { Paginated } from '@/types/filters'

const PAGE: Paginated<Job> = { data: [JOB], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }

// in beforeEach, after clearing mocks + deleting view/job params:
api.getPage.mockResolvedValue(PAGE)
api.get.mockResolvedValue(EMPTY_BOARD) // board query
```

1c. Replace every `initialJobs={[JOB]}` with `initialJobs={PAGE}`, and `initialJobs={[]}` with `initialJobs={{ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }}`. The four existing assertions (default list link, board view, toggle→board, toggle→list clean URL, open Add-Job modal) stay valid. Also clear the new filter params in `beforeEach`:

```ts
for (const k of ['view', 'job', 'search', 'status', 'ghost', 'sort', 'dir', 'page']) searchParams.delete(k)
```

- [ ] **Step 2: Run the test — expect FAIL** (workspace still imports `JobsList`, calls `useJobs(initialJobs)`)

Run: `npm run test -- src/components/jobs/jobs-workspace.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite `src/components/jobs/jobs-workspace.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { useJobs } from '@/hooks/use-jobs'
import { useKanban } from '@/hooks/use-dashboard'
import { useJobFilters } from '@/hooks/use-job-filters'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { JobsToolbar } from './jobs-toolbar'
import { JobsTable } from './jobs-table'
import { JobsPagination } from './jobs-pagination'
import { AddJobModal } from './add-job-modal'
import { JobDrawer } from './job-drawer'
import { PageHeader } from '@/components/layout/app/page-header'
import { NotificationBell } from '@/components/notifications/notification-bell'
import type { Paginated } from '@/types/filters'
import type { Job } from '@/types/job'
import type { KanbanBoard as Board } from '@/types/dashboard'

type View = 'board' | 'list'

const VIEW_OPTIONS = [
  { value: 'board', label: 'Board', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
] as const

function isView(value: string | null): value is View {
  return value === 'board' || value === 'list'
}

export function JobsWorkspace({
  initialJobs,
  initialBoard,
}: {
  initialJobs: Paginated<Job>
  initialBoard: Board
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view: View = isView(searchParams.get('view')) ? (searchParams.get('view') as View) : 'list'
  const jobId = searchParams.get('job')

  const { filters, isFiltered, setSearch, setStatus, setGhost, setSort, setPage, resetAll } = useJobFilters()
  const boardFilters = { search: filters.search, ghost: filters.ghost }

  const listQuery = useJobs(filters, initialJobs)
  const page = listQuery.data ?? initialJobs
  const boardQuery = useKanban(boardFilters, initialBoard)
  const board = boardQuery.data ?? initialBoard

  const [addOpen, setAddOpen] = useState(false)

  function setView(next: View) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'list') params.delete('view')
    else params.set('view', next)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const count = view === 'board' ? board.stats.totalJobs : page.meta.total

  const actions = (
    <>
      <SegmentedControl value={view} onValueChange={setView} options={VIEW_OPTIONS} aria-label="Switch view" />
      <Button type="button" onClick={() => setAddOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Add job
      </Button>
      <NotificationBell />
    </>
  )

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader
          title="Jobs"
          description={
            <>
              <span className="font-mono tabular-nums">{count}</span> {isFiltered ? 'matching' : 'tracked'}
            </>
          }
          actions={actions}
        />
        <JobsToolbar
          view={view}
          filters={filters}
          isFiltered={isFiltered}
          onSearch={setSearch}
          onStatus={setStatus}
          onGhost={setGhost}
          onSort={setSort}
          onReset={resetAll}
        />
        {view === 'board' ? (
          <div className="min-h-0 flex-1 p-6">
            <KanbanBoard board={board} filters={boardFilters} isFiltered={isFiltered} />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <JobsTable
              jobs={page.data}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={setSort}
              loading={listQuery.isLoading}
              isFiltered={isFiltered}
              onReset={resetAll}
            />
            <JobsPagination meta={page.meta} onPage={setPage} />
          </div>
        )}
      </div>

      <AddJobModal open={addOpen} onOpenChange={setAddOpen} />
      <JobDrawer jobId={jobId} />
    </>
  )
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `npm run test -- src/components/jobs/jobs-workspace.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/jobs/jobs-workspace.tsx src/components/jobs/jobs-workspace.test.tsx
git commit -m "feat(frontend-next): wire JobsWorkspace — toolbar + table + pagination + filtered board (Slice 5)"
```

---

## Task 15: SSR filtered initial fetch (`page.tsx`)

**Files:**
- Modify: `src/app/app/jobs/page.tsx`

> No co-located test (Server Components with `apiServer`/cookies aren't unit-tested in this repo; covered by the production build + live smoke in Task 16).

- [ ] **Step 1: Rewrite `src/app/app/jobs/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { JobsWorkspace } from '@/components/jobs/jobs-workspace'
import { EMPTY_BOARD, EMPTY_JOBS_PAGE } from '@/lib/dashboard-defaults'
import { parseFilters, buildListQuery, buildBoardQuery } from '@/lib/filters'
import type { Paginated } from '@/types/filters'
import type { Job } from '@/types/job'
import type { KanbanBoard } from '@/types/dashboard'

export const metadata: Metadata = { title: 'Jobs' }

const FILTER_PARAMS = ['search', 'status', 'ghost', 'sort', 'dir', 'page'] as const

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = new URLSearchParams()
  for (const k of FILTER_PARAMS) {
    const v = sp[k]
    if (typeof v === 'string') params.set(k, v)
  }
  const filters = parseFilters(params)
  const view = sp['view']

  let initialJobs: Paginated<Job> = EMPTY_JOBS_PAGE
  try {
    initialJobs = await apiServer.getPage<Job>(`/api/jobs${buildListQuery(filters)}`)
  } catch {
    initialJobs = EMPTY_JOBS_PAGE
  }

  let initialBoard: KanbanBoard = EMPTY_BOARD
  if (view === 'board') {
    try {
      initialBoard = await apiServer.get<KanbanBoard>(
        `/api/dashboard/kanban${buildBoardQuery({ search: filters.search, ghost: filters.ghost })}`,
      )
    } catch {
      initialBoard = EMPTY_BOARD
    }
  }

  // useSearchParams() in JobsWorkspace requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <JobsWorkspace initialJobs={initialJobs} initialBoard={initialBoard} />
    </Suspense>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/app/jobs/page.tsx
git commit -m "feat(frontend-next): SSR-seed filtered list/board from URL params for deep links (Slice 5)"
```

---

## Task 16: Full verification gate + progress.md

**Files:**
- Modify: `progress.md`

- [ ] **Step 1: Typecheck**

Run (in `frontend-next/`): `npm run typecheck`
Expected: PASS. (If anything in `kanban-board.tsx` is flagged as an unused import — e.g. leftover `useKanban`/`calculateKanbanOrder`/`DASHBOARD_KANBAN_KEY` — remove it.)

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS (no errors). Fix any `react-hooks/exhaustive-deps` warnings surfaced by the new effects/callbacks per the patterns already used in the codebase.

- [ ] **Step 3: Full test suite**

Run: `npm run test`
Expected: PASS — all prior suites green plus the new ones (filters, debounce, query-keys, getPage, useJobs, useKanban, useJobFilters, search-input, sort-control, jobs-toolbar, jobs-table, jobs-pagination, resolveDrop, kanban-board, jobs-workspace). Confirm `jobs-list.test.tsx` is gone.

- [ ] **Step 4: Production build (Docker — avoids the root-owned `.next` host-mount issue)**

Run (from repo root): `docker build --target production ./frontend-next`
Expected: build succeeds (catches `useSearchParams`/Suspense and RSC boundary issues the dev server misses).

- [ ] **Step 5: Live smoke against the Docker stack** (manual; do after the gate is green)

```bash
docker compose up -d --build
```
Then through the `:8080` proxy, verify:
- List view: search narrows results (debounced); status/ghost selects filter; clicking a column header sorts (URL gains `?sort=`/`?dir=`); pagination Prev/Next works and the range/`?page=` update; Reset clears filters.
- Deep link: open `/app/jobs?search=...&ghost=stale&sort=company&dir=asc` directly — the SSR HTML already reflects the filtered first page (no flash) and the controls reflect the URL.
- Board view: toggle to Board; search + ghost narrow it (server-driven); the "Reordering is paused while filtered" hint shows; a **cross-column** drag still moves a card (status change) while filtered; a **within-column** drag snaps back; clearing the filter restores full reordering.
- Toggle Board⇄List preserves the URL filter params.

- [ ] **Step 6: Update `progress.md`** — add a Slice 5 section after the Slice 4 block:

```markdown
## Migration Slice 5 — Filters + Search + List View (NEW) (2026-06-04)

> **Spec**: `docs/superpowers/specs/2026-06-04-slice-5-filters-search-list-design.md`
> **Plan**: `docs/superpowers/plans/2026-06-04-slice-5-filters-search-list.md`
> **Decisions**: filters on **both** views, **server-driven** (zero backend changes — `GET /api/jobs` and `GET /api/dashboard/kanban` already filter/sort/paginate); URL-synced via a single `useJobFilters` (+ shared `parseFilters`); list toolbar search w/ **Cmd/⌘K** focus; **borderless aligned** sortable list (not a spreadsheet table); **hybrid board drag** (cross-column moves stay enabled while filtered, within-column reorder suppressed) via pure `resolveDrop`.

### Frontend (`frontend-next`)
- [x] `types/filters.ts` + pure `lib/filters.ts` (`parseFilters`/`isFiltered`/`buildListQuery`/`buildBoardQuery`); filter-encoded query keys (`jobsListKey`/`kanbanKey`) nested under existing prefixes; `apiClient/apiServer.getPage` preserve pagination `meta`; `useDebouncedValue`; `shortDate`.
- [x] `useJobFilters` (URL↔filter source of truth, clean-URL + reset-page rules, preserves `view`/`job`); filter-aware `useJobs` (→ `{data, meta}`, `keepPreviousData`) + `useKanban` (search+ghost).
- [x] `SearchInput` (debounced + Cmd/⌘K + clear), `SortControl`, `JobsToolbar` (per-view controls + reset), `JobsTable` (sortable borderless list, replaces `JobsList`), `JobsPagination`, `ReorderPausedHint`.
- [x] Hybrid board drag (`resolveDrop` pure helper; controlled `KanbanBoard` writing the active `kanbanKey`); `JobsWorkspace` owns both queries; `page.tsx` SSR-seeds filtered list/board for deep links.

### Verification
- [x] Frontend: typecheck + lint + test + Docker production build — all green.
- [ ] Manual browser pass (search/sort/paginate/reset, deep-link SSR, board hybrid drag while filtered, toggle preserves filters) — recommended before merge.
```

- [ ] **Step 7: Commit**

```bash
git add progress.md
git commit -m "docs(progress): Slice 5 (filters + search + list view) complete — frontend-only, both views server-driven"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** §3 URL contract → Tasks 1/7; §4 data layer → Tasks 3/4/5/6 + SSR Task 15; §5 FilterBar → Tasks 8/9/10; §6 list → Tasks 11/12; §7 board → Task 13; wiring → Task 14; tests → every task; out-of-scope items are not implemented (correct).
- **Type consistency:** `JobFilters`/`Paginated<T>`/`PageMeta`/`SortField`/`GhostFilter` are defined once in `types/filters.ts` and imported everywhere; `parseFilters` is the single shared parser (page + hook); `jobsListKey`/`kanbanKey` are the only list/board keys; `resolveDrop` is the single drop decision.
- **No backend changes** anywhere — if a filter appears not to apply on the server, that is a separate backend defect (see spec §1), not part of this plan.
- **Green-tree caveat:** Task 11 deletes `JobsList` before Task 14 rewires the workspace, so the tree typechecks green only from Task 14 onward. If strict per-commit green is required, move the `git rm` from Task 11 into Task 14's commit.
