import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { push, useSearchParamsMock } = vi.hoisted(() => ({
  push: vi.fn(),
  useSearchParamsMock: vi.fn(() => new URLSearchParams('')),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/app/dashboard',
  useSearchParams: () => useSearchParamsMock(),
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

beforeEach(() => {
  vi.clearAllMocks()
  useSearchParamsMock.mockReturnValue(new URLSearchParams(''))
})

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

  it('calls markRead and pushes a URL with ?job=<id> preserving pre-existing params when a notification with relatedJobId is selected', async () => {
    const relatedJobId = 'job-42'
    useSearchParamsMock.mockReturnValue(new URLSearchParams('view=board'))
    api.get.mockResolvedValue([
      { id: 'n1', message: 'Interview scheduled', type: 'REMINDER', isRead: false, relatedJobId, userId: 'u1', createdAt: '' },
    ])
    api.patch.mockResolvedValue({ id: 'n1', isRead: true })

    render(<NotificationBell />, { wrapper })

    // Open the popover by clicking the bell button
    const bell = await screen.findByRole('button', { name: /notifications/i })
    await userEvent.click(bell)

    // Click the notification item inside the popover
    const item = await screen.findByText('Interview scheduled')
    await userEvent.click(item)

    // mark-read mutation should have been fired
    expect(api.patch).toHaveBeenCalledWith(expect.stringContaining('n1'))

    // router.push should include both the pre-existing param and job=<id>
    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith(expect.stringContaining('view=board'))
    expect(push).toHaveBeenCalledWith(expect.stringContaining(`job=${relatedJobId}`))
  })
})
