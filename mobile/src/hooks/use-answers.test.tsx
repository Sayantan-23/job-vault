import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { apiClient } from '@/lib/api-client';
import { ANSWERS_KEY } from '@/lib/query-keys';
import type { Answer } from '@/types/answer';

import {
  useAnswers,
  useCreateAnswer,
  useUpdateAnswer,
  useDeleteAnswer,
  useMarkAnswerUsed,
  useGenerateAnswer,
} from './use-answers';

const mockAnswer: Answer = {
  id: 'a-1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  question: 'Why do you want to work here?',
  answerShort: 'I love your product.',
  answerLong: 'I have used your product for years and admire your team culture.',
  lastUsedAt: null,
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
  ApiError: class ApiError extends Error {},
}));

describe('use-answers', () => {
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

  it('fetches answers list', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce([mockAnswer]);

    const { result } = await renderHook(() => useAnswers(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockAnswer]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/answers');
  });

  it('creates an answer and invalidates ANSWERS_KEY', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockAnswer);

    const { result } = await renderHook(() => useCreateAnswer(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        question: 'Why?',
        answerShort: 'Because.',
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/answers', {
      question: 'Why?',
      answerShort: 'Because.',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ANSWERS_KEY });
  });

  it('updates an answer and invalidates ANSWERS_KEY', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({ ...mockAnswer, answerShort: 'New short' });

    const { result } = await renderHook(() => useUpdateAnswer('a-1'), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ answerShort: 'New short' });
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/api/answers/a-1', { answerShort: 'New short' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ANSWERS_KEY });
  });

  it('deletes an answer and invalidates ANSWERS_KEY', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    (apiClient.delete as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = await renderHook(() => useDeleteAnswer(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('a-1');
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/answers/a-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ANSWERS_KEY });
  });

  it('marks an answer as used without invalidating the query cache', async () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ id: 'a-1', lastUsedAt: '2026-09-05T00:00:00Z' });

    const { result } = await renderHook(() => useMarkAnswerUsed(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('a-1');
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/answers/a-1/used', {});
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('generates an answer draft', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ short: 'S draft', long: 'L draft' });

    const { result } = await renderHook(() => useGenerateAnswer(), {
      wrapper: makeWrapper(queryClient),
    });

    let draft;
    await act(async () => {
      draft = await result.current.mutateAsync({
        question: 'Why?',
        personaId: 'p-1',
        jobId: 'j-1',
      });
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/answers/generate', {
      question: 'Why?',
      personaId: 'p-1',
      jobId: 'j-1',
    });
    expect(draft).toEqual({ short: 'S draft', long: 'L draft' });
  });
});
