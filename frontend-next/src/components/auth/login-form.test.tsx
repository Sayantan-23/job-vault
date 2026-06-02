import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// vi.mock is hoisted; create the shared mock with vi.hoisted so the factory can use it.
const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('@/hooks/use-auth', () => ({ useLogin: () => ({ mutate, isPending: false, error: null }) }))

import { LoginForm } from './login-form'

beforeEach(() => vi.clearAllMocks())

describe('LoginForm', () => {
  it('shows a validation error for an invalid email and does not submit', async () => {
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits valid credentials', async () => {
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret' }))
  })
})
