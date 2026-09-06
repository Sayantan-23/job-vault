import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { apiClient } from '@/lib/api-client';
import type { CoverLetter } from '@/types/cover-letter';
import {
  useCoverLetters,
  useAllCoverLetters,
  useCoverLetter,
  useGenerateCoverLetter,
  useUpdateCoverLetter,
  useRefineCoverLetter,
  useDeleteCoverLetter,
} from './use-cover-letters';

const mockLetter: CoverLetter = {
  id: 'cl-1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  jobId: 'job-1',
  adhocJob: null,
  personaId: 'p-1',
  title: 'Full Stack Engineer Cover Letter',
  instructions: null,
  bodyMarkdown: 'Dear Hiring Team,\n\nI am thrilled to apply.',
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
    patch: jest.fn(),
    delete: jest.fn(),
    post: jest.fn(),
  },
}));

describe('use-cover-letters', () => {
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

  it('fetches all cover letters', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce([mockLetter]);

    const { result } = await renderHook(() => useAllCoverLetters(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockLetter]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/cover-letters');
  });

  it('fetches cover letters by job ID', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce([mockLetter]);

    const { result } = await renderHook(() => useCoverLetters('job-1'), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockLetter]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/cover-letters?jobId=job-1');
  });

  it('fetches single cover letter by ID', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockLetter);

    const { result } = await renderHook(() => useCoverLetter('cl-1'), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockLetter);
    expect(apiClient.get).toHaveBeenCalledWith('/api/cover-letters/cl-1');
  });

  it('generates a new cover letter', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockLetter);

    const { result } = await renderHook(() => useGenerateCoverLetter(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        personaId: 'p-1',
        jobId: 'job-1',
        instructions: 'Emphasize React experience',
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/cover-letters', {
      personaId: 'p-1',
      jobId: 'job-1',
      instructions: 'Emphasize React experience',
    });
  });

  it('updates a cover letter', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      ...mockLetter,
      title: 'Updated Title',
    });

    const { result } = await renderHook(() => useUpdateCoverLetter('cl-1'), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Updated Title' });
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/api/cover-letters/cl-1', {
      title: 'Updated Title',
    });
  });

  it('refines a cover letter', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      bodyMarkdown: 'Refined proposal text',
    });

    const { result } = await renderHook(() => useRefineCoverLetter('cl-1'), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      const res = await result.current.mutateAsync({ action: 'humanize' });
      expect(res.bodyMarkdown).toBe('Refined proposal text');
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/cover-letters/cl-1/refine', {
      action: 'humanize',
    });
  });

  it('deletes a cover letter', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = await renderHook(() => useDeleteCoverLetter(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('cl-1');
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/cover-letters/cl-1');
  });
});
