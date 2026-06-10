// frontend-next/src/hooks/use-profile.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ProfileContent } from '@/types/profile'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useProfile, useUpdateProfile } from './use-profile'

const api = vi.mocked(apiClient)
const CONTENT: ProfileContent = { basics: { name: 'Ada', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useProfile', () => {
  it('fetches GET /api/profile', async () => {
    api.get.mockResolvedValue(CONTENT)
    const { result } = renderHook(() => useProfile(), { wrapper })
    await waitFor(() => expect(result.current.data?.basics.name).toBe('Ada'))
    expect(api.get).toHaveBeenCalledWith('/api/profile')
  })
})

describe('useUpdateProfile', () => {
  it('PUTs { content }', async () => {
    api.put.mockResolvedValue(CONTENT)
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync(CONTENT)
    })
    expect(api.put).toHaveBeenCalledWith('/api/profile', { content: CONTENT })
  })
})
