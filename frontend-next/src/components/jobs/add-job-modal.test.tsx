import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { AddJobModal } from './add-job-modal'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('AddJobModal', () => {
  it('opens on the URL tab and switches to manual', async () => {
    render(<AddJobModal open onOpenChange={vi.fn()} />, { wrapper })
    expect(screen.getByLabelText(/job posting url/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /manual/i }))
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<AddJobModal open={false} onOpenChange={vi.fn()} />, { wrapper })
    expect(screen.queryByLabelText(/job posting url/i)).not.toBeInTheDocument()
  })
})
