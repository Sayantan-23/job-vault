import { and, eq, isNull, or, gt, desc, sql } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { apiKeys, type ApiKeyRow, type NewApiKeyRow } from '@/db/schema/api-keys.js'

async function create(values: NewApiKeyRow): Promise<ApiKeyRow> {
  const rows = await getDb().insert(apiKeys).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

/** Active (not revoked) keys for a user, newest first — for the Connected Apps list. */
async function listActiveForUser(userId: string): Promise<ApiKeyRow[]> {
  return getDb()
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt))
}

/**
 * Candidate rows for verification: matching prefix, not revoked, not expired.
 * Usually one row; the bcrypt compare in the service disambiguates the rare
 * prefix collision.
 */
async function findActiveByPrefix(keyPrefix: string): Promise<ApiKeyRow[]> {
  return getDb()
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, keyPrefix),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, sql`now()`)),
      ),
    )
}

/** Soft-revoke (keeps the row for audit). Returns false if nothing was active to revoke. */
async function revoke(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .update(apiKeys)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id })
  return rows.length > 0
}

/** Best-effort usage stamp; failures must never block the authed request. */
async function touchLastUsed(id: string): Promise<void> {
  await getDb().update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id))
}

export const apiKeysRepository = { create, listActiveForUser, findActiveByPrefix, revoke, touchLastUsed }
