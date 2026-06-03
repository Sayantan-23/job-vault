import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => new URLSearchParams(''),
}))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { NotificationBell } from './notification-bell'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('NotificationBell', () => {
  it('hides the badge when there are no unread notifications', async () => {
    api.get.mockResolvedValue([{ id: 'n1', message: 'x', type: 'REMINDER', isRead: true, relatedJobId: null, userId: 'u1', createdAt: '' }])
    render(<NotificationBell />, { wrapper })
    await screen.findByRole('button', { name: /notifications/i })
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
  })

  it('shows the unread count, capped at 99+', async () => {
    api.get.mockResolvedValue(
      Array.from({ length: 150 }, (_, i) => ({
        id: `n${i}`, message: 'x', type: 'REMINDER', isRead: false, relatedJobId: null, userId: 'u1', createdAt: '',
      })),
    )
    render(<NotificationBell />, { wrapper })
    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('99+')
  })
})
