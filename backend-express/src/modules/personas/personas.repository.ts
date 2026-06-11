import { and, eq, desc, count } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { personas, type PersonaRow, type NewPersonaRow } from '@/db/schema/personas.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'
import { normalizePersonaData } from '@/shared/resume-to-profile.js'

// Read-time normalization: legacy rows (pre-7b ResumeContent) up-convert to
// ProfileContent lazily; persistence happens via the one-off backfill script.
function normalizeRow(row: PersonaRow): PersonaRow {
  return { ...row, data: normalizePersonaData(row.data) }
}

async function create(values: NewPersonaRow): Promise<PersonaRow> {
  const rows = await getDb().insert(personas).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function countForUser(userId: string): Promise<number> {
  const rows = await getDb().select({ value: count() }).from(personas).where(eq(personas.userId, userId))
  return rows[0]?.value ?? 0
}

async function listForUser(userId: string): Promise<PersonaRow[]> {
  const rows = await getDb()
    .select()
    .from(personas)
    .where(eq(personas.userId, userId))
    .orderBy(desc(personas.createdAt))
  return rows.map(normalizeRow)
}

async function findById(userId: string, id: string): Promise<PersonaRow | null> {
  const rows = await getDb()
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)))
    .limit(1)
  const row = rows[0]
  return row ? normalizeRow(row) : null
}

async function update(
  userId: string,
  id: string,
  patch: { name?: string; data?: ProfileContent },
): Promise<PersonaRow | null> {
  const set: Partial<NewPersonaRow> = { updatedAt: new Date() }
  if (patch.name !== undefined) set.name = patch.name
  if (patch.data !== undefined) set.data = patch.data
  const rows = await getDb()
    .update(personas)
    .set(set)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)))
    .returning({ id: personas.id })
  return rows.length > 0
}

export const personasRepository = { create, countForUser, listForUser, findById, update, remove }
