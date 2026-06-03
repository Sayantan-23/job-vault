import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Reminder } from '@/types/reminder'
import { ReminderItem } from './reminder-item'

function fake(over: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r1', jobId: 'j1', userId: 'u1', message: 'Ping recruiter',
    remindAt: new Date('2099-01-01T00:00:00Z').toISOString(), isCompleted: false,
    createdAt: new Date().toISOString(), ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('ReminderItem', () => {
  it('renders the message', () => {
    render(<ReminderItem reminder={fake()} onToggleComplete={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Ping recruiter')).toBeInTheDocument()
  })

  it('marks overdue past-due, not-completed reminders', () => {
    render(<ReminderItem reminder={fake({ remindAt: new Date('2000-01-01T00:00:00Z').toISOString() })} onToggleComplete={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('reminder-item')).toHaveAttribute('data-overdue', 'true')
  })

  it('calls onToggleComplete and onDelete', async () => {
    const onToggleComplete = vi.fn()
    const onDelete = vi.fn()
    const reminder = fake()
    render(<ReminderItem reminder={reminder} onToggleComplete={onToggleComplete} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /complete/i }))
    expect(onToggleComplete).toHaveBeenCalledWith(reminder)
    await userEvent.click(screen.getByRole('button', { name: /delete reminder/i }))
    expect(onDelete).toHaveBeenCalledWith('r1')
  })
})
