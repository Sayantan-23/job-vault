import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DashboardView } from './dashboard-view'
import type { KanbanBoard } from '@/types/dashboard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

const BOARD: KanbanBoard = {
  columns: [
    { status: 'WISHLIST', jobs: [] }, { status: 'APPLIED', jobs: [] }, { status: 'INTERVIEWING', jobs: [] },
    { status: 'OFFER', jobs: [] }, { status: 'REJECTED', jobs: [] }, { status: 'ARCHIVED', jobs: [] },
  ],
  stats: { totalJobs: 0, byStatus: { WISHLIST: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 0 },
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('DashboardView', () => {
  it('renders the heading, stats, and the board columns', () => {
    render(<DashboardView initialBoard={BOARD} />, { wrapper })
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
  })
})
