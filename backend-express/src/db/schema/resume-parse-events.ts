import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'

// One row per successful résumé parse (POST /api/personas/parse-resume).
// Stores no content — it exists solely so the DB-derived hourly AI rate limit
// can count parses alongside generated résumés and cover letters.
export const resumeParseEvents = pgTable(
  'resume_parse_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [index('idx_resume_parse_events_user_id').on(t.userId)],
)

export type ResumeParseEventRow = typeof resumeParseEvents.$inferSelect
export type NewResumeParseEventRow = typeof resumeParseEvents.$inferInsert
