import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({ apiClient: { post: vi.fn() }, ApiError: class extends Error {} }))
import { apiClient } from '@/lib/api-client'
import { InlineAuthForm } from './inline-auth-form'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('InlineAuthForm', () => {
  it('logs in and calls onAuthenticated', async () => {
    api.post.mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A' })
    const onAuthenticated = vi.fn()
    render(<InlineAuthForm onAuthenticated={onAuthenticated} />, { wrapper })
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled())
    expect(api.post).toHaveBeenCalledWith('/api/auth/login', { email: 'a@b.co', password: 'secret' })
  })

  it('switches to the register pane', async () => {
    render(<InlineAuthForm onAuthenticated={() => {}} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })
})
