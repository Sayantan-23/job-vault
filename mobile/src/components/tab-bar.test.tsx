import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/tabs';

import { NOTIFICATIONS_KEY } from '@/lib/query-keys';
import type { Notification } from '@/types/notification';
import { TabBar } from './tab-bar';

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const ROUTE_NAMES = ['index', 'answers', 'vault', 'activity'];

function makeProps(index: number) {
  return {
    state: {
      index,
      routes: ROUTE_NAMES.map((name) => ({ key: `${name}-0`, name, params: undefined })),
    },
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    },
    descriptors: {},
    insets: METRICS.insets,
  } as unknown as BottomTabBarProps;
}

function renderBar(props: BottomTabBarProps, queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={METRICS}>
        <TabBar {...props} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

describe('TabBar', () => {
  it('renders the four tabs of d-0cd3wr', async () => {
    await renderBar(makeProps(0));

    for (const label of ['Jobs', 'Answers', 'Vault', 'Activity']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('navigates to a tab that is not focused', async () => {
    const props = makeProps(0);
    await renderBar(props);

    await fireEvent.press(screen.getByText('Answers'));

    expect(props.navigation.navigate).toHaveBeenCalledWith('answers', undefined);
  });

  it('does not navigate when the focused tab is pressed', async () => {
    const props = makeProps(0);
    await renderBar(props);

    await fireEvent.press(screen.getByText('Jobs'));

    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('shows unread dot on activity tab when there are unread notifications', async () => {
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

    await renderBar(makeProps(0), qc);

    expect(screen.getByTestId('tab-unread-dot')).toBeTruthy();
  });

  it('does not show unread dot on activity tab when all notifications are read', async () => {
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

    await renderBar(makeProps(0), qc);

    expect(screen.queryByTestId('tab-unread-dot')).toBeNull();
  });
});
