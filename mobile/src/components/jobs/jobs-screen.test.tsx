import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import type { Job } from '@/types/job';
import type { KanbanBoardResponse } from '@/types/kanban';
import { JobsScreen } from './jobs-screen';

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};
jest.mock('@/lib/socket', () => ({
  __esModule: true,
  connectSocket: jest.fn(() => mockSocket),
  disconnectSocket: jest.fn(),
}));

const mockJobs: Job[] = [
  {
    id: 'j1',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    userId: 'u1',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    location: 'Remote',
    salaryRange: '$180k–$220k',
    sourceUrl: null,
    snapshotMarkdown: null,
    status: 'APPLIED',
    kanbanOrder: 0,
    lastActivityAt: null,
    ghostDays: 20,
    notes: null,
  },
];

const mockKanbanBoard: KanbanBoardResponse = {
  columns: [
    {
      status: 'APPLIED',
      jobs: [
        {
          id: 'j1',
          title: 'Senior Frontend Engineer',
          company: 'Stripe',
          location: 'Remote',
          ghostDays: 20,
          status: 'APPLIED',
          kanbanOrder: 0,
          lastActivityAt: null,
          createdAt: '2026-09-01T00:00:00Z',
        },
      ],
    },
  ],
  stats: {
    totalJobs: 1,
    byStatus: {
      WISHLIST: 0,
      APPLIED: 1,
      INTERVIEWING: 0,
      OFFER: 0,
      REJECTED: 0,
      ARCHIVED: 0,
    },
    ghostAlerts: 1,
    recentActivity: 0,
  },
};

const mockUseInfiniteJobs = jest.fn();
const mockUseKanban = jest.fn();

jest.mock('@/hooks/use-jobs', () => ({
  __esModule: true,
  useInfiniteJobs: () => mockUseInfiniteJobs(),
  useUpdateJob: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateJob: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/use-kanban', () => ({
  __esModule: true,
  useKanban: () => mockUseKanban(),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{withSafeArea(children)}</QueryClientProvider>;
}

describe('JobsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInfiniteJobs.mockReturnValue({
      data: mockJobs,
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });
    mockUseKanban.mockReturnValue({
      data: mockKanbanBoard,
      isLoading: false,
    });
  });

  it('renders in list view with title and SpeedDial FAB without view switch button', async () => {
    await render(<JobsScreen />, { wrapper: Wrapper });

    expect(screen.getByText('Jobs')).toBeTruthy();
    expect(screen.queryByLabelText('Switch to Kanban view')).toBeNull();
    expect(screen.getByText('Senior Frontend Engineer')).toBeTruthy();
    expect(screen.getByLabelText('Job actions')).toBeTruthy();
  });

  it('opens SpeedDial options and triggers Add Job sheet', async () => {
    await render(<JobsScreen />, { wrapper: Wrapper });

    // Open SpeedDial
    await fireEvent.press(screen.getByLabelText('Job actions'));

    expect(screen.getByText('Add job')).toBeTruthy();
    expect(screen.getByText('Filter jobs')).toBeTruthy();

    // Press Add Job
    await fireEvent.press(screen.getByLabelText('Add job'));

    // New job sheet opens
    expect(screen.getByText('New job')).toBeTruthy();
  });

  it('opens SpeedDial options and triggers Filter sheet', async () => {
    await render(<JobsScreen />, { wrapper: Wrapper });

    await fireEvent.press(screen.getByLabelText('Job actions'));
    await fireEvent.press(screen.getByLabelText('Filter jobs'));

    expect(screen.getByText('Filter jobs')).toBeTruthy();
  });
});
