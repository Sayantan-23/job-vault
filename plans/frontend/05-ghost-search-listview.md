# Frontend Plan 05 — Ghost Meter Filtering, Search & List View

## Overview

Extend the dashboard with search functionality, ghost meter filtering, stage filters, and a secondary List View (table format). The search bar lives in the header for global access. This plan ties together the filtering and alternate view experiences that complement the Kanban board.

---

## Dependencies

```bash
# No additional dependencies — Nuxt UI provides UTable, UInput, USelect, etc.
```

---

## Folder / File Structure

```
frontend/app/
├── components/
│   ├── dashboard/
│   │   ├── DashboardFilters.vue      # Filter bar: search, status filter, ghost filter, sort
│   │   └── ViewToggle.vue            # (from Plan 03, already exists)
│   ├── list/
│   │   ├── JobListView.vue           # Table view of all jobs
│   │   └── JobListRow.vue            # Custom row with ghost meter, status badge, actions
│   └── search/
│       └── HeaderSearchBar.vue       # Search input in AppHeader
├── composables/
│   └── useJobFilters.ts              # Filter/search state, query building
└── types/
    └── filters.ts                    # Filter-related type definitions
```

---

## Type Definitions

### `types/filters.ts`

```typescript
import type { JobStatus } from '~/utils/constants';

export type GhostFilter = 'all' | 'active' | 'stale' | 'ghost';

export type SortField = 'createdAt' | 'updatedAt' | 'title' | 'company' | 'ghostDays';
export type SortOrder = 'asc' | 'desc';

export interface JobFilters {
  search?: string;
  status?: JobStatus | 'all';
  ghostFilter?: GhostFilter;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
}

export interface JobListItem {
  id: string;
  title: string;
  company: string;
  location?: string;
  status: JobStatus;
  ghostDays: number;
  lastActivityAt?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## API Endpoints (consumed)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/jobs` | Yes | Query: `search`, `status`, `ghostFilter`, `sortBy`, `sortOrder`, `page`, `limit` | `PaginatedResponse<JobListItem>` |
| GET | `/api/dashboard/kanban` | Yes | Query: `search`, `status`, `ghostFilter` | `KanbanBoardData` (filtered) |

---

## Components

### `HeaderSearchBar.vue`
- Lives inside `AppHeader.vue`
- `UInput` with search icon, placeholder "Search jobs..."
- Debounced input (300ms) → updates `useJobFilters().search`
- Clear button (X icon) when text present
- Keyboard shortcut: `Cmd/Ctrl + K` to focus
- Responsive: icon-only on mobile, expands on focus

### `DashboardFilters.vue`
- Horizontal bar below stats, above kanban/list
- **Status filter**: `USelectMenu` with "All Statuses" + 6 status options
- **Ghost filter**: `USelectMenu` with options:
  - All
  - Active (≤ 7 days) — green
  - Stale (8-14 days) — yellow
  - Ghost Risk (> 14 days) — red
- **Sort**: `USelectMenu` for sort field + order toggle button
- **Clear filters**: "Reset" button (shown when any filter is active)
- Reads/writes from `useJobFilters()`

### `JobListView.vue`
- **Props**: `jobs: JobListItem[]`, `isLoading: boolean`, `meta: PaginationMeta`
- Uses `UTable` from Nuxt UI
- Columns:
  - Title (clickable → opens drawer)
  - Company
  - Location
  - Status (`JobStatusBadge`)
  - Ghost Meter (`GhostMeter`)
  - Last Activity (relative date)
  - Created (relative date)
  - Actions (kebab menu)
- Sortable column headers (click to sort)
- Pagination at bottom using `UPagination`
- Row click → opens `JobDrawer`
- Empty state when no jobs match filters

### `JobListRow.vue`
- Custom row rendering for the table (if needed beyond UTable defaults)
- Integrates `GhostMeter` and `JobStatusBadge` in cells

---

## Composable: `useJobFilters`

