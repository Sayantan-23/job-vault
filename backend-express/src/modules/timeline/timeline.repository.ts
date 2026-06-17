import { eq, desc, count } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { timelineEvents, type TimelineEventRow, type NewTimelineEventRow } from '@/db/schema/timeline.js'
import { jobs } from '@/db/schema/jobs.js'

// A timeline row enriched with its job's title + company, for the global feed
// (where the event alone — e.g. "Status changed to Applied" — needs the job for
// context). Inner-joined, so only events whose job still exists are returned.
export interface GlobalTimelineEventRow extends TimelineEventRow {
  jobTitle: string
  jobCompany: string
}

async function findByJob(jobId: string): Promise<TimelineEventRow[]> {
  return getDb()
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.jobId, jobId))
    .orderBy(desc(timelineEvents.createdAt))
}

async function findByUser(
  userId: string,
  limit: number,
  offset: number,
): Promise<{ rows: GlobalTimelineEventRow[]; total: number }> {
  const rows = await getDb()
    .select({
      id: timelineEvents.id,
      createdAt: timelineEvents.createdAt,
      updatedAt: timelineEvents.updatedAt,
      userId: timelineEvents.userId,
      jobId: timelineEvents.jobId,
      type: timelineEvents.type,
      title: timelineEvents.title,
      description: timelineEvents.description,
      jobTitle: jobs.title,
      jobCompany: jobs.company,
    })
    .from(timelineEvents)
    .innerJoin(jobs, eq(timelineEvents.jobId, jobs.id))
    .where(eq(timelineEvents.userId, userId))
    .orderBy(desc(timelineEvents.createdAt))
    .limit(limit)
    .offset(offset)

  // Count through the same inner join as the rows query, so `total` can never
  // exceed the number of rows that are actually returnable (i.e. whose job still
  // exists). They match in practice today via the jobId cascade-delete, but
  // keeping the WHERE/JOIN identical makes pagination correct by construction.
  const totalRows = await getDb()
    .select({ value: count() })
    .from(timelineEvents)
    .innerJoin(jobs, eq(timelineEvents.jobId, jobs.id))
    .where(eq(timelineEvents.userId, userId))

  return { rows, total: totalRows[0]?.value ?? 0 }
}

async function create(values: NewTimelineEventRow): Promise<TimelineEventRow> {
  const rows = await getDb().insert(timelineEvents).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

export const timelineRepository = {
  findByJob,
  findByUser,
  create,
}
