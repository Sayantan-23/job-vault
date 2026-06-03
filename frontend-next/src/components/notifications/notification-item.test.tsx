import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Notification } from '@/types/notification'
import { NotificationItem } from './notification-item'

function fake(over: Partial<Notification> = {}): Notification {
  return {
    id: 'n1', userId: 'u1', message: 'Ping recruiter', type: 'REMINDER',
    isRead: false, relatedJobId: 'j1', createdAt: new Date().toISOString(), ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('NotificationItem', () => {
  it('renders the message', () => {
    render(<NotificationItem notification={fake()} onSelect={vi.fn()} />)
    expect(screen.getByText('Ping recruiter')).toBeInTheDocument()
  })

  it('calls onSelect with the notification when clicked', async () => {
    const onSelect = vi.fn()
    const n = fake()
    render(<NotificationItem notification={n} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(n)
  })

  it('marks unread visually via the data attribute', () => {
    render(<NotificationItem notification={fake({ isRead: false })} onSelect={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('data-unread', 'true')
  })
})
