# Frontend Plan 03 — Dashboard & Kanban Board

## Overview

Build the main dashboard page featuring a Kanban board with 6 fixed columns (Wishlist, Applied, Interviewing, Offer, Rejected, Archived). Jobs are displayed as cards with drag-and-drop between columns using `vue-draggable-plus`. Each card shows the ghost meter indicator. The dashboard includes summary stats at the top.

---

## Dependencies

```bash
npm install vue-draggable-plus
```

---

## Folder / File Structure

```
frontend/app/
├── components/
│   ├── dashboard/
│   │   ├── DashboardStats.vue        # Summary stats row (total jobs, by status, ghost alerts)
│   │   └── ViewToggle.vue            # Kanban / List view toggle button group
│   ├── kanban/
│   │   ├── KanbanBoard.vue           # Full board container with 6 columns
│   │   ├── KanbanColumn.vue          # Single column (header + droppable area + card list)
│   │   └── KanbanCard.vue            # Individual job card (title, company, ghost meter, date)
│   └── ghost/
│       └── GhostMeter.vue            # Ghost meter icon + day count with color coding
├── composables/
│   └── useJobs.ts                    # Job state management, Kanban operations
├── pages/
│   └── dashboard.vue                 # Main dashboard page
└── types/
    └── job.ts                        # Job-related type definitions
```

---

## Type Definitions

### `types/job.ts`

```typescript
import type { JobStatus } from '~/utils/constants';

export interface Job {
  id: string;
  userId: string;
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  sourceUrl?: string;
  snapshotMarkdown?: string;
  status: JobStatus;
  kanbanOrder: number;
  lastActivityAt?: string;
  ghostDays: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  location?: string;
  ghostDays: number;
  status: JobStatus;
  kanbanOrder: number;
  lastActivityAt?: string;
  createdAt: string;
}

export interface KanbanColumn {
  status: JobStatus;
  label: string;
  color: string;
  jobs: JobCard[];
}

export interface KanbanBoardData {
  columns: KanbanColumn[];
  stats: DashboardStats;
}

export interface DashboardStats {
  totalJobs: number;
  byStatus: Record<JobStatus, number>;
  ghostAlerts: number;        // jobs with ghostDays > 14
  recentActivity: number;     // jobs updated in last 7 days
}

export interface MoveJobRequest {
  jobId: string;
  newStatus: JobStatus;
  newOrder: number;
}
```

---

## API Endpoints (consumed)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/dashboard/kanban` | Yes | — | `KanbanBoardData` |
| PATCH | `/api/jobs/:id/move` | Yes | `{ status, kanbanOrder }` | `Job` |
| GET | `/api/dashboard/stats` | Yes | — | `DashboardStats` |

---

## Components

### `DashboardStats.vue`
- **Props**: `stats: DashboardStats`
- Row of stat cards using `UCard`
- Shows: Total Jobs, Applied, Interviewing, Offers, Ghost Alerts (red badge)
- Responsive: horizontal scroll on mobile, grid on desktop

### `ViewToggle.vue`
- **Props**: `modelValue: 'kanban' | 'list'`
- **Emits**: `update:modelValue`
- `UButtonGroup` with Kanban icon and List icon
- Persists preference via `useAuth().updateProfile()`

### `KanbanBoard.vue`
- **Props**: `columns: KanbanColumn[]`
- **Emits**: `move-job: MoveJobRequest`
- Horizontal scrollable container with 6 columns
- Uses CSS `overflow-x: auto` for horizontal scrolling
- Each column rendered via `KanbanColumn`

### `KanbanColumn.vue`
- **Props**: `column: KanbanColumn`
- **Emits**: `move-job: MoveJobRequest`
- Column header: status label + job count badge
- Droppable area using `vue-draggable-plus` `VueDraggable` component
- Renders list of `KanbanCard` components
- Min-height to allow drops on empty columns
- Styled with colored top border matching status

### `KanbanCard.vue`
- **Props**: `job: JobCard`
- **Emits**: `click` (opens drawer — Plan 04)
- `UCard` with:
  - Job title (bold, truncated)
  - Company name
  - Location (if present, muted text)
  - `GhostMeter` component
  - Relative date ("2 days ago")
- Cursor: grab (while dragging: grabbing)
- Hover: subtle shadow elevation

