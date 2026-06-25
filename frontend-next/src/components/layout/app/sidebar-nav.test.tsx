import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// SidebarNav now also renders SidebarNotifications (useRouter/useSearchParams + a query).
vi.mock('next/navigation', () => ({
  usePathname: () => '/app/jobs',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { SidebarNav } from './sidebar-nav'

function renderNav(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('SidebarNav', () => {
  it('marks the active route with aria-current and leaves the others unmarked', () => {
    renderNav(<SidebarNav />)
    expect(screen.getByRole('link', { name: /jobs/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /personas/i })).not.toHaveAttribute('aria-current')
  })

  it('lists the workspace destinations in order, without Dashboard', () => {
    renderNav(<SidebarNav />)
    const labels = screen.getAllByRole('link').map((link) => link.textContent)
    expect(labels).toEqual(['Jobs', 'Personas', 'Résumés', 'Cover letters', 'Timeline'])
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Résumés' })).toHaveAttribute('href', '/app/resumes')
  })

  it('renders Notifications as a rail entry (not the old header bell)', () => {
    renderNav(<SidebarNav />)
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
  })
})
