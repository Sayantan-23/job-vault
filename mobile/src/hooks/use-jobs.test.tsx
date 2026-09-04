import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import * as apiClientModule from '@/lib/api-client'
import { JOBS_KEY } from '@/lib/query-keys'
import type { Job } from '@/types/job'
import type { JobFilters } from '@/types/filters'

import { useInfiniteJobs, useUpdateJob } from './use-jobs'

// The full { data, meta } envelope that apiClient.getPage returns (it skips the
// unwrap, see api-client.ts:144). So the mock returns the envelope whole.
const page = (rows: Job[], page: number, totalPages: number) => ({
  data: rows,
  meta: { total: rows.length * totalPages, page, limit: 30, totalPages },
})

const job = (id: string): Job => ({
  id,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  title: `Job ${id}`,
  company: 'Acme',
  location: null,
  salaryRange: null,
  sourceUrl: null,
  snapshotMarkdown: null,
  status: 'APPLIED',
  kanbanOrder: 0,
  lastActivityAt: null,
  ghostDays: 0,
  notes: null,
})

const defaultFilters: Omit<JobFilters, 'page'> = {
  search: '',
  ghost: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc',
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  apiClient: {
    getPage: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    post: jest.fn(),
  },
  ApiError: class ApiError extends Error {},
}))

const apiClient = apiClientModule.apiClient as jest.Mocked<
  typeof apiClientModule.apiClient
>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useInfiniteJobs', () => {
  it('returns the first page flattened', async () => {
    apiClient.getPage.mockResolvedValue(page([job('j1'), job('j2')], 1, 1))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = await renderHook(() => useInfiniteJobs(defaultFilters), {
      wrapper: makeWrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].id).toBe('j1')
  })

  it('reports hasNextPage when totalPages > 1', async () => {
    apiClient.getPage.mockResolvedValue(page([job('j1')], 1, 2))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = await renderHook(() => useInfiniteJobs(defaultFilters), {
      wrapper: makeWrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
  })

  it('concatenates rows across pages on fetchNextPage', async () => {
    apiClient.getPage
      .mockResolvedValueOnce(page([job('j1')], 1, 2))
      .mockResolvedValueOnce(page([job('j2')], 2, 2))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = await renderHook(() => useInfiniteJobs(defaultFilters), {
      wrapper: makeWrapper(client),
    })

    // Await the fetch promise outside act, then let waitFor absorb the state
    // update — wrapping fetchNextPage in act under RN's async renderer leaves
    // the second page's commit stranded one tick ahead of act's flush.
    const next = result.current.fetchNextPage()
    await act(async () => {
      await next
    })

    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(result.current.data?.map((j: Job) => j.id)).toEqual(['j1', 'j2'])
  })
})

describe('useUpdateJob', () => {
  it('invalidates the JOBS_KEY on success', async () => {
    const updated = job('j1')
    updated.status = 'INTERVIEWING'
    apiClient.patch.mockResolvedValue(updated)

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = await renderHook(() => useUpdateJob('j1'), {
      wrapper: makeWrapper(client),
    })

    await act(() => result.current.mutateAsync({ status: 'INTERVIEWING' }))

    expect(apiClient.patch).toHaveBeenCalledWith('/api/jobs/j1', {
      status: 'INTERVIEWING',
    })
    // The JOBS_KEY prefix invalidation must fire (covers the infinite list).
    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey)
    expect(invalidatedKeys).toContainEqual(JOBS_KEY)
  })
})
