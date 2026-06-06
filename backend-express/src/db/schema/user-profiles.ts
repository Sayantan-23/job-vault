import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: jsonb('content').$type<ProfileContent>().notNull(),
})

export type UserProfileRow = typeof userProfiles.$inferSelect
export type NewUserProfileRow = typeof userProfiles.$inferInsert
