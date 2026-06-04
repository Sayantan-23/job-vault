# JobVault — List Column Filters Redesign — Design Spec

> Refinement of Slice 5 (Filters + Search + List View). Parent spec: [`2026-06-04-slice-5-filters-search-list-design.md`](./2026-06-04-slice-5-filters-search-list-design.md). Built on the same branch (`slice-5-filters-search-list`, not yet merged).

---

## 1. Goal & scope

Move column-specific controls **out of the page header and onto the columns themselves** (Notion-style), so the header holds only the two global controls — **Search** and **Activity** (ghost) — while each column owns its own sort and filter. Add a real **date-range filter** to the Added column (a small additive backend change).

This crosses back into the **backend** (the date-range filter), so this sub-task is *not* frontend-only. Everything else is frontend.

## 2. Resolved decisions (brainstorming, 2026-06-04)

1. **Header = Search + Activity only.** The header `SortControl` is removed; the Status dropdown moves off the header onto the Status column.
2. **Tap a column header to sort, 3-state cycle:** `asc → desc → off`, where **off** clears that column's sort and falls back to the default **`createdAt` desc** (newest first). The **Added** column (which *is* `createdAt`) special-cases to a plain `asc ↔ desc` toggle, since its "off" equals its default desc.
3. **Funnel menu only on filterable columns** — **Status** (filter by status) and **Added** (date range). Funnel button is hidden, fades in on hover/focus, and opens an **anchored** popover beside the column. Title/Company/Ghost sort by tap only; Location is static.
4. **Date range is included** (backend `createdFrom`/`createdTo`, no migration).

## 3. Backend changes (`backend-express/`) — small, additive, no migration

**List endpoint only** (`GET /api/jobs`). The board/kanban endpoint (`DashboardQuerySchema`) is untouched — the board has no Added column and date range is a list-only filter.

### `src/modules/jobs/jobs.schema.ts` — `JobQuerySchema`
Add two optional fields:
```ts
createdFrom: z.string().date().optional(),  // 'YYYY-MM-DD'; if the installed Zod predates .date(), use .regex(/^\d{4}-\d{2}-\d{2}$/)
createdTo: z.string().date().optional(),
```
(`JobQueryInput` type is inferred, so it updates automatically.)

### `src/modules/jobs/jobs.repository.ts` — `findAll`
Add two WHERE conditions to the existing `and(...)`, using **UTC day boundaries** (`createdTo` is inclusive through end-of-day):
```ts
query.createdFrom ? gte(jobs.createdAt, new Date(`${query.createdFrom}T00:00:00.000Z`)) : undefined,
query.createdTo   ? lte(jobs.createdAt, new Date(`${query.createdTo}T23:59:59.999Z`))   : undefined,
```
Import `gte`, `lte` from `drizzle-orm` (alongside the existing `and/or/eq/ilike`). The same conditions apply to both the rows query and the total-count query (they already share the `where`).

### Tests
- `jobs.repository.test.ts` (real DB): seed jobs with distinct `createdAt`; assert `createdFrom`/`createdTo`/both narrow correctly and that `createdTo` is inclusive of that day.
- `jobs.router.test.ts`: assert `createdFrom`/`createdTo` are forwarded through `validate(JobQuerySchema,'query')` to `repo.findAll` (extend the existing "forwards filters" test).

**Contract:** response envelope unchanged (`{ data, meta }`). Invalid date strings → the existing 400 validation path.

## 4. Filter model + URL (`frontend-next/`)

### `types/filters.ts`
`JobFilters` gains `createdFrom?: string` and `createdTo?: string` (both `YYYY-MM-DD`).

### URL contract additions
| URL param | API param | Values | Default (omitted) | Applies to |
|---|---|---|---|---|
| `from` | `createdFrom` | `YYYY-MM-DD` | — | **List only** |
| `to` | `createdTo` | `YYYY-MM-DD` | — | **List only** |

`parseFilters` reads `from`/`to` (passes through only well-formed `YYYY-MM-DD`, else omits). `buildListQuery` maps them to `createdFrom`/`createdTo`. `buildBoardQuery` ignores them.

