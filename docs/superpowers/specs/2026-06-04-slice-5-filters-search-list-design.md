# JobVault — Slice 5: Filters + Search + List View — Design Spec

> Parent specs: [`2026-04-26-…-migration-design.md`](./2026-04-26-nest-to-express-nuxt-to-next-migration-design.md) (architecture + phase roadmap) and [`2026-06-01-app-redesign-…-minimalist-design.md`](./2026-06-01-app-redesign-express-next-minimalist-design.md) (app surface + per-slice resolutions in §9). This spec covers the build sequence's final app-surface phase: **Filters + Search + List View**. Decisions here should be recorded in condensed form as "Slice 5 resolutions (2026-06-04)" in the app-redesign spec §9 once executed.

---

## 1. Goal & scope

Make the Jobs workspace **findable**: let the user search, filter, sort, and page through their pipeline, on **both** the Board and the List view, with all the heavy lifting done **server-side** and all filter state **URL-synced** (shareable, bookmarkable, back-button friendly).

This slice is **frontend-only**. Both backend endpoints already implement the full filter surface and validate it server-side:

- **`GET /api/jobs`** — `validate(JobQuerySchema, 'query')` accepts `page` (≥1, default 1), `limit` (1–100, default 20), `sortBy` (`createdAt`|`updatedAt`|`title`|`company`|`kanbanOrder`|`lastActivityAt`, default `createdAt`), `sortOrder` (`asc`|`desc`, default `desc`), `search`, `status` (one of `JOB_STATUSES`), `ghostFilter` (`all`|`active`|`stale`|`ghost`). Repository (`jobs.repository.findAll`) applies ILIKE on `title`+`company`, status equality, **live-SQL ghost-days** derivation (`floor(extract(epoch from (now() - coalesce(lastActivityAt, createdAt))) / 86400)`), `SORT_COLUMNS[sortBy]` ordering, and `LIMIT/OFFSET`. Returns `{ data: JobRow[], meta: { total, page, limit, totalPages } }`.
- **`GET /api/dashboard/kanban`** — `validate(DashboardQuerySchema, 'query')` accepts `search`, `status`, `ghostFilter`. Repository (`dashboard.repository.findForUser`) applies ILIKE `title`+`company` and status; service (`dashboard.service.getKanban`) applies `ghostFilter` post-derivation via `passesGhostFilter`, then groups into 6 columns ordered by `kanbanOrder asc`. Returns `{ data: { columns, stats } }`.

**No backend, schema, migration, or contract changes.** If, during execution, any endpoint turns out *not* to apply a filter as described above, stop and treat it as a defect to fix in the relevant backend module under TDD — but the read above (verified 2026-06-04) says both are complete.

Reference behavior (intent, not contract) lives in the legacy Nuxt plan `plans/frontend/05-ghost-search-listview.md` and `frontend/` (read-only). The contracts below are stated explicitly so the implementation plan can be derived without re-reading the old stack.

## 2. Resolved product decisions (from brainstorming, 2026-06-04)

