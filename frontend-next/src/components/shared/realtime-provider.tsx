'use client'

import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { NOTIFICATIONS_KEY } from '@/lib/query-keys'
import type { Notification } from '@/types/notification'

/**
 * Opens the real-time channel for authenticated app pages: connects the socket
 * on mount, prepends each pushed 'notification' into the TanStack Query cache
 * at NOTIFICATIONS_KEY (deduped by id), and disconnects on unmount. Unread is
 * client-derived (spec §9) — `useNotifications` counts `!isRead` over this list,
 * so a pushed `isRead:false` notification increments the bell badge for free.
 * This supersedes focus-refetch as the primary freshness path; focus-refetch in
 * `useNotifications` stays as a fallback for the initial load and any missed events.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = connectSocket()

    function onNotification(payload: Notification) {
      queryClient.setQueryData<Notification[]>(NOTIFICATIONS_KEY, (prev) =>
        prev ? [payload, ...prev.filter((n) => n.id !== payload.id)] : [payload],
      )
    }

    socket.on('notification', onNotification)
    return () => {
      socket.off('notification', onNotification)
      disconnectSocket()
    }
  }, [queryClient])

  return <>{children}</>
}
