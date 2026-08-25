import { and, eq, desc, sql } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { questionAnswers, type QuestionAnswerRow, type NewQuestionAnswerRow } from '@/db/schema/question-answers.js'

async function create(values: NewQuestionAnswerRow): Promise<QuestionAnswerRow> {
  const rows = await getDb().insert(questionAnswers).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

// Recently used first — the sort key that makes retrieval feel fast. Rows never
// copied sort last (NULLS LAST), then by most recently edited.
async function listForUser(userId: string): Promise<QuestionAnswerRow[]> {
  return getDb()
    .select()
    .from(questionAnswers)
    .where(eq(questionAnswers.userId, userId))
    .orderBy(sql`${questionAnswers.lastUsedAt} DESC NULLS LAST`, desc(questionAnswers.updatedAt))
}

async function findById(userId: string, id: string): Promise<QuestionAnswerRow | null> {
  const rows = await getDb()
    .select()
    .from(questionAnswers)
    .where(and(eq(questionAnswers.id, id), eq(questionAnswers.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(
  userId: string,
  id: string,
  patch: { question?: string; answerShort?: string | null; answerLong?: string | null },
): Promise<QuestionAnswerRow | null> {
  const set: Partial<NewQuestionAnswerRow> = { updatedAt: new Date() }
  if (patch.question !== undefined) set.question = patch.question
  if (patch.answerShort !== undefined) set.answerShort = patch.answerShort
  if (patch.answerLong !== undefined) set.answerLong = patch.answerLong
  const rows = await getDb()
    .update(questionAnswers)
    .set(set)
    .where(and(eq(questionAnswers.id, id), eq(questionAnswers.userId, userId)))
    .returning()
  return rows[0] ?? null
}

// Copying is not an edit: this deliberately leaves `updatedAt` alone, so the
// secondary sort keeps meaning "most recently edited".
async function markUsed(userId: string, id: string): Promise<QuestionAnswerRow | null> {
  const rows = await getDb()
    .update(questionAnswers)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(questionAnswers.id, id), eq(questionAnswers.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(questionAnswers)
    .where(and(eq(questionAnswers.id, id), eq(questionAnswers.userId, userId)))
    .returning({ id: questionAnswers.id })
  return rows.length > 0
}

export const answersRepository = { create, listForUser, findById, update, markUsed, remove }
