import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { NOTIFICATIONS_KEY } from '@/lib/query-keys'
import type { Notification } from '@/types/notification'
import { NotificationBell } from './notification-bell'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

function fake(over: Partial<Notification> = {}): Notification {
  return {
    id: 'n1', userId: 'u1', message: 'Ping recruiter', type: 'REMINDER',
    isRead: false, relatedJobId: 'j1', createdAt: new Date().toISOString(), ...over,
  }
}

// Seed the cache so the (fresh, 30s staleTime) query never hits the network and
// the unread derivation is deterministic — the panel itself opens via Radix
// popper, which jsdom can't position, so we assert the closed-state trigger only.
function renderBell(seed: Notification[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(NOTIFICATIONS_KEY, seed)
  const ui: ReactNode = (
    <QueryClientProvider client={client}>
      <NotificationBell />
    </QueryClientProvider>
  )
  return render(ui)
}

describe('NotificationBell', () => {
  it('labels the trigger with the unread count and shows the unread dot', () => {
    renderBell([fake(), fake({ id: 'n2', isRead: true })])
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument()
    expect(screen.getByTestId('header-unread-dot')).toBeInTheDocument()
  })

  it('drops the dot and the count when everything is read', () => {
    renderBell([fake({ isRead: true })])
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.queryByTestId('header-unread-dot')).toBeNull()
  })
})
