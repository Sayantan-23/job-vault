# Backend Plan 03 — Job Module

## Overview

Implement the Job entity, full CRUD operations, URL scraping (Cheerio primary + Gemini AI fallback), job status management, Kanban reorder functionality, and paginated job listing. This is the core data module that powers the "vault" — capturing and preserving job postings.

---

## Dependencies

```bash
npm install cheerio
npm install @google/genai
npm install turndown           # HTML to Markdown converter
npm install -D @types/turndown
```

---

## Folder / File Structure

```
backend/src/modules/job/
├── job.module.ts                     # JobModule
├── job.controller.ts                 # Job CRUD routes
├── job.service.ts                    # Job business logic
├── entities/
│   └── job.entity.ts                 # Job entity
├── dto/
│   ├── create-job.dto.ts             # Manual job creation
│   ├── create-job-from-url.dto.ts    # URL-based job creation
│   ├── update-job.dto.ts             # Update job fields
│   ├── move-job.dto.ts               # Kanban move (status + order)
│   └── job-query.dto.ts              # Query params (search, filters, pagination)
├── services/
│   ├── scraper.service.ts            # URL scraping with Cheerio + Gemini fallback
│   └── markdown.service.ts           # HTML to Markdown conversion
└── enums/
    └── job-status.enum.ts            # JobStatus enum
```

---

## Entity Definition

### `job.entity.ts`

```typescript
import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { JobStatus } from '../enums/job-status.enum';

@Entity({ tableName: 'jobs' })
export class Job extends BaseEntity {
  @ManyToOne(() => User)
  user: User;

  @Property()
  @Index()
  title: string;

  @Property()
  @Index()
  company: string;

  @Property({ nullable: true })
  location?: string;

  @Property({ nullable: true })
  salaryRange?: string;

  @Property({ nullable: true, length: 2000 })
  sourceUrl?: string;

  @Property({ nullable: true, type: 'text' })
  snapshotMarkdown?: string;

  @Enum(() => JobStatus)
  @Index()
  status: JobStatus = JobStatus.WISHLIST;

  @Property({ type: 'float', default: 0 })
  kanbanOrder: number = 0;

  @Property({ nullable: true, type: 'timestamptz' })
  lastActivityAt?: Date;

  @Property({ type: 'int', default: 0 })
  ghostDays: number = 0;

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
```

### `job-status.enum.ts`
```typescript
export enum JobStatus {
  WISHLIST = 'wishlist',
  APPLIED = 'applied',
  INTERVIEWING = 'interviewing',
  OFFER = 'offer',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}
```

### Migration: `CreateJobsTable`
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  salary_range VARCHAR(255),
  source_url VARCHAR(2000),
  snapshot_markdown TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'wishlist',
  kanban_order FLOAT NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  ghost_days INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_company ON jobs(company);
```

---

## DTO Definitions

### `create-job.dto.ts`
```typescript
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { JobStatus } from '../enums/job-status.enum';

export class CreateJobDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(255)
  company: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  salaryRange?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  snapshotMarkdown?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### `create-job-from-url.dto.ts`
```typescript
import { IsUrl } from 'class-validator';

export class CreateJobFromUrlDto {
  @IsUrl()
  sourceUrl: string;
}
```

### `update-job.dto.ts`
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateJobDto } from './create-job.dto';

export class UpdateJobDto extends PartialType(CreateJobDto) {}
```

### `move-job.dto.ts`
```typescript
import { IsEnum, IsNumber } from 'class-validator';
import { JobStatus } from '../enums/job-status.enum';

export class MoveJobDto {
  @IsEnum(JobStatus)
  status: JobStatus;

