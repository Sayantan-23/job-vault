import { and, eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { generatedResumes, type GeneratedResumeRow, type NewGeneratedResumeRow } from '@/db/schema/generated-resumes.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

async function create(values: NewGeneratedResumeRow): Promise<GeneratedResumeRow> {
  const rows = await getDb().insert(generatedResumes).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function listForUser(userId: string, jobId?: string): Promise<GeneratedResumeRow[]> {
  const where = jobId
    ? and(eq(generatedResumes.userId, userId), eq(generatedResumes.jobId, jobId))
    : eq(generatedResumes.userId, userId)
  return getDb().select().from(generatedResumes).where(where).orderBy(desc(generatedResumes.createdAt))
}

async function findById(userId: string, id: string): Promise<GeneratedResumeRow | null> {
  const rows = await getDb()
    .select()
    .from(generatedResumes)
    .where(and(eq(generatedResumes.id, id), eq(generatedResumes.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(
  userId: string,
  id: string,
  patch: { title?: string; content?: ResumeContent },
): Promise<GeneratedResumeRow | null> {
  const set: Partial<NewGeneratedResumeRow> = { updatedAt: new Date() }
  if (patch.title !== undefined) set.title = patch.title
  if (patch.content !== undefined) set.content = patch.content
  const rows = await getDb()
    .update(generatedResumes)
    .set(set)
    .where(and(eq(generatedResumes.id, id), eq(generatedResumes.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(generatedResumes)
    .where(and(eq(generatedResumes.id, id), eq(generatedResumes.userId, userId)))
    .returning({ id: generatedResumes.id })
  return rows.length > 0
}

export const resumesRepository = { create, listForUser, findById, update, remove }
