import { and, or, eq, ilike, asc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { jobs, type JobRow, type JobStatus } from '@/db/schema/jobs.js'

interface BoardFilters {
  search?: string | undefined
  status?: JobStatus | undefined
}

async function findForUser(userId: string, filters: BoardFilters): Promise<JobRow[]> {
  const where = and(
    eq(jobs.userId, userId),
    filters.search
      ? or(ilike(jobs.title, `%${filters.search}%`), ilike(jobs.company, `%${filters.search}%`))
      : undefined,
    filters.status ? eq(jobs.status, filters.status) : undefined,
  )
  return getDb().select().from(jobs).where(where).orderBy(asc(jobs.kanbanOrder))
}

export const dashboardRepository = { findForUser }
