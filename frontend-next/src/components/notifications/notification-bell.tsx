'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications'
import { NotificationPopover } from './notification-popover'
import type { Notification } from '@/types/notification'

export function NotificationBell() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const [open, setOpen] = useState(false)

  // Unread is derived client-side from the fetched list (no /unread-count endpoint).
  const unread = notifications.filter((n) => !n.isRead).length
  const badge = unread > 99 ? '99+' : String(unread)

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
        <Button type="button" variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 ? (
            <span
              data-testid="notification-badge"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-medium leading-none text-primary-foreground tabular-nums"
            >
              {badge}
            </span>
          ) : null}
        </Button>
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
