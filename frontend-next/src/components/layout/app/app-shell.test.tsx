import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// AppShell renders SidebarNav (usePathname), the NotificationBell (useRouter + a
// query), and AccountMenu (useCurrentUser/useLogout).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/hooks/use-auth', () => ({
  useCurrentUser: () => ({ data: { name: 'Grace Hopper', email: 'grace@example.com' } }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}))

import { AppShell } from './app-shell'

function renderWithProviders(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('AppShell', () => {
  it('renders the workspace nav (no Dashboard; Profile/Settings live in the account menu)', () => {
    renderWithProviders(<AppShell>content</AppShell>)
    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/app/jobs')
    expect(screen.getByRole('link', { name: 'Timeline' })).toHaveAttribute('href', '/app/timeline')
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
    // Settings is not a top-level nav link; it lives in the account menu.
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull()
    // Two account menus mount (desktop rail + mobile header); CSS hides one per
    // viewport, but both are in the DOM under jsdom.
    expect(screen.getAllByRole('button', { name: /open account menu/i }).length).toBeGreaterThan(0)
  })

  it('mounts the notification bell in the canvas header (not the nav list)', () => {
    renderWithProviders(<AppShell>content</AppShell>)
    // Rail-canvas floating bell + mobile-header bell both mount under jsdom.
    expect(screen.getAllByRole('button', { name: /notifications/i }).length).toBeGreaterThan(0)
    // It's a header utility, not one of the rail's page-nav links.
    expect(screen.queryByRole('link', { name: /notifications/i })).toBeNull()
  })

  it('renders its children in the main region', () => {
    renderWithProviders(<AppShell>hello-region</AppShell>)
    expect(screen.getByRole('main')).toHaveTextContent('hello-region')
  })
})
