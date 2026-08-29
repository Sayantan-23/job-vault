import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { deviceTokens, type DeviceTokenRow, type NewDeviceTokenRow } from '@/db/schema/device-tokens.js'

/** Registers a device, re-pointing the token at this user if it was owned by another. */
async function upsert(values: NewDeviceTokenRow): Promise<DeviceTokenRow> {
  const rows = await getDb()
    .insert(deviceTokens)
    .values(values)
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: { userId: values.userId, platform: values.platform, updatedAt: new Date() },
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function listForUser(userId: string): Promise<DeviceTokenRow[]> {
  return getDb().select().from(deviceTokens).where(eq(deviceTokens.userId, userId))
}

/** Logout / manual unregister. Returns false when the user owns no such token. */
async function remove(userId: string, token: string): Promise<boolean> {
  const rows = await getDb()
    .delete(deviceTokens)
    .where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.token, token)))
    .returning({ id: deviceTokens.id })
  return rows.length > 0
}

/**
 * Prunes tokens Expo reported as DeviceNotRegistered. Deliberately not
 * user-scoped: Expo says the token is dead for every account that holds it.
 */
async function removeTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return
  await getDb().delete(deviceTokens).where(inArray(deviceTokens.token, tokens))
}

export const pushRepository = { upsert, listForUser, remove, removeTokens }
