import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
// react-pdf download is browser-only — stub it.
vi.mock('@/components/resume/download-cover-letter-pdf-button', () => ({ DownloadCoverLetterPdfButton: () => <button>Download PDF</button> }))

import { apiClient } from '@/lib/api-client'
import { CoverLetterSection } from './cover-letter-section'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('CoverLetterSection', () => {
  it('disables generate + shows a notice when AI is not configured', async () => {
    api.get.mockImplementation((path: string) =>
      path.startsWith('/api/ai/status') ? Promise.resolve({ enabled: false, maxPersonas: 5 }) : Promise.resolve([]),
    )
    render(<CoverLetterSection jobId="j1" />, { wrapper })
    expect(await screen.findByText(/not configured/i)).toBeInTheDocument()
  })
  it('generates a cover letter from the selected persona', async () => {
    api.get.mockImplementation((path: string) => {
      if (path.startsWith('/api/ai/status')) return Promise.resolve({ enabled: true, maxPersonas: 5 })
      if (path.startsWith('/api/personas')) return Promise.resolve([{ id: 'p1', name: 'Backend', userId: 'u1', data: {}, rawInput: null, createdAt: '', updatedAt: '' }])
      return Promise.resolve([]) // cover letters
    })
    api.post.mockResolvedValue({ id: 'cl1', jobId: 'j1', personaId: 'p1', title: 'Acme', instructions: null, bodyMarkdown: 'Dear hiring manager', userId: 'u1', createdAt: '', updatedAt: '' })
    render(<CoverLetterSection jobId="j1" />, { wrapper })
    await screen.findByRole('button', { name: /generate cover letter/i })
    await userEvent.click(screen.getByRole('button', { name: /generate cover letter/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/cover-letters', { jobId: 'j1', personaId: 'p1' }))
    expect(await screen.findByRole('button', { name: /copy text/i })).toBeInTheDocument()
  })
})
