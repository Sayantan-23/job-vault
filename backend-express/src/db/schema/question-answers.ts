import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'

// A reusable answer to a repetitive application-form question, kept in two
// length variants. Variants are sized in CHARACTERS, not words: ATS fields cap
// characters ("max 1500 characters") and never words, so a word count is a
// number the user would have to translate at paste time.
//
// Both variant columns are nullable — an answer may have only one. "At least
// one non-empty" is a request-shape rule enforced in Zod rather than a DB
// CHECK: unlike cover_letters' job XOR it guards no invariant other code
// depends on.
//
// Deliberately no `job_id`: a job-pinned answer would pollute the reusable
// list, which is the whole product. Job context is a generation-time input.
export const questionAnswers = pgTable(
  'question_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    question: varchar('question', { length: 500 }).notNull(),
    answerShort: text('answer_short'),
    answerLong: text('answer_long'),
    // Stamped on copy, never on edit — it is the list's sort key, and the
    // signal the extension slice needs to rank answers on a form page.
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (t) => [index('idx_question_answers_user_id').on(t.userId)],
)

export type QuestionAnswerRow = typeof questionAnswers.$inferSelect
export type NewQuestionAnswerRow = typeof questionAnswers.$inferInsert
