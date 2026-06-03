import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'

// AUTO events are emitted by jobs.service on create/status-change; MANUAL events
// are user-authored notes. Single source of truth for both the Postgres enum and
// the Zod request schema (imported by timeline.schema.ts).
export const TIMELINE_EVENT_TYPES = ['AUTO', 'MANUAL'] as const

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number]

export const timelineEventTypeEnum = pgEnum('timeline_event_type', TIMELINE_EVENT_TYPES)

export const timelineEvents = pgTable(
  'timeline_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    type: timelineEventTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
  },
  (t) => [
    index('idx_timeline_events_user_id').on(t.userId),
    index('idx_timeline_events_job_id').on(t.jobId),
  ],
)

export type TimelineEventRow = typeof timelineEvents.$inferSelect
export type NewTimelineEventRow = typeof timelineEvents.$inferInsert
