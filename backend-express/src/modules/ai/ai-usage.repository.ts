import { and, eq, gte, count } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'
import { coverLetters } from '@/db/schema/cover-letters.js'
import { resumeParseEvents } from '@/db/schema/resume-parse-events.js'
import { aiUsageEvents } from '@/db/schema/ai-usage-events.js'

// Sums a user's AI usage (résumés + cover letters + résumé parses + misc. AI
// usage events) since `since` so the hourly rate limit is shared across all AI
// paths.
async function countRecentGenerations(userId: string, since: Date): Promise<number> {
  const [r] = await getDb()
    .select({ value: count() })
    .from(generatedResumes)
    .where(and(eq(generatedResumes.userId, userId), gte(generatedResumes.createdAt, since)))
  const [c] = await getDb()
    .select({ value: count() })
    .from(coverLetters)
    .where(and(eq(coverLetters.userId, userId), gte(coverLetters.createdAt, since)))
  const [p] = await getDb()
    .select({ value: count() })
    .from(resumeParseEvents)
    .where(and(eq(resumeParseEvents.userId, userId), gte(resumeParseEvents.createdAt, since)))
  const [e] = await getDb()
    .select({ value: count() })
    .from(aiUsageEvents)
    .where(and(eq(aiUsageEvents.userId, userId), gte(aiUsageEvents.createdAt, since)))
  return (r?.value ?? 0) + (c?.value ?? 0) + (p?.value ?? 0) + (e?.value ?? 0)
}

// Records a successful résumé parse so it counts against the shared limit.
async function recordResumeParse(userId: string): Promise<void> {
  await getDb().insert(resumeParseEvents).values({ userId })
}

// Records a misc. AI action (e.g. cover-letter refine) so it counts against the
// shared limit. `kind` labels the action.
async function recordUsageEvent(userId: string, kind: string): Promise<void> {
  await getDb().insert(aiUsageEvents).values({ userId, kind })
}

export const aiUsageRepository = { countRecentGenerations, recordResumeParse, recordUsageEvent }
