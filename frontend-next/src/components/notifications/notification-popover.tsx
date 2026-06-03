'use client'

import { Button } from '@/components/ui/button'
import { PopoverContent, PopoverTitle } from '@/components/ui/popover'
import { NotificationItem } from './notification-item'
import type { Notification } from '@/types/notification'

export function NotificationPopover({
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
    <PopoverContent>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <PopoverTitle className="text-sm font-semibold">Notifications</PopoverTitle>
        {hasUnread ? (
          <Button type="button" variant="ghost" size="sm" onClick={onMarkAllRead}>
            Mark all read
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          notifications.map((n) => <NotificationItem key={n.id} notification={n} onSelect={onSelect} />)
        )}
      </div>
    </PopoverContent>
  )
}
