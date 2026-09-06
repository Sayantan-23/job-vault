import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { apiClient } from '@/lib/api-client';
import type { GeneratedResume } from '@/types/resume';
import { useResumes, useResume, useDeleteResume } from './use-resumes';

const mockResume: GeneratedResume = {
  id: 'res-1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  personaId: 'p1',
  jobId: 'job-1',
  title: 'Senior Software Engineer',
  instructions: null,
  content: {
    basics: {
      name: 'Jordan Avery',
      links: [],
    },
    summary: 'Experienced developer.',
    experience: [],
    projects: [],
    skills: [],
    education: [],
  },
};

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  apiClient: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('use-resumes', () => {
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

  it('fetches all resumes', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce([mockResume]);

    const { result } = await renderHook(() => useResumes(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockResume]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/resumes');
  });

  it('fetches resumes by jobId', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce([mockResume]);

    const { result } = await renderHook(() => useResumes('job-1'), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockResume]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/resumes?jobId=job-1');
  });

  it('fetches single resume by id', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResume);

    const { result } = await renderHook(() => useResume('res-1'), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResume);
    expect(apiClient.get).toHaveBeenCalledWith('/api/resumes/res-1');
  });

  it('deletes a resume', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = await renderHook(() => useDeleteResume(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('res-1');
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/resumes/res-1');
  });
});
