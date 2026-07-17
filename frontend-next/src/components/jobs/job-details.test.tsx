import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Job } from '@/types/job'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { JobDetails, JobDrawerHeader, JobDrawerFooter } from './job-details'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const JOB: Job = {
  id: 'j1', createdAt: '', updatedAt: '', userId: 'u1', title: 'SWE', company: 'Acme',
  location: 'Remote', salaryRange: null, sourceUrl: null, snapshotMarkdown: null,
  status: 'APPLIED', kanbanOrder: 1, lastActivityAt: null, ghostDays: 0, notes: null,
}

beforeEach(() => vi.clearAllMocks())

describe('JobDrawerHeader', () => {
  it('renders the job title and company', () => {
    render(<JobDrawerHeader job={JOB} onClose={vi.fn()} />, { wrapper })
    expect(screen.getByRole('heading', { name: 'SWE' })).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
  })
})

describe('JobDetails', () => {
  it('patches the status when changed', async () => {
    api.patch.mockResolvedValue({ ...JOB, status: 'OFFER' })
    render(<JobDetails job={JOB} />, { wrapper })
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'OFFER')
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/jobs/j1', { status: 'OFFER' }))
  })
})

describe('JobDrawerFooter', () => {
  it('requires confirmation before deleting', async () => {
    api.delete.mockResolvedValue({ message: 'Job deleted successfully' })
    const onDeleted = vi.fn()
    render(<JobDrawerFooter job={JOB} onDeleted={onDeleted} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /delete job/i }))
    // Confirm in the dialog (its own "Delete" button, scoped to the dialog).
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/delete job\?/i)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/jobs/j1'))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })
})
