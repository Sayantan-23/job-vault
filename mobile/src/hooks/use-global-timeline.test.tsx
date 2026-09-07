import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as apiClientModule from '@/lib/api-client';

import { useGlobalTimeline } from './use-global-timeline';

const mockPage = {
  data: [
    {
      id: 't1',
      jobId: 'j1',
      userId: 'u1',
      type: 'AUTO' as const,
      title: 'Status changed to Interviewing',
      description: 'Scheduled on Google Meet',
      createdAt: '2026-09-06T12:00:00Z',
      jobTitle: 'Senior Frontend Engineer',
      jobCompany: 'Stripe',
    },
  ],
  meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
};

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useGlobalTimeline', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.restoreAllMocks();
  });

  it('fetches timeline events with pagination envelope', async () => {
    jest.spyOn(apiClientModule.apiClient, 'getPage').mockResolvedValueOnce(mockPage);

    const { result } = await renderHook(() => useGlobalTimeline(1), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPage);
    expect(apiClientModule.apiClient.getPage).toHaveBeenCalledWith('/api/timeline?page=1&limit=50');
  });
});
