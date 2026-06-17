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
import { ManualJobForm } from './manual-job-form'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('ManualJobForm', () => {
  it('shows validation errors when title/company are blank', async () => {
    render(<ManualJobForm onCreated={vi.fn()} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /add job/i }))
    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Company is required')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('submits a valid job (omitting an empty sourceUrl) and calls onCreated', async () => {
    api.post.mockResolvedValue({ id: 'j1', title: 'SWE', company: 'Acme' })
    const onCreated = vi.fn()
    render(<ManualJobForm onCreated={onCreated} />, { wrapper })
    await userEvent.type(screen.getByLabelText('Title'), 'SWE')
    await userEvent.type(screen.getByLabelText('Company'), 'Acme')
    await userEvent.click(screen.getByRole('button', { name: /add job/i }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    const payload = api.post.mock.calls[0]?.[1] as Record<string, unknown>
    expect(payload).toMatchObject({ title: 'SWE', company: 'Acme' })
    expect(payload).not.toHaveProperty('sourceUrl')
  })

  it('prefills fields from the prefill prop', () => {
    render(<ManualJobForm onCreated={vi.fn()} prefill={{ title: 'Pre', company: 'Filled' }} />, { wrapper })
    expect(screen.getByLabelText('Title')).toHaveValue('Pre')
    expect(screen.getByLabelText('Company')).toHaveValue('Filled')
  })

  it('prefills and submits the scraped description (snapshotMarkdown)', async () => {
    api.post.mockResolvedValue({ id: 'j1' })
    const onCreated = vi.fn()
    render(
      <ManualJobForm
        onCreated={onCreated}
        prefill={{ title: 'Pre', company: 'Filled', snapshotMarkdown: '# Captured\n\nBody.' }}
      />,
      { wrapper },
    )
    expect(screen.getByLabelText('Description')).toHaveValue('# Captured\n\nBody.')
    await userEvent.click(screen.getByRole('button', { name: /add job/i }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    const payload = api.post.mock.calls[0]?.[1] as Record<string, unknown>
    expect(payload).toMatchObject({ snapshotMarkdown: '# Captured\n\nBody.' })
  })
})
