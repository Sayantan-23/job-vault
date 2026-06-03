import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'

export const reminders = pgTable(
  'reminders',
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
    message: varchar('message', { length: 500 }).notNull(),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
  },
  (t) => [
    index('idx_reminders_user_id').on(t.userId),
    index('idx_reminders_job_id').on(t.jobId),
    index('idx_reminders_remind_at').on(t.remindAt),
  ],
)

export type ReminderRow = typeof reminders.$inferSelect
export type NewReminderRow = typeof reminders.$inferInsert
