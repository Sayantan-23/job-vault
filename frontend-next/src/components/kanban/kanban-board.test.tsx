import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { KanbanBoard } from './kanban-board'
import type { KanbanBoard as Board } from '@/types/dashboard'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/app/dashboard' }))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

const BOARD: Board = {
  columns: [
    { status: 'WISHLIST', jobs: [{ id: 'w1', title: 'Wished', company: 'Acme', location: null, ghostDays: 0, status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: null, createdAt: '' }] },
    { status: 'APPLIED', jobs: [] },
    { status: 'INTERVIEWING', jobs: [] },
    { status: 'OFFER', jobs: [] },
    { status: 'REJECTED', jobs: [] },
    { status: 'ARCHIVED', jobs: [] },
  ],
  stats: { totalJobs: 1, byStatus: { WISHLIST: 1, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 1 },
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('KanbanBoard', () => {
  it('renders all six columns and the seeded card', () => {
    render(<KanbanBoard board={BOARD} />, { wrapper })
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('Wished')).toBeInTheDocument()
  })
})
