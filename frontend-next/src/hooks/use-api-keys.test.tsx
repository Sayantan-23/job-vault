import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {},
}))
import { apiClient } from '@/lib/api-client'
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from './use-api-keys'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('use-api-keys', () => {
  it('lists keys', async () => {
    api.get.mockResolvedValue([{ id: 'k1' }])
    const { result } = renderHook(() => useApiKeys(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/api-keys')
  })
  it('creates a key by name', async () => {
    api.post.mockResolvedValue({ id: 'k1', rawKey: 'jv_x' })
    const { result } = renderHook(() => useCreateApiKey(), { wrapper })
    result.current.mutate('Chrome')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/api-keys', { name: 'Chrome' })
  })
  it('revokes a key by id', async () => {
    api.delete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useRevokeApiKey(), { wrapper })
    result.current.mutate('k1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/api-keys/k1')
  })
})
