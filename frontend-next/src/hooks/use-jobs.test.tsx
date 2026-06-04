import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), getPage: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useJobs, useCreateJob, useScrapeJob, useUpdateJob, useDeleteJob } from './use-jobs'
import { JOBS_KEY, DASHBOARD_KANBAN_KEY, DASHBOARD_STATS_KEY } from '@/lib/query-keys'
import { DEFAULT_FILTERS } from '@/types/filters'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

// A wrapper that exposes a spy on the client's invalidateQueries so a test can
// assert which caches a mutation refreshes on success.
function spiedClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { Wrapper, invalidate }
}

beforeEach(() => vi.clearAllMocks())

describe('useJobs', () => {
  it('fetches the filtered page from /api/jobs and returns {data, meta}', async () => {
    api.getPage.mockResolvedValue({ data: [{ id: 'j1', title: 'SWE' }], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } })
    const { result } = renderHook(() => useJobs(DEFAULT_FILTERS), { wrapper })
    await waitFor(() => expect(result.current.data?.data[0]?.id).toBe('j1'))
    expect(api.getPage).toHaveBeenCalledWith('/api/jobs')
    expect(result.current.data?.meta.total).toBe(1)
  })

  it('appends the built query string for active filters', async () => {
    api.getPage.mockResolvedValue({ data: [], meta: { total: 0, page: 2, limit: 20, totalPages: 0 } })
    renderHook(() => useJobs({ ...DEFAULT_FILTERS, search: 'rust', page: 2 }), { wrapper })
    await waitFor(() => expect(api.getPage).toHaveBeenCalled())
    expect(api.getPage).toHaveBeenCalledWith('/api/jobs?search=rust&page=2')
  })
})

describe('useCreateJob', () => {
  it('posts to /api/jobs', async () => {
    api.post.mockResolvedValue({ id: 'j1' })
    const { result } = renderHook(() => useCreateJob(), { wrapper })
    result.current.mutate({ title: 'SWE', company: 'Acme' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/jobs', { title: 'SWE', company: 'Acme' })
  })
})

describe('useScrapeJob', () => {
  it('posts the URL to /api/jobs/scrape', async () => {
    api.post.mockResolvedValue({ title: 'T', company: 'C', snapshotMarkdown: '' })
    const { result } = renderHook(() => useScrapeJob(), { wrapper })
    result.current.mutate('https://x.com/j')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/jobs/scrape', { sourceUrl: 'https://x.com/j' })
  })
})

describe('useDeleteJob', () => {
  it('deletes /api/jobs/:id', async () => {
    api.delete.mockResolvedValue({ message: 'Job deleted successfully' })
    const { result } = renderHook(() => useDeleteJob(), { wrapper })
    result.current.mutate('j1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/jobs/j1')
  })
})

// The dashboard overview (stats) and the kanban board are separate queries from
// the jobs list, so every write must refresh all three or counts/board go stale.
describe('job mutations refresh the jobs, kanban and stats caches', () => {
  it('useCreateJob invalidates jobs + kanban + stats on success', async () => {
    api.post.mockResolvedValue({ id: 'j1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useCreateJob(), { wrapper: Wrapper })
    result.current.mutate({ title: 'SWE', company: 'Acme' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_KANBAN_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_STATS_KEY })
  })

  it('useUpdateJob invalidates jobs + kanban + stats on success', async () => {
    api.patch.mockResolvedValue({ id: 'j1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useUpdateJob('j1'), { wrapper: Wrapper })
    result.current.mutate({ title: 'SWE' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_KANBAN_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_STATS_KEY })
  })

  it('useDeleteJob invalidates jobs + kanban + stats on success', async () => {
    api.delete.mockResolvedValue({ message: 'ok' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useDeleteJob(), { wrapper: Wrapper })
    result.current.mutate('j1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_KANBAN_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_STATS_KEY })
  })
})
