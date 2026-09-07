import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as apiClientModule from '@/lib/api-client';
import { NOTIFICATIONS_KEY } from '@/lib/query-keys';
import type { Notification } from '@/types/notification';

import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './use-notifications';

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'u1',
    message: 'Application submitted',
    type: 'STATUS_CHANGE',
    isRead: false,
    relatedJobId: 'j1',
    createdAt: '2026-09-06T10:00:00Z',
  },
  {
    id: 'n2',
    userId: 'u1',
    message: 'Follow-up reminder',
    type: 'REMINDER',
    isRead: true,
    relatedJobId: 'j2',
    createdAt: '2026-09-05T10:00:00Z',
  },
];

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useNotifications', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.restoreAllMocks();
  });

  it('fetches notifications from /api/notifications', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValueOnce(mockNotifications);

    const { result } = await renderHook(() => useNotifications(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockNotifications);
    expect(apiClientModule.apiClient.get).toHaveBeenCalledWith('/api/notifications');
  });

  it('derives unread count accurately', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValueOnce(mockNotifications);

    const { result } = await renderHook(() => useUnreadNotificationCount(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current).toBe(1));
  });

  it('optimistically marks a notification as read', async () => {
    queryClient.setQueryData(NOTIFICATIONS_KEY, mockNotifications);
    const patchSpy = jest.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValueOnce({
      ...mockNotifications[0],
      isRead: true,
    });

    const { result } = await renderHook(() => useMarkNotificationRead(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('n1');
    });

    expect(patchSpy).toHaveBeenCalledWith('/api/notifications/n1/read');
    const cached = queryClient.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
    expect(cached?.[0].isRead).toBe(true);
  });

  it('optimistically marks all notifications as read', async () => {
    queryClient.setQueryData(NOTIFICATIONS_KEY, mockNotifications);
    const patchSpy = jest.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValueOnce({ updated: 1 });

    const { result } = await renderHook(() => useMarkAllNotificationsRead(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(patchSpy).toHaveBeenCalledWith('/api/notifications/read-all');
    const cached = queryClient.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
    expect(cached?.every((n) => n.isRead)).toBe(true);
  });
});
