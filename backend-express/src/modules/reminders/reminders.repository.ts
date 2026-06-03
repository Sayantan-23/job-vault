import { and, eq, lte, asc, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { reminders, type ReminderRow, type NewReminderRow } from '@/db/schema/reminders.js'
import type { UpdateReminderInput } from './reminders.schema.js'

async function create(values: NewReminderRow): Promise<ReminderRow> {
  const rows = await getDb().insert(reminders).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function listForJob(userId: string, jobId: string): Promise<ReminderRow[]> {
  return getDb()
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.jobId, jobId)))
    .orderBy(asc(reminders.remindAt))
}

async function findById(userId: string, id: string): Promise<ReminderRow | null> {
  const rows = await getDb()
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function update(userId: string, id: string, patch: UpdateReminderInput): Promise<ReminderRow | null> {
  const set: Partial<NewReminderRow> = { updatedAt: new Date() }
  if (patch.message !== undefined) set.message = patch.message
  if (patch.remindAt !== undefined) set.remindAt = patch.remindAt
  if (patch.isCompleted !== undefined) set.isCompleted = patch.isCompleted

  const rows = await getDb()
    .update(reminders)
    .set(set)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .returning({ id: reminders.id })
  return rows.length > 0
}

async function findDue(now: Date): Promise<ReminderRow[]> {
  return getDb()
    .select()
    .from(reminders)
    .where(and(lte(reminders.remindAt, now), eq(reminders.isCompleted, false)))
}

async function markCompleted(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  // System-wide (not user-scoped): the cron sweeps every user's due reminders by
  // id, so this update is intentionally unscoped. All request paths remain
  // user-scoped (findById/update/remove take a userId).
  await getDb()
    .update(reminders)
    .set({ isCompleted: true, updatedAt: new Date() })
    .where(inArray(reminders.id, ids))
}

export const remindersRepository = {
  create,
  listForJob,
  findById,
  update,
  remove,
  findDue,
  markCompleted,
}
