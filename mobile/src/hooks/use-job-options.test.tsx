import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as apiClientModule from '@/lib/api-client';
import type { Job } from '@/types/job';
import { useJobOptions } from './use-job-options';

const mockJobs: Partial<Job>[] = [
  { id: 'j1', title: 'Senior Engineer', company: 'Acme Corp' },
  { id: 'j2', title: 'Tech Lead', company: 'Globex' },
];

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useJobOptions', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('maps fetched jobs to lightweight JobOption items', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue(mockJobs as Job[]);

    const { result } = await renderHook(() => useJobOptions(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: 'j1', title: 'Senior Engineer', company: 'Acme Corp' },
      { id: 'j2', title: 'Tech Lead', company: 'Globex' },
    ]);
  });
});
