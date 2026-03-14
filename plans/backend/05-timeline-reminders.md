# Backend Plan 05 — Timeline, Reminders & Notifications

## Overview

Implement the TimelineEvent, Reminder, and Notification entities with full CRUD, plus cron jobs for ghost detection (daily) and reminder checking (every 10 minutes). Timeline events are auto-created on status changes and can be manually added. Reminders trigger notifications when due. Ghost alerts are generated daily for stale jobs.

---

## Dependencies

```bash
npm install @nestjs/schedule
npm install -D @types/cron
```

---

## Folder / File Structure

```
backend/src/modules/
├── timeline/
│   ├── timeline.module.ts            # TimelineModule
│   ├── timeline.controller.ts        # Timeline routes
│   ├── timeline.service.ts           # Timeline business logic
│   ├── entities/
│   │   └── timeline-event.entity.ts  # TimelineEvent entity
│   └── dto/
│       └── create-timeline-event.dto.ts
├── reminder/
│   ├── reminder.module.ts            # ReminderModule
│   ├── reminder.controller.ts        # Reminder routes
│   ├── reminder.service.ts           # Reminder business logic
│   ├── entities/
│   │   └── reminder.entity.ts        # Reminder entity
│   └── dto/
│       ├── create-reminder.dto.ts
│       └── update-reminder.dto.ts
├── notification/
│   ├── notification.module.ts        # NotificationModule
│   ├── notification.controller.ts    # Notification routes
│   ├── notification.service.ts       # Notification business logic
│   ├── entities/
│   │   └── notification.entity.ts    # Notification entity
│   └── dto/
│       └── notification-query.dto.ts
└── scheduler/
    ├── scheduler.module.ts           # SchedulerModule
    └── scheduler.service.ts          # Cron job definitions
```

---

## Entity Definitions

### `timeline-event.entity.ts`

```typescript
import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Job } from '../../job/entities/job.entity';

export enum TimelineEventType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

@Entity({ tableName: 'timeline_events' })
export class TimelineEvent extends BaseEntity {
  @ManyToOne(() => Job, { onDelete: 'cascade' })
  job: Job;

  @Enum(() => TimelineEventType)
  type: TimelineEventType;

  @Property()
  title: string;

  @Property({ nullable: true, type: 'text' })
  description?: string;
}
```

### `reminder.entity.ts`

```typescript
import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Job } from '../../job/entities/job.entity';
import { User } from '../../auth/entities/user.entity';

@Entity({ tableName: 'reminders' })
export class Reminder extends BaseEntity {
  @ManyToOne(() => Job, { onDelete: 'cascade' })
  job: Job;

  @ManyToOne(() => User)
  user: User;

  @Property()
  message: string;

  @Property({ type: 'timestamptz' })
  remindAt: Date;

  @Property({ default: false })
  isCompleted: boolean = false;
}
```

### `notification.entity.ts`

```typescript
import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { Job } from '../../job/entities/job.entity';

export enum NotificationType {
  GHOST_ALERT = 'GHOST_ALERT',
  REMINDER = 'REMINDER',
  STATUS_CHANGE = 'STATUS_CHANGE',
  GENERAL = 'GENERAL',
}

@Entity({ tableName: 'notifications' })
export class Notification extends BaseEntity {
  @ManyToOne(() => User)
  user: User;

  @Property()
  message: string;

  @Enum(() => NotificationType)
  type: NotificationType;

  @Property({ default: false })
  isRead: boolean = false;

  @ManyToOne(() => Job, { nullable: true, onDelete: 'set null' })
  relatedJob?: Job;
}
```

### Migrations

```sql
-- Migration 3: CreateTimelineEventsTable
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_timeline_events_job_id ON timeline_events(job_id);

-- Migration 4: CreateRemindersTable
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message VARCHAR(500) NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);

-- Migration 5: CreateNotificationsTable
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message VARCHAR(500) NOT NULL,
  type VARCHAR(20) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

---

## DTO Definitions

### `create-timeline-event.dto.ts`
```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateTimelineEventDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### `create-reminder.dto.ts`
```typescript
import { IsString, IsDateString, MaxLength } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @MaxLength(500)
  message: string;

  @IsDateString()
  remindAt: string;
}
```

