import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ConnectedApp } from '@/types/extension'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {},
}))
import { apiClient } from '@/lib/api-client'
import { ConnectedAppsSection } from './connected-apps-section'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
const APP: ConnectedApp = {
  id: 'k1',
  name: 'Chrome Extension',
  keyPrefix: 'jv_1a2b3c4d',
  lastUsedAt: null,
  createdAt: '2026-06-20T00:00:00.000Z',
}
const RAW = `jv_${'a'.repeat(48)}`

beforeEach(() => vi.clearAllMocks())

describe('ConnectedAppsSection', () => {
  it('lists connected apps with prefix and last-used', async () => {
    api.get.mockResolvedValue([APP])
    render(<ConnectedAppsSection />, { wrapper })
    expect(await screen.findByText('Chrome Extension')).toBeInTheDocument()
    expect(screen.getByText(/jv_1a2b3c4d/)).toBeInTheDocument()
    expect(screen.getByText(/Never used/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no keys', async () => {
    api.get.mockResolvedValue([])
    render(<ConnectedAppsSection />, { wrapper })
    expect(await screen.findByText(/No extensions connected yet/)).toBeInTheDocument()
  })

  it('reveals the raw key once after generating, then hides it on Done', async () => {
    api.get.mockResolvedValue([])
    api.post.mockResolvedValue({ ...APP, rawKey: RAW })
    render(<ConnectedAppsSection />, { wrapper })
    await screen.findByText(/No extensions connected yet/)
    await userEvent.click(screen.getByRole('button', { name: /Generate a key manually/i }))
    expect(await screen.findByText(RAW)).toBeInTheDocument()
    expect(screen.getByText(/see it again/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Done$/ }))
    await waitFor(() => expect(screen.queryByText(RAW)).not.toBeInTheDocument())
  })

  it('asks for confirmation before revoking', async () => {
    api.get.mockResolvedValue([APP])
    render(<ConnectedAppsSection />, { wrapper })
    await screen.findByText('Chrome Extension')
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(await screen.findByText(/must reconnect/)).toBeInTheDocument()
  })
})
