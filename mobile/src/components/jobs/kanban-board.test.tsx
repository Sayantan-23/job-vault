import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import type { KanbanBoardResponse } from '@/types/kanban';
import { KanbanBoard } from './kanban-board';

const mockUseKanban = jest.fn();

jest.mock('@/hooks/use-kanban', () => ({
  __esModule: true,
  useKanban: (filters?: any) => mockUseKanban(filters),
}));

const mockBoardData: KanbanBoardResponse = {
  columns: [
    {
      status: 'WISHLIST',
      jobs: [
        {
          id: 'k1',
          title: 'Staff Frontend Engineer',
          company: 'Stripe',
          location: 'Remote',
          ghostDays: 2,
          status: 'WISHLIST',
          kanbanOrder: 0,
          lastActivityAt: null,
          createdAt: '2026-09-01T00:00:00Z',
          outreachCount: 1,
          outreachReplies: 0,
        },
      ],
    },
    {
      status: 'APPLIED',
      jobs: [
        {
          id: 'k2',
          title: 'Product Engineer',
          company: 'Linear',
          location: 'Remote',
          ghostDays: 5,
          status: 'APPLIED',
          kanbanOrder: 1,
          lastActivityAt: null,
          createdAt: '2026-09-02T00:00:00Z',
          outreachCount: 0,
          outreachReplies: 0,
        },
      ],
    },
    {
      status: 'INTERVIEWING',
      jobs: [],
    },
  ],
  stats: {
    totalJobs: 2,
    byStatus: {
      WISHLIST: 1,
      APPLIED: 1,
      INTERVIEWING: 0,
      OFFER: 0,
      REJECTED: 0,
      ARCHIVED: 0,
    },
    ghostAlerts: 0,
    recentActivity: 2,
  },
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{withSafeArea(children)}</QueryClientProvider>;
}

describe('KanbanBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton when loading', async () => {
    mockUseKanban.mockReturnValue({ data: undefined, isLoading: true });
    await render(<KanbanBoard />, { wrapper: Wrapper });

    expect(screen.queryByText('Staff Frontend Engineer')).toBeNull();
  });

  it('renders columns and cards when loaded', async () => {
    mockUseKanban.mockReturnValue({ data: mockBoardData, isLoading: false });
    await render(<KanbanBoard />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getAllByText('Wishlist').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Applied').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Staff Frontend Engineer')).toBeTruthy();
      expect(screen.getByText('Product Engineer')).toBeTruthy();
      expect(screen.getByText('No jobs in stage')).toBeTruthy();
    });
  });
});
