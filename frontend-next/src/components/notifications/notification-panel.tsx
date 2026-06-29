'use client'

import { Button } from '@/components/ui/button'
import { NotificationItem } from './notification-item'
import type { Notification } from '@/types/notification'

/**
 * The notification panel body — header (title + Mark all read) over a scrollable
 * list, with an editorial empty state. Presentational only: it's dropped inside
 * the bell's anchored popover (see notification-bell.tsx), so it owns no
 * positioning of its own.
 */
export function NotificationPanel({
  notifications,
  hasUnread,
  onSelect,
  onMarkAllRead,
}: {
  notifications: Notification[]
  hasUnread: boolean
  onSelect: (notification: Notification) => void
  onMarkAllRead: () => void
}) {
  return (
    <div className="flex max-h-[70vh] w-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">Notifications</span>
        {hasUnread ? (
          <Button type="button" variant="ghost" size="sm" onClick={onMarkAllRead}>
            Mark all read
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          notifications.map((n) => <NotificationItem key={n.id} notification={n} onSelect={onSelect} />)
        )}
      </div>
    </div>
  )
}
