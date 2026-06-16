import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { getPage: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useGlobalTimeline, TIMELINE_PAGE_SIZE } from './use-global-timeline'
import type { Paginated } from '@/types/filters'
import type { GlobalTimelineEvent } from '@/types/timeline'

const api = vi.mocked(apiClient)

function seedPage(id: string): Paginated<GlobalTimelineEvent> {
  return {
    data: [
      { id, jobId: 'j1', userId: 'u1', type: 'AUTO', title: 'seed', description: null,
        createdAt: '2026-06-16T10:00:00.000Z', jobTitle: 'SWE', jobCompany: 'Acme' },
    ],
    meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
  }
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useGlobalTimeline', () => {
  it('fetches /api/timeline with the requested page and the page size', async () => {
    api.getPage.mockResolvedValue({ data: [{ id: 't1' }], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } })
    const { result } = renderHook(() => useGlobalTimeline(2), { wrapper })
    await waitFor(() => expect(result.current.data?.data?.[0]?.id).toBe('t1'))
    expect(api.getPage).toHaveBeenCalledWith(`/api/timeline?page=2&limit=${TIMELINE_PAGE_SIZE}`)
  })

  it('uses server-provided initialData for page 1 (no flash of empty)', () => {
    const { result } = renderHook(() => useGlobalTimeline(1, seedPage('seed')), { wrapper })
    // initialData is present synchronously on first render
    expect(result.current.data?.data?.[0]?.id).toBe('seed')
  })
})
