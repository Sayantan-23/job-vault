# Backend Plan 04 — Dashboard API

## Overview

Implement the dashboard-specific endpoints: Kanban board data (jobs grouped by status with ordering), dashboard statistics, ghost meter calculation, and search/filter support for the board view. This module aggregates data from the Job module into dashboard-friendly shapes.

---

## Dependencies

```bash
# No additional dependencies — uses existing MikroORM, Job entity
```

---

## Folder / File Structure

```
backend/src/modules/dashboard/
├── dashboard.module.ts               # DashboardModule
├── dashboard.controller.ts           # Dashboard routes
├── dashboard.service.ts              # Dashboard business logic
└── dto/
    ├── kanban-response.dto.ts        # KanbanBoard response shape
    ├── dashboard-stats.dto.ts        # Stats response shape
    └── dashboard-query.dto.ts        # Dashboard query params (filters)
```

---

## DTO Definitions

### `kanban-response.dto.ts`

```typescript
import { JobStatus } from '../../job/enums/job-status.enum';

export class KanbanCardDto {
  id: string;
  title: string;
  company: string;
  location?: string;
  ghostDays: number;
  status: JobStatus;
  kanbanOrder: number;
  lastActivityAt?: Date;
  createdAt: Date;
}

export class KanbanColumnDto {
  status: JobStatus;
  label: string;
  color: string;
  jobs: KanbanCardDto[];
}

export class KanbanBoardResponseDto {
  columns: KanbanColumnDto[];
  stats: DashboardStatsDto;
}
```

### `dashboard-stats.dto.ts`

```typescript
import { JobStatus } from '../../job/enums/job-status.enum';

export class DashboardStatsDto {
  totalJobs: number;
  byStatus: Record<JobStatus, number>;
  ghostAlerts: number;
  recentActivity: number;
}
```

### `dashboard-query.dto.ts`

```typescript
import { IsOptional, IsString, IsIn, IsEnum } from 'class-validator';
import { JobStatus } from '../../job/enums/job-status.enum';

export class DashboardQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsIn(['all', 'active', 'stale', 'ghost'])
  ghostFilter?: string;
}
```

---

## API Endpoints

| Method | Path | Auth | Request | Response | Description |
|--------|------|------|---------|----------|-------------|
| GET | `/api/dashboard/kanban` | Yes | Query: `DashboardQueryDto` | `KanbanBoardResponseDto` | Full Kanban board data |
| GET | `/api/dashboard/stats` | Yes | — | `DashboardStatsDto` | Dashboard statistics |

---

## Service: `dashboard.service.ts`

```typescript
export class DashboardService {
  async getKanbanBoard(userId: string, query: DashboardQueryDto): Promise<KanbanBoardResponseDto>;
    // 1. Fetch all user's jobs (with optional filters)
    // 2. Apply search filter (ILIKE on title, company)
    // 3. Apply status filter (if specified, only return that column)
    // 4. Apply ghost filter
    // 5. Group jobs by status
    // 6. Sort each group by kanbanOrder ASC
    // 7. Map to KanbanCardDto (select only needed fields)
    // 8. Build 6 columns (even if empty) with labels and colors
    // 9. Calculate stats
    // 10. Return KanbanBoardResponseDto

  async getStats(userId: string): Promise<DashboardStatsDto>;
    // 1. Count total jobs
    // 2. Count by status (GROUP BY status)
    // 3. Count ghost alerts (ghostDays > 14)
    // 4. Count recent activity (lastActivityAt within 7 days)
    // 5. Return DashboardStatsDto

  private groupByStatus(jobs: Job[]): Map<JobStatus, KanbanCardDto[]>;
  private buildColumns(grouped: Map<JobStatus, KanbanCardDto[]>): KanbanColumnDto[];
}
```

### Column Configuration (hardcoded)

