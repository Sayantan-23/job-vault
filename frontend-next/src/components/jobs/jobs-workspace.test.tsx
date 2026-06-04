import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Job } from '@/types/job'
import type { Paginated } from '@/types/filters'
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
  apiClient: { get: vi.fn(), getPage: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
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

const PAGE: Paginated<Job> = { data: [JOB], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }

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
  for (const k of ['view', 'job', 'search', 'status', 'ghost', 'sort', 'dir', 'page']) searchParams.delete(k)
  api.getPage.mockResolvedValue(PAGE)
  // board query returns EMPTY_BOARD; the notifications query (also api.get) returns [].
  api.get.mockImplementation((url: string) =>
    url.startsWith('/api/dashboard/kanban') ? Promise.resolve(EMPTY_BOARD) : Promise.resolve([]),
  )
})

describe('JobsWorkspace', () => {
  it('defaults to the list view', () => {
    render(<JobsWorkspace initialJobs={PAGE} initialBoard={EMPTY_BOARD} />, { wrapper })
    expect(screen.getByRole('link', { name: /staff engineer/i })).toHaveAttribute('href', '/app/jobs?job=j1')
  })

  it('renders the board view when ?view=board', () => {
    searchParams.set('view', 'board')
    render(<JobsWorkspace initialJobs={PAGE} initialBoard={EMPTY_BOARD} />, { wrapper })
    expect(screen.getByText('Interviewing')).toBeInTheDocument() // a board column header
    expect(screen.queryByRole('link', { name: /staff engineer/i })).not.toBeInTheDocument()
  })

  it('toggling to Board sets ?view=board in the URL', async () => {
    render(<JobsWorkspace initialJobs={PAGE} initialBoard={EMPTY_BOARD} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'Board' }))
    expect(replace).toHaveBeenCalledWith('/app/jobs?view=board', { scroll: false })
  })

  it('toggling back to List removes ?view and emits a clean URL', async () => {
    searchParams.set('view', 'board')
    render(<JobsWorkspace initialJobs={PAGE} initialBoard={EMPTY_BOARD} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'List' }))
    // List is the default, so the param is dropped entirely — no `?`, no `view=list`.
    expect(replace).toHaveBeenCalledWith('/app/jobs', { scroll: false })
  })

  it('opens the Add-Job modal from the toolbar', async () => {
    render(<JobsWorkspace initialJobs={{ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }} initialBoard={EMPTY_BOARD} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /add job/i }))
    expect(screen.getByLabelText(/job posting url/i)).toBeInTheDocument()
  })

  it('keeps status filtering on the column funnel, not the header', () => {
    render(<JobsWorkspace initialJobs={PAGE} initialBoard={EMPTY_BOARD} />, { wrapper })
    // header: search + activity only
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    // the Status column funnel renders in the default list view
    expect(screen.getByRole('button', { name: /filter by status/i })).toBeInTheDocument()
  })
})