1. **Filter scope — both views, server-driven.** Search + ghost filter narrow **both** Board and List. Status filter, sort, and pagination are **List-only** (status is meaningless on a status-grouped board; sort/pagination don't apply to a kanban-ordered board). All filtering/sorting/paging is performed by the API — the frontend never filters in memory.
2. **Search entry — list toolbar input + Cmd/⌘K focus.** A debounced search field in a filter toolbar (shown in both views), focusable via `Cmd/Ctrl+K`, with a clear (✕) affordance.
3. **List look — borderless aligned list** (the Linear/Height treatment), **not** a boxed-cell spreadsheet table. Column-aligned rows via CSS grid, a sortable header, hairline row separators only, hover highlight, mono numerics, row → drawer, pagination footer.
4. **Board drag while filtered — hybrid** (mirrors Jira/Linear "rank disabled unless ordered by rank" + Airtable/Trello "column moves always work"): cross-column drag (a status change) **stays enabled** while filtered; within-column manual reorder is **suppressed** while filtered (with a subtle hint). Clearing filters restores full reordering.

## 3. URL contract (single source of truth)

Filter state lives entirely in the URL query string, following the existing workspace pattern (`new URLSearchParams(searchParams)` → mutate → `router.replace(qs ? \`${pathname}?${qs}\` : pathname, { scroll: false })`). The pre-existing `view` and `job` params are **always preserved** by every filter write.

| URL param | API param | Values | Default (omitted from URL) | Applies to |
|---|---|---|---|---|
| `search` | `search` | string (trimmed; empty → omitted) | — | Board + List |
| `ghost` | `ghostFilter` | `active` \| `stale` \| `ghost` | `all` | Board + List |
| `status` | `status` | one of the 6 `JOB_STATUSES` | (none) | **List only** |
| `sort` | `sortBy` | `title` \| `company` \| `createdAt` \| `updatedAt` \| `lastActivityAt` | `createdAt` | **List only** |
| `dir` | `sortOrder` | `asc` \| `desc` | `desc` | **List only** |
| `page` | `page` | integer ≥ 1 | `1` | **List only** |
| `view` | — | `board` \| `list` | `list` | (existing) |
| `job` | — | job id | — | (existing) |

**Clean-URL rule:** a param is written only when it differs from its default; setting a control back to its default **deletes** the param (matching the existing `view=list` → no-param behavior). The default sort is `createdAt`/`desc` to match the backend default exactly, so an unfiltered list URL is just `/app/jobs`.

**Persistence across toggle:** List-only params (`status`/`sort`/`dir`/`page`) persist in the URL when the user toggles to Board (their controls are hidden, not stripped) and reappear on toggling back. The kanban endpoint simply never receives them.

**Param-change resets page:** any change to `search`/`status`/`ghost`/`sort`/`dir` resets `page` to 1 (deletes the `page` param). Only Prev/Next set `page`.

### `useJobFilters()` — `hooks/use-job-filters.ts`

A new client hook that is the **only** place the filter ↔ URL mapping lives:

```ts
interface JobFilters {
  search: string            // '' when absent
  status?: JobStatus
  ghost: GhostFilter        // 'all' when absent  ('all' | 'active' | 'stale' | 'ghost')
  sortBy: SortField         // 'createdAt' when absent
  sortOrder: SortOrder      // 'desc' when absent
  page: number              // 1 when absent
}
```

- Reads each value from `useSearchParams()` (coercing/falling back to the default).
- Exposes setters: `setSearch`, `setStatus`, `setGhost`, `setSort(field)` (toggles `dir` if the field is already active, else sets the field + sensible default dir), `setPage`, `resetAll`. Each setter clones the params, applies the clean-URL + reset-page rules, preserves `view`/`job`, and `router.replace(..., { scroll: false })`.
- Exposes `isFiltered` (true when `search` non-empty **or** `status` set **or** `ghost !== 'all'`) — used to gate the Reset button and the board's reorder-suppression. (Sort/page are not "filters" for the `isFiltered` purpose; sort doesn't affect the board and an active sort shouldn't pause board reorder.)
- Exposes the two API query strings: `listQuery` (all params → `/api/jobs?…`) and `boardQuery` (only `search`+`ghost` → `/api/dashboard/kanban?…`), each omitting defaults.

Types live in `types/filters.ts`: `GhostFilter`, `SortField`, `SortOrder`, `JobFilters` (re-using `JobStatus` from `lib/job-status.ts`). `SortField` must be a strict subset of the backend's `SORT_FIELDS` (no `kanbanOrder` in the List UI — it isn't a meaningful user-facing sort).

## 4. Data layer

### 4.1 Envelope-preserving fetch (`apiClient.getPage` / `apiServer.getPage`)

Today `apiClient.get` / `apiServer.get` unwrap and **discard** `meta`. Pagination needs it. Add a sibling method to **both** clients that returns the full success envelope:

```ts
interface Paginated<T> { data: T[]; meta: PageMeta }
interface PageMeta { total: number; page: number; limit: number; totalPages: number }
// apiClient.getPage<T>(path, init?): Promise<Paginated<T>>
```

