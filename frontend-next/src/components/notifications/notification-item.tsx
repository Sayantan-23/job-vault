'use client'

import { Ghost, Bell, ArrowRightLeft, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/notification'

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  GHOST_ALERT: Ghost,
  REMINDER: Bell,
  STATUS_CHANGE: ArrowRightLeft,
  GENERAL: Info,
}

export function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification
  onSelect: (notification: Notification) => void
}) {
  const Icon = TYPE_ICON[notification.type]
  return (
    <button
      type="button"
      data-unread={notification.isRead ? 'false' : 'true'}
      onClick={() => onSelect(notification)}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent',
        notification.isRead ? 'text-muted-foreground' : 'text-foreground',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className={cn('text-sm leading-snug', notification.isRead ? 'font-normal' : 'font-medium')}>
        {notification.message}
      </span>
    </button>
  )
}
