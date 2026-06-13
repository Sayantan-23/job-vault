import { pgTable, uuid, timestamp, varchar, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'

// One row per misc. AI action (e.g. cover-letter refine) that has no other
// persisted artifact. Stores no content — `kind` only labels the action — so
// the DB-derived hourly AI rate limit can count these alongside generated
// résumés, cover letters, and résumé parses.
export const aiUsageEvents = pgTable(
  'ai_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 50 }).notNull(),
  },
  (t) => [index('idx_ai_usage_events_user_id').on(t.userId)],
)

export type AiUsageEventRow = typeof aiUsageEvents.$inferSelect
export type NewAiUsageEventRow = typeof aiUsageEvents.$inferInsert
