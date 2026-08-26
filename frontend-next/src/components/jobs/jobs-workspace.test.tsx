import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Job } from '@/types/job'
import type { Paginated } from '@/types/filters'
import type { KanbanBoard } from '@/types/dashboard'

const { replaceUrl, searchParams } = vi.hoisted(() => ({
  replaceUrl: vi.fn(),
  searchParams: new URLSearchParams(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/app/jobs',
  // A fresh instance per call, like Next (which hands back a new
  // ReadonlyURLSearchParams per navigation). Returning the mutated-in-place
  // object let React Compiler cache values derived from it — `view` stayed
  // stale when a test flipped ?view between renders.
  useSearchParams: () => new URLSearchParams(searchParams),
}))
vi.mock('@/lib/url-state', () => ({ replaceUrl }))
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
  // board query -> EMPTY_BOARD; stats query -> the stats object; notifications (also api.get) -> [].
  api.get.mockImplementation((url: string) => {
    if (url.startsWith('/api/dashboard/kanban')) return Promise.resolve(EMPTY_BOARD)
    if (url.startsWith('/api/dashboard/stats')) return Promise.resolve(EMPTY_BOARD.stats)
    return Promise.resolve([])
  })
})

describe('JobsWorkspace', () => {
  it('defaults to the list view', async () => {
    render(<JobsWorkspace />, { wrapper })
    expect(await screen.findByRole('link', { name: /staff engineer/i })).toHaveAttribute('href', '/app/jobs?job=j1')
    // the board stays mounted behind <Activity mode="hidden">, just not visible
    expect(screen.getByText('Interviewing')).not.toBeVisible()
    // ...and mounting it costs nothing: the kanban query stays disabled until shown
    expect(api.get.mock.calls.some(([url]) => url.startsWith('/api/dashboard/kanban'))).toBe(false)
  })

  it('renders the board view when ?view=board', async () => {
    searchParams.set('view', 'board')
    render(<JobsWorkspace />, { wrapper })
    expect(screen.getByText('Interviewing')).toBeVisible() // a board column header
    expect(await screen.findByRole('link', { name: /staff engineer/i, hidden: true })).not.toBeVisible()
  })

  it('keeps the hidden view mounted across the toggle', async () => {
    const { rerender } = render(<JobsWorkspace />, { wrapper })
    const row = await screen.findByRole('link', { name: /staff engineer/i })
    searchParams.set('view', 'board')
    rerender(<JobsWorkspace />)
    // same DOM node, hidden rather than unmounted — that is what preserves the
    // list's scroll position (and the board's) across the toggle.
    expect(row).toBeInTheDocument()
    expect(row).not.toBeVisible()
    expect(screen.getByText('Interviewing')).toBeVisible()
  })

  it('toggling to Board sets ?view=board in the URL', async () => {
    render(<JobsWorkspace />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'Board' }))
    // history.replaceState, not router.replace — the toggle must not re-run the
    // page on the server (see lib/url-state.ts).
    expect(replaceUrl).toHaveBeenCalledWith('/app/jobs?view=board')
  })

  it('toggling back to List removes ?view and emits a clean URL', async () => {
    searchParams.set('view', 'board')
    render(<JobsWorkspace />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'List' }))
    // List is the default, so the param is dropped entirely — no `?`, no `view=list`.
    expect(replaceUrl).toHaveBeenCalledWith('/app/jobs')
  })

  it('opens the Add-Job modal from the toolbar', async () => {
    api.getPage.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })
    render(<JobsWorkspace />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /add job/i }))
    expect(screen.getByLabelText(/job posting url/i)).toBeInTheDocument()
  })

  it('keeps filtering on the merged Filter control, not the header', () => {
    render(<JobsWorkspace />, { wrapper })
    // header: search + activity only
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    // the single merged Filter control renders in the default list view
    expect(screen.getByRole('button', { name: /filter jobs/i })).toBeInTheDocument()
  })
})
