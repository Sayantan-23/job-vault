import { pgTable, uuid, text, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'

// Single source of truth for the Postgres enum and the Zod request schemas.
// Only GHOST_ALERT + REMINDER are created in Slice 4; the other two are reserved.
export const NOTIFICATION_TYPES = ['GHOST_ALERT', 'REMINDER', 'STATUS_CHANGE', 'GENERAL'] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const notificationTypeEnum = pgEnum('notification_type', NOTIFICATION_TYPES)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    type: notificationTypeEnum('type').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    // Deliberately ON DELETE SET NULL (not cascade) so deleting a job preserves
    // notification history.
    relatedJobId: uuid('related_job_id').references(() => jobs.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('idx_notifications_user_id').on(t.userId),
    index('idx_notifications_user_id_is_read').on(t.userId, t.isRead),
  ],
)

export type NotificationRow = typeof notifications.$inferSelect
export type NewNotificationRow = typeof notifications.$inferInsert
