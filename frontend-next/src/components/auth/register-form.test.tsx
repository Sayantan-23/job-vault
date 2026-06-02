import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const state = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false, error: null as Error | null }))
vi.mock('@/hooks/use-auth', () => ({
  useRegister: () => ({ mutate: state.mutate, isPending: state.isPending, error: state.error }),
}))

import { RegisterForm } from './register-form'

beforeEach(() => {
  vi.clearAllMocks()
  state.isPending = false
  state.error = null
})

describe('RegisterForm', () => {
  it('rejects a short password', async () => {
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Ada')
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/at least 8/i)).toBeInTheDocument()
    expect(state.mutate).not.toHaveBeenCalled()
  })

  it('submits a valid registration', async () => {
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Ada')
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() =>
      expect(state.mutate).toHaveBeenCalledWith({ name: 'Ada', email: 'a@b.co', password: 'longenough' }),
    )
  })

  it('shows a server-error alert when registration conflicts (409)', () => {
    state.error = new Error('Email already registered')
    render(<RegisterForm />)
    expect(screen.getByRole('alert')).toHaveTextContent('Email already registered')
  })
})
