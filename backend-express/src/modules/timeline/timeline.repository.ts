import { eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { timelineEvents, type TimelineEventRow, type NewTimelineEventRow } from '@/db/schema/timeline.js'

async function findByJob(jobId: string): Promise<TimelineEventRow[]> {
  return getDb()
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.jobId, jobId))
    .orderBy(desc(timelineEvents.createdAt))
}

async function create(values: NewTimelineEventRow): Promise<TimelineEventRow> {
  const rows = await getDb().insert(timelineEvents).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

export const timelineRepository = {
  findByJob,
  create,
}
