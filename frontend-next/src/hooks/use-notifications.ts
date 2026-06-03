'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { NOTIFICATIONS_KEY } from '@/lib/query-keys'
import type { Notification } from '@/types/notification'

// Event-driven liveness: refetch on window focus + invalidate-on-mutation. No
// refetchInterval — real-time push lands in Slice 4c. The whole list is fetched
// (no unreadOnly query param); the bell derives the unread count client-side.
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => apiClient.get<Notification[]>('/api/notifications'),
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<Notification>(`/api/notifications/${id}/read`),
    onMutate: (id) => {
      const previous = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY)
      if (previous) {
        qc.setQueryData<Notification[]>(
          NOTIFICATIONS_KEY,
          previous.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        )
      }
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(NOTIFICATIONS_KEY, context.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.patch<{ updated: number }>('/api/notifications/read-all'),
    onMutate: () => {
      const previous = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY)
      if (previous) {
        qc.setQueryData<Notification[]>(
          NOTIFICATIONS_KEY,
          previous.map((n) => ({ ...n, isRead: true })),
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(NOTIFICATIONS_KEY, context.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    },
  })
}
