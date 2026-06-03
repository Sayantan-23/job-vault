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
import { TimelineAddForm } from './timeline-add-form'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('TimelineAddForm', () => {
  it('does not submit when the title is blank', async () => {
    render(<TimelineAddForm jobId="j1" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /add note/i }))
    expect(api.post).not.toHaveBeenCalled()
  })

  it('submits the title (and description) via the mutation', async () => {
    api.post.mockResolvedValue({ id: 't1', type: 'MANUAL', title: 'Called recruiter' })
    render(<TimelineAddForm jobId="j1" />, { wrapper })
    await userEvent.type(screen.getByLabelText(/note/i), 'Called recruiter')
    await userEvent.type(screen.getByLabelText(/detail/i), 'Left a voicemail')
    await userEvent.click(screen.getByRole('button', { name: /add note/i }))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/timeline', {
        title: 'Called recruiter',
        description: 'Left a voicemail',
      }),
    )
  })

  it('omits an empty description', async () => {
    api.post.mockResolvedValue({ id: 't1' })
    render(<TimelineAddForm jobId="j1" />, { wrapper })
    await userEvent.type(screen.getByLabelText(/note/i), 'Quick note')
    await userEvent.click(screen.getByRole('button', { name: /add note/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/jobs/j1/timeline', { title: 'Quick note' }))
  })
})
