import { AppError } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'
import { emitToUser } from '@/realtime/socket.js'
import { pushService } from '@/modules/push/push.service.js'
import { notificationsRepository } from './notifications.repository.js'
import type { NotificationRow, NotificationType } from '@/db/schema/notifications.js'

// Push notification titles; the notification's own message is the body.
const PUSH_TITLES: Record<NotificationType, string> = {
  GHOST_ALERT: 'Ghost alert',
  REMINDER: 'Reminder',
  STATUS_CHANGE: 'Status update',
  GENERAL: 'JobVault',
}

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
  // And to the owner's registered mobile devices, for when no tab is open at
  // all. Fire-and-forget: sendToUser swallows its own failures, and a cron
  // sweep must not wait on an HTTP round-trip per notification.
  void pushService.sendToUser(notification.userId, {
    title: PUSH_TITLES[notification.type],
    body: notification.message,
    data: {
      notificationId: notification.id,
      type: notification.type,
      // The mobile deep link needs the job; omitted when there isn't one.
      ...(notification.relatedJobId ? { jobId: notification.relatedJobId } : {}),
    },
  }).catch((err: unknown) => logger.warn({ err }, 'mobile push delivery failed'))
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
