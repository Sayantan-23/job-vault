import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { NOTIFICATIONS_KEY } from '@/lib/query-keys';
import type { Notification } from '@/types/notification';

export function notificationsQueryOptions() {
  return {
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => apiClient.get<Notification[]>('/api/notifications'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  } as const;
}

export function useNotifications() {
  return useQuery(notificationsQueryOptions());
}

export function useUnreadNotificationCount(): number {
  const { data: notifications } = useNotifications();
  if (!notifications) return 0;
  return notifications.filter((n) => !n.isRead).length;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<Notification>(`/api/notifications/${id}/read`),
    onMutate: (id) => {
      const previous = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
      if (previous) {
        qc.setQueryData<Notification[]>(
          NOTIFICATIONS_KEY,
          previous.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(NOTIFICATIONS_KEY, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch<{ updated: number }>('/api/notifications/read-all'),
    onMutate: () => {
      const previous = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
      if (previous) {
        qc.setQueryData<Notification[]>(
          NOTIFICATIONS_KEY,
          previous.map((n) => ({ ...n, isRead: true }))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(NOTIFICATIONS_KEY, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
