import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const state = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  error: null as Error | null,
  search: '',
}))
vi.mock('@/hooks/use-auth', () => ({
  useRegister: () => ({ mutate: state.mutate, isPending: state.isPending, error: state.error }),
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(state.search),
}))

import { RegisterForm } from './register-form'

beforeEach(() => {
  vi.clearAllMocks()
  state.isPending = false
  state.error = null
  state.search = ''
})

// "Password" and "Confirm password" both contain "password", so use exact labels.
async function fill(values: { name: string; email: string; password: string; confirm: string }) {
  await userEvent.type(screen.getByLabelText('Name'), values.name)
  await userEvent.type(screen.getByLabelText('Email'), values.email)
  await userEvent.type(screen.getByLabelText('Password'), values.password)
  await userEvent.type(screen.getByLabelText('Confirm password'), values.confirm)
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))
}

describe('RegisterForm', () => {
  it('rejects a short password', async () => {
    render(<RegisterForm />)
    await fill({ name: 'Ada', email: 'a@b.co', password: 'short', confirm: 'short' })
    expect(await screen.findByText(/at least 8/i)).toBeInTheDocument()
    expect(state.mutate).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords', async () => {
    render(<RegisterForm />)
    await fill({ name: 'Ada', email: 'a@b.co', password: 'longenough', confirm: 'different' })
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(state.mutate).not.toHaveBeenCalled()
  })

  it('submits a valid registration without the confirm field', async () => {
    render(<RegisterForm />)
    await fill({ name: 'Ada', email: 'a@b.co', password: 'longenough', confirm: 'longenough' })
    await waitFor(() =>
      expect(state.mutate).toHaveBeenCalledWith({
        name: 'Ada',
        email: 'a@b.co',
        password: 'longenough',
      }),
    )
  })

  it('shows a server-error alert when registration conflicts (409)', () => {
    state.error = new Error('Email already registered')
    render(<RegisterForm />)
    expect(screen.getByRole('alert')).toHaveTextContent('Email already registered')
  })

  it('carries a valid ?next= over to the sign-in link', () => {
    state.search = 'next=/app/personas'
    render(<RegisterForm />)
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login?next=%2Fapp%2Fpersonas',
    )
  })
})
