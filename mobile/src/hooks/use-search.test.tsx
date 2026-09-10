import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as apiClientModule from '@/lib/api-client';
import type { SearchResult } from '@/types/search';
import { useSearch } from './use-search';

let qc: QueryClient;

function makeWrapper() {
  qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useSearch', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    qc?.clear();
  });

  it('stays disabled when term is shorter than 2 characters', async () => {
    const getSpy = jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue([]);

    const { result } = await renderHook(() => useSearch('a'), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('fetches search results when term is 2 or more characters', async () => {
    const mockResults: SearchResult[] = [
      {
        type: 'job',
        id: 'job-1',
        title: 'Software Engineer',
        subtitle: 'Acme',
        snippet: 'Looking for a engineer',
      },
    ];
    const getSpy = jest
      .spyOn(apiClientModule.apiClient, 'get')
      .mockResolvedValue(mockResults);

    const { result } = await renderHook(() => useSearch('software'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getSpy).toHaveBeenCalledWith('/api/search?q=software');
    expect(result.current.data).toEqual(mockResults);
    expect(result.current.settled).toBe(true);
  });

  it('reports settled: false during the debounce window when term changes', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue([]);

    const { result, rerender } = await renderHook(
      (props: { term: string }) => useSearch(props.term),
      {
        wrapper: makeWrapper(),
        initialProps: { term: 'react' },
      }
    );

    await waitFor(() => expect(result.current.settled).toBe(true));

    await rerender({ term: 'react native' });
    expect(result.current.settled).toBe(false);

    await waitFor(() => expect(result.current.settled).toBe(true));
  });

  it('trims whitespace and ignores pure trailing spaces', async () => {
    jest.spyOn(apiClientModule.apiClient, 'get').mockResolvedValue([]);

    const { result, rerender } = await renderHook(
      (props: { term: string }) => useSearch(props.term),
      {
        wrapper: makeWrapper(),
        initialProps: { term: 'design' },
      }
    );

    await waitFor(() => expect(result.current.settled).toBe(true));

    await rerender({ term: 'design ' });
    expect(result.current.settled).toBe(true);
  });
});
