import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Job } from '@/types/job'
import type { KanbanBoard } from '@/types/dashboard'

const { replace, searchParams } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => searchParams,
}))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { JobsWorkspace } from './jobs-workspace'

const api = vi.mocked(apiClient)

const JOB: Job = {
  id: 'j1', createdAt: '', updatedAt: '', userId: 'u1', title: 'Staff Engineer', company: 'Acme',
  location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null,
  status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: null, ghostDays: 0, notes: null,
}

const EMPTY_BOARD: KanbanBoard = {
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

beforeEach(() => {
  vi.clearAllMocks()
  searchParams.delete('view')
  searchParams.delete('job')
  api.get.mockImplementation((url: string) =>
    url === '/api/dashboard/kanban' ? Promise.resolve(EMPTY_BOARD) : Promise.resolve([JOB]),
  )
})

describe('JobsWorkspace', () => {
  it('defaults to the list view', () => {
    render(<JobsWorkspace initialJobs={[JOB]} initialBoard={EMPTY_BOARD} />, { wrapper })
    expect(screen.getByRole('link', { name: /staff engineer/i })).toHaveAttribute('href', '/app/jobs?job=j1')
  })

  it('renders the board view when ?view=board', () => {
    searchParams.set('view', 'board')
    render(<JobsWorkspace initialJobs={[JOB]} initialBoard={EMPTY_BOARD} />, { wrapper })
    expect(screen.getByText('Interviewing')).toBeInTheDocument() // a board column header
    expect(screen.queryByRole('link', { name: /staff engineer/i })).not.toBeInTheDocument()
  })

  it('toggling to Board sets ?view=board in the URL', async () => {
    render(<JobsWorkspace initialJobs={[JOB]} initialBoard={EMPTY_BOARD} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'Board' }))
    expect(replace).toHaveBeenCalledWith('/app/jobs?view=board', { scroll: false })
  })

  it('opens the Add-Job modal from the toolbar', async () => {
    render(<JobsWorkspace initialJobs={[]} initialBoard={EMPTY_BOARD} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /add job/i }))
    expect(screen.getByLabelText(/job posting url/i)).toBeInTheDocument()
  })
})
