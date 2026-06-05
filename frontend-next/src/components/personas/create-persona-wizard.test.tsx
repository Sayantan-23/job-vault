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
import { CreatePersonaWizard } from './create-persona-wizard'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('CreatePersonaWizard', () => {
  it('submits name + pasted resume and closes on success', async () => {
    api.post.mockResolvedValue({ id: 'p1', name: 'Backend' })
    const onOpenChange = vi.fn()
    render(<CreatePersonaWizard open onOpenChange={onOpenChange} />, { wrapper })
    await userEvent.type(screen.getByLabelText(/persona name/i), 'Backend')
    await userEvent.type(screen.getByLabelText(/paste your résumé|paste your resume/i), 'RESUME TEXT')
    await userEvent.click(screen.getByRole('button', { name: /structure with ai|create/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/personas', { name: 'Backend', inputs: { pastedResume: 'RESUME TEXT', freeText: '' } }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('shows a validation error when nothing is provided', async () => {
    render(<CreatePersonaWizard open onOpenChange={vi.fn()} />, { wrapper })
    await userEvent.type(screen.getByLabelText(/persona name/i), 'Backend')
    await userEvent.click(screen.getByRole('button', { name: /structure with ai|create/i }))
    expect(await screen.findByText(/paste a résumé|paste a resume|add some notes/i)).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })
})
