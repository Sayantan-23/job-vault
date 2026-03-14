# Frontend Plan 04 — Job Management

## Overview

Implement the complete job management UI: adding jobs via URL paste (auto-scrape) or manual form, full CRUD operations, the slide-out drawer for job details with a split-panel layout (frozen snapshot on the left, actions/details on the right), and notes editing. This is the core feature that gives JobVault its "vault" capability.

---

## Dependencies

```bash
# markdown rendering for frozen snapshots
npm install marked
npm install -D @types/marked
```

---

## Folder / File Structure

```
frontend/app/
├── components/
│   └── job/
│       ├── AddJobModal.vue           # Modal: URL paste OR manual form (tabbed)
│       ├── UrlPasteForm.vue          # URL input + "Fetch & Save" button
│       ├── ManualJobForm.vue         # Full manual job entry form
│       ├── JobDrawer.vue             # USlideover: split-panel job detail view
│       ├── JobSnapshot.vue           # Left panel: rendered markdown snapshot
│       ├── JobDetails.vue            # Right panel: job info + actions
│       ├── JobInfoSection.vue        # Editable job metadata (title, company, etc.)
│       ├── JobNotesEditor.vue        # Notes textarea with save
│       ├── JobActions.vue            # Status change, delete, open source URL
│       └── JobStatusBadge.vue        # Colored status badge
├── composables/
│   └── useJobDrawer.ts              # Drawer open/close state + selected job
└── types/
    └── job.ts                        # (extended from Plan 03)
```

---

## Type Definitions (additions to `types/job.ts`)

```typescript
export interface CreateJobFromUrlRequest {
  sourceUrl: string;
}

export interface CreateJobManualRequest {
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  sourceUrl?: string;
  snapshotMarkdown?: string;
  status?: JobStatus;
  notes?: string;
}

export interface UpdateJobRequest {
  title?: string;
  company?: string;
  location?: string;
  salaryRange?: string;
  notes?: string;
  status?: JobStatus;
}

export interface JobDetail extends Job {
  // Full job with all fields (reuses Job interface)
}

export interface ScrapeResult {
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  snapshotMarkdown: string;
}
```

---

## API Endpoints (consumed)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/jobs/scrape` | Yes | `{ sourceUrl }` | `ScrapeResult` |
| POST | `/api/jobs` | Yes | `CreateJobManualRequest` | `Job` |
| GET | `/api/jobs/:id` | Yes | — | `Job` |
| PATCH | `/api/jobs/:id` | Yes | `UpdateJobRequest` | `Job` |
| DELETE | `/api/jobs/:id` | Yes | — | `{ message }` |

---

## Components

### `AddJobModal.vue`
- Opened via "Add Job" button in header or dashboard
- Uses `UModal` with `UTabs` for two modes:
  - **Tab 1: "Paste URL"** → renders `UrlPasteForm`
  - **Tab 2: "Manual Entry"** → renders `ManualJobForm`
- On successful creation: close modal, refresh kanban, show success toast

### `UrlPasteForm.vue`
- **Emits**: `created: Job`
- `UInput` for URL with paste-friendly styling (large, monospace)
- "Fetch & Save" `UButton` — sends `POST /api/jobs/scrape` first to preview
- Shows loading state while scraping ("Capturing job posting...")
- On scrape success: shows preview (title, company, snippet of snapshot)
- User confirms → `POST /api/jobs` to create job
- Status: defaults to "Wishlist"
- Error state: if scrape fails, offer to switch to Manual Entry tab with URL pre-filled

### `ManualJobForm.vue`
- **Props**: `prefill?: Partial<CreateJobManualRequest>` (for URL fallback)
- **Emits**: `created: Job`
- `UForm` with fields:
  - Title (required)
  - Company (required)
  - Location (optional)
  - Salary Range (optional)
  - Source URL (optional)
  - Status (dropdown, default: Wishlist)
  - Description / Notes (textarea, optional)
- Validation via Nuxt UI form validation

### `JobDrawer.vue`
- Uses `USlideover` (from right, large width ~80vw or max 1200px)
- **Props**: `jobId: string`
- Split-panel layout:
  - **Left (60%)**: `JobSnapshot` — frozen job description
  - **Right (40%)**: `JobDetails` — metadata + actions
- Header: job title + close button
- Fetches full job detail on open: `GET /api/jobs/:id`
- Loading state while fetching

### `JobSnapshot.vue`
- **Props**: `markdown?: string`, `sourceUrl?: string`
- Renders `snapshotMarkdown` as HTML using `marked`
- If no snapshot: shows "No snapshot captured" empty state
- "View Original" link to `sourceUrl` (opens in new tab) if available
- Styled with prose classes for readable markdown
- Scrollable container

### `JobDetails.vue`
- **Props**: `job: Job`
- **Emits**: `updated: Job`, `deleted: string`
- Contains:
  - `JobInfoSection` — editable metadata
  - `JobNotesEditor` — notes
  - `JobActions` — status change, delete
  - Timeline section (stub placeholder for Plan 06)
  - Cover letter section (stub placeholder for Plan 07)

