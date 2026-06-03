import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReminderForm } from './reminder-form'

beforeEach(() => vi.clearAllMocks())

describe('ReminderForm', () => {
  it('submits the message + remindAt and clears the message', async () => {
    const onSubmit = vi.fn()
    render(<ReminderForm onSubmit={onSubmit} isPending={false} />)
    await userEvent.type(screen.getByLabelText(/reminder/i), 'Ping recruiter')
    const dt = screen.getByLabelText(/when/i)
    await userEvent.type(dt, '2026-07-01T09:00')
    await userEvent.click(screen.getByRole('button', { name: /add reminder/i }))
    expect(onSubmit).toHaveBeenCalledWith({ message: 'Ping recruiter', remindAt: new Date('2026-07-01T09:00').toISOString() })
  })

  it('does not submit an empty message', async () => {
    const onSubmit = vi.fn()
    render(<ReminderForm onSubmit={onSubmit} isPending={false} />)
    await userEvent.type(screen.getByLabelText(/when/i), '2026-07-01T09:00')
    await userEvent.click(screen.getByRole('button', { name: /add reminder/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
