import { and, eq, desc } from 'drizzle-orm'
import { getDb } from '@/db/client.js'
import { notifications, type NotificationRow, type NewNotificationRow } from '@/db/schema/notifications.js'

const LIST_CAP = 50

async function create(values: NewNotificationRow): Promise<NotificationRow> {
  const rows = await getDb().insert(notifications).values(values).returning()
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row
}

async function list(userId: string, unreadOnly: boolean): Promise<NotificationRow[]> {
  const where = unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    : eq(notifications.userId, userId)
  return getDb()
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(LIST_CAP)
}

async function findById(userId: string, id: string): Promise<NotificationRow | null> {
  const rows = await getDb()
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

async function markRead(userId: string, id: string): Promise<NotificationRow | null> {
  const rows = await getDb()
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning()
  return rows[0] ?? null
}

async function markAllRead(userId: string): Promise<number> {
  const rows = await getDb()
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id })
  return rows.length
}

export const notificationsRepository = {
  create,
  list,
  findById,
  markRead,
  markAllRead,
}
