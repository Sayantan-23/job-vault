import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { apiClient } from '@/lib/api-client';
import { NOTIFICATIONS_KEY } from '@/lib/query-keys';
import * as pushLib from '@/lib/push-notifications';
import type { Notification } from '@/types/notification';
import { PushNotificationProvider } from './push-notification-provider';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getLastNotificationResponseAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    patch: jest.fn(),
  },
}));

jest.mock('@/lib/push-notifications', () => ({
  registerForPushNotificationsAsync: jest.fn(),
  unregisterPushTokenAsync: jest.fn(),
  getNotifications: jest.fn(() => jest.requireMock('expo-notifications')),
  isPushSupported: jest.fn(() => true),
}));

describe('PushNotificationProvider', () => {
  const mockPush = jest.fn();
  const mockNavigate = jest.fn();
  let listenerCallback: (response: any) => void;
  const mockSubscription = { remove: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      navigate: mockNavigate,
    });
    (Notifications.getLastNotificationResponseAsync as jest.Mock).mockResolvedValue(null);
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation(
      (cb) => {
        listenerCallback = cb;
        return mockSubscription;
      }
    );
    (apiClient.patch as jest.Mock).mockResolvedValue({});
  });

  it('registers for push notifications on mount and cleans up on unmount', async () => {
    const qc = new QueryClient();
    const { unmount } = await render(
      <QueryClientProvider client={qc}>
        <PushNotificationProvider />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(pushLib.registerForPushNotificationsAsync).toHaveBeenCalled();
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockSubscription.remove).toHaveBeenCalled();
      expect(pushLib.unregisterPushTokenAsync).toHaveBeenCalled();
    });
  });

  it('handles notification tap with jobId by deep-linking to /jobs/[id]', async () => {
    const qc = new QueryClient();
    const mockNotifs: Notification[] = [
      {
        id: 'n1',
        userId: 'u1',
        type: 'REMINDER',
        message: 'Reminder',
        isRead: false,
        relatedJobId: 'j1',
        createdAt: '2026-09-06T00:00:00Z',
      },
    ];
    qc.setQueryData(NOTIFICATIONS_KEY, mockNotifs);

    await render(
      <QueryClientProvider client={qc}>
        <PushNotificationProvider />
      </QueryClientProvider>
    );

    const mockResponse = {
      notification: {
        request: {
          content: {
            data: {
              jobId: 'j1',
              notificationId: 'n1',
            },
          },
        },
      },
    };

    listenerCallback(mockResponse);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/jobs/[id]',
        params: { id: 'j1' },
      });
      expect(apiClient.patch).toHaveBeenCalledWith('/api/notifications/n1/read');
    });

    const updated = qc.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
    expect(updated?.[0]?.isRead).toBe(true);
  });

  it('handles notification tap without jobId by navigating to Activity notifications', async () => {
    const qc = new QueryClient();
    await render(
      <QueryClientProvider client={qc}>
        <PushNotificationProvider />
      </QueryClientProvider>
    );

    const mockResponse = {
      notification: {
        request: {
          content: {
            data: {
              type: 'GENERAL',
            },
          },
        },
      },
    };

    listenerCallback(mockResponse);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/(tabs)/activity',
        params: { filter: 'notifications' },
      });
    });
  });
});