### `JobInfoSection.vue`
- **Props**: `job: Job`
- **Emits**: `updated: Job`
- Displays job fields as editable inline fields or form
- Edit mode toggle: click "Edit" → fields become inputs → "Save" / "Cancel"
- Fields: title, company, location, salary range
- Saves via `PATCH /api/jobs/:id`

### `JobNotesEditor.vue`
- **Props**: `jobId: string`, `notes?: string`
- **Emits**: `updated: string`
- `UTextarea` for notes (auto-resize)
- Auto-save with debounce (1.5s after last keystroke)
- Manual save button as fallback
- Shows "Saved" / "Saving..." indicator

### `JobActions.vue`
- **Props**: `job: Job`
- **Emits**: `status-changed: Job`, `deleted: string`
- Status change: `USelect` dropdown with all 6 statuses
- On status change → `PATCH /api/jobs/:id` with new status
- Delete button (red, with confirmation modal)
- Open source URL button (if sourceUrl exists)

### `JobStatusBadge.vue`
- **Props**: `status: JobStatus`
- Renders `UBadge` with status label and color from constants

---

## Composable: `useJobDrawer`

```typescript
export function useJobDrawer() {
  const isOpen: Ref<boolean>;
  const selectedJobId: Ref<string | null>;
  const selectedJob: Ref<Job | null>;
  const isLoading: Ref<boolean>;

  function openDrawer(jobId: string): void;
  function closeDrawer(): void;
  async function fetchJobDetail(jobId: string): Promise<void>;
  async function updateJob(data: UpdateJobRequest): Promise<void>;
  async function deleteJob(): Promise<void>;

  return { isOpen, selectedJobId, selectedJob, isLoading, openDrawer, closeDrawer, updateJob, deleteJob };
}
```

---

## Integration Points

- **KanbanCard** (Plan 03): clicking a card → `useJobDrawer().openDrawer(job.id)`
- **Dashboard** (Plan 03): "Add Job" button → opens `AddJobModal`
- **AppHeader** (Plan 01): "Add Job" button in header → opens `AddJobModal`
- After job creation/update/deletion → refresh kanban via `useJobs().fetchKanban()`

---

## Step-by-Step Implementation Order

1. **Extend `types/job.ts`** — Add create/update request types, ScrapeResult
2. **Create `JobStatusBadge.vue`** — Status badge component
3. **Create `UrlPasteForm.vue`** — URL paste with scrape preview
4. **Create `ManualJobForm.vue`** — Manual job entry form
5. **Create `AddJobModal.vue`** — Tabbed modal combining both forms
6. **Create `useJobDrawer` composable** — Drawer state management
7. **Create `JobSnapshot.vue`** — Markdown renderer for snapshots
8. **Create `JobInfoSection.vue`** — Editable job metadata
9. **Create `JobNotesEditor.vue`** — Auto-saving notes editor
10. **Create `JobActions.vue`** — Status change + delete
11. **Create `JobDetails.vue`** — Right panel composite
12. **Create `JobDrawer.vue`** — Split-panel slideover
13. **Integrate with KanbanCard** — Click → open drawer
14. **Add "Add Job" button** to AppHeader and Dashboard
15. **Test CRUD flow** — Create (URL + manual), Read, Update, Delete

---

## Testing Strategy

### Unit Tests (Vitest)
- `UrlPasteForm`: validates URL format, shows loading during scrape, shows preview on success
- `ManualJobForm`: validates required fields, pre-fills when prefill prop provided
- `AddJobModal`: switches between tabs, emits created event
- `JobSnapshot`: renders markdown correctly, shows empty state when no snapshot
- `JobNotesEditor`: debounce fires save after delay, shows saving indicator
- `JobStatusBadge`: renders correct color for each status
- `useJobDrawer`: open sets jobId and fetches, close resets state

### E2E Tests (Playwright)
- Click "Add Job" → modal opens with two tabs
- Paste URL → scrape loading → preview shown → confirm → job created in Wishlist
- Scrape fails → switch to Manual → fill form → submit → job created
- Click kanban card → drawer slides open → shows snapshot left, details right
- Edit job title in drawer → save → kanban card updates
- Change status in drawer → card moves to new column
- Delete job → confirmation → card removed from board
- Notes auto-save → close drawer → reopen → notes persisted

---

## Acceptance Criteria

- [ ] "Add Job" button present in header and dashboard
- [ ] Add Job modal opens with URL Paste and Manual Entry tabs
- [ ] URL paste: validates URL, shows scraping progress, displays preview
- [ ] URL paste: on scrape failure, user can switch to manual with URL pre-filled
- [ ] Manual form: validates required fields, creates job on submit
- [ ] New jobs appear in Wishlist column on kanban
- [ ] Clicking kanban card opens slide-out drawer
- [ ] Drawer shows split panel: snapshot left (60%), details right (40%)
- [ ] Snapshot renders markdown with proper formatting
- [ ] Job metadata is editable inline (title, company, location, salary)
- [ ] Notes auto-save with debounce and visual indicator
- [ ] Status can be changed from dropdown in drawer
- [ ] Job can be deleted with confirmation dialog
- [ ] All changes reflect immediately on kanban board
- [ ] "View Original" link opens source URL in new tab
- [ ] Loading states shown for all async operations
