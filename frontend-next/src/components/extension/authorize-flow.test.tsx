import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const h = vi.hoisted(() => ({ params: new URLSearchParams() }))
vi.mock('next/navigation', () => ({ useSearchParams: () => h.params }))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {},
}))
// Keep the real allowlist/builder; stub only the navigation (jsdom can't spy on
// window.location.assign).
vi.mock('@/lib/extension-authorize', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/extension-authorize')>()
  return { ...actual, redirectToExtension: vi.fn() }
})

import { apiClient } from '@/lib/api-client'
import { redirectToExtension } from '@/lib/extension-authorize'
import { AuthorizeFlow } from './authorize-flow'

const api = vi.mocked(apiClient)
const redirect = vi.mocked(redirectToExtension)
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
const VALID = 'https://abcdefghij.chromiumapp.org/'
function setParams(obj: Record<string, string>) {
  h.params = new URLSearchParams(obj)
}

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.clearAllMocks()
  setParams({ redirect_uri: VALID, state: 'nonce' })
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

function meReturns(status: number, body?: unknown) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })
}

describe('AuthorizeFlow', () => {
  it('rejects an untrusted redirect_uri', async () => {
    setParams({ redirect_uri: 'https://evil.com/' })
    meReturns(200, { data: { id: 'u1', email: 'a@b.c', name: 'A' } })
    render(<AuthorizeFlow />, { wrapper })
    expect(await screen.findByText(/Invalid authorization link/)).toBeInTheDocument()
  })

  it('shows the inline auth form when logged out', async () => {
    meReturns(401)
    render(<AuthorizeFlow />, { wrapper })
    expect(await screen.findByText(/Sign in to connect/)).toBeInTheDocument()
  })

  it('mints a key and redirects to the extension when logged in', async () => {
    meReturns(200, { data: { id: 'u1', email: 'a@b.c', name: 'A' } })
    api.post.mockResolvedValue({
      id: 'k1',
      rawKey: 'jv_secret',
      name: 'Chrome Extension',
      keyPrefix: 'jv_secret0',
      lastUsedAt: null,
      createdAt: '',
    })
    render(<AuthorizeFlow />, { wrapper })
    await userEvent.click(await screen.findByRole('button', { name: 'Connect' }))
    await waitFor(() => expect(redirect).toHaveBeenCalledWith(VALID, 'jv_secret', 'nonce'))
    expect(api.post).toHaveBeenCalledWith('/api/api-keys', { name: 'Chrome Extension' })
  })
})
