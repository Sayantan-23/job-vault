import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { apiClient } from '@/lib/api-client';
import type { ProfileContent } from '@/types/profile';
import { useProfile, useUpdateProfile } from './use-profile';

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const mockProfile: ProfileContent = {
  basics: { name: 'Ada Lovelace', links: [] },
  summary: 'Pioneer of computing',
  experience: [],
  projects: [],
  skills: [],
  education: [],
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('use-profile hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('useProfile fetches GET /api/profile', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockProfile);

    const { result } = await renderHook(() => useProfile(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.basics.name).toBe('Ada Lovelace');
    expect(apiClient.get).toHaveBeenCalledWith('/api/profile');
  });

  it('useUpdateProfile calls PUT /api/profile with content payload and updates cache', async () => {
    const updated = { ...mockProfile, summary: 'Updated summary' };
    (apiClient.put as jest.Mock).mockResolvedValueOnce(updated);

    const { result } = await renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(queryClient),
    });

    let res: ProfileContent | undefined;
    await act(async () => {
      res = await result.current.mutateAsync(updated);
    });

    expect(apiClient.put).toHaveBeenCalledWith('/api/profile', { content: updated });
    expect(res?.summary).toBe('Updated summary');
  });
});
