import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InlineStats } from './inline-stats'
import type { DashboardStats } from '@/types/dashboard'

const stats: DashboardStats = {
  totalJobs: 24,
  byStatus: { WISHLIST: 1, APPLIED: 18, INTERVIEWING: 6, OFFER: 2, REJECTED: 3, ARCHIVED: 0 },
  ghostAlerts: 5,
  recentActivity: 4,
}

describe('InlineStats', () => {
  it('renders the total, interviewing, and going-quiet figures', () => {
    render(<InlineStats stats={stats} />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('tracked')).toBeInTheDocument()
    expect(screen.getByText('going quiet')).toBeInTheDocument()
  })

  it('tints the going-quiet figure when there are ghost alerts', () => {
    render(<InlineStats stats={stats} />)
    expect(screen.getByText('going quiet').closest('span')).toHaveClass('text-ghost-ghosted')
  })

  it('does not tint going quiet when there are zero ghost alerts', () => {
    render(<InlineStats stats={{ ...stats, ghostAlerts: 0 }} />)
    expect(screen.getByText('going quiet').closest('span')).not.toHaveClass('text-ghost-ghosted')
  })
})
