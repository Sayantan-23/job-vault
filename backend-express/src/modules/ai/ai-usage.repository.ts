import { and, eq, gte, count } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'

// Counts a user's AI generations since `since`. 6b counts résumés; 6c will also
// add cover_letters here so the hourly limit is shared across both.
async function countRecentGenerations(userId: string, since: Date): Promise<number> {
  const rows = await getDb()
    .select({ value: count() })
    .from(generatedResumes)
    .where(and(eq(generatedResumes.userId, userId), gte(generatedResumes.createdAt, since)))
  return rows[0]?.value ?? 0
}

export const aiUsageRepository = { countRecentGenerations }
