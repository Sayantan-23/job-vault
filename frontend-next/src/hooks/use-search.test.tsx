import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))
import { apiClient } from '@/lib/api-client'
import { useSearch } from './use-search'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('use-search', () => {
  // The debounce means `data` always belongs to an *older* term than the one on
  // screen. `settled` is the only honest way for a caller to know the two agree —
  // without it the palette reports "no matches" for a term it never searched.
  it('reports unsettled from the keystroke until the debounced term is the live one', async () => {
    api.get.mockResolvedValue([])
    const { result, rerender } = renderHook(({ term }) => useSearch(term), {
      wrapper,
      initialProps: { term: 'reac' },
    })
    await waitFor(() => expect(result.current.settled).toBe(true))
    expect(api.get).toHaveBeenLastCalledWith('/api/search?q=reac')

    rerender({ term: 'react' })
    expect(result.current.settled).toBe(false)

    await waitFor(() => expect(result.current.settled).toBe(true))
    expect(api.get).toHaveBeenLastCalledWith('/api/search?q=react')
  })

  it('settles on the trimmed term, so trailing whitespace is not a new search', async () => {
    api.get.mockResolvedValue([])
    const { result, rerender } = renderHook(({ term }) => useSearch(term), {
      wrapper,
      initialProps: { term: 'react' },
    })
    await waitFor(() => expect(result.current.settled).toBe(true))

    rerender({ term: 'react ' })

    expect(result.current.settled).toBe(true)
  })
})
