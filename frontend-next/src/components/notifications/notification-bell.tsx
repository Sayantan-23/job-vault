'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import {
  AnchoredPopover,
  AnchoredPopoverTrigger,
  AnchoredPopoverContent,
} from '@/components/ui/anchored-popover'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications'
import { IconButton } from '@/components/ui/icon-button'
import { NotificationPanel } from './notification-panel'
import type { Notification } from '@/types/notification'
import { cn } from '@/lib/utils'

/**
 * The notification bell — a quiet utility control mounted by AppShell at the
 * top-right of the canvas (a featherweight header, not a rail entry). Its panel is
 * anchored to the bell so it opens directly below it, replacing the old
 * top-right-pinned dialog popover. A small dot — not a count — signals unread.
 */
export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter()
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const [open, setOpen] = useState(false)

  const unread = notifications.filter((n) => !n.isRead).length

  function handleSelect(notification: Notification) {
    if (!notification.isRead) markRead.mutate(notification.id)
    setOpen(false)
    // Notifications are job-scoped; open the related job's drawer on the Jobs page
    // (the bell is global, so the current page may have no drawer of its own).
    if (notification.relatedJobId) {
      router.push(`/app/jobs?job=${notification.relatedJobId}`)
    }
  }

  return (
    <AnchoredPopover open={open} onOpenChange={setOpen}>
      <AnchoredPopoverTrigger asChild>
        <IconButton
          title="Notifications"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className={cn(open && 'bg-accent text-foreground', className)}
        >
          <span className="relative">
            <Bell className="size-[18px]" aria-hidden="true" />
            {unread > 0 ? (
              <span
                data-testid="header-unread-dot"
                // ring-background lifts the dot cleanly off whatever content scrolls beneath the floating bell
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-ghost-ghosted ring-2 ring-background"
                aria-hidden="true"
              />
            ) : null}
          </span>
        </IconButton>
      </AnchoredPopoverTrigger>
      <AnchoredPopoverContent aria-label="Notifications" align="end" sideOffset={8} className="w-80 p-0">
        <NotificationPanel
          notifications={notifications}
          hasUnread={unread > 0}
          onSelect={handleSelect}
          onMarkAllRead={() => markAllRead.mutate()}
        />
      </AnchoredPopoverContent>
    </AnchoredPopover>
  )
}
