import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardStats } from './dashboard-stats'
import type { DashboardStats as Stats } from '@/types/dashboard'

const STATS: Stats = {
  totalJobs: 12,
  byStatus: { WISHLIST: 2, APPLIED: 5, INTERVIEWING: 3, OFFER: 1, REJECTED: 1, ARCHIVED: 0 },
  ghostAlerts: 4,
  recentActivity: 7,
}

describe('DashboardStats', () => {
  it('renders the five stat cards with their values', () => {
    render(<DashboardStats stats={STATS} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.getByText('Interviewing')).toBeInTheDocument()
    expect(screen.getByText('Offers')).toBeInTheDocument()
    expect(screen.getByText('Ghost alerts')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})
