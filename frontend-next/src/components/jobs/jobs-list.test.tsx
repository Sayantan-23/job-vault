import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobsList } from './jobs-list'
import type { Job } from '@/types/job'

// next/link reads the App Router via next/navigation; stub it for jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => new URLSearchParams(),
}))

const JOB: Job = {
  id: 'j1', createdAt: '', updatedAt: '', userId: 'u1', title: 'Staff Engineer', company: 'Acme',
  location: null, salaryRange: null, sourceUrl: null, snapshotMarkdown: null,
  status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: null, ghostDays: 0, notes: null,
}

describe('JobsList', () => {
  it('renders a row linking to the job drawer via ?job=', () => {
    render(<JobsList jobs={[JOB]} />)
    const link = screen.getByRole('link', { name: /staff engineer/i })
    expect(link).toHaveAttribute('href', '/app/jobs?job=j1')
  })

  it('shows an empty state when there are no jobs', () => {
    render(<JobsList jobs={[]} />)
    expect(screen.getByText(/no jobs yet/i)).toBeInTheDocument()
  })
})
