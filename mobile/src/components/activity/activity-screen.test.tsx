import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { apiClient } from '@/lib/api-client';
import { NOTIFICATIONS_KEY } from '@/lib/query-keys';
import { globalTimelineQuery } from '@/lib/queries';
import type { Notification } from '@/types/notification';
import type { GlobalTimelineEvent } from '@/types/timeline';
import { ActivityScreen } from './activity-screen';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    getPage: jest.fn(),
    patch: jest.fn(),
  },
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'u1',
    type: 'REMINDER',
    message: 'Follow up with Figma recruiter',
    isRead: false,
    relatedJobId: 'j1',
    createdAt: '2026-09-06T12:00:00Z',
  },
  {
    id: 'n2',
    userId: 'u1',
    type: 'STATUS_CHANGE',
    message: 'Stripe moved to Interviewing',
    isRead: true,
    relatedJobId: 'j2',
    createdAt: '2026-09-05T12:00:00Z',
  },
];

const mockTimelineEvents: GlobalTimelineEvent[] = [
  {
    id: 'e1',
    userId: 'u1',
    jobId: 'j1',
    jobTitle: 'Senior Product Designer',
    jobCompany: 'Figma',
    title: 'Applied to Senior Product Designer',
    description: 'Submitted application via careers page.',
    type: 'AUTO',
    createdAt: '2026-09-06T11:00:00Z',
  },
];

function renderScreen(qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <SafeAreaProvider initialMetrics={METRICS}>
        <ActivityScreen />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

describe('ActivityScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (apiClient.get as jest.Mock).mockResolvedValue(mockNotifications);
    (apiClient.getPage as jest.Mock).mockResolvedValue({
      data: mockTimelineEvents,
      meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
    });
    (apiClient.patch as jest.Mock).mockResolvedValue({});
  });

  it('renders header, filter pills, and interleaved feed in "All" mode', async () => {
    const qc = new QueryClient();
    qc.setQueryData(NOTIFICATIONS_KEY, mockNotifications);
    qc.setQueryData(globalTimelineQuery(1).key, {
      data: mockTimelineEvents,
      meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
    });

    await renderScreen(qc);

    expect(screen.getByText('Activity')).toBeTruthy();
    expect(screen.getByLabelText('Filter all activity')).toBeTruthy();
    expect(screen.getByLabelText('Filter timeline')).toBeTruthy();
    expect(screen.getByLabelText('Filter notifications')).toBeTruthy();

    // Both notification and timeline entries render
    expect(screen.getByText('Follow up with Figma recruiter')).toBeTruthy();
    expect(screen.getByText('Applied to Senior Product Designer')).toBeTruthy();
  });

  it('filters to only timeline items when Timeline pill is tapped', async () => {
    const qc = new QueryClient();
    qc.setQueryData(NOTIFICATIONS_KEY, mockNotifications);
    qc.setQueryData(globalTimelineQuery(1).key, {
      data: mockTimelineEvents,
      meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
    });

    await renderScreen(qc);

    await fireEvent.press(screen.getByLabelText('Filter timeline'));

    await waitFor(() => {
      expect(screen.getByText('Applied to Senior Product Designer')).toBeTruthy();
      expect(screen.queryByText('Follow up with Figma recruiter')).toBeNull();
    });
  });

  it('filters to only notifications when Notifications pill is tapped', async () => {
    const qc = new QueryClient();
    qc.setQueryData(NOTIFICATIONS_KEY, mockNotifications);
    qc.setQueryData(globalTimelineQuery(1).key, {
      data: mockTimelineEvents,
      meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
    });

    await renderScreen(qc);

    await fireEvent.press(screen.getByLabelText('Filter notifications'));

    await waitFor(() => {
      expect(screen.getByText('Follow up with Figma recruiter')).toBeTruthy();
      expect(screen.queryByText('Applied to Senior Product Designer')).toBeNull();
    });
  });

  it('marks unread notification as read and navigates to related job on tap', async () => {
    const qc = new QueryClient();
    qc.setQueryData(NOTIFICATIONS_KEY, mockNotifications);
    qc.setQueryData(globalTimelineQuery(1).key, {
      data: mockTimelineEvents,
      meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
    });

    await renderScreen(qc);

    await fireEvent.press(screen.getByText('Follow up with Figma recruiter'));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/api/notifications/n1/read');
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/jobs/[id]',
        params: { id: 'j1' },
      });
    });
  });

  it('marks all notifications read when "Mark all read" is tapped in banner', async () => {
    const qc = new QueryClient();
    qc.setQueryData(NOTIFICATIONS_KEY, mockNotifications);
    qc.setQueryData(globalTimelineQuery(1).key, {
      data: mockTimelineEvents,
      meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
    });

    await renderScreen(qc);

    expect(screen.getByText('1 unread notification')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Mark all notifications as read'));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/api/notifications/read-all');
    });
  });

  it('honors params.filter="notifications" from deep linking or top bell press', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ filter: 'notifications' });

    const qc = new QueryClient();
    qc.setQueryData(NOTIFICATIONS_KEY, mockNotifications);
    qc.setQueryData(globalTimelineQuery(1).key, {
      data: mockTimelineEvents,
      meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
    });

    await renderScreen(qc);

    await waitFor(() => {
      expect(screen.getByText('Follow up with Figma recruiter')).toBeTruthy();
      expect(screen.queryByText('Applied to Senior Product Designer')).toBeNull();
    });
  });

  it('renders empty states when there is no activity', async () => {
    const qc = new QueryClient();
    qc.setQueryData(NOTIFICATIONS_KEY, []);
    qc.setQueryData(globalTimelineQuery(1).key, {
      data: [],
      meta: { page: 1, pageSize: 50, totalItems: 0, totalPages: 1 },
    });

    await renderScreen(qc);

    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeTruthy();
    });
  });

  it('renders "Load older activity" button when totalPages > 1 and loads next page on press', async () => {
    const qc = new QueryClient();
    qc.setQueryData(NOTIFICATIONS_KEY, []);
    qc.setQueryData(globalTimelineQuery(1).key, {
      data: mockTimelineEvents,
      meta: { page: 1, pageSize: 50, totalItems: 100, totalPages: 2 },
    });

    const page2Event: GlobalTimelineEvent = {
      id: 'e2',
      userId: 'u1',
      jobId: 'j2',
      jobTitle: 'Staff Software Engineer',
      jobCompany: 'Stripe',
      title: 'Moved to Offer',
      description: null,
      type: 'MANUAL',
      createdAt: '2026-09-01T10:00:00Z',
    };

    (apiClient.getPage as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('page=2')) {
        return Promise.resolve({
          data: [page2Event],
          meta: { page: 2, pageSize: 50, totalItems: 100, totalPages: 2 },
        });
      }
      return Promise.resolve({
        data: mockTimelineEvents,
        meta: { page: 1, pageSize: 50, totalItems: 100, totalPages: 2 },
      });
    });

    await renderScreen(qc);

    expect(screen.getByText('Load older activity')).toBeTruthy();

    await fireEvent.press(screen.getByText('Load older activity'));

    await waitFor(() => {
      expect(screen.getByText('Moved to Offer')).toBeTruthy();
      expect(screen.getByText('Applied to Senior Product Designer')).toBeTruthy();
    });
  });
});
