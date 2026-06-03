import { and, or, eq, ilike, asc, desc, max, count, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { jobs, type JobRow, type NewJobRow, type JobStatus } from '@/db/schema/jobs.js'
import { GHOST_STALE_DAYS, GHOST_GHOST_DAYS } from '@/shared/ghost.js'
import type { JobQueryInput, JobSortField, UpdateJobInput } from './jobs.schema.js'

const SORT_COLUMNS = {
  createdAt: jobs.createdAt,
  updatedAt: jobs.updatedAt,
  title: jobs.title,
  company: jobs.company,
  kanbanOrder: jobs.kanbanOrder,
  lastActivityAt: jobs.lastActivityAt,
} as const satisfies Record<JobSortField, unknown>

// Ghost-days derived live in SQL (now - COALESCE(lastActivityAt, createdAt))/day,
// so the filter matches the dashboard's derive-live behavior. The stored
// jobs.ghostDays column is never used for display — it is the cron's anchor only.
const ghostDaysExpr = sql`floor(extract(epoch from (now() - coalesce(${jobs.lastActivityAt}, ${jobs.createdAt}))) / 86400)`

function ghostCondition(filter: JobQueryInput['ghostFilter']): SQL | undefined {
  switch (filter) {
    case 'active':
      return sql`${ghostDaysExpr} <= ${GHOST_STALE_DAYS}`
    case 'stale':
      return sql`${ghostDaysExpr} > ${GHOST_STALE_DAYS} and ${ghostDaysExpr} <= ${GHOST_GHOST_DAYS}`
    case 'ghost':
      return sql`${ghostDaysExpr} > ${GHOST_GHOST_DAYS}`
    default:
      return undefined
  }
}

async function nextKanbanOrder(userId: string, status: JobStatus): Promise<number> {
  const rows = await getDb()
    .select({ max: max(jobs.kanbanOrder) })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.status, status)))
  return (rows[0]?.max ?? 0) + 1
}

async function create(values: NewJobRow): Promise<JobRow> {
  const rows = await getDb().insert(jobs).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function findById(userId: string, id: string): Promise<JobRow | null> {
  const rows = await getDb()
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function findAll(userId: string, query: JobQueryInput): Promise<{ rows: JobRow[]; total: number }> {
  const where = and(
    eq(jobs.userId, userId),
    query.search
      ? or(ilike(jobs.title, `%${query.search}%`), ilike(jobs.company, `%${query.search}%`))
      : undefined,
    query.status ? eq(jobs.status, query.status) : undefined,
    ghostCondition(query.ghostFilter),
  )

  const sortColumn = SORT_COLUMNS[query.sortBy]
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

  const rows = await getDb()
    .select()
    .from(jobs)
    .where(where)
    .orderBy(orderBy)
    .limit(query.limit)
    .offset((query.page - 1) * query.limit)

  const totalRows = await getDb().select({ value: count() }).from(jobs).where(where)
  const total = totalRows[0]?.value ?? 0

  return { rows, total }
}

async function update(userId: string, id: string, patch: UpdateJobInput): Promise<JobRow | null> {
  const set: Partial<NewJobRow> = { updatedAt: new Date(), lastActivityAt: new Date() }
  if (patch.title !== undefined) set.title = patch.title
  if (patch.company !== undefined) set.company = patch.company
  if (patch.location !== undefined) set.location = patch.location
  if (patch.salaryRange !== undefined) set.salaryRange = patch.salaryRange
  if (patch.sourceUrl !== undefined) set.sourceUrl = patch.sourceUrl
  if (patch.snapshotMarkdown !== undefined) set.snapshotMarkdown = patch.snapshotMarkdown
  if (patch.status !== undefined) set.status = patch.status
  if (patch.notes !== undefined) set.notes = patch.notes

  const rows = await getDb()
    .update(jobs)
    .set(set)
    .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function move(userId: string, id: string, status: JobStatus, kanbanOrder: number): Promise<JobRow | null> {
  const rows = await getDb()
    .update(jobs)
    .set({ status, kanbanOrder, updatedAt: new Date(), lastActivityAt: new Date() })
    .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
    .returning({ id: jobs.id })
  return rows.length > 0
}

export const jobsRepository = {
  nextKanbanOrder,
  create,
  findById,
  findAll,
  update,
  move,
  remove,
}
