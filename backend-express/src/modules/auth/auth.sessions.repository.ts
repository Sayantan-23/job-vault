import { and, desc, eq, gt, lt, sql } from 'drizzle-orm'
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

/** Live sessions held by a user, newest first — the candidates a refresh token is matched against. */
async function listByUser(userId: string): Promise<UserSessionRow[]> {
  return getDb()
    .select()
    .from(userSessions)
    .where(and(eq(userSessions.userId, userId), gt(userSessions.expiresAt, sql`now()`)))
    .orderBy(desc(userSessions.createdAt))
}

/**
 * Compare-and-swap rotation: the update only lands if the row still holds
 * `previousTokenHash`. Returns false when another request rotated first, so two
 * concurrent refreshes cannot both succeed and orphan one of the tokens.
 * `expiresAt` is deliberately untouched — it is an absolute cap, not a sliding one.
 */
async function rotate(
  userId: string,
  id: string,
  values: { tokenHash: string; previousTokenHash: string },
): Promise<boolean> {
  const now = new Date()
  const rows = await getDb()
    .update(userSessions)
    .set({ ...values, rotatedAt: now, lastUsedAt: now, updatedAt: now })
    .where(
      and(
        eq(userSessions.id, id),
        eq(userSessions.userId, userId),
        eq(userSessions.tokenHash, values.previousTokenHash),
      ),
    )
    .returning({ id: userSessions.id })
  return rows.length > 0
}

/** Revoke a single device. */
async function deleteById(userId: string, id: string): Promise<void> {
  await getDb()
    .delete(userSessions)
    .where(and(eq(userSessions.id, id), eq(userSessions.userId, userId)))
}

/** Revoke every device — logout by a credential that cannot name its session. */
async function deleteAllForUser(userId: string): Promise<void> {
  await getDb().delete(userSessions).where(eq(userSessions.userId, userId))
}

/** Reap rows past their absolute cap (scheduler). Returns how many went. */
async function deleteExpired(): Promise<number> {
  const rows = await getDb()
    .delete(userSessions)
    .where(lt(userSessions.expiresAt, sql`now()`))
    .returning({ id: userSessions.id })
  return rows.length
}

export const sessionsRepository = {
  create,
  listByUser,
  rotate,
  deleteById,
  deleteAllForUser,
  deleteExpired,
}
