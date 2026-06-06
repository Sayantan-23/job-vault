import { and, eq, gte, count } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'
import { coverLetters } from '@/db/schema/cover-letters.js'

// Sums a user's AI generations (résumés + cover letters) since `since` so the
// hourly rate limit is shared across both.
async function countRecentGenerations(userId: string, since: Date): Promise<number> {
  const [r] = await getDb()
    .select({ value: count() })
    .from(generatedResumes)
    .where(and(eq(generatedResumes.userId, userId), gte(generatedResumes.createdAt, since)))
  const [c] = await getDb()
    .select({ value: count() })
    .from(coverLetters)
    .where(and(eq(coverLetters.userId, userId), gte(coverLetters.createdAt, since)))
  return (r?.value ?? 0) + (c?.value ?? 0)
}

export const aiUsageRepository = { countRecentGenerations }
