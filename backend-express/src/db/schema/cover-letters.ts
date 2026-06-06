import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'
import { personas } from './personas.js'

export const coverLetters = pgTable(
  'cover_letters',
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
    personaId: uuid('persona_id').references(() => personas.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }),
    instructions: text('instructions'),
    bodyMarkdown: text('body_markdown').notNull(),
  },
  (t) => [index('idx_cover_letters_user_id').on(t.userId), index('idx_cover_letters_job_id').on(t.jobId)],
)

export type CoverLetterRow = typeof coverLetters.$inferSelect
export type NewCoverLetterRow = typeof coverLetters.$inferInsert
