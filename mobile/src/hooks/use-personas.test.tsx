import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { apiClient } from '@/lib/api-client';
import type { Persona } from '@/types/persona';
import {
  usePersonas,
  usePersona,
  useCreatePersona,
  useUpdatePersona,
  useDeletePersona,
} from './use-personas';

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const mockPersona: Persona = {
  id: 'pers-1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'user-1',
  name: 'Senior Frontend Engineer',
  data: {
    basics: { name: 'Ada Lovelace', links: [] },
    summary: 'Expert in modern web & mobile architectures',
    experience: [],
    projects: [],
    skills: [],
    education: [],
  },
  rawInput: null,
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('use-personas hooks', () => {
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

  it('usePersonas fetches GET /api/personas', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce([mockPersona]);

    const { result } = await renderHook(() => usePersonas(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Senior Frontend Engineer');
    expect(apiClient.get).toHaveBeenCalledWith('/api/personas');
  });

  it('usePersona fetches GET /api/personas/:id', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockPersona);

    const { result } = await renderHook(() => usePersona('pers-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('pers-1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/personas/pers-1');
  });

  it('useCreatePersona calls POST /api/personas and invalidates cache', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockPersona);

    const { result } = await renderHook(() => useCreatePersona(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        name: 'Senior Frontend Engineer',
        data: mockPersona.data,
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/personas', {
      name: 'Senior Frontend Engineer',
      data: mockPersona.data,
    });
  });

  it('useUpdatePersona calls PATCH /api/personas/:id', async () => {
    const updated = { ...mockPersona, name: 'Lead Frontend Engineer' };
    (apiClient.patch as jest.Mock).mockResolvedValueOnce(updated);

    const { result } = await renderHook(() => useUpdatePersona('pers-1'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Lead Frontend Engineer' });
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/api/personas/pers-1', {
      name: 'Lead Frontend Engineer',
    });
  });

  it('useDeletePersona calls DELETE /api/personas/:id', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = await renderHook(() => useDeletePersona(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('pers-1');
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/personas/pers-1');
  });
});
