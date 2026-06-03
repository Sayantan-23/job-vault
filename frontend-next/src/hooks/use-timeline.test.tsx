import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useTimeline, useAddTimelineEntry } from './use-timeline'
import {
  JOBS_KEY,
  jobKey,
  timelineKey,
  DASHBOARD_KANBAN_KEY,
  DASHBOARD_STATS_KEY,
} from '@/lib/query-keys'
import type { TimelineEvent } from '@/types/timeline'

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
  return { client, Wrapper, invalidate }
}

beforeEach(() => vi.clearAllMocks())

describe('useTimeline', () => {
  it('fetches a job\'s timeline from /api/jobs/:id/timeline', async () => {
    api.get.mockResolvedValue([{ id: 't1', type: 'AUTO', title: 'Job added to vault' }])
    const { result } = renderHook(() => useTimeline('j1'), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.id).toBe('t1'))
    expect(api.get).toHaveBeenCalledWith('/api/jobs/j1/timeline')
  })

  it('is disabled when jobId is null', () => {
    const { result } = renderHook(() => useTimeline(null), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(api.get).not.toHaveBeenCalled()
  })
})

describe('useAddTimelineEntry', () => {
  it('posts the entry to /api/jobs/:id/timeline', async () => {
    api.post.mockResolvedValue({ id: 't2', type: 'MANUAL', title: 'Called recruiter' })
    const { result } = renderHook(() => useAddTimelineEntry('j1'), { wrapper })
    result.current.mutate({ title: 'Called recruiter', description: 'vm' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/timeline', { title: 'Called recruiter', description: 'vm' })
  })

  it('optimistically prepends the entry to the cache before the request resolves', async () => {
    // Hold the POST open so we can observe the cache mid-flight (before settle).
    let resolvePost: (value: TimelineEvent) => void = () => {}
    api.post.mockImplementation(
      () =>
        new Promise<TimelineEvent>((resolve) => {
          resolvePost = resolve
        }),
    )
    const { client, Wrapper } = spiedClient()
    // Seed an existing event so we can assert the optimistic one lands in front.
    client.setQueryData<TimelineEvent[]>(timelineKey('j1'), [
      {
        id: 't-existing',
        jobId: 'j1',
        userId: 'u1',
        type: 'AUTO',
        title: 'Job added to vault',
        description: null,
        createdAt: '2026-06-03T11:00:00.000Z',
      },
    ])
    const { result } = renderHook(() => useAddTimelineEntry('j1'), { wrapper: Wrapper })
    result.current.mutate({ title: 'Called recruiter', description: 'vm' })

    await waitFor(() => {
      const cached = client.getQueryData<TimelineEvent[]>(timelineKey('j1'))
      expect(cached?.[0]?.title).toBe('Called recruiter')
      expect(cached?.[0]?.type).toBe('MANUAL')
      expect(cached?.[0]?.description).toBe('vm')
      expect(cached?.[1]?.id).toBe('t-existing')
    })

    resolvePost({ id: 't2', jobId: 'j1', userId: 'u1', type: 'MANUAL', title: 'Called recruiter', description: 'vm', createdAt: '2026-06-03T12:00:00.000Z' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('rolls the cache back to the snapshot on error', async () => {
    api.post.mockRejectedValue(new Error('boom'))
    const { client, Wrapper } = spiedClient()
    const previous: TimelineEvent[] = [
      {
        id: 't-existing',
        jobId: 'j1',
        userId: 'u1',
        type: 'AUTO',
        title: 'Job added to vault',
        description: null,
        createdAt: '2026-06-03T11:00:00.000Z',
      },
    ]
    client.setQueryData<TimelineEvent[]>(timelineKey('j1'), previous)
    const { result } = renderHook(() => useAddTimelineEntry('j1'), { wrapper: Wrapper })
    result.current.mutate({ title: 'Called recruiter' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData<TimelineEvent[]>(timelineKey('j1'))).toEqual(previous)
  })

  it('invalidates the timeline, the job, the jobs list, and the dashboard on success', async () => {
    api.post.mockResolvedValue({ id: 't2', jobId: 'j1', userId: 'u1', type: 'MANUAL', title: 'note', description: null, createdAt: '2026-06-03T12:00:00.000Z' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useAddTimelineEntry('j1'), { wrapper: Wrapper })
    result.current.mutate({ title: 'note' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: timelineKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: jobKey('j1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: JOBS_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_KANBAN_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DASHBOARD_STATS_KEY })
  })
})
