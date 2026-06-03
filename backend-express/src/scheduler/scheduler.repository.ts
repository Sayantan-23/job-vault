import { eq, ne } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { jobs, type JobRow } from '@/db/schema/jobs.js'

// System-wide accessors for the daily ghost cron. The cron is intentionally NOT
// user-scoped (it sweeps every user's jobs), unlike the user-scoped request paths
// in jobsRepository. Keeping these here makes that boundary explicit and avoids
// overloading the user-scoped repository with an unscoped query.
async function findAllNonArchivedJobs(): Promise<JobRow[]> {
  return getDb().select().from(jobs).where(ne(jobs.status, 'ARCHIVED'))
}

async function setJobGhostDays(id: string, ghostDays: number): Promise<void> {
  await getDb().update(jobs).set({ ghostDays }).where(eq(jobs.id, id))
}

export const schedulerRepository = {
  findAllNonArchivedJobs,
  setJobGhostDays,
}
