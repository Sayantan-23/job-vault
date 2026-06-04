import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobsTable } from './jobs-table'
import type { Job } from '@/types/job'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => new URLSearchParams(),
}))

const JOB: Job = {
  id: 'j1', createdAt: '2026-05-28T00:00:00.000Z', updatedAt: '', userId: 'u1',
  title: 'Staff Engineer', company: 'Acme', location: 'Remote', salaryRange: null,
  sourceUrl: null, snapshotMarkdown: null, status: 'WISHLIST', kanbanOrder: 1,
  lastActivityAt: null, ghostDays: 3, notes: null,
}

const base = { sortBy: 'createdAt' as const, sortOrder: 'desc' as const, loading: false, isFiltered: false, onReset: vi.fn() }

describe('JobsTable', () => {
  it('renders a row linking to the drawer via ?job=', () => {
    render(<JobsTable jobs={[JOB]} onSort={vi.fn()} {...base} />)
    const link = screen.getByRole('link', { name: /staff engineer/i })
    expect(link).toHaveAttribute('href', '/app/jobs?job=j1')
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByTestId('status-chip')).toBeInTheDocument()
    expect(screen.getByTestId('ghost-meter')).toBeInTheDocument()
  })

  it('clicking the Company header sorts by company', () => {
    const onSort = vi.fn()
    render(<JobsTable jobs={[JOB]} onSort={onSort} {...base} />)
    fireEvent.click(screen.getByRole('button', { name: /company/i }))
    expect(onSort).toHaveBeenCalledWith('company')
  })

  it('shows a filtered-empty state with a Reset action', () => {
    const onReset = vi.fn()
    render(<JobsTable jobs={[]} onSort={vi.fn()} {...base} isFiltered onReset={onReset} />)
    expect(screen.getByText(/no jobs match/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalled()
  })

  it('shows the initial-empty state when not filtered', () => {
    render(<JobsTable jobs={[]} onSort={vi.fn()} {...base} />)
    expect(screen.getByText(/no jobs yet/i)).toBeInTheDocument()
  })
})
