# Frontend Plan 06 — Timeline, Reminders & Notifications

## Overview

Build the per-job event timeline (auto-tracked status changes + manual entries), reminder creation and management, and the notification system with an in-app notification bell and popover. Notifications are fetched via polling (no real-time). This plan extends the job drawer (Plan 04) with timeline and reminder sections.

---

## Dependencies

```bash
# No additional dependencies
```

---

## Folder / File Structure

```
frontend/app/
├── components/
│   ├── timeline/
│   │   ├── JobTimeline.vue           # Full timeline component for job drawer
│   │   ├── TimelineEntry.vue         # Single timeline entry (icon, text, date)
│   │   └── AddTimelineEntry.vue      # Form to add manual timeline entry
│   ├── reminder/
│   │   ├── ReminderList.vue          # List of reminders for a job
│   │   ├── ReminderItem.vue          # Single reminder (message, date, actions)
│   │   └── AddReminderForm.vue       # Form to create reminder
│   └── notification/
│       ├── NotificationBell.vue      # Bell icon with unread count badge
│       └── NotificationPopover.vue   # Dropdown list of notifications
├── composables/
│   ├── useTimeline.ts                # Per-job timeline operations
│   ├── useReminders.ts               # Reminder CRUD
│   └── useNotifications.ts           # Notification state, polling, mark read
└── types/
    ├── timeline.ts                   # Timeline type definitions
    ├── reminder.ts                   # Reminder type definitions
    └── notification.ts               # Notification type definitions
```

---

## Type Definitions

### `types/timeline.ts`

```typescript
export type TimelineEventType = 'AUTO' | 'MANUAL';

export interface TimelineEvent {
  id: string;
  jobId: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  createdAt: string;
}

export interface CreateTimelineEventRequest {
  title: string;
  description?: string;
}
```

### `types/reminder.ts`

```typescript
export interface Reminder {
  id: string;
  jobId: string;
  userId: string;
  message: string;
  remindAt: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderRequest {
  message: string;
  remindAt: string;  // ISO date string
}

export interface UpdateReminderRequest {
  message?: string;
  remindAt?: string;
  isCompleted?: boolean;
}
```

### `types/notification.ts`

```typescript
export type NotificationType = 'GHOST_ALERT' | 'REMINDER' | 'STATUS_CHANGE' | 'GENERAL';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedJobId?: string;
  createdAt: string;
}
```

---

## API Endpoints (consumed)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/jobs/:id/timeline` | Yes | — | `TimelineEvent[]` |
| POST | `/api/jobs/:id/timeline` | Yes | `CreateTimelineEventRequest` | `TimelineEvent` |
| GET | `/api/jobs/:id/reminders` | Yes | — | `Reminder[]` |
| POST | `/api/jobs/:id/reminders` | Yes | `CreateReminderRequest` | `Reminder` |
| PATCH | `/api/reminders/:id` | Yes | `UpdateReminderRequest` | `Reminder` |
| DELETE | `/api/reminders/:id` | Yes | — | `{ message }` |
| GET | `/api/notifications` | Yes | Query: `unreadOnly?` | `Notification[]` |
| PATCH | `/api/notifications/:id/read` | Yes | — | `Notification` |
| PATCH | `/api/notifications/read-all` | Yes | — | `{ message }` |

---

## Components

### `JobTimeline.vue`
- **Props**: `jobId: string`
- Fetches timeline on mount: `GET /jobs/:id/timeline`
- Vertical timeline layout with line connector
- Each entry: icon (auto/manual), title, description, relative date
- Auto events: styled differently (system icon, muted color)
- Manual events: user icon, full color
- `AddTimelineEntry` at bottom
- Scrollable if many entries

### `TimelineEntry.vue`
- **Props**: `event: TimelineEvent`
- Icon: clock icon for AUTO, pencil icon for MANUAL
- Title bold, description muted
- Relative date on right

### `AddTimelineEntry.vue`
- **Props**: `jobId: string`
- **Emits**: `created: TimelineEvent`
- Inline form: title input + optional description textarea
- "Add" button → `POST /jobs/:id/timeline`
- Collapses to "Add note" button when not active

### `ReminderList.vue`
- **Props**: `jobId: string`
- Fetches reminders on mount: `GET /jobs/:id/reminders`
- List of `ReminderItem` components
- Separated into "Upcoming" and "Completed" sections
- `AddReminderForm` at top

### `ReminderItem.vue`
- **Props**: `reminder: Reminder`
- **Emits**: `updated: Reminder`, `deleted: string`
- Shows: message, due date (relative + absolute), completed status
- Checkbox to mark complete → `PATCH /reminders/:id { isCompleted: true }`
- Edit button → inline edit mode
- Delete button → `DELETE /reminders/:id`
- Overdue styling: red text if remindAt < now and !isCompleted

### `AddReminderForm.vue`
- **Props**: `jobId: string`
- **Emits**: `created: Reminder`
- Fields: message (input), remindAt (date-time picker)
- Quick presets: "Tomorrow", "In 3 days", "Next week"
- "Add Reminder" button → `POST /jobs/:id/reminders`

### `NotificationBell.vue`
- Lives in `AppHeader`
- Bell icon using `UButton` with `UChip` badge for unread count
- Click → toggles `NotificationPopover`
- Badge hidden when unread count is 0
- Polls for unread count every 60 seconds

### `NotificationPopover.vue`
- **Props**: none (uses `useNotifications()`)
- `UPopover` dropdown from bell
- Header: "Notifications" + "Mark all read" link
- List of notifications:
  - Icon by type (ghost icon, bell icon, etc.)
  - Message text
  - Relative time
  - Unread: bold text + blue dot
  - Click → mark read + navigate to related job (if relatedJobId)