### `update-reminder.dto.ts`
```typescript
import { IsOptional, IsString, IsDateString, IsBoolean, MaxLength } from 'class-validator';

export class UpdateReminderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsDateString()
  remindAt?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
```

### `notification-query.dto.ts`
```typescript
import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class NotificationQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  unreadOnly?: boolean;
}
```

---

## API Endpoints

| Method | Path | Auth | Request | Response | Description |
|--------|------|------|---------|----------|-------------|
| GET | `/api/jobs/:id/timeline` | Yes | — | `TimelineEvent[]` | Get job timeline |
| POST | `/api/jobs/:id/timeline` | Yes | `CreateTimelineEventDto` | `TimelineEvent` | Add manual entry |
| GET | `/api/jobs/:id/reminders` | Yes | — | `Reminder[]` | Get job reminders |
| POST | `/api/jobs/:id/reminders` | Yes | `CreateReminderDto` | `Reminder` | Create reminder |
| PATCH | `/api/reminders/:id` | Yes | `UpdateReminderDto` | `Reminder` | Update reminder |
| DELETE | `/api/reminders/:id` | Yes | — | `{ message }` | Delete reminder |
| GET | `/api/notifications` | Yes | Query: `unreadOnly?` | `Notification[]` | Get notifications |
| PATCH | `/api/notifications/:id/read` | Yes | — | `Notification` | Mark as read |
| PATCH | `/api/notifications/read-all` | Yes | — | `{ message }` | Mark all as read |

---

## Services

### `timeline.service.ts`
```typescript
export class TimelineService {
  async getJobTimeline(jobId: string, userId: string): Promise<TimelineEvent[]>;
    // Ordered by createdAt DESC

  async addManualEntry(jobId: string, userId: string, dto: CreateTimelineEventDto): Promise<TimelineEvent>;
    // Type: MANUAL, updates job.lastActivityAt

  async addAutoEntry(jobId: string, title: string, description?: string): Promise<TimelineEvent>;
    // Type: AUTO, called internally by other services
    // Examples: "Status changed to Applied", "Job created", "Cover letter generated"
}
```

### `reminder.service.ts`
```typescript
export class ReminderService {
  async getJobReminders(jobId: string, userId: string): Promise<Reminder[]>;
  async create(jobId: string, userId: string, dto: CreateReminderDto): Promise<Reminder>;
  async update(id: string, userId: string, dto: UpdateReminderDto): Promise<Reminder>;
  async delete(id: string, userId: string): Promise<void>;
  async getDueReminders(): Promise<Reminder[]>;
    // remindAt <= now AND isCompleted = false
    // Used by scheduler
}
```

### `notification.service.ts`
```typescript
export class NotificationService {
  async getUserNotifications(userId: string, query: NotificationQueryDto): Promise<Notification[]>;
    // Ordered by createdAt DESC, limit 50

  async create(userId: string, message: string, type: NotificationType, relatedJobId?: string): Promise<Notification>;
  async markRead(id: string, userId: string): Promise<Notification>;
  async markAllRead(userId: string): Promise<void>;
  async getUnreadCount(userId: string): Promise<number>;
}
```

---

## Scheduler Service: `scheduler.service.ts`

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

export class SchedulerService {
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateGhostDays(): Promise<void>;
    // 1. Fetch all jobs
    // 2. Calculate ghostDays for each: days since lastActivityAt (or createdAt)
    // 3. Batch update ghostDays field
    // 4. For jobs crossing thresholds (7→8 days, 14→15 days):
    //    Create GHOST_ALERT notification