Implementation: a variant of the existing `request` that returns the parsed payload as-is (no `.data` unwrap) when it carries both `data` and `meta`. It must preserve the **silent-refresh** behavior (401 → refresh → retry once, single-flight) — i.e. reuse the same `request` core, just skip the unwrap. The single-job/list `.get` and all mutations are unchanged.

### 4.2 Query keys (`lib/query-keys.ts`)

```ts
export const JOBS_KEY = ['jobs'] as const                                  // unchanged prefix
export const jobsListKey = (f: JobFilters) => ['jobs', 'list', f] as const // NEW
export const jobKey = (id: string) => ['jobs', id] as const                // unchanged
export const DASHBOARD_KANBAN_KEY = ['dashboard', 'kanban'] as const       // unchanged prefix
export const kanbanKey = (f: { search: string; ghost: GhostFilter }) =>
  ['dashboard', 'kanban', f] as const                                      // NEW
```

- `jobsListKey` nests under `['jobs', 'list', …]` so it never collides with `jobKey(id) = ['jobs', id]`, while still being matched by the existing prefix invalidations of `['jobs']` (create/update/delete/move all `invalidateQueries({ queryKey: JOBS_KEY })`). **No mutation-invalidation changes needed** — prefix matching covers every filtered variant.
- `kanbanKey` likewise nests under the `['dashboard','kanban']` prefix that `useMoveJob.onSettled` already invalidates. The filter object is a stable key; TanStack hashes it structurally, so identical filters share a cache entry.

### 4.3 Hooks

