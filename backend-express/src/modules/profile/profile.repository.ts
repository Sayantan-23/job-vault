import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { userProfiles, type UserProfileRow } from '@/db/schema/user-profiles.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

async function findByUserId(userId: string): Promise<UserProfileRow | null> {
  const rows = await getDb().select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1)
  return rows[0] ?? null
}

async function upsert(userId: string, content: ProfileContent): Promise<UserProfileRow> {
  const rows = await getDb()
    .insert(userProfiles)
    .values({ userId, content })
    .onConflictDoUpdate({ target: userProfiles.userId, set: { content, updatedAt: new Date() } })
    .returning()
  const row = rows[0]
  if (!row) throw new Error('upsert returned no row')
  return row
}

export const profileRepository = { findByUserId, upsert }
