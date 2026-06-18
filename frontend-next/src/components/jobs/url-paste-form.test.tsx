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
import { UrlPasteForm } from './url-paste-form'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('UrlPasteForm', () => {
  it('scrapes a URL and shows a preview', async () => {
    api.post.mockResolvedValue({ title: 'Scraped SWE', company: 'Acme', snapshotMarkdown: '# md' })
    render(<UrlPasteForm onScraped={vi.fn()} onCreated={vi.fn()} />, { wrapper })
    await userEvent.type(screen.getByLabelText(/job posting url/i), 'https://x.com/job')
    await userEvent.click(screen.getByRole('button', { name: /fetch/i }))
    expect(await screen.findByText('Scraped SWE')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/api/jobs/scrape', { sourceUrl: 'https://x.com/job' })
  })

  it('saves the scraped preview as a job', async () => {
    api.post
      .mockResolvedValueOnce({ title: 'Scraped SWE', company: 'Acme', snapshotMarkdown: '# md' })
      .mockResolvedValueOnce({ id: 'j1' })
    const onCreated = vi.fn()
    render(<UrlPasteForm onScraped={vi.fn()} onCreated={onCreated} />, { wrapper })
    await userEvent.type(screen.getByLabelText(/job posting url/i), 'https://x.com/job')
    await userEvent.click(screen.getByRole('button', { name: /fetch/i }))
    await screen.findByText('Scraped SWE')
    await userEvent.click(screen.getByRole('button', { name: /save job/i }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(api.post).toHaveBeenLastCalledWith(
      '/api/jobs',
      expect.objectContaining({ title: 'Scraped SWE', company: 'Acme', sourceUrl: 'https://x.com/job' }),
    )
  })

  it('routes to manual entry (dropping placeholders) when capture is incomplete', async () => {
    api.post.mockResolvedValue({
      title: 'Untitled Position',
      company: 'Unknown Company',
      snapshotMarkdown: 'Some captured body text.',
      status: 'empty',
    })
    const onScraped = vi.fn()
    render(<UrlPasteForm onScraped={onScraped} onCreated={vi.fn()} />, { wrapper })
    await userEvent.type(screen.getByLabelText(/job posting url/i), 'https://x.com/job')
    await userEvent.click(screen.getByRole('button', { name: /fetch/i }))
    expect(await screen.findByText(/couldn.t fully capture/i)).toBeInTheDocument()
    // No "Save job" on an incomplete capture — only a review path.
    expect(screen.queryByRole('button', { name: /save job/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /review & complete/i }))
    const prefill = onScraped.mock.calls[0]?.[0] as Record<string, unknown>
    expect(prefill).toMatchObject({ sourceUrl: 'https://x.com/job', snapshotMarkdown: 'Some captured body text.' })
    expect(prefill).not.toHaveProperty('title') // placeholder dropped
    expect(prefill).not.toHaveProperty('company')
  })

  it('offers manual entry when the scrape fails', async () => {
    api.post.mockRejectedValue(new Error('Scraping failed'))
    const onScraped = vi.fn()
    render(<UrlPasteForm onScraped={onScraped} onCreated={vi.fn()} />, { wrapper })
    await userEvent.type(screen.getByLabelText(/job posting url/i), 'https://x.com/job')
    await userEvent.click(screen.getByRole('button', { name: /fetch/i }))
    const manualBtn = await screen.findByRole('button', { name: /enter details manually/i })
    await userEvent.click(manualBtn)
    expect(onScraped).toHaveBeenCalledWith(expect.objectContaining({ sourceUrl: 'https://x.com/job' }))
  })
})
