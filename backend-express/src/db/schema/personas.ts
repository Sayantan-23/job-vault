import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

export const personas = pgTable(
  'personas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    data: jsonb('data').$type<ProfileContent>().notNull(),
    rawInput: text('raw_input'),
  },
  (t) => [index('idx_personas_user_id').on(t.userId)],
)

export type PersonaRow = typeof personas.$inferSelect
export type NewPersonaRow = typeof personas.$inferInsert
