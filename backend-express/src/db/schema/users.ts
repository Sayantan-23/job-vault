import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  defaultView?: 'kanban' | 'list'
}

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  masterResumeUrl: text('master_resume_url'),
  masterProfileJson: jsonb('master_profile_json').$type<Record<string, unknown>>(),
  preferences: jsonb('preferences').$type<UserPreferences>(),
})

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
