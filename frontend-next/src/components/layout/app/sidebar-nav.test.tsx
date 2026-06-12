import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ usePathname: () => '/app/jobs' }))

import { SidebarNav } from './sidebar-nav'

describe('SidebarNav', () => {
  it('marks the active route with aria-current and leaves the others unmarked', () => {
    render(<SidebarNav />)
    expect(screen.getByRole('link', { name: /jobs/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveAttribute('aria-current')
  })

  it('lists Résumés and Cover letters between Personas and Timeline', () => {
    render(<SidebarNav />)
    const labels = screen.getAllByRole('link').map((link) => link.textContent)
    expect(labels).toEqual(['Dashboard', 'Jobs', 'Personas', 'Résumés', 'Cover letters', 'Timeline'])
    expect(screen.getByRole('link', { name: 'Résumés' })).toHaveAttribute('href', '/app/resumes')
    expect(screen.getByRole('link', { name: 'Cover letters' })).toHaveAttribute('href', '/app/cover-letters')
  })
})
