import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import {
  userSessions,
  type UserSessionRow,
  type NewUserSessionRow,
} from '@/db/schema/user-sessions.js'

async function create(values: NewUserSessionRow): Promise<UserSessionRow> {
  const rows = await getDb().insert(userSessions).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

/** Every session held by a user, newest first — the candidates a refresh token is matched against. */
async function listByUser(userId: string): Promise<UserSessionRow[]> {
  return getDb()
    .select()
    .from(userSessions)
    .where(eq(userSessions.userId, userId))
    .orderBy(desc(userSessions.createdAt))
}

/** Rotate one session in place: same row (and `created_at`), new token hash and expiry. */
async function rotate(
  userId: string,
  id: string,
  values: { tokenHash: string; expiresAt: Date },
): Promise<void> {
  await getDb()
    .update(userSessions)
    .set({ ...values, lastUsedAt: new Date() })
    .where(and(eq(userSessions.id, id), eq(userSessions.userId, userId)))
}

/** Revoke a single device. */
async function deleteById(userId: string, id: string): Promise<void> {
  await getDb()
    .delete(userSessions)
    .where(and(eq(userSessions.id, id), eq(userSessions.userId, userId)))
}

/** Revoke the whole family — reuse detection, and logout that cannot name its session. */
async function deleteAllForUser(userId: string): Promise<void> {
  await getDb().delete(userSessions).where(eq(userSessions.userId, userId))
}

export const sessionsRepository = { create, listByUser, rotate, deleteById, deleteAllForUser }
