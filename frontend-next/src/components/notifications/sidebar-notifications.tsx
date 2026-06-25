'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications'
import { NotificationPopover } from './notification-popover'
import type { Notification } from '@/types/notification'
import { cn } from '@/lib/utils'

/**
 * Notifications as a quiet rail entry (replaces the old header bell). Styled to
 * match the nav links, with a small unread dot instead of a badge. Opening it
 * reuses the existing top-right NotificationPopover panel and its mark-read /
 * jump-to-job behavior — no new route.
 */
export function SidebarNotifications() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const [open, setOpen] = useState(false)

  const unread = notifications.filter((n) => !n.isRead).length

  function handleSelect(notification: Notification) {
    if (!notification.isRead) markRead.mutate(notification.id)
    setOpen(false)
    if (notification.relatedJobId) {
      const params = new URLSearchParams(searchParams)
      params.set('job', notification.relatedJobId)
      router.push(`${pathname}?${params.toString()}`)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
            open
              ? 'bg-accent font-medium text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Bell className="size-4" aria-hidden="true" />
          Notifications
          {unread > 0 ? (
            <span
              data-testid="sidebar-unread-dot"
              className="ml-auto size-2 shrink-0 rounded-full bg-ghost-ghosted"
              aria-hidden="true"
            />
          ) : null}
        </button>
      </PopoverTrigger>
      <NotificationPopover
        notifications={notifications}
        hasUnread={unread > 0}
        onSelect={handleSelect}
        onMarkAllRead={() => markAllRead.mutate()}
      />
    </Popover>
  )
}