### `GhostMeter.vue`
- **Props**: `ghostDays: number`
- Displays icon + "{N}d" text
- Color logic:
  - `ghostDays <= 7`: green (text-green-500) — active
  - `ghostDays > 7 && <= 14`: yellow (text-yellow-500) — stale
  - `ghostDays > 14`: red (text-red-500) — ghost risk
- Icon: clock/timer icon (changes based on severity)
- Tooltip with full text: "Last activity: X days ago"

---

## Composable: `useJobs`

```typescript
export function useJobs() {
  // State
  const kanbanData: Ref<KanbanBoardData | null>;
  const isLoading: Ref<boolean>;

  // Methods
  async function fetchKanban(): Promise<void>;     // GET /dashboard/kanban
  async function moveJob(request: MoveJobRequest): Promise<void>;  // PATCH /jobs/:id/move

  // Optimistic update helper
  function optimisticMove(jobId: string, fromStatus: JobStatus, toStatus: JobStatus, newOrder: number): void;
  function rollbackMove(jobId: string, fromStatus: JobStatus, originalOrder: number): void;

  return { kanbanData, isLoading, fetchKanban, moveJob };
}
```

### Optimistic Drag-and-Drop Flow
1. User drags card from Column A to Column B
2. `vue-draggable-plus` fires `onChange` event
3. Immediately update local state (optimistic)
4. Send `PATCH /jobs/:id/move` to backend
5. On success: keep local state
6. On failure: rollback local state + show error toast

---

## Page: `dashboard.vue`

```typescript
// definePageMeta({ layout: 'default' })
// On mount: fetch kanban data via useJobs().fetchKanban()
// Template:
//   - DashboardStats (top)
//   - ViewToggle (right-aligned below stats)
//   - KanbanBoard (main area) or ListView (Plan 05)
//   - Loading spinner while fetching
//   - Empty state if no jobs
```

---

## Styling Notes

- Kanban columns: fixed width (280-320px), full viewport height minus header/stats
- Column background: subtle gray (light mode) / dark-800 (dark mode)
- Cards: white (light) / dark-700 (dark) with rounded corners
- Drag ghost: semi-transparent card with shadow
- Mobile: columns stack vertically or horizontal scroll with snap

---

## Step-by-Step Implementation Order

1. **Create `types/job.ts`** — Job, JobCard, KanbanColumn, DashboardStats types
2. **Create `GhostMeter.vue`** — Ghost meter component with color logic
3. **Create `KanbanCard.vue`** — Job card component
4. **Create `KanbanColumn.vue`** — Column with vue-draggable-plus integration
5. **Create `KanbanBoard.vue`** — Full board with 6 columns
6. **Create `useJobs` composable** — Fetch + optimistic move logic
7. **Create `DashboardStats.vue`** — Stats row
8. **Create `ViewToggle.vue`** — Kanban/List toggle
9. **Create `dashboard.vue` page** — Compose all components
10. **Style drag-and-drop** — Ghost styles, cursor, hover effects
11. **Test optimistic updates** — Drag, API fail → rollback
12. **Responsive testing** — Mobile horizontal scroll, card sizing

---

## Testing Strategy

### Unit Tests (Vitest)
- `GhostMeter`: renders correct color/icon for ghostDays 0, 7, 8, 14, 15, 30
- `KanbanCard`: renders title, company, ghost meter, handles click
- `KanbanColumn`: renders header with count, renders cards in order
- `useJobs`: mock API, verify fetchKanban populates columns, moveJob sends correct request
- `useJobs`: optimistic update modifies local state immediately

### E2E Tests (Playwright)
- Dashboard loads with kanban board showing all 6 columns
- Job cards display correct info (title, company, ghost meter)
- Drag card from Wishlist to Applied → card moves, API called
- Stats update after move
- Empty board shows empty state message
- View toggle switches between kanban and list

---

## Acceptance Criteria

- [ ] Dashboard page loads and displays Kanban board
- [ ] 6 columns render with correct status labels and colors
- [ ] Job cards show title, company, location, ghost meter, date
- [ ] Ghost meter shows correct color (green/yellow/red) based on days
- [ ] Drag-and-drop moves cards between columns
- [ ] Optimistic update: card moves instantly, API called in background
- [ ] Failed move: card snaps back to original position + error toast
- [ ] Stats row shows total jobs, by-status counts, ghost alerts
- [ ] View toggle switches between kanban and list views
- [ ] Board scrolls horizontally on smaller screens
- [ ] Empty columns show droppable area (can receive cards)
- [ ] Loading spinner shown while fetching initial data
- [ ] Empty state shown when user has no jobs
