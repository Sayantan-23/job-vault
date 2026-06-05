import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { personas } from './personas.js'
import { jobs } from './jobs.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

export const generatedResumes = pgTable(
  'generated_resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    personaId: uuid('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }),
    instructions: text('instructions'),
    content: jsonb('content').$type<ResumeContent>().notNull(),
  },
  (t) => [
    index('idx_generated_resumes_user_id').on(t.userId),
    index('idx_generated_resumes_job_id').on(t.jobId),
  ],
)

export type GeneratedResumeRow = typeof generatedResumes.$inferSelect
export type NewGeneratedResumeRow = typeof generatedResumes.$inferInsert
