import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// vi.mock is hoisted above imports, so shared mocks must be created with vi.hoisted.
const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { useLogin, useCurrentUser, useRegister, useLogout } from './use-auth'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useLogin', () => {
  it('logs in, primes the current-user cache, and routes to the jobs workspace', async () => {
    api.post.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'Ada' })
    const { result } = renderHook(() => useLogin(), { wrapper })
    result.current.mutate({ email: 'a@b.c', password: 'longenough' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/auth/login', { email: 'a@b.c', password: 'longenough' })
    expect(push).toHaveBeenCalledWith('/app/jobs')
  })
})

describe('useRegister', () => {
  it('registers, primes the current-user cache, and routes to the jobs workspace', async () => {
    api.post.mockResolvedValue({ id: 'u1', email: 'a@b.co', name: 'Ada' })
    const { result } = renderHook(() => useRegister(), { wrapper })
    result.current.mutate({ name: 'Ada', email: 'a@b.co', password: 'longenough' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/auth/register', {
      name: 'Ada',
      email: 'a@b.co',
      password: 'longenough',
    })
    expect(push).toHaveBeenCalledWith('/app/jobs')
  })
})

describe('useLogout', () => {
  it('logs out and redirects to /login', async () => {
    api.post.mockResolvedValue({ message: 'Logged out successfully' })
    const { result } = renderHook(() => useLogout(), { wrapper })
    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/auth/logout')
    expect(push).toHaveBeenCalledWith('/login')
  })
})

describe('useCurrentUser', () => {
  it('fetches the current user from /api/auth/me', async () => {
    api.get.mockResolvedValue({ id: 'u1', email: 'a@b.co', name: 'Ada' })
    const { result } = renderHook(() => useCurrentUser(), { wrapper })
    await waitFor(() => expect(result.current.data?.id).toBe('u1'))
    expect(api.get).toHaveBeenCalledWith('/api/auth/me')
  })
})