  @Cron('*/10 * * * *')  // Every 10 minutes
  async checkReminders(): Promise<void>;
    // 1. Fetch due reminders (remindAt <= now, isCompleted = false)
    // 2. For each: create REMINDER notification
    // 3. Mark reminder as completed (so it doesn't fire again)
    //    Note: "completed" here means "notification sent", not "user acted on it"
    //    The reminder stays visible; isCompleted prevents re-notification
}
```

### Ghost Alert Logic
```typescript
// Daily at midnight:
// 1. Calculate ghostDays for all active jobs (not archived)
// 2. If ghostDays just crossed 7 days (was ≤7, now >7):
//    → Notification: "⚠️ {company} - {title} has been inactive for {days} days"
// 3. If ghostDays just crossed 14 days:
//    → Notification: "🚨 Ghost alert: {company} - {title} - no activity for {days} days"
// Threshold: compare previous ghostDays vs new ghostDays to detect crossing
```

---

## Integration with Job Module

When `JobService.move()` changes a job's status:
```typescript
// In job.service.ts:
await this.timelineService.addAutoEntry(
  job.id,
  `Status changed to ${newStatus}`,
  `Moved from ${oldStatus} to ${newStatus}`
);
```

When job is created:
```typescript
await this.timelineService.addAutoEntry(
  job.id,
  'Job added to vault',
  `Added to ${status} column`
);
```

---

## Step-by-Step Implementation Order

1. **Create `timeline-event.entity.ts`** — TimelineEvent entity
2. **Create `reminder.entity.ts`** — Reminder entity
3. **Create `notification.entity.ts`** — Notification entity
4. **Create migrations** — 3 tables in correct order
5. **Create DTOs** — create/update for each entity
6. **Create `timeline.service.ts`** — Timeline CRUD + auto entries
7. **Create `timeline.controller.ts`** — Timeline routes
8. **Create `timeline.module.ts`** — Wire up
9. **Create `reminder.service.ts`** — Reminder CRUD + due detection
10. **Create `reminder.controller.ts`** — Reminder routes
11. **Create `reminder.module.ts`** — Wire up
12. **Create `notification.service.ts`** — Notification CRUD + unread count
13. **Create `notification.controller.ts`** — Notification routes
14. **Create `notification.module.ts`** — Wire up
15. **Create `scheduler.service.ts`** — Ghost detection + reminder cron
16. **Create `scheduler.module.ts`** — ScheduleModule.forRoot()
17. **Integrate timeline auto-entries with JobService** — Status change, creation
18. **Register all modules in AppModule**
19. **Test all endpoints** — CRUD for each entity
20. **Test cron jobs** — Ghost detection, reminder checking

---

## Testing Strategy

### Unit Tests (Jest)
- `TimelineService.addAutoEntry`: creates AUTO type entry
- `TimelineService.addManualEntry`: creates MANUAL type, updates lastActivityAt
- `ReminderService.getDueReminders`: returns only due, uncompleted reminders
- `NotificationService.create`: creates notification with correct type
- `NotificationService.markRead`: sets isRead to true
- `NotificationService.markAllRead`: marks all user's notifications as read
- `SchedulerService.updateGhostDays`: calculates correctly, creates alerts at thresholds
- `SchedulerService.checkReminders`: creates notifications for due reminders

### E2E Tests (Supertest)
- `GET /api/jobs/:id/timeline` — returns events for job
- `POST /api/jobs/:id/timeline` — creates manual entry
- `GET /api/jobs/:id/reminders` — returns reminders for job
- `POST /api/jobs/:id/reminders` — creates reminder with future date
- `PATCH /api/reminders/:id` — marks complete
- `DELETE /api/reminders/:id` — removes reminder
- `GET /api/notifications` — returns user's notifications
- `GET /api/notifications?unreadOnly=true` — returns only unread
- `PATCH /api/notifications/:id/read` — marks single as read
- `PATCH /api/notifications/read-all` — marks all as read
- Auto timeline: change job status → timeline entry created automatically

---

## Acceptance Criteria

- [ ] TimelineEvent entity persists with job relation
- [ ] Manual timeline entries can be created via API
- [ ] Auto timeline entries created on job status change
- [ ] Auto timeline entry created when job is added
- [ ] Timeline returns events sorted by date (newest first)
- [ ] Reminders can be created with future date
- [ ] Reminders can be updated (message, date, completed)
- [ ] Reminders can be deleted
- [ ] Notifications created for due reminders
- [ ] Ghost alert notifications created when jobs cross thresholds
- [ ] Notifications can be marked read (single + all)
- [ ] Unread-only filter works on notifications endpoint
- [ ] Daily cron updates ghostDays for all jobs
- [ ] 10-minute cron checks and fires due reminders
- [ ] All entities scoped to authenticated user
- [ ] Cascade delete: removing job deletes its timeline/reminders
