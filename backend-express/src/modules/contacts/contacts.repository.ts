import { and, eq, desc, count, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { jobContacts, type JobContactRow, type NewJobContactRow } from '@/db/schema/job-contacts.js'
import type { UpdateContactInput } from './contacts.schema.js'

export interface OutreachCounts {
  outreachCount: number
  outreachReplies: number
}

async function create(values: NewJobContactRow): Promise<JobContactRow> {
  const rows = await getDb().insert(jobContacts).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function listForJob(userId: string, jobId: string): Promise<JobContactRow[]> {
  return getDb()
    .select()
    .from(jobContacts)
    .where(and(eq(jobContacts.userId, userId), eq(jobContacts.jobId, jobId)))
    .orderBy(desc(jobContacts.reachedOutAt))
}

async function findById(userId: string, id: string): Promise<JobContactRow | null> {
  const rows = await getDb()
    .select()
    .from(jobContacts)
    .where(and(eq(jobContacts.id, id), eq(jobContacts.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(userId: string, id: string, patch: UpdateContactInput): Promise<JobContactRow | null> {
  const set: Partial<NewJobContactRow> = { updatedAt: new Date() }
  if (patch.contact !== undefined) set.contact = patch.contact
  if (patch.channel !== undefined) set.channel = patch.channel
  if (patch.status !== undefined) set.status = patch.status
  if (patch.reachedOutAt !== undefined) set.reachedOutAt = patch.reachedOutAt
  if (patch.notes !== undefined) set.notes = patch.notes

  const rows = await getDb()
    .update(jobContacts)
    .set(set)
    .where(and(eq(jobContacts.id, id), eq(jobContacts.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(jobContacts)
    .where(and(eq(jobContacts.id, id), eq(jobContacts.userId, userId)))
    .returning({ id: jobContacts.id })
  return rows.length > 0
}

// One grouped query powering the list/board outreach badges. Any status other
// than NO_RESPONSE implies the person replied (heard back / referred / declined).
async function countsForJobs(userId: string, jobIds: string[]): Promise<Map<string, OutreachCounts>> {
  if (jobIds.length === 0) return new Map()
  const rows = await getDb()
    .select({
      jobId: jobContacts.jobId,
      total: count(),
      replies: count(sql`case when ${jobContacts.status} <> 'NO_RESPONSE' then 1 end`),
    })
    .from(jobContacts)
    .where(and(eq(jobContacts.userId, userId), inArray(jobContacts.jobId, jobIds)))
    .groupBy(jobContacts.jobId)
  return new Map(rows.map((r) => [r.jobId, { outreachCount: r.total, outreachReplies: r.replies }]))
}

export const contactsRepository = { create, listForJob, findById, update, remove, countsForJobs }
