import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, notificationsQueryOptions } from './use-notifications'
import { NOTIFICATIONS_KEY } from '@/lib/query-keys'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function spiedClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { Wrapper, invalidate }
}

beforeEach(() => vi.clearAllMocks())

describe('useNotifications', () => {
  it('fetches /api/notifications (whole list, no unreadOnly param)', async () => {
    api.get.mockResolvedValue([{ id: 'n1', message: 'hi', isRead: false }])
    const { result } = renderHook(() => useNotifications(), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.id).toBe('n1'))
    expect(api.get).toHaveBeenCalledWith('/api/notifications')
  })
})

describe('useMarkNotificationRead', () => {
  it('patches /api/notifications/:id/read and invalidates the list', async () => {
    api.patch.mockResolvedValue({ id: 'n1', isRead: true })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: Wrapper })
    result.current.mutate('n1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/notifications/n1/read')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTIFICATIONS_KEY })
  })
})

describe('useMarkAllNotificationsRead', () => {
  it('patches /api/notifications/read-all and invalidates the list', async () => {
    api.patch.mockResolvedValue({ updated: 3 })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: Wrapper })
    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/notifications/read-all')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTIFICATIONS_KEY })
  })
})

describe('useNotifications freshness', () => {
  it('uses a 30s staleTime and keeps focus refetch as a fallback', () => {
    const opts = notificationsQueryOptions()
    expect(opts.staleTime).toBe(30_000)
    expect(opts.refetchOnWindowFocus).toBe(true)
  })
})