- "View all" link at bottom (future: dedicated notifications page)
- Empty state: "No notifications"

---

## Composables

### `useTimeline`

```typescript
export function useTimeline(jobId: MaybeRef<string>) {
  const events: Ref<TimelineEvent[]>;
  const isLoading: Ref<boolean>;

  async function fetchTimeline(): Promise<void>;
  async function addEntry(data: CreateTimelineEventRequest): Promise<void>;

  return { events, isLoading, fetchTimeline, addEntry };
}
```

### `useReminders`

```typescript
export function useReminders(jobId: MaybeRef<string>) {
  const reminders: Ref<Reminder[]>;
  const isLoading: Ref<boolean>;
  const upcoming: ComputedRef<Reminder[]>;
  const completed: ComputedRef<Reminder[]>;

  async function fetchReminders(): Promise<void>;
  async function addReminder(data: CreateReminderRequest): Promise<void>;
  async function updateReminder(id: string, data: UpdateReminderRequest): Promise<void>;
  async function deleteReminder(id: string): Promise<void>;

  return { reminders, isLoading, upcoming, completed, fetchReminders, addReminder, updateReminder, deleteReminder };
}
```

### `useNotifications`

```typescript
export function useNotifications() {
  const notifications: Ref<Notification[]>;
  const unreadCount: ComputedRef<number>;
  const isLoading: Ref<boolean>;

  async function fetchNotifications(): Promise<void>;
  async function markRead(id: string): Promise<void>;
  async function markAllRead(): Promise<void>;
  function startPolling(intervalMs?: number): void;  // default 60000
  function stopPolling(): void;

  return { notifications, unreadCount, isLoading, fetchNotifications, markRead, markAllRead, startPolling, stopPolling };
}
```

### Polling Strategy
- Start polling on app mount (in `default.vue` layout or plugin)
- Poll `GET /notifications?unreadOnly=true` every 60 seconds
- Update unread count badge
- Stop polling on logout
- Only poll when tab is visible (use `document.visibilityState`)

---

## Integration with Job Drawer

Extend `JobDetails.vue` (Plan 04) to include:
```
<JobInfoSection />
<UTabs :items="['Timeline', 'Reminders', 'Notes', 'Cover Letter']">
  <template #timeline>
    <JobTimeline :job-id="job.id" />
  </template>
  <template #reminders>
    <ReminderList :job-id="job.id" />
  </template>
  <template #notes>
    <JobNotesEditor />
  </template>
  <template #cover-letter>
    <!-- Plan 07 stub -->
  </template>
</UTabs>
```

---

## Step-by-Step Implementation Order

1. **Create type definitions** — `timeline.ts`, `reminder.ts`, `notification.ts`
2. **Create `useTimeline` composable** — Fetch + create timeline events
3. **Create `TimelineEntry.vue`** — Single timeline entry component
4. **Create `AddTimelineEntry.vue`** — Inline form for manual entries
5. **Create `JobTimeline.vue`** — Full timeline with entries
6. **Create `useReminders` composable** — CRUD operations
7. **Create `ReminderItem.vue`** — Single reminder with actions
8. **Create `AddReminderForm.vue`** — Form with date picker and presets
9. **Create `ReminderList.vue`** — List with upcoming/completed sections
10. **Create `useNotifications` composable** — Fetch, poll, mark read
11. **Create `NotificationBell.vue`** — Bell icon with badge
12. **Create `NotificationPopover.vue`** — Dropdown notification list
13. **Integrate bell into `AppHeader`**
14. **Integrate timeline + reminders into `JobDetails` tabs**
15. **Set up polling** — Start on mount, stop on logout, pause on hidden tab
16. **Test notification flow** — Create reminder → wait → notification appears

---

## Testing Strategy

### Unit Tests (Vitest)
- `useTimeline`: fetch populates events, addEntry prepends to list
- `useReminders`: CRUD operations update state correctly, upcoming/completed computed
- `useNotifications`: unreadCount computed, markRead decrements count, polling interval
- `TimelineEntry`: renders correct icon for AUTO vs MANUAL
- `ReminderItem`: checkbox toggles completion, overdue styling applied
- `AddReminderForm`: validates required fields, preset buttons set correct dates
- `NotificationBell`: shows badge when unread > 0, hides when 0

### E2E Tests (Playwright)
- Open job drawer → Timeline tab shows auto events (status changes)
- Add manual timeline entry → appears at top of timeline
- Create reminder with date → appears in upcoming section
- Mark reminder complete → moves to completed section
- Delete reminder → removed from list
- Notification bell shows unread count
- Click notification → marked read, navigates to related job
- "Mark all read" clears unread count
- Ghost alert notification appears for stale jobs

---

## Acceptance Criteria

- [ ] Job drawer shows Timeline tab with auto-tracked events
- [ ] Manual timeline entries can be added with title + description
- [ ] Timeline displays chronologically with correct icons
- [ ] Reminders can be created with message and date
- [ ] Quick preset buttons (Tomorrow, 3 days, Next week) set correct dates
- [ ] Reminders show in Upcoming/Completed sections
- [ ] Reminders can be marked complete, edited, and deleted
- [ ] Overdue reminders show red styling
- [ ] Notification bell in header shows unread count badge
- [ ] Notification popover lists all notifications
- [ ] Click notification → mark read + navigate to job
- [ ] "Mark all read" marks all as read
- [ ] Polling updates notification count every 60 seconds
- [ ] Polling pauses when browser tab is hidden
- [ ] Ghost alert notifications appear for ghost risk jobs
