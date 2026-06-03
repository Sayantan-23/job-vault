import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from './use-reminders'
import { remindersKey } from '@/lib/query-keys'

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

describe('useReminders', () => {
  it('fetches /api/jobs/:jobId/reminders', async () => {
    api.get.mockResolvedValue([{ id: 'r1', message: 'Ping' }])
    const { result } = renderHook(() => useReminders('j1'), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.id).toBe('r1'))
    expect(api.get).toHaveBeenCalledWith('/api/jobs/j1/reminders')
  })
})

describe('useCreateReminder', () => {
  it('posts to /api/jobs/:jobId/reminders and invalidates the list', async () => {
    api.post.mockResolvedValue({ id: 'r1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useCreateReminder('j1'), { wrapper: Wrapper })
    result.current.mutate({ message: 'Ping', remindAt: '2026-07-01T00:00:00Z' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/reminders', { message: 'Ping', remindAt: '2026-07-01T00:00:00Z' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: remindersKey('j1') })
  })
})

describe('useUpdateReminder', () => {
  it('patches /api/reminders/:id and invalidates the list', async () => {
    api.patch.mockResolvedValue({ id: 'r1', isCompleted: true })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useUpdateReminder('j1'), { wrapper: Wrapper })
    result.current.mutate({ id: 'r1', patch: { isCompleted: true } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/reminders/r1', { isCompleted: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: remindersKey('j1') })
  })
})

describe('useDeleteReminder', () => {
  it('deletes /api/reminders/:id and invalidates the list', async () => {
    api.delete.mockResolvedValue({ id: 'r1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useDeleteReminder('j1'), { wrapper: Wrapper })
    result.current.mutate('r1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/reminders/r1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: remindersKey('j1') })
  })
})
