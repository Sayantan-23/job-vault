import { sql } from 'drizzle-orm'
import { pgTable, uuid, varchar, text, timestamp, index, jsonb, check } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'
import { personas } from './personas.js'

/** Pasted-JD job context stored on the letter itself (never materialized as a tracked job). */
export interface AdhocJob {
  title: string
  company: string
  description?: string
}

export const coverLetters = pgTable(
  'cover_letters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }),
    adhocJob: jsonb('adhoc_job').$type<AdhocJob>(),
    personaId: uuid('persona_id').references(() => personas.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }),
    instructions: text('instructions'),
    bodyMarkdown: text('body_markdown').notNull(),
  },
  (t) => [
    index('idx_cover_letters_user_id').on(t.userId),
    index('idx_cover_letters_job_id').on(t.jobId),
    check('cover_letters_job_xor', sql`(job_id IS NULL) <> (adhoc_job IS NULL)`),
  ],
)

export type CoverLetterRow = typeof coverLetters.$inferSelect
export type NewCoverLetterRow = typeof coverLetters.$inferInsert
