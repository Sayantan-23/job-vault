import { pgTable, uuid, varchar, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const DEVICE_PLATFORMS = ['ios', 'android'] as const

export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number]

export const devicePlatformEnum = pgEnum('device_platform', DEVICE_PLATFORMS)

// Expo push tokens registered by the mobile app, one row per device.
//
// `token` is UNIQUE globally, not per user: a phone belongs to one account at a
// time, so registering after a different login must MOVE the row (upsert on the
// token), never leave the previous owner's notifications flowing to that device.
export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    platform: devicePlatformEnum('platform').notNull(),
  },
  (t) => [index('idx_device_tokens_user_id').on(t.userId)],
)

export type DeviceTokenRow = typeof deviceTokens.$inferSelect
export type NewDeviceTokenRow = typeof deviceTokens.$inferInsert
