import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as apiClientModule from '@/lib/api-client';
import type { TimelineEvent } from '@/types/timeline';

import { TimelineSection } from './timeline-section';

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  apiClient: { get: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

const apiClient = apiClientModule.apiClient as jest.Mocked<
  typeof apiClientModule.apiClient
>;

const event = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: 'e1',
  jobId: 'j1',
  userId: 'u1',
  type: 'AUTO',
  title: 'Status changed to Interviewing',
  description: null,
  createdAt: '2026-09-01T00:00:00Z',
  ...overrides,
});

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TimelineSection', () => {
  it('renders the loading state then the events', async () => {
    apiClient.get.mockResolvedValue([event()]);
    await render(<TimelineSection jobId="j1" />, { wrapper: Wrapper });
    expect(screen.getByText('Loading…')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Status changed to Interviewing')).toBeTruthy();
    });
    expect(apiClient.get).toHaveBeenCalledWith('/api/jobs/j1/timeline');
  });

  it('shows the empty state when there are no events', async () => {
    apiClient.get.mockResolvedValue([]);
    await render(<TimelineSection jobId="j1" />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByText('No activity yet.')).toBeTruthy(),
    );
  });

  it('renders the description when present', async () => {
    apiClient.get.mockResolvedValue([
      event({ description: 'Via the recruiter portal' }),
    ]);
    await render(<TimelineSection jobId="j1" />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByText('Via the recruiter portal')).toBeTruthy(),
    );
  });
});
