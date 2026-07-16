import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from './use-contacts'
import { contactsKey, JOBS_KEY, DASHBOARD_KANBAN_KEY } from '@/lib/query-keys'

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

describe('useContacts', () => {
  it('fetches /api/jobs/:jobId/contacts', async () => {
    api.get.mockResolvedValue([{ id: 'c1', contact: 'Priya' }])
    const { result } = renderHook(() => useContacts('j1'), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.id).toBe('c1'))
    expect(api.get).toHaveBeenCalledWith('/api/jobs/j1/contacts')
  })
})

describe('useCreateContact', () => {
  it('posts and invalidates contacts + jobs + kanban', async () => {
    api.post.mockResolvedValue({ id: 'c1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useCreateContact('j1'), { wrapper: Wrapper })
    result.current.mutate({ contact: 'Priya', channel: 'EMAIL' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/contacts', { contact: 'Priya', channel: 'EMAIL' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: contactsKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_KANBAN_KEY })
  })
})

describe('useUpdateContact', () => {
  it('patches /api/contacts/:id and invalidates contacts + jobs + kanban', async () => {
    api.patch.mockResolvedValue({ id: 'c1', status: 'HEARD_BACK' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useUpdateContact('j1'), { wrapper: Wrapper })
    result.current.mutate({ id: 'c1', patch: { status: 'HEARD_BACK' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/contacts/c1', { status: 'HEARD_BACK' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: contactsKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_KANBAN_KEY })
  })
})

describe('useDeleteContact', () => {
  it('deletes /api/contacts/:id and invalidates contacts + jobs + kanban', async () => {
    api.delete.mockResolvedValue({ id: 'c1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useDeleteContact('j1'), { wrapper: Wrapper })
    result.current.mutate('c1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/contacts/c1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: contactsKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
  })
})
