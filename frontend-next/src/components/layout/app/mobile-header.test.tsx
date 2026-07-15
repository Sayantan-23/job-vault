import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// MobileHeader renders SidebarNav's NAV as pills (usePathname), the
// NotificationBell (useRouter + notifications queries), and AccountMenu
// (useCurrentUser/useLogout). `pathname` is a mutable let so a rerender can
// simulate a route change.
let pathname = '/app/jobs'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => pathname,
}))
vi.mock('@/hooks/use-auth', () => ({
  useCurrentUser: () => ({ data: { name: 'Grace Hopper', email: 'grace@example.com' } }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({ data: [] }),
  useMarkNotificationRead: () => ({ mutate: vi.fn() }),
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn() }),
}))

import { MobileHeader } from './mobile-header'

function renderHeader() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MobileHeader />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  pathname = '/app/jobs'
})

function toggle() {
  return screen.getByRole('button', { name: /open navigation|close navigation/i })
}

describe('MobileHeader', () => {
  it('renders the menu closed by default', () => {
    renderHeader()
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).toBeNull()
  })

  it('opens all five nav links with the correct labels and hrefs', async () => {
    renderHeader()
    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      'Jobs',
      'Personas',
      'Résumés',
      'Cover letters',
      'Timeline',
    ])
    expect(screen.getByRole('link', { name: 'Résumés' })).toHaveAttribute('href', '/app/resumes')
    expect(nav).toBeInTheDocument()
  })

  it('marks the active route link with aria-current', async () => {
    renderHeader()
    await userEvent.click(toggle())
    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Personas' })).not.toHaveAttribute('aria-current')
  })

  it('closes on the invisible outside-click catcher', async () => {
    renderHeader()
    await userEvent.click(toggle())
    // The catcher is the aria-hidden fixed-inset button.
    const catcher = document.querySelector('button[aria-hidden="true"]') as HTMLButtonElement
    expect(catcher).toBeTruthy()
    await userEvent.click(catcher)
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).toBeNull()
  })

  it('closes on Escape and returns focus to the toggle', async () => {
    renderHeader()
    await userEvent.click(toggle())
    await userEvent.keyboard('{Escape}')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
    expect(toggle()).toHaveFocus()
  })

  it('closes when the pathname changes (but not on initial mount)', async () => {
    const { rerender } = renderHeader()
    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    pathname = '/app/personas'
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MobileHeader />
      </QueryClientProvider>,
    )
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })
})
