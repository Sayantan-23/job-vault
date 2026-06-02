import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { users, type UserRow, type NewUserRow } from '@/db/schema/users.js'
import type { UpdateProfileInput } from './auth.schema.js'

async function findByEmail(email: string): Promise<UserRow | null> {
  const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1)
  return rows[0] ?? null
}

async function findById(id: string): Promise<UserRow | null> {
  const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1)
  return rows[0] ?? null
}

async function create(input: Pick<NewUserRow, 'name' | 'email' | 'passwordHash'>): Promise<UserRow> {
  const rows = await getDb().insert(users).values(input).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function setRefreshTokenHash(id: string, hash: string): Promise<void> {
  await getDb()
    .update(users)
    .set({ refreshTokenHash: hash, updatedAt: new Date() })
    .where(eq(users.id, id))
}

async function clearRefreshTokenHash(id: string): Promise<void> {
  await getDb()
    .update(users)
    .set({ refreshTokenHash: null, updatedAt: new Date() })
    .where(eq(users.id, id))
}

async function updateProfile(id: string, input: UpdateProfileInput): Promise<UserRow> {
  const patch: Partial<NewUserRow> = { updatedAt: new Date() }
  if (input.name !== undefined) patch.name = input.name
  if (input.preferences !== undefined) patch.preferences = input.preferences
  if (input.masterProfileJson !== undefined) patch.masterProfileJson = input.masterProfileJson
  const rows = await getDb().update(users).set(patch).where(eq(users.id, id)).returning()
  const row = rows[0]
  if (!row) throw new Error('update returned no row')
  return row
}

export const authRepository = {
  findByEmail,
  findById,
  create,
  setRefreshTokenHash,
  clearRefreshTokenHash,
  updateProfile,
}