```typescript
const COLUMN_CONFIG: Record<JobStatus, { label: string; color: string }> = {
  wishlist: { label: 'Wishlist', color: 'neutral' },
  applied: { label: 'Applied', color: 'info' },
  interviewing: { label: 'Interviewing', color: 'warning' },
  offer: { label: 'Offer', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  archived: { label: 'Archived', color: 'neutral' },
};
```

### Ghost Days Calculation Logic

```typescript
// Called by daily cron (Plan 05) but logic defined here for reference:
function calculateGhostDays(job: Job): number {
  const reference = job.lastActivityAt || job.createdAt;
  const now = new Date();
  const diffMs = now.getTime() - reference.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
```

### Filter Logic

```typescript
// Search: title ILIKE %query% OR company ILIKE %query%
// Status: exact match on status field
// Ghost filter:
//   active: ghostDays <= 7
//   stale: ghostDays > 7 AND ghostDays <= 14
//   ghost: ghostDays > 14
//   all: no filter (default)
```

---

## Performance Considerations

- Kanban board fetches ALL user's jobs (no pagination) — this is intentional for drag-and-drop
- For users with many jobs (100+), consider:
  - Excluding Archived column jobs by default (include with filter)
  - Lazy-loading card details on drawer open
  - Caching stats with short TTL
- KanbanCardDto is a projection (not full Job entity) to minimize payload

---

## Step-by-Step Implementation Order

1. **Create DTOs** — KanbanCardDto, KanbanColumnDto, KanbanBoardResponseDto, DashboardStatsDto, DashboardQueryDto
2. **Create `dashboard.service.ts`** — Kanban board grouping + stats calculation
3. **Create `dashboard.controller.ts`** — Dashboard routes with JWT guard
4. **Create `dashboard.module.ts`** — Wire up module, import JobModule
5. **Register DashboardModule in AppModule**
6. **Test Kanban endpoint** — Returns all 6 columns with jobs
7. **Test with filters** — Search, status, ghost filter applied
8. **Test stats endpoint** — Correct counts per status
9. **Test empty state** — New user with no jobs

---

## Testing Strategy

### Unit Tests (Jest)
- `DashboardService.getKanbanBoard`: groups jobs by status correctly
- `DashboardService.getKanbanBoard`: returns 6 columns even when some are empty
- `DashboardService.getKanbanBoard`: applies search filter (title + company)
- `DashboardService.getKanbanBoard`: applies ghost filter correctly
- `DashboardService.getKanbanBoard`: sorts jobs by kanbanOrder within columns
- `DashboardService.getStats`: counts total, by status, ghost alerts, recent activity
- Ghost days calculation: correct for various dates

### E2E Tests (Supertest)
- `GET /api/dashboard/kanban` — returns 6 columns, jobs in correct columns
- `GET /api/dashboard/kanban?search=engineer` — only matching jobs returned
- `GET /api/dashboard/kanban?status=applied` — only Applied column has jobs
- `GET /api/dashboard/kanban?ghostFilter=ghost` — only ghost risk jobs
- `GET /api/dashboard/stats` — correct counts
- Empty user: kanban returns 6 empty columns, stats all zeros
- Jobs scoped to user: cannot see other user's jobs

---

## Acceptance Criteria

- [ ] `GET /api/dashboard/kanban` returns 6 columns with correctly grouped jobs
- [ ] Empty columns are included (not omitted)
- [ ] Jobs sorted by `kanbanOrder` ASC within each column
- [ ] KanbanCardDto contains only necessary fields (not full job)
- [ ] Search filter matches on title and company (case-insensitive)
- [ ] Status filter returns only jobs with matching status
- [ ] Ghost filter correctly segments by ghostDays thresholds
- [ ] Multiple filters can be combined
- [ ] `GET /api/dashboard/stats` returns accurate counts
- [ ] Ghost alerts count matches jobs with ghostDays > 14
- [ ] Recent activity count matches jobs with lastActivityAt within 7 days
- [ ] All data is scoped to the authenticated user
- [ ] Empty state: new user gets 6 empty columns, zero stats
- [ ] Response payload is efficient (no unnecessary fields)
