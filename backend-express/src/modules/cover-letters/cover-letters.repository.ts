import { and, eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { coverLetters, type CoverLetterRow, type NewCoverLetterRow } from '@/db/schema/cover-letters.js'

async function create(values: NewCoverLetterRow): Promise<CoverLetterRow> {
  const rows = await getDb().insert(coverLetters).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function listForUser(userId: string, jobId?: string): Promise<CoverLetterRow[]> {
  const where = jobId
    ? and(eq(coverLetters.userId, userId), eq(coverLetters.jobId, jobId))
    : eq(coverLetters.userId, userId)
  return getDb().select().from(coverLetters).where(where).orderBy(desc(coverLetters.createdAt))
}

async function findById(userId: string, id: string): Promise<CoverLetterRow | null> {
  const rows = await getDb()
    .select()
    .from(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(
  userId: string,
  id: string,
  patch: { title?: string; bodyMarkdown?: string },
): Promise<CoverLetterRow | null> {
  const set: Partial<NewCoverLetterRow> = { updatedAt: new Date() }
  if (patch.title !== undefined) set.title = patch.title
  if (patch.bodyMarkdown !== undefined) set.bodyMarkdown = patch.bodyMarkdown
  const rows = await getDb()
    .update(coverLetters)
    .set(set)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .returning({ id: coverLetters.id })
  return rows.length > 0
}

export const coverLettersRepository = { create, listForUser, findById, update, remove }
