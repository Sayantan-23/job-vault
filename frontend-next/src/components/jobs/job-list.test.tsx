import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobList } from './job-list'
import type { Job } from '@/types/job'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

function makeJob(over: Partial<Job> & Pick<Job, 'id'>): Job {
  return {
    createdAt: '2026-05-28T00:00:00.000Z',
    updatedAt: '',
    userId: 'u1',
    title: 'Engineer',
    company: 'Acme',
    location: 'Remote',
    salaryRange: null,
    sourceUrl: null,
    snapshotMarkdown: null,
    status: 'APPLIED',
    kanbanOrder: 1,
    lastActivityAt: null,
    ghostDays: 0,
    notes: null,
    ...over,
  }
}

describe('JobList', () => {
  it('groups ghosted jobs under "Needs your attention" and active jobs under "In progress"', () => {
    const ghosted = makeJob({ id: 'g1', title: 'Ghosted Role', ghostDays: 21 })
    const active = makeJob({ id: 'a1', title: 'Fresh Role', ghostDays: 2 })
    render(<JobList jobs={[ghosted, active]} loading={false} isFiltered={false} onReset={vi.fn()} />)

    const needs = screen.getByText('Needs your attention').closest('section')
    const progress = screen.getByText('In progress').closest('section')
    expect(needs).toContainElement(screen.getByText('Ghosted Role'))
    expect(progress).toContainElement(screen.getByText('Fresh Role'))
  })

  it('links each row to the job drawer via ?job=<id>', () => {
    render(
      <JobList
        jobs={[makeJob({ id: 'j1', title: 'Staff Engineer', ghostDays: 2 })]}
        loading={false}
        isFiltered={false}
        onReset={vi.fn()}
      />,
    )
    const link = screen.getByRole('link', { name: /staff engineer/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('job=j1'))
  })

  it('shows the empty state when there are no jobs and not loading', () => {
    render(<JobList jobs={[]} loading={false} isFiltered={false} onReset={vi.fn()} />)
    expect(screen.getByText(/no jobs yet/i)).toBeInTheDocument()
  })

  it('shows the outreach badge only for jobs with contacts', () => {
    render(
      <JobList
        jobs={[
          makeJob({ id: 'a', outreachCount: 3, outreachReplies: 1 }),
          makeJob({ id: 'b' }),
        ]}
        loading={false}
        isFiltered={false}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getAllByTestId('outreach-badge')).toHaveLength(1)
    expect(screen.getByText('· 1 replied')).toBeInTheDocument()
  })
})