  @IsNumber()
  kanbanOrder: number;
}
```

### `job-query.dto.ts`
```typescript
import { IsOptional, IsString, IsEnum, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { JobStatus } from '../enums/job-status.enum';

export class JobQueryDto extends PaginationQueryDto {
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
| POST | `/api/jobs` | Yes | `CreateJobDto` | `Job` | Create job manually |
| POST | `/api/jobs/scrape` | Yes | `CreateJobFromUrlDto` | `ScrapeResult` | Scrape job from URL (preview) |
| GET | `/api/jobs` | Yes | Query: `JobQueryDto` | `PaginatedResponse<Job>` | List user's jobs with filters |
| GET | `/api/jobs/:id` | Yes | — | `Job` | Get single job |
| PATCH | `/api/jobs/:id` | Yes | `UpdateJobDto` | `Job` | Update job fields |
| PATCH | `/api/jobs/:id/move` | Yes | `MoveJobDto` | `Job` | Move job (status + order) |
| DELETE | `/api/jobs/:id` | Yes | — | `{ message }` | Delete job |

---

## Service: `job.service.ts`

```typescript
export class JobService {
  // CRUD
  async create(userId: string, dto: CreateJobDto): Promise<Job>;
    // 1. Create job entity with user relation
    // 2. Set kanbanOrder to max order in status column + 1
    // 3. Set lastActivityAt to now
    // 4. Persist and return

  async findAll(userId: string, query: JobQueryDto): Promise<PaginatedResponse<Job>>;
    // 1. Build query with user filter (always scoped to current user)
    // 2. Apply search filter (ILIKE on title, company)
    // 3. Apply status filter
    // 4. Apply ghost filter:
    //    - active: ghostDays <= 7
    //    - stale: ghostDays > 7 AND <= 14
    //    - ghost: ghostDays > 14
    // 5. Apply sorting and pagination
    // 6. Return paginated response

  async findOne(userId: string, id: string): Promise<Job>;
    // Find by id + userId (ensure ownership)

  async update(userId: string, id: string, dto: UpdateJobDto): Promise<Job>;
    // 1. Find job (ensure ownership)
    // 2. Update fields
    // 3. Update lastActivityAt
    // 4. Persist and return

  async move(userId: string, id: string, dto: MoveJobDto): Promise<Job>;
    // 1. Find job (ensure ownership)
    // 2. If status changed: create auto timeline event (Plan 05)
    // 3. Update status + kanbanOrder
    // 4. Update lastActivityAt
    // 5. Persist and return

  async delete(userId: string, id: string): Promise<void>;
    // 1. Find job (ensure ownership)
    // 2. Remove entity (cascades to timeline, reminders, cover letters)

  async scrapeFromUrl(url: string): Promise<ScrapeResult>;
    // 1. Call ScraperService.scrape(url)
    // 2. Return extracted data (title, company, location, salary, markdown)
}
```

---

## Scraper Service: `scraper.service.ts`

```typescript
export class ScraperService {
  async scrape(url: string): Promise<ScrapeResult>;
    // 1. Fetch page HTML with fetch/axios
    // 2. Parse with Cheerio
    // 3. Attempt structured extraction:
    //    a. Check for schema.org JobPosting JSON-LD
    //    b. Try platform-specific selectors (LinkedIn, Indeed, etc.)
    //    c. Fall back to generic extraction (title, meta, body)
    // 4. Convert description HTML to Markdown via MarkdownService
    // 5. If Cheerio extraction is poor (missing title/company):
    //    → Fall back to Gemini AI extraction
    // 6. Return ScrapeResult

  private async cheerioExtract(html: string, url: string): Promise<Partial<ScrapeResult>>;
  private async geminiExtract(html: string, url: string): Promise<Partial<ScrapeResult>>;
}

interface ScrapeResult {
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  snapshotMarkdown: string;
}
```

### Gemini Fallback Logic
```typescript
// When Cheerio fails to extract title OR company:
// 1. Send page HTML (truncated to ~30k chars) to Gemini
// 2. Prompt: "Extract job posting details from this HTML: title, company, location, salary, full description"
// 3. Parse Gemini's structured response
// 4. Convert description to markdown
```

---

## Markdown Service: `markdown.service.ts`

```typescript
export class MarkdownService {
  htmlToMarkdown(html: string): string;
    // Uses Turndown library
    // Strips scripts, styles, nav, footer
    // Preserves: headings, lists, paragraphs, links, bold/italic
    // Cleans up excessive whitespace
}
```

---

## Kanban Order Strategy

- `kanbanOrder` is a float to allow insertion between existing items
- New job: `kanbanOrder = maxOrderInColumn + 1`
- Move to position between items A (order=2.0) and B (order=3.0): `kanbanOrder = 2.5`
- Periodically normalize orders (when gap becomes too small): reassign 1, 2, 3, ...

---

## Ghost Days Calculation

- `ghostDays` = days since `lastActivityAt` (or `createdAt` if no activity)
- Updated by daily cron job (Plan 05)
- `lastActivityAt` updated on:
  - Job creation
  - Status change
  - Note update
  - Manual timeline entry
  - Any PATCH to the job

---

## Step-by-Step Implementation Order

1. **Create `job-status.enum.ts`** — Status enum
2. **Create `job.entity.ts`** — Job entity with all fields
3. **Create migration** — `CreateJobsTable`
4. **Create DTOs** — create, update, move, query, scrape
5. **Create `markdown.service.ts`** — HTML to Markdown converter
6. **Create `scraper.service.ts`** — Cheerio scraper + Gemini fallback
7. **Create `job.service.ts`** — CRUD, filtering, Kanban ordering
8. **Create `job.controller.ts`** — All job routes with guards
9. **Create `job.module.ts`** — Wire up module
10. **Register JobModule in AppModule**
11. **Test CRUD** — Create, read, update, delete jobs
12. **Test scraping** — Various URLs (LinkedIn, Indeed, generic)
13. **Test filters** — Search, status, ghost filter
14. **Test Kanban move** — Status change + reorder

---

## Testing Strategy

### Unit Tests (Jest)
- `JobService.create`: creates job with correct defaults, sets kanbanOrder
- `JobService.findAll`: applies search, status, ghost filters correctly
- `JobService.move`: updates status + order, updates lastActivityAt
- `JobService.delete`: removes job, verifies cascade intent
- `ScraperService.scrape`: returns data from Cheerio, falls back to Gemini
- `MarkdownService`: converts HTML to clean markdown
- `MoveJobDto`: validates enum values

### E2E Tests (Supertest)
- `POST /api/jobs` — creates job, returns with id and defaults
- `POST /api/jobs/scrape` — scrapes URL, returns preview data
- `GET /api/jobs` — returns paginated list, respects filters
- `GET /api/jobs/:id` — returns single job (owned by user)
- `GET /api/jobs/:id` — returns 404 for other user's job
- `PATCH /api/jobs/:id` — updates fields
- `PATCH /api/jobs/:id/move` — changes status and order
- `DELETE /api/jobs/:id` — removes job

---

## Acceptance Criteria

- [ ] Job entity persists with all fields
- [ ] Manual job creation works with all required fields
- [ ] URL scraping extracts title, company, location from job pages
- [ ] Scraping converts page to markdown snapshot
- [ ] Gemini fallback activates when Cheerio extraction is incomplete
- [ ] Jobs are always scoped to the authenticated user
- [ ] User cannot access/modify another user's jobs
- [ ] Search filters by title and company (case-insensitive)
- [ ] Status filter works for all 6 statuses
- [ ] Ghost filter correctly segments active/stale/ghost
- [ ] Kanban move updates status and order
- [ ] `lastActivityAt` updates on all relevant operations
- [ ] Pagination works with correct meta (total, pages)
- [ ] Delete cascades to related entities
- [ ] Sorting works by all supported fields