- **`useJobs(filters: JobFilters, initial?: Paginated<Job>)`** (`hooks/use-jobs.ts`, rewritten) — `queryKey: jobsListKey(filters)`, `queryFn: () => apiClient.getPage<Job>(\`/api/jobs?\${listQuery}\`)`, `placeholderData: keepPreviousData` (so paging/sorting doesn't flash empty), `refetchOnMount: 'always'`, optional `initialData`. Returns `{ data: { data, meta }, … }`.
- **`useKanban(filters: { search; ghost }, initial?: KanbanBoard)`** (`hooks/use-dashboard.ts`, edited) — `queryKey: kanbanKey(filters)`, `queryFn` hits `/api/dashboard/kanban?${boardQuery}`, `placeholderData: keepPreviousData`, `refetchOnMount: 'always'`. `useStats` is unchanged (overview is global).
- **`useMoveJob()`** (`hooks/use-dashboard.ts`, edited) — must operate on the **active filtered key**. It will accept the current `kanbanKey(filters)` (passed in, or read via a small `useActiveKanbanKey()` from `useJobFilters`) for its optimistic `setQueryData`/rollback; its `onSettled` keeps invalidating the `DASHBOARD_KANBAN_KEY` prefix (matches all variants). The `KanbanBoard` optimistic `setBoard` helper switches from the static `DASHBOARD_KANBAN_KEY` to the active key.

### 4.4 SSR initial data (`app/app/jobs/page.tsx`)

The page parses the **full** filter searchParams (not just `view`), forwards them to the matching endpoint, and seeds the matching query key so deep-linked filtered URLs render server-side without a flash:

- Always: `apiServer.getPage<Job>(\`/api/jobs?\${listQuery}\`)` → `initialJobs: Paginated<Job>` (seeds `jobsListKey(filters)` via `useJobs(filters, initialJobs)`).
- When `view === 'board'`: `apiServer.getPage`-style fetch of `/api/dashboard/kanban?${boardQuery}` (board envelope is `{ data }`, no `meta` — use a plain `apiServer.get<KanbanBoard>`) → seeds `kanbanKey(filters)`.
- On first client render the URL filters equal the server filters, so the seeded key matches the hook's key — no refetch flash. The page's `searchParams` type widens to include all params. Existing try/catch-to-empty fallbacks are kept.

> Note: the page is a Server Component and `useJobFilters` is a client hook, so the page parses searchParams with a small **pure** `parseFilters(searchParams)` helper (also in `types/filters.ts` / a `lib/filters.ts`) that both the server page and the client hook use to stay in lockstep on defaults.

## 5. FilterBar — `components/jobs/jobs-toolbar.tsx`

A toolbar row rendered between `PageHeader` and the view content, in **both** views. Per-view controls (every styled element is its own component — no inline styled markup):

- **Board:** `[ SearchInput, FilterSelect(ghost), ResetButton? ]`
- **List:** `[ SearchInput, FilterSelect(status), FilterSelect(ghost), SortControl, ResetButton? ]`

Components:
- **`SearchInput`** (`components/jobs/search-input.tsx`) — wraps the `Input` primitive + a leading search icon and trailing clear (✕) button (shown when non-empty). Debounces local input by **300ms** (`useDebouncedValue`) before calling `setSearch`, but reflects keystrokes immediately in the field. Registers a global `keydown` listener for **Cmd/Ctrl+K** that `preventDefault()`s and focuses the input (cleaned up on unmount). Seeds its initial value from the URL `search`.
- **`FilterSelect`** — a thin labeled wrapper over the existing `Select` primitive (label + options + value + onChange), if the bare `Select` needs it; otherwise use `Select` directly with an aria-label. Status select options: "All statuses" + the 6 statuses (reuse `StatusChip` labels/casing). Ghost select options: All / Active (≤7d) / Stale (8–14d) / Ghost (>14d).
- **`SortControl`** — `Select` of the 5 `SortField`s + a direction toggle button (asc/desc chevron). (List header click-to-sort and this control both drive `setSort`; they stay in sync via the URL.)
- **`ResetButton`** — ghost/secondary button, rendered only when `isFiltered` (or any non-default sort/page on list); calls `resetAll`.

`useDebouncedValue<T>(value, delayMs)` lives in `lib/use-debounced-value.ts` (or `hooks/`): standard effect-with-timeout, cleared on change/unmount.

The `PageHeader` count/description reflects the **filtered total**: List shows `meta.total` ("N results" when `isFiltered`, else "N tracked"); Board shows the board's filtered card total. The `SegmentedControl` (view toggle), **Add job**, and **NotificationBell** stay in `PageHeader` actions (unchanged).

## 6. List view — `components/jobs/jobs-table.tsx` (replaces `jobs-list.tsx`)

A **borderless, column-aligned list** — not a boxed table. Structure:

- **Header row:** column labels in a CSS-grid that the body rows share (identical `grid-template-columns`). Sortable headers (Title, Company, Ghost, Added) are buttons that call `setSort(field)`; the active column shows a ▲/▼ arrow reflecting `sortOrder`. Non-sortable columns (Location, Status) are plain labels.
- **Rows:** one hairline bottom border (`divide-y`/`border-b border-border`), hover highlight (`hover:bg-accent`), the whole row a link to `/app/jobs?job={id}` (`scroll={false}`, preserving current params). No vertical gridlines, no per-cell borders.
- **Columns:** **Title** (`font-medium`, truncate), **Company** (muted), **Location** (muted, `—` when null), **Status** (`StatusChip`), **Ghost** (`GhostMeter` + a mono "Xd ago"/relative-activity label; the header sorts by `lastActivityAt`), **Added** (`createdAt`, mono short date; sorts by `createdAt`). Default visible sort = Added ▼.
- **Mobile:** the grid is wrapped in an `overflow-x-auto` container; under a breakpoint, secondary columns (Location, Added) are hidden via responsive classes, keeping Title / Status / Ghost.
- **States:** while loading (and no `keepPreviousData`), render ~8 skeleton rows matching the grid. Empty: if `isFiltered` → "No jobs match your filters" + a Reset action; else → the existing "No jobs yet" + Add-job hint.

### `components/jobs/jobs-pagination.tsx`

Footer below the list: `"{from}–{to} of {total}"` (mono numerics) + **‹ Prev** / **Next ›** buttons. Prev disabled when `page === 1`; Next disabled when `page >= meta.totalPages`. Clicking calls `setPage`. Hidden when `totalPages <= 1`. (Offset paging matches the server's `page`/`limit`; default `limit` = 20 — not user-configurable in this slice.)

## 7. Board view — hybrid drag (`components/kanban/kanban-board.tsx`, edited)

- **Filter-aware fetch:** `JobsWorkspace` passes the active board filters; `KanbanBoard` uses `useKanban(filters, initial)` and reads/writes the **active `kanbanKey(filters)`** for its optimistic `setBoard`/snapshot/rollback (replacing the static `DASHBOARD_KANBAN_KEY` in `setQueryData`/`getQueryData`).
- **Reorder suppression while `isFiltered`:** in `onDragEnd`, if `isFiltered`:
  - **Same-column drop** (`from.status === targetStatus`) → **cancel** (restore from snapshot / no move). This is the within-column reorder that would otherwise compute a fractional `kanbanOrder` midpoint against possibly-hidden neighbors and risk a collision.
  - **Cross-column drop** (status change) → **allowed**; place the card at the **end** of the target column and compute `kanbanOrder` via `calculateKanbanOrder(visibleSiblings, end)` (append-after-last-visible — collision-safe: strictly distinct from existing orders; exact position may be approximate vs hidden cards and self-heals on the next unfiltered reorder). Then `move.mutate` as today.
  - `onDragOver`'s cross-column preview stays; only the **commit** rules change. (Optionally disable in-column sortable affordances while filtered for clarity, but the `onDragEnd` guard is the source of truth.)
- **Hint:** when `isFiltered`, show a subtle muted line near the toolbar/board ("Reordering is paused while filtered — clear filters to reorder."). Its own tiny component, not inline.
- When **not** filtered, behavior is exactly today's (full cross-column + within-column drag).

## 8. `JobsWorkspace` wiring (`components/jobs/jobs-workspace.tsx`, edited)

- Instantiate `useJobFilters()` once; derive `view`, `jobId` as today.
- Pass `listQuery`/filters to `useJobs(filters, initialJobs)` and `search`+`ghost` to `KanbanBoard` (which calls `useKanban`).
- Render `<JobsToolbar view={view} filters={…} … />` between `PageHeader` and the content region.
- List branch: `<JobsTable jobs={data.data} sort={…} onSort={setSort} loading={…} />` + `<JobsPagination meta={data.meta} onPage={setPage} />`.
- Board branch: `<KanbanBoard board={…} filters={…} isFiltered={…} />` + the suppression hint.
- `AddJobModal` + `JobDrawer` unchanged.

## 9. Inventory

**New files**
- `frontend-next/src/types/filters.ts` — `GhostFilter`, `SortField`, `SortOrder`, `JobFilters`, `PageMeta`, `Paginated<T>`, `parseFilters`.
- `frontend-next/src/hooks/use-job-filters.ts` — the URL ↔ filter hook.
- `frontend-next/src/lib/use-debounced-value.ts` — debounce helper.
- `frontend-next/src/components/jobs/jobs-toolbar.tsx` — the FilterBar.
- `frontend-next/src/components/jobs/search-input.tsx` — debounced search + Cmd/K + clear.
- `frontend-next/src/components/jobs/sort-control.tsx` — sort field select + dir toggle.
- `frontend-next/src/components/jobs/jobs-table.tsx` — the borderless aligned list.
- `frontend-next/src/components/jobs/jobs-pagination.tsx` — prev/next + range.
- (Optional) `frontend-next/src/components/ui/filter-select.tsx` — labeled `Select` wrapper, if needed.
- (Optional) `frontend-next/src/components/kanban/reorder-paused-hint.tsx`.

**Modified files**
- `frontend-next/src/lib/api-client.ts`, `frontend-next/src/lib/api-server.ts` — add `getPage`.
- `frontend-next/src/lib/query-keys.ts` — add `jobsListKey`, `kanbanKey`.
- `frontend-next/src/hooks/use-jobs.ts` — filter-aware list query returning `{ data, meta }`.
- `frontend-next/src/hooks/use-dashboard.ts` — filter-aware `useKanban`; `useMoveJob` on the active key.
- `frontend-next/src/components/kanban/kanban-board.tsx` — active key + hybrid-drag guard.
- `frontend-next/src/components/jobs/jobs-workspace.tsx` — toolbar + filter wiring.
- `frontend-next/src/app/app/jobs/page.tsx` — parse all filter searchParams, filtered SSR fetch, seed matching keys.

**Removed**
- `frontend-next/src/components/jobs/jobs-list.tsx` (+ its test) — superseded by `jobs-table.tsx`.

## 10. Testing strategy (Vitest + RTL, TDD per task)

Co-located `*.test.ts(x)`; mock `next/navigation` (`useRouter`/`usePathname`/`useSearchParams`); wrap hook/query tests in a `QueryClientProvider`.

- **`parseFilters` / `useJobFilters`** — reads each param with correct defaults; setters write the right param, **omit defaults** (clean URL), **preserve `view`/`job`**, and **reset `page`** on filter/sort change; `setSort` toggles dir on re-click; `isFiltered` truth table; `listQuery`/`boardQuery` builders omit defaults and (board) include only `search`+`ghost`.
- **`useDebouncedValue`** — emits only after the delay; resets the timer on rapid changes (fake timers).
- **`api-client.getPage`** — returns `{ data, meta }` without unwrap; still triggers single-flight refresh + retry on 401 (reuse the existing refresh test pattern).
- **`SearchInput`** — types → debounced `setSearch` (fake timers); clear button resets; Cmd/Ctrl+K focuses (and `preventDefault`).
- **`JobsToolbar`** — board renders search+ghost only; list renders search+status+ghost+sort; Reset shows only when filtered and calls `resetAll`.
- **`JobsTable`** — renders the 6 columns + values; clicking a sortable header calls `setSort` with the field (and toggles dir when active); shows the active-sort arrow; empty-filtered vs empty-initial states differ; loading renders skeletons.
- **`JobsPagination`** — range math (`from`–`to` of `total`); Prev disabled on page 1, Next disabled on last page; hidden when `totalPages <= 1`.
- **`KanbanBoard` (hybrid drag)** — when filtered: a **same-column** drop is canceled (no `move.mutate`, board restored) and a **cross-column** drop **does** `move.mutate` (status change); when not filtered, both still work (extend the existing drag-vs-tap/move tests). Assert the optimistic write targets the **active filtered key**.
- **`page.tsx`** (light) — forwards parsed filters into the SSR fetch URL (assert the `apiServer` call path includes the query) and seeds the workspace.

## 11. Out of scope / deferred

- **Saved filters / saved views**, multi-select status, server-side full-text ranking (beyond ILIKE substring), fuzzy search.
- **Board pagination** (board intentionally shows the full filtered pipeline) and **user-configurable page size**.
- **Column show/hide / reorder preferences**, density toggle, CSV/export.
- **Global cross-job timeline / activity filtering** (tracked separately in `docs/deferred-tasks.md`).
- Any backend change — explicitly none in this slice.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Filter-aware keys break existing mutation invalidations | Keep `['jobs']` / `['dashboard','kanban']` as **prefixes**; prefix-`invalidateQueries` matches every filtered variant. No invalidation edits. |
| Optimistic move writes to the wrong (stale, unfiltered) cache key | `KanbanBoard` reads/writes the **active** `kanbanKey(filters)`; `onSettled` invalidates the prefix. Covered by a test asserting the target key. |
| Cross-column move while filtered corrupts `kanbanOrder` | Append-after-last-**visible** yields a distinct order; the only true collision case (within-column midpoint vs hidden card) is the path we **disable** while filtered. Self-heals on the next unfiltered reorder. |
| Paging/sorting flashes empty state on each fetch | `placeholderData: keepPreviousData` on both list and board queries. |
| SSR seed key ≠ client key → refetch flash / hydration mismatch | A single pure `parseFilters` shared by the server page and `useJobFilters` guarantees identical defaults → identical keys on first render. |
| Debounced search desyncs field vs URL on back/forward | Field seeds from URL on mount and on `search` prop change; debounce only gates the **write**, never the displayed value. |
| Mobile table overflow | `overflow-x-auto` wrapper + responsive column hiding (keep Title/Status/Ghost). |
