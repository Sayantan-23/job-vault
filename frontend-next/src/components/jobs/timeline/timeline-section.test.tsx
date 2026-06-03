import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { TimelineSection } from './timeline-section'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('TimelineSection', () => {
  it('renders fetched events', async () => {
    api.get.mockResolvedValue([
      { id: 't1', jobId: 'j1', userId: 'u1', type: 'AUTO', title: 'Job added to vault', description: null, createdAt: new Date().toISOString() },
    ])
    render(<TimelineSection jobId="j1" />, { wrapper })
    await waitFor(() => expect(screen.getByText('Job added to vault')).toBeInTheDocument())
  })

  it('shows an empty state when there are no events', async () => {
    api.get.mockResolvedValue([])
    render(<TimelineSection jobId="j1" />, { wrapper })
    await waitFor(() => expect(screen.getByText(/no activity yet/i)).toBeInTheDocument())
  })

  it('always renders the add-note form', async () => {
    api.get.mockResolvedValue([])
    render(<TimelineSection jobId="j1" />, { wrapper })
    await waitFor(() => expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument())
  })
})
