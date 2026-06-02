import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('@/hooks/use-auth', () => ({ useRegister: () => ({ mutate, isPending: false, error: null }) }))

import { RegisterForm } from './register-form'

beforeEach(() => vi.clearAllMocks())

describe('RegisterForm', () => {
  it('rejects a short password', async () => {
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Ada')
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c')
    await userEvent.type(screen.getByLabelText(/password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/at least 8/i)).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits a valid registration', async () => {
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Ada')
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co')
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith({ name: 'Ada', email: 'a@b.co', password: 'longenough' }),
    )
  })
})
