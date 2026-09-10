import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { NOTIFICATIONS_KEY } from '@/lib/query-keys';
import type { Notification } from '@/types/notification';
import { AppHeader } from './app-header';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderHeader(queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={METRICS}>
        <AppHeader title="Vault" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

describe('AppHeader', () => {
  const mockNavigate = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      push: mockPush,
    });
  });

  it('renders title and search icon', async () => {
    await renderHeader();

    expect(screen.getByText('Vault')).toBeTruthy();
    expect(screen.getByLabelText('Search')).toBeTruthy();
    expect(screen.getByTestId('header-notification-button')).toBeTruthy();
  });

  it('navigates to search screen when search icon is pressed', async () => {
    await renderHeader();

    await fireEvent.press(screen.getByLabelText('Search'));
    expect(mockPush).toHaveBeenCalledWith('/search');
  });

  it('shows unread dot on notification bell when there are unread notifications', async () => {
    const qc = new QueryClient();
    const mockNotifications: Notification[] = [
      {
        id: 'n1',
        userId: 'u1',
        type: 'REMINDER',
        message: 'Follow up with Stripe',
        isRead: false,
        relatedJobId: 'j1',
        createdAt: new Date().toISOString(),
      },
    ];
    qc.setQueryData(NOTIFICATIONS_KEY, mockNotifications);

    await renderHeader(qc);

    expect(screen.getByTestId('header-unread-dot')).toBeTruthy();
    expect(screen.getByLabelText('Notifications, 1 unread')).toBeTruthy();
  });

  it('navigates to Activity tab with filter: notifications when bell is pressed', async () => {
    await renderHeader();

    await fireEvent.press(screen.getByTestId('header-notification-button'));

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/(tabs)/activity',
      params: { filter: 'notifications' },
    });
  });

  it('does not show unread dot when all notifications are read', async () => {
    const qc = new QueryClient();
    const mockNotifications: Notification[] = [
      {
        id: 'n1',
        userId: 'u1',
        type: 'REMINDER',
        message: 'Follow up with Stripe',
        isRead: true,
        relatedJobId: 'j1',
        createdAt: new Date().toISOString(),
      },
    ];
    qc.setQueryData(NOTIFICATIONS_KEY, mockNotifications);

    await renderHeader(qc);

    expect(screen.queryByTestId('header-unread-dot')).toBeNull();
    expect(screen.getByLabelText('Notifications')).toBeTruthy();
  });
});
