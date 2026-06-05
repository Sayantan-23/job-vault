import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))
import { apiClient } from '@/lib/api-client'
import { useResumes, useGenerateResume, useUpdateResume, useDeleteResume } from './use-resumes'
import { RESUMES_KEY } from '@/lib/query-keys'

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

describe('use-resumes', () => {
  it('lists (optionally by job)', async () => {
    api.get.mockResolvedValue([{ id: 'res1' }])
    const { result } = renderHook(() => useResumes('job1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/resumes?jobId=job1')
  })
  it('generate posts and invalidates', async () => {
    api.post.mockResolvedValue({ id: 'res1' })
    const { W, invalidate } = spied()
    const { result } = renderHook(() => useGenerateResume(), { wrapper: W })
    result.current.mutate({ personaId: 'p1' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/resumes', { personaId: 'p1' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: RESUMES_KEY })
  })
  it('update patches by id', async () => {
    api.patch.mockResolvedValue({ id: 'res1' })
    const { result } = renderHook(() => useUpdateResume('res1'), { wrapper })
    result.current.mutate({ title: 'X' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/resumes/res1', { title: 'X' })
  })
  it('delete by id', async () => {
    api.delete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteResume(), { wrapper })
    result.current.mutate('res1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/resumes/res1')
  })
})
