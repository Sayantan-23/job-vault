import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DASHBOARD_STATS_KEY } from '@/lib/query-keys'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useKanban, useMoveJob, useStats } from './use-dashboard'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

// The freshness window is what made the board bug invisible in tests: with the
// default staleTime of 0 everything refetches, so the production 30s window has
// to be reproduced explicitly.
function productionClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
}

function clientWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

beforeEach(() => vi.clearAllMocks())

describe('useKanban', () => {
  it('fetches the board from /api/dashboard/kanban for default filters', async () => {
    api.get.mockResolvedValue({ columns: [], stats: { totalJobs: 0 } })
    const { result } = renderHook(() => useKanban({ search: '', ghost: 'all' }), { wrapper })
    await waitFor(() => expect(result.current.data?.stats.totalJobs).toBe(0))
    expect(api.get).toHaveBeenCalledWith('/api/dashboard/kanban')
  })

  it('appends search + ghostFilter when filtered', async () => {
    api.get.mockResolvedValue({ columns: [], stats: { totalJobs: 0 } })
    renderHook(() => useKanban({ search: 'acme', ghost: 'ghost' }), { wrapper })
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(api.get).toHaveBeenCalledWith('/api/dashboard/kanban?search=acme&ghostFilter=ghost')
  })

  it('fetches when the Board view switches it on, inside the freshness window', async () => {
    // Regression (Board view showed no jobs until a reload): the board was seeded
    // with an empty board as `initialData`, which counts as data fetched *now*.
    // Flipping enabled false -> true only refetches a query that is stale, so
    // within staleTime nothing was ever requested and the columns stayed empty.
    api.get.mockResolvedValue({ columns: [], stats: { totalJobs: 7 } })
    const { result, rerender } = renderHook(({ enabled }) => useKanban({ search: '', ghost: 'all' }, enabled), {
      wrapper: clientWrapper(productionClient()),
      initialProps: { enabled: false },
    })
    expect(api.get).not.toHaveBeenCalled() // List view: no board request

    rerender({ enabled: true }) // user clicks Board
    await waitFor(() => expect(result.current.data?.stats.totalJobs).toBe(7))
  })
})

describe('useMoveJob', () => {
  it('PATCHes /api/jobs/:id/move with status + kanbanOrder', async () => {
    api.patch.mockResolvedValue({ id: 'j1', status: 'OFFER', kanbanOrder: 3 })
    const { result } = renderHook(() => useMoveJob(), { wrapper })
    result.current.mutate({ id: 'j1', status: 'OFFER', kanbanOrder: 3 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/jobs/j1/move', { status: 'OFFER', kanbanOrder: 3 })
  })
})

describe('useStats', () => {
  it('serves server-hydrated stats synchronously, without a fetch', () => {
    const seed = {
      totalJobs: 4,
      byStatus: { WISHLIST: 0, APPLIED: 2, INTERVIEWING: 1, OFFER: 1, REJECTED: 0, ARCHIVED: 0 },
      ghostAlerts: 1,
      recentActivity: 0,
    }
    // Exactly what /app/jobs/page.tsx does: prefetch into a server-side client,
    // dehydrate it, hydrate it in the browser.
    const server = new QueryClient()
    server.setQueryData(DASHBOARD_STATS_KEY, seed)
    const client = productionClient()
    hydrate(client, dehydrate(server))

    const { result } = renderHook(() => useStats(), { wrapper: clientWrapper(client) })
    expect(result.current.data).toEqual(seed)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('fetches /api/dashboard/stats when nothing was hydrated', async () => {
    const fetched = {
      totalJobs: 9,
      byStatus: { WISHLIST: 0, APPLIED: 2, INTERVIEWING: 1, OFFER: 1, REJECTED: 0, ARCHIVED: 0 },
      ghostAlerts: 2,
      recentActivity: 0,
    }
    api.get.mockResolvedValue(fetched)
    const { result } = renderHook(() => useStats(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(fetched))
    expect(api.get).toHaveBeenCalledWith('/api/dashboard/stats')
  })
})
