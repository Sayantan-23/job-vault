import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { NOTIFICATIONS_KEY } from '@/lib/query-keys';
import {
  getNotifications,
  isPushSupported,
  registerForPushNotificationsAsync,
  unregisterPushTokenAsync,
} from '@/lib/push-notifications';
import type { Notification } from '@/types/notification';

export function PushNotificationProvider({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    // In Expo Go on Android, remote push notifications were removed in SDK 53.
    // We guard against running this provider in Expo Go so it doesn't crash on device.
    if (!isPushSupported()) {
      return;
    }

    const Notifications = getNotifications();
    if (!Notifications) {
      return;
    }

    // 1. Register push token with backend on mount
    void registerForPushNotificationsAsync();

    // 2. Helper to handle notification response (job deep link + mark read)
    function handleResponse(response: any) {
      const data = response?.notification?.request?.content?.data as
        | { jobId?: string; notificationId?: string; type?: string }
        | undefined;

      if (!data) return;

      if (data.notificationId) {
        // Optimistically mark as read in cache
        queryClient.setQueryData<Notification[]>(NOTIFICATIONS_KEY, (prev) =>
          prev ? prev.map((n) => (n.id === data.notificationId ? { ...n, isRead: true } : n)) : prev
        );
        void apiClient.patch(`/api/notifications/${data.notificationId}/read`).catch(() => {});
      }

      if (data.jobId) {
        router.push({
          pathname: '/jobs/[id]',
          params: { id: data.jobId },
        });
      } else {
        router.navigate({
          pathname: '/(tabs)/activity',
          params: { filter: 'notifications' },
        });
      }
    }

    // Check cold-start notification tap
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleResponse(response);
      }
    });

    // Listen for background / foreground notification taps
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    return () => {
      subscription.remove();
      void unregisterPushTokenAsync();
    };
  }, [router, queryClient]);

  return children ? <>{children}</> : null;
}
