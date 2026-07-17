import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { OutreachSection } from './outreach-section'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const CONTACT = {
  id: 'c1', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z',
  userId: 'u1', jobId: 'j1', contact: 'Priya — priya@acme.com', channel: 'EMAIL',
  status: 'NO_RESPONSE', reachedOutAt: '2026-07-01T00:00:00Z', notes: null,
}

beforeEach(() => vi.clearAllMocks())

describe('OutreachSection', () => {
  it('shows the empty state when there are no contacts', async () => {
    api.get.mockResolvedValue([])
    render(<OutreachSection jobId="j1" />, { wrapper })
    expect(await screen.findByText(/No outreach yet/i)).toBeInTheDocument()
  })

  it('lists contacts with their status', async () => {
    api.get.mockResolvedValue([CONTACT])
    render(<OutreachSection jobId="j1" />, { wrapper })
    expect(await screen.findByText('Priya — priya@acme.com')).toBeInTheDocument()
    expect(screen.getByLabelText(/Status for Priya/i)).toHaveValue('NO_RESPONSE')
  })

  it('creates a contact from the form', async () => {
    api.get.mockResolvedValue([])
    api.post.mockResolvedValue(CONTACT)
    const user = userEvent.setup()
    render(<OutreachSection jobId="j1" />, { wrapper })
    // Form is collapsed behind an Add button; open it first.
    await user.click(await screen.findByRole('button', { name: /Add contact/i }))
    await user.type(await screen.findByLabelText(/Person/i), 'Priya — priya@acme.com')
    await user.selectOptions(screen.getByLabelText(/Channel/i), 'EMAIL')
    await user.click(screen.getByRole('button', { name: /Add contact/i }))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/contacts', {
        contact: 'Priya — priya@acme.com',
        channel: 'EMAIL',
      }),
    )
  })

  it('changes status through the row select', async () => {
    api.get.mockResolvedValue([CONTACT])
    api.patch.mockResolvedValue({ ...CONTACT, status: 'HEARD_BACK' })
    const user = userEvent.setup()
    render(<OutreachSection jobId="j1" />, { wrapper })
    await user.selectOptions(await screen.findByLabelText(/Status for Priya/i), 'HEARD_BACK')
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/contacts/c1', { status: 'HEARD_BACK' }))
  })

  it('deletes only after confirmation', async () => {
    api.get.mockResolvedValue([CONTACT])
    api.delete.mockResolvedValue({ id: 'c1' })
    const user = userEvent.setup()
    render(<OutreachSection jobId="j1" />, { wrapper })
    await user.click(await screen.findByRole('button', { name: /Delete contact/i }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/contacts/c1'))
  })
})
