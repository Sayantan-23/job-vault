import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useOptionalCurrentUser } from './use-auth'

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}

const USER = { id: 'u1', email: 'a@b.co', name: 'A' }
function res(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }
}

let fetchMock: ReturnType<typeof vi.fn>
let meCalls = 0
beforeEach(() => {
  meCalls = 0
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('useOptionalCurrentUser', () => {
  it('returns the user when /me is 200 (no refresh)', async () => {
    fetchMock.mockResolvedValue(res(200, { data: USER }))
    const { result } = renderHook(() => useOptionalCurrentUser(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(USER)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('recovers a refreshable session: 401 on /me → refresh → /me 200', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/auth/refresh')) return Promise.resolve(res(200, {}))
      meCalls += 1
      return Promise.resolve(meCalls === 1 ? res(401) : res(200, { data: USER }))
    })
    const { result } = renderHook(() => useOptionalCurrentUser(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(USER)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/refresh', expect.objectContaining({ method: 'POST' }))
  })

  it('returns null when /me and refresh both fail (genuinely logged out)', async () => {
    fetchMock.mockResolvedValue(res(401))
    const { result } = renderHook(() => useOptionalCurrentUser(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})
