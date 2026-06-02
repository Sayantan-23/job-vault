import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Job } from '@/types/job'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { JobsBoard } from './jobs-board'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const JOB: Job = {
  id: 'j1', createdAt: '', updatedAt: '', userId: 'u1', title: 'Staff Engineer', company: 'Acme',
  location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null,
  status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: null, ghostDays: 0, notes: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  // The board seeds the query with initialData; resolve the background refetch
  // to an array so React Query never warns about an undefined query result.
  api.get.mockResolvedValue([])
})

describe('JobsBoard', () => {
  it('renders the seeded jobs with a link that opens the drawer via ?job=', () => {
    // useJobs refetches on mount; keep the refetch consistent with the seed.
    api.get.mockResolvedValue([JOB])
    render(<JobsBoard initialJobs={[JOB]} />, { wrapper })
    const link = screen.getByRole('link', { name: /staff engineer/i })
    expect(link).toHaveAttribute('href', '/app/jobs?job=j1')
  })

  it('shows an empty state when there are no jobs', () => {
    render(<JobsBoard initialJobs={[]} />, { wrapper })
    expect(screen.getByText(/no jobs yet/i)).toBeInTheDocument()
  })

  it('opens the Add-Job modal from the toolbar button', async () => {
    render(<JobsBoard initialJobs={[]} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /add job/i }))
    expect(screen.getByLabelText(/job posting url/i)).toBeInTheDocument()
  })
})
