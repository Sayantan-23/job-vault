import type { Notification } from '~/types/notification';
import type { ApiResponse } from '~/types/api';

/**
 * Global notification composable.
 * Manages notification state, polling, and read/unread operations.
 * Uses useState for shared state across components.
 */
export function useNotifications() {
  const notifications = useState<Notification[]>('notifications', () => []);
  const isLoading = useState<boolean>('notifications-loading', () => false);

  const unreadCount = computed(() =>
    notifications.value.filter((n) => !n.isRead).length,
  );

  const api = useApi();

  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let isPolling = false;

  async function fetchNotifications(): Promise<void> {
    isLoading.value = true;
    try {
      const response = await api.get<ApiResponse<Notification[]>>('/notifications');
      notifications.value = response.data;
    } catch {
      // Silently fail for polling -- avoid toast spam
    } finally {
      isLoading.value = false;
    }
  }

  async function markRead(id: string): Promise<void> {
    try {
      await api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
      const index = notifications.value.findIndex((n) => n.id === id);
      if (index !== -1) {
        notifications.value[index] = { ...notifications.value[index], isRead: true } as Notification;
      }
    } catch {
      // Silent fail
    }
  }

  async function markAllRead(): Promise<void> {
    try {
      await api.patch('/notifications/read-all');
      notifications.value = notifications.value.map((n) => ({ ...n, isRead: true }));
    } catch {
      // Silent fail
    }
  }

  function startPolling(intervalMs: number = 60000): void {
    if (isPolling) return;
    isPolling = true;

    // Initial fetch
    fetchNotifications();

    pollingTimer = setInterval(() => {
      // Only poll when tab is visible
      if (import.meta.client && document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, intervalMs);

    // Pause/resume polling on visibility change
    if (import.meta.client) {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
  }

  function stopPolling(): void {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    isPolling = false;

    if (import.meta.client) {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  }

  function onVisibilityChange(): void {
    // Fetch immediately when tab becomes visible again
    if (document.visibilityState === 'visible' && isPolling) {
      fetchNotifications();
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markRead,
    markAllRead,
    startPolling,
    stopPolling,
  };
}
