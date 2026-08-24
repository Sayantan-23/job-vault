import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
import { apiClient } from '@/lib/api-client'
import { useCoverLetters, useAllCoverLetters, useGenerateCoverLetter, useUpdateCoverLetter, useDeleteCoverLetter, useRefineCoverLetter } from './use-cover-letters'
import { COVER_LETTERS_KEY } from '@/lib/query-keys'
import type { CoverLetter } from '@/types/cover-letter'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
function spied() {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(c, 'invalidateQueries')
  const W = ({ children }: { children: ReactNode }) => <QueryClientProvider client={c}>{children}</QueryClientProvider>
  return { W, invalidate }
}
beforeEach(() => vi.clearAllMocks())

describe('use-cover-letters', () => {
  it('lists by job', async () => {
    api.get.mockResolvedValue([{ id: 'cl1' }])
    const { result } = renderHook(() => useCoverLetters('j1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/cover-letters?jobId=j1')
  })
  it('lists the full library', async () => {
    api.get.mockResolvedValue([{ id: 'cl1' }, { id: 'cl2' }])
    const { result } = renderHook(() => useAllCoverLetters(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/cover-letters')
    expect(result.current.data).toHaveLength(2)
  })
  it('serves server-hydrated letters without an immediate refetch', () => {
    const letter: CoverLetter = {
      id: 'cl1', createdAt: '2026-06-12T00:00:00Z', updatedAt: '2026-06-12T00:00:00Z',
      userId: 'u1', jobId: null, adhocJob: { title: 'Staff Eng', company: 'Acme' },
      personaId: 'p1', title: 'Acme — cover letter', instructions: null, bodyMarkdown: 'Dear team,',
    }
    // What the server page ships: a dehydrated snapshot, hydrated on arrival.
    const server = new QueryClient()
    server.setQueryData(COVER_LETTERS_KEY, [letter])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
    hydrate(client, dehydrate(server))

    const { result } = renderHook(() => useAllCoverLetters(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    expect(result.current.data).toEqual([letter])
    expect(api.get).not.toHaveBeenCalled()
  })
  it('generate posts an adhoc job body verbatim', async () => {
    api.post.mockResolvedValue({ id: 'cl2' })
    const { result } = renderHook(() => useGenerateCoverLetter(), { wrapper })
    const body = { personaId: 'p1', job: { title: 'Staff Eng', company: 'Acme', description: 'JD text' } }
    result.current.mutate(body)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/cover-letters', body)
  })
  it('generate posts and invalidates', async () => {
    api.post.mockResolvedValue({ id: 'cl1' })
    const { W, invalidate } = spied()
    const { result } = renderHook(() => useGenerateCoverLetter(), { wrapper: W })
    result.current.mutate({ jobId: 'j1', personaId: 'p1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/cover-letters', { jobId: 'j1', personaId: 'p1' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: COVER_LETTERS_KEY })
  })
  it('update + delete by id', async () => {
    api.patch.mockResolvedValue({ id: 'cl1' }); api.delete.mockResolvedValue(undefined)
    const up = renderHook(() => useUpdateCoverLetter('cl1'), { wrapper })
    up.result.current.mutate({ bodyMarkdown: 'X' })
    await waitFor(() => expect(up.result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/cover-letters/cl1', { bodyMarkdown: 'X' })
    const del = renderHook(() => useDeleteCoverLetter(), { wrapper })
    del.result.current.mutate('cl1')
    await waitFor(() => expect(del.result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/cover-letters/cl1')
  })
  it('refine posts the action + instructions and resolves to bodyMarkdown', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'Refined letter.' })
    const { result } = renderHook(() => useRefineCoverLetter('cl1'), { wrapper })
    result.current.mutate({ action: 'custom', instructions: 'Make it punchier' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/cover-letters/cl1/refine', {
      action: 'custom',
      instructions: 'Make it punchier',
    })
    expect(result.current.data).toEqual({ bodyMarkdown: 'Refined letter.' })
  })
})