### `isFiltered` split (`lib/filters.ts`)
Replace the single `isFiltered` with two intent-specific predicates (fixes the prior review nit where a status-only filter wrongly paused board reordering):
```ts
// board reorder-suppression + board "matching" count — board-relevant filters only
export function isBoardFiltered(f: JobFilters): boolean {
  return f.search !== '' || f.ghost !== 'all'
}
// list reset / empty-state / "matching" count — every list filter
export function isListFiltered(f: JobFilters): boolean {
  return f.search !== '' || f.status !== undefined || f.ghost !== 'all' || !!f.createdFrom || !!f.createdTo
}
```

### `hooks/use-job-filters.ts`
- Replace `setSort` with **`cycleSort(field)`** implementing the 3-state cycle. Reads current `sort`/`dir` via `parseFilters(searchParams)`:
  ```
  cycleSort(field):
    f = parseFilters(searchParams)
    if (field === 'createdAt'):                       // Added: toggle asc<->desc (off == default desc)
       if f.sortBy === 'createdAt' && f.sortOrder === 'asc':  clear sort+dir         // → default createdAt desc
       else:                                                  set sort=createdAt, dir=asc
       return
    if f.sortBy !== field:        set sort=field, dir=asc          // inactive → asc
    else if f.sortOrder === 'asc': set sort=field, delete dir       // asc → desc (dir omitted = default desc)
    else:                          clear sort+dir                   // desc → off → default createdAt desc
  ```
  (clean-URL: `dir` omitted = desc; `sort` omitted = createdAt. Always preserves `view`/`job`, resets `page`.)
- Add **`setDateRange(from?: string, to?: string)`** — sets/clears the `from`/`to` params (omitting empty), resets `page`, preserves `view`/`job`.
- Expose `isBoardFiltered` and `isListFiltered` (computed) instead of the single `isFiltered`.
- `resetAll` continues to clear all filter params (now incl. `from`/`to`).

Sort indicator is unchanged: a column shows ▲/▼ when `filters.sortBy === field`; with no explicit sort, that's the Added column showing ▼ (default newest-first).

## 5. Anchored popover primitive

The existing `ui/popover.tsx` is hardcoded to `fixed right-4 top-16` (the notification bell) — not anchored to a trigger. Add a small **anchored** popover on **`@radix-ui/react-popover`** (new dependency; consistent with "Radix for overlay behavior"):

`src/components/ui/anchored-popover.tsx` — thin wrappers exporting `AnchoredPopover` (Root), `AnchoredPopoverTrigger`, and `AnchoredPopoverContent` (Portal + `Content` with `align="start"`, `sideOffset`, collision padding, our card tokens + `data-theme-scope="app"`, and the existing `animate-jv-surface-in/out`). Behavior (anchor, focus, escape, outside-click) comes from Radix; presentation is ours.

> Install: `@radix-ui/react-popover`. After adding a dep, the Docker stack needs `--renew-anon-volumes` (per CLAUDE.md).

## 6. Column controls (`JobsTable`)

`src/components/jobs/jobs-table.tsx` header cells become per-column:
- **Sortable label** (Title, Company, Ghost, Added): a button calling `onSort(field)` → `cycleSort`; shows ▲/▼ when active. (Existing `SortHeader`, repointed to `cycleSort`.)
- **Funnel** (Status, Added): a `ColumnFunnel` trigger (funnel/filter icon, `opacity-0 group-hover/header:opacity-100 focus-visible:opacity-100`) inside an `AnchoredPopover`. The header row/cell gets a `group/header` so the funnel reveals on hover; it's always reachable via keyboard focus.
- **Status** header: not sortable (label is plain text) — funnel only.
- **Location**: plain label, no funnel.
- An active filter on a column shows a small **dot/active state** on its funnel (so a hidden-by-hover funnel still signals "filtered").

New menu components (each its own component — no inline menu markup):
- `src/components/jobs/status-filter-menu.tsx` — radio-style list: *All statuses* + 6 `JOB_STATUSES` (labels from `STATUS_META`); selecting calls `onStatus(value)` and closes. Active item checked.
- `src/components/jobs/date-range-menu.tsx` — two `<input type="date">` (From / To, From bound by `max=To`, To by `min=From`), an **Apply** and a **Clear**; calls `setDateRange`. Seeds from current `from`/`to`.

## 7. Header (`JobsToolbar` + `JobsWorkspace`)

