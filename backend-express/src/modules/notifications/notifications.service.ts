import { AppError } from '@/shared/errors.js'
import { emitToUser } from '@/realtime/socket.js'
import { notificationsRepository } from './notifications.repository.js'
import type { NotificationRow, NotificationType } from '@/db/schema/notifications.js'

export interface CreateNotificationInput {
  userId: string
  message: string
  type: NotificationType
  relatedJobId?: string
}

// Returns the created NotificationRow (the cron + 4c socket push both need the row).
async function create(input: CreateNotificationInput): Promise<NotificationRow> {
  const values: {
    userId: string
    message: string
    type: NotificationType
    relatedJobId?: string
  } = { userId: input.userId, message: input.message, type: input.type }
  if (input.relatedJobId !== undefined) values.relatedJobId = input.relatedJobId
  const notification = await notificationsRepository.create(values)
  // Best-effort real-time push to the owner's open tabs. emitToUser is a safe
  // no-op when the socket server is unset (e.g. under test / realtime disabled).
  emitToUser(notification.userId, 'notification', notification)
  return notification
}

async function list(userId: string, unreadOnly: boolean): Promise<NotificationRow[]> {
  return notificationsRepository.list(userId, unreadOnly)
}

async function markRead(userId: string, id: string): Promise<NotificationRow> {
  const updated = await notificationsRepository.markRead(userId, id)
  if (!updated) throw new AppError('NOT_FOUND', 'Notification not found')
  return updated
}

async function markAllRead(userId: string): Promise<{ updated: number }> {
  const updated = await notificationsRepository.markAllRead(userId)
  return { updated }
}

export const notificationsService = { create, list, markRead, markAllRead }
