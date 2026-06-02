import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useKanban, useMoveJob } from './use-dashboard'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useKanban', () => {
  it('fetches the board from /api/dashboard/kanban', async () => {
    api.get.mockResolvedValue({ columns: [], stats: { totalJobs: 0 } })
    const { result } = renderHook(() => useKanban(), { wrapper })
    await waitFor(() => expect(result.current.data?.stats.totalJobs).toBe(0))
    expect(api.get).toHaveBeenCalledWith('/api/dashboard/kanban')
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
