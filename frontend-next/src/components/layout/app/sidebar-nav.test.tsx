import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// SidebarNav is now a pure page-nav list (the notification bell moved to the
// canvas header), so it only needs usePathname.
vi.mock('next/navigation', () => ({
  usePathname: () => '/app/jobs',
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
    expect(labels).toEqual(['Jobs', 'Personas', 'Résumés', 'Cover letters', 'Answers', 'Timeline'])
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Résumés' })).toHaveAttribute('href', '/app/resumes')
  })

  it('no longer carries the notifications bell (it moved to the canvas header)', () => {
    renderNav(<SidebarNav />)
    expect(screen.queryByRole('button', { name: /notifications/i })).toBeNull()
  })
})
