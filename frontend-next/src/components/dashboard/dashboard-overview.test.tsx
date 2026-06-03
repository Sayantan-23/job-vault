import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { DashboardStats } from '@/types/dashboard'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { DashboardOverview } from './dashboard-overview'

const STATS: DashboardStats = {
  totalJobs: 7,
  byStatus: { WISHLIST: 1, APPLIED: 2, INTERVIEWING: 1, OFFER: 1, REJECTED: 1, ARCHIVED: 1 },
  ghostAlerts: 3,
  recentActivity: 0,
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiClient).get.mockResolvedValue(STATS)
})

describe('DashboardOverview', () => {
  it('renders the heading and the seeded total', () => {
    render(<DashboardOverview initialStats={STATS} />, { wrapper })
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('does not render the kanban board (no status column headers)', () => {
    render(<DashboardOverview initialStats={STATS} />, { wrapper })
    // The kanban column header is an <h2> heading; the stats grid uses a <p>
    // label of the same name, so scope the assertion to the column heading.
    expect(screen.queryByRole('heading', { name: 'Interviewing' })).not.toBeInTheDocument()
  })
})
