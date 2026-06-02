import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AppShell } from './app-shell'

// AppShell renders LogoutButton (useRouter + useQueryClient) and SidebarNav (usePathname).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/dashboard',
}))

function renderWithProviders(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('AppShell', () => {
  it('renders the primary navigation links', () => {
    renderWithProviders(<AppShell>content</AppShell>)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/app/dashboard')
    expect(screen.getByRole('link', { name: 'Timeline' })).toHaveAttribute('href', '/app/timeline')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/app/settings')
  })

  it('renders its children in the main region', () => {
    renderWithProviders(<AppShell>hello-region</AppShell>)
    expect(screen.getByRole('main')).toHaveTextContent('hello-region')
  })
})
