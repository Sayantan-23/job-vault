import { and, desc, eq, gt, lt, or, sql } from 'drizzle-orm'
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
 * How long a token that was just rotated away keeps working. Tabs waking
 * together all present the same cookie, and the ones that lose the race must
 * still be served. One generation deep and short by design — Auth0 ships the
 * same shape as its "rotation overlap period".
 */
export const ROTATION_GRACE_MS = 15_000

/**
 * The whole of refresh, in one statement — there is no read-then-write window
 * to lose, so no racer ever gets a transient 401.
 *
 * Two arms. The row rotates only when the caller presents the CURRENT token
 * (compare-and-swap on `token_hash`). A caller presenting the token this
 * session rotated away from moments ago still matches, but the row is left
 * untouched: it gets a fresh access token and keeps using the winner's refresh
 * token. Rotating for it too would demote the winner's brand-new token to a
 * `ROTATION_GRACE_MS` lifetime and start a ping-pong.
 *
 * Returns the row as it stands after the statement (compare `tokenHash` to know
 * which arm matched), or null when the token is neither — a genuine replay.
 * `expiresAt` is never extended: it is an absolute cap, not a sliding one.
 */
async function rotate(
  userId: string,
  id: string,
  values: { tokenHash: string; previousTokenHash: string },
): Promise<UserSessionRow | null> {
  const presented = values.previousTokenHash
  const isCurrent = sql`${userSessions.tokenHash} = ${presented}`
  const rows = await getDb()
    .update(userSessions)
    .set({
      tokenHash: sql`CASE WHEN ${isCurrent} THEN ${values.tokenHash} ELSE ${userSessions.tokenHash} END`,
      previousTokenHash: sql`CASE WHEN ${isCurrent} THEN ${presented} ELSE ${userSessions.previousTokenHash} END`,
      rotatedAt: sql`CASE WHEN ${isCurrent} THEN now() ELSE ${userSessions.rotatedAt} END`,
      lastUsedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(userSessions.id, id),
        eq(userSessions.userId, userId),
        gt(userSessions.expiresAt, sql`now()`),
        or(
          isCurrent,
          and(
            eq(userSessions.previousTokenHash, presented),
            gt(userSessions.rotatedAt, sql`now() - make_interval(secs => ${ROTATION_GRACE_MS / 1000})`),
          ),
        ),
      ),
    )
    .returning()
  return rows[0] ?? null
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
