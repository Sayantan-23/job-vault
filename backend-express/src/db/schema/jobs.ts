import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  doublePrecision,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

// The 6 kanban statuses, in pipeline order. Single source of truth for both the
// Postgres enum and the Zod request schemas (imported by jobs.schema.ts).
export const JOB_STATUSES = [
  'WISHLIST',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'ARCHIVED',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export const jobStatusEnum = pgEnum('job_status', JOB_STATUSES)

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    company: varchar('company', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }),
    salaryRange: varchar('salary_range', { length: 255 }),
    sourceUrl: varchar('source_url', { length: 2000 }),
    snapshotMarkdown: text('snapshot_markdown'),
    status: jobStatusEnum('status').notNull().default('WISHLIST'),
    kanbanOrder: doublePrecision('kanban_order').notNull().default(0),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    ghostDays: integer('ghost_days').notNull().default(0),
    notes: text('notes'),
  },
  (t) => [
    index('idx_jobs_user_id').on(t.userId),
    index('idx_jobs_status').on(t.status),
    index('idx_jobs_title').on(t.title),
    index('idx_jobs_company').on(t.company),
  ],
)

export type JobRow = typeof jobs.$inferSelect
export type NewJobRow = typeof jobs.$inferInsert
