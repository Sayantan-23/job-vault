import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { connectSocket, disconnectSocket } from '@/lib/socket';
import { NOTIFICATIONS_KEY, TIMELINE_KEY } from '@/lib/query-keys';
import type { Notification } from '@/types/notification';

import { RealtimeProvider } from './realtime-provider';

let notificationHandler: ((n: Notification) => void) | undefined;
const mockSocket = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn((event: string, handler: (n: Notification) => void) => {
    if (event === 'notification') {
      notificationHandler = handler;
    }
  }),
  off: jest.fn(),
};

jest.mock('@/lib/socket', () => ({
  __esModule: true,
  connectSocket: jest.fn(() => mockSocket),
  disconnectSocket: jest.fn(() => mockSocket.disconnect()),
}));


describe('RealtimeProvider', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.clearAllMocks();
    notificationHandler = undefined;
  });

  it('connects socket on mount and listens for notification event', async () => {
    const { unmount } = await render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <Text>Child</Text>
        </RealtimeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(connectSocket).toHaveBeenCalled());
    expect(mockSocket.on).toHaveBeenCalledWith('notification', expect.any(Function));

    unmount();
    await waitFor(() => expect(disconnectSocket).toHaveBeenCalled());
    expect(mockSocket.off).toHaveBeenCalledWith('notification', expect.any(Function));
  });

  it('prepends incoming notification to cache and invalidates timeline', async () => {
    const initial: Notification[] = [
      {
        id: 'n1',
        userId: 'u1',
        message: 'Old notification',
        type: 'REMINDER',
        isRead: false,
        relatedJobId: 'j1',
        createdAt: '2026-09-05T00:00:00Z',
      },
    ];
    queryClient.setQueryData(NOTIFICATIONS_KEY, initial);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <Text>Child</Text>
        </RealtimeProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(notificationHandler).toBeDefined());

    const incoming: Notification = {
      id: 'n2',
      userId: 'u1',
      message: 'New application event',
      type: 'STATUS_CHANGE',
      isRead: false,
      relatedJobId: 'j2',
      createdAt: '2026-09-06T12:00:00Z',
    };

    act(() => {
      notificationHandler!(incoming);
    });

    const cached = queryClient.getQueryData<Notification[]>(NOTIFICATIONS_KEY);
    expect(cached).toEqual([incoming, initial[0]]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: TIMELINE_KEY });
  });
});
