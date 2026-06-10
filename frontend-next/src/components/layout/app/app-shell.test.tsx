import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// AppShell renders SidebarNav (usePathname) and AccountMenu (useCurrentUser/useLogout).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/dashboard',
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
  it('renders the primary navigation links (Profile/Settings live in the account menu, not the nav)', () => {
    renderWithProviders(<AppShell>content</AppShell>)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/app/dashboard')
    expect(screen.getByRole('link', { name: 'Timeline' })).toHaveAttribute('href', '/app/timeline')
    // Settings is no longer a top-level nav link; it moved into the account menu.
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull()
    expect(screen.getByRole('button', { name: /open account menu/i })).toBeInTheDocument()
  })

  it('renders its children in the main region', () => {
    renderWithProviders(<AppShell>hello-region</AppShell>)
    expect(screen.getByRole('main')).toHaveTextContent('hello-region')
  })
})
