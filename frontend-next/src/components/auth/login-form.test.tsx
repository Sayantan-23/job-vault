import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// vi.mock is hoisted; a mutable hoisted holder lets each test set the mutation state.
const state = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false, error: null as Error | null }))
vi.mock('@/hooks/use-auth', () => ({
  useLogin: () => ({ mutate: state.mutate, isPending: state.isPending, error: state.error }),
}))

import { LoginForm } from './login-form'

beforeEach(() => {
  vi.clearAllMocks()
  state.isPending = false
  state.error = null
})

describe('LoginForm', () => {
  it('shows a validation error for an invalid email and does not submit', async () => {
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(state.mutate).not.toHaveBeenCalled()
  })

  it('submits valid credentials', async () => {
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() =>
      expect(state.mutate).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret' }),
    )
  })

  it('shows a server-error alert when the login mutation fails', () => {
    state.error = new Error('Invalid email or password')
    render(<LoginForm />)
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
  })
})