- `JobsToolbar` renders **only** `SearchInput` + the Activity (`ghost`) `Select`, plus a conditional **"Clear all"** ghost button shown when `isListFiltered` **or** a non-default sort is active (clears every filter + sort via `resetAll`). Status `Select` and `SortControl` are removed from it.
- **Delete `src/components/jobs/sort-control.tsx`** (+ its test) — no longer used anywhere.
- `JobsWorkspace`: pass `cycleSort` to `JobsTable` (`onSort`); pass `setStatus`/`setDateRange`/current values to the column menus (via `JobsTable` props); board uses `isBoardFiltered` for the reorder-paused hint; the header count uses `isListFiltered` (list) / `isBoardFiltered` (board) for the "matching" vs "tracked" label.

## 8. Component inventory

**New**
- `frontend-next/src/components/ui/anchored-popover.tsx`
- `frontend-next/src/components/jobs/column-funnel.tsx` (the hover-reveal trigger + active dot)
- `frontend-next/src/components/jobs/status-filter-menu.tsx`
- `frontend-next/src/components/jobs/date-range-menu.tsx`

**Modified**
- `backend-express/src/modules/jobs/jobs.schema.ts`, `jobs.repository.ts` (+ tests)
- `frontend-next/src/types/filters.ts`, `src/lib/filters.ts`
- `frontend-next/src/hooks/use-job-filters.ts` (+ test)
- `frontend-next/src/components/jobs/jobs-table.tsx` (+ test), `jobs-toolbar.tsx` (+ test), `jobs-workspace.tsx` (+ test)
- `frontend-next/src/components/kanban/kanban-board.tsx` (consume `isBoardFiltered`) and any `isFiltered` callers
- `frontend-next/package.json` (`@radix-ui/react-popover`)

**Removed**
- `frontend-next/src/components/jobs/sort-control.tsx` + `sort-control.test.tsx`

## 9. Testing

- **Backend:** repo date-range (real DB, incl. inclusive `createdTo`); router forwards `createdFrom`/`createdTo`.
- **`lib/filters`:** `parseFilters` reads `from`/`to`; `buildListQuery` emits `createdFrom`/`createdTo`; `buildBoardQuery` omits them; `isBoardFiltered` vs `isListFiltered` truth tables.
- **`useJobFilters`:** `cycleSort` 3-state for a non-default column (asc → desc → off→default) and the createdAt toggle; `setDateRange` set/clear + page reset + view/job preserved.
- **`StatusFilterMenu`** (select calls `onStatus`, active checked), **`DateRangeMenu`** (Apply/Clear call `setDateRange`, From/To bounds).
- **`JobsTable`:** sortable label cycles via `onSort`; funnel renders only on Status/Added and is keyboard-focusable; active-filter dot shows.
- **`JobsToolbar`:** renders only search + activity (+ Clear-all when filtered); no status select / sort control.
- **`KanbanBoard`/workspace:** reorder-paused hint keys off `isBoardFiltered` (a status- or date-only filter does **not** pause board reorder).

## 10. Out of scope
Per-column **text** filters (Title/Company-only — the API has only the combined `search`), **Location** sort/filter, **multi-select** status (API takes one), date range on activity/`lastActivityAt`, saved views, a calendar-widget date picker (native date inputs only).

## 11. Risks & mitigations
| Risk | Mitigation |
|---|---|
| `z.string().date()` unsupported by the installed Zod | Fall back to `.regex(/^\d{4}-\d{2}-\d{2}$/)`; verify the version at implementation time. |
| TZ edges on date-range (timestamptz vs UTC day) | Use explicit UTC day boundaries (`T00:00:00.000Z` / `T23:59:59.999Z`); acceptable for a single-user tracker; documented. |
| New `@radix-ui/react-popover` dep not picked up in Docker | Rebuild with `--renew-anon-volumes` (CLAUDE.md). |
| Hover-only funnel is invisible to keyboard/touch | Funnel also reveals on `focus-visible`; an active-filter dot keeps it discoverable; desktop-first app. |
| `cycleSort` "off" no-ops on the Added column | Added is special-cased to a plain asc↔desc toggle (its off == default desc). |
| Splitting `isFiltered` breaks existing callers | Replace all `isFiltered` references with `isBoardFiltered`/`isListFiltered` in the same change; typecheck covers it. |