```typescript
export function useJobFilters() {
  // State
  const filters: Ref<JobFilters>;
  const isFiltered: ComputedRef<boolean>;  // true if any filter is active

  // Methods
  function setSearch(query: string): void;
  function setStatus(status: JobStatus | 'all'): void;
  function setGhostFilter(filter: GhostFilter): void;
  function setSort(field: SortField, order: SortOrder): void;
  function setPage(page: number): void;
  function resetFilters(): void;

  // Query string builder for API calls
  function toQueryParams(): Record<string, string>;

  return { filters, isFiltered, setSearch, setStatus, setGhostFilter, setSort, setPage, resetFilters, toQueryParams };
}
```

### Filter Flow
1. Any filter change → update `useJobFilters()` state
2. Watch filters → debounced API call
3. If Kanban view: `GET /dashboard/kanban?search=...&status=...&ghostFilter=...`
4. If List view: `GET /jobs?search=...&status=...&ghostFilter=...&page=...&limit=20`
5. URL query params synced with filters (shareable/bookmarkable URLs)

### Ghost Filter Logic (backend handles, frontend sends)
- `active`: ghostDays ≤ 7
- `stale`: ghostDays > 7 AND ≤ 14
- `ghost`: ghostDays > 14

---

## Integration with Dashboard

Update `dashboard.vue` (from Plan 03):
```
<DashboardStats />
<div class="flex justify-between items-center">
  <DashboardFilters />
  <ViewToggle v-model="currentView" />
</div>
<KanbanBoard v-if="currentView === 'kanban'" />
<JobListView v-else />
```

Update `AppHeader.vue` (from Plan 01):
- Add `HeaderSearchBar` to center/right of header
- Search input syncs with `useJobFilters().search`

---

## Step-by-Step Implementation Order

1. **Create `types/filters.ts`** — Filter type definitions
2. **Create `useJobFilters` composable** — Filter state management + query builder
3. **Create `HeaderSearchBar.vue`** — Debounced search in header
4. **Create `DashboardFilters.vue`** — Status, ghost, sort filter bar
5. **Integrate `HeaderSearchBar` into `AppHeader`**
6. **Update `useJobs` composable** — Accept filters, pass to API calls
7. **Create `JobListView.vue`** — Table with sortable columns and pagination
8. **Integrate List View into `dashboard.vue`** — ViewToggle switches views
9. **Sync URL query params** — Filters reflect in URL, URL populates filters on load
10. **Update Kanban to respect filters** — Filtered kanban shows only matching jobs
11. **Add keyboard shortcut** — Cmd/Ctrl+K focuses search
12. **Test all filter combinations** — Search + status + ghost, verify results

---

## Testing Strategy

### Unit Tests (Vitest)
- `useJobFilters`: set/reset filters, toQueryParams builds correct string
- `useJobFilters`: isFiltered returns true when any filter set
- `HeaderSearchBar`: debounces input, emits after delay
- `DashboardFilters`: renders all filter dropdowns, reset clears all
- `JobListView`: renders table with correct columns, handles empty state
- `GhostMeter` filter mapping: active/stale/ghost ranges

### E2E Tests (Playwright)
- Type in search bar → kanban filters to matching jobs
- Select "Applied" status filter → only Applied column has content
- Select "Ghost Risk" → only red ghost meter jobs shown
- Switch to List View → table renders with all visible jobs
- Click column header → table sorts by that column
- Pagination: navigate pages in list view
- Clear filters → all jobs visible again
- URL reflects filters: refresh page → filters persist
- Cmd/Ctrl+K focuses search bar

---

## Acceptance Criteria

- [ ] Search bar in header with debounced search (300ms)
- [ ] Cmd/Ctrl+K keyboard shortcut focuses search
- [ ] Status filter dropdown filters jobs by selected status
- [ ] Ghost filter dropdown filters by Active/Stale/Ghost Risk
- [ ] Sort dropdown changes job ordering
- [ ] "Reset" button clears all filters
- [ ] Active filter count or indicator shown when filters are applied
- [ ] Kanban view respects all active filters
- [ ] List view shows all jobs in a table with correct columns
- [ ] List view table columns are sortable
- [ ] List view has pagination (20 jobs per page)
- [ ] Clicking a row in list view opens job drawer
- [ ] View toggle switches between Kanban and List
- [ ] URL query params sync with active filters
- [ ] Empty state shown when no jobs match filters
- [ ] Filters persist across view toggle (kanban ↔ list)
