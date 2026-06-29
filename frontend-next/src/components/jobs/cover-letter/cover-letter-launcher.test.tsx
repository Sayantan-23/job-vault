import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { CoverLetter } from '@/types/cover-letter'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
// react-pdf download is browser-only — stub it.
vi.mock('@/components/resume/download-cover-letter-pdf-button', () => ({ DownloadCoverLetterPdfButton: () => <button>Download PDF</button> }))

import { apiClient } from '@/lib/api-client'
import { CoverLetterLauncher } from './cover-letter-launcher'

const api = vi.mocked(apiClient)
const LETTER: CoverLetter = {
  id: 'cl1', createdAt: '2026-06-10T12:00:00.000Z', updatedAt: '', userId: 'u1',
  jobId: 'j1', adhocJob: null, personaId: 'p1', title: 'Acme — cover letter', instructions: null, bodyMarkdown: 'Dear Acme',
}

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('CoverLetterLauncher', () => {
  it('shows an action button deep-linking the pre-opened sheet when there is no letter', async () => {
    api.get.mockResolvedValue([])
    render(<CoverLetterLauncher jobId="j1" />, { wrapper })
    const link = await screen.findByRole('link', { name: /generate cover letter/i })
    expect(link).toHaveAttribute('href', '/app/cover-letters?new=1&job=j1')
  })

  it('lists existing letters with quick Copy/Download and a link to the editor', async () => {
    api.get.mockResolvedValue([LETTER])
    render(<CoverLetterLauncher jobId="j1" />, { wrapper })
    const titleLink = await screen.findByRole('link', { name: /Acme — cover letter/ })
    expect(titleLink).toHaveAttribute('href', '/app/cover-letters/cl1')
    // Per-row aria-label carries the document title (distinct from other rows).
    expect(screen.getByRole('button', { name: 'Copy Acme — cover letter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /generate another/i })).toHaveAttribute('href', '/app/cover-letters?new=1&job=j1')
  })
})
