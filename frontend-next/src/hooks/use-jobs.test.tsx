import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useJobs, useCreateJob, useScrapeJob, useDeleteJob } from './use-jobs'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useJobs', () => {
  it('fetches the job list from /api/jobs', async () => {
    api.get.mockResolvedValue([{ id: 'j1', title: 'SWE' }])
    const { result } = renderHook(() => useJobs(), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.id).toBe('j1'))
    expect(api.get).toHaveBeenCalledWith('/api/jobs')
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
