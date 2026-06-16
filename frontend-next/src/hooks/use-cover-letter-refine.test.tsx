import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useCoverLetterRefine } from './use-cover-letter-refine'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useCoverLetterRefine', () => {
  it('run() stages a candidate and posts the action; keep() applies it and exposes undo', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'A polished rewrite.' })
    const onApply = vi.fn()
    const { result } = renderHook(() => useCoverLetterRefine('cl1', 'Original body', onApply), { wrapper })

    act(() => result.current.run('humanize'))
    await waitFor(() => expect(result.current.staged).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/cover-letters/cl1/refine', { action: 'humanize' })
    expect(result.current.candidate).toBe('A polished rewrite.')

    act(() => result.current.keep())
    expect(onApply).toHaveBeenCalledWith('A polished rewrite.')
    expect(result.current.staged).toBe(false)
    expect(result.current.undoBody).toBe('Original body')

    act(() => result.current.undo())
    expect(onApply).toHaveBeenLastCalledWith('Original body')
  })

  it('run() forwards trimmed custom instructions; discard() clears the candidate', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'x' })
    const { result } = renderHook(() => useCoverLetterRefine('cl1', 'b', vi.fn()), { wrapper })
    act(() => result.current.run('custom', '  make it warmer  '))
    await waitFor(() => expect(result.current.staged).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/cover-letters/cl1/refine', { action: 'custom', instructions: 'make it warmer' })
    act(() => result.current.discard())
    expect(result.current.staged).toBe(false)
  })

  it('bumps proposalSeq on each fresh candidate (so the proposal pane remounts)', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'one' })
    const { result } = renderHook(() => useCoverLetterRefine('cl1', 'b', vi.fn()), { wrapper })
    act(() => result.current.run('shorten'))
    await waitFor(() => expect(result.current.staged).toBe(true))
    const first = result.current.proposalSeq
    act(() => result.current.tryAgain())
    await waitFor(() => expect(result.current.proposalSeq).toBeGreaterThan(first))
  })
})
