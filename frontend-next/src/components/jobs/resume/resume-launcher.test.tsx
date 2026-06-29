import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { GeneratedResume } from '@/types/resume'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
// react-pdf download is browser-only — stub it.
vi.mock('@/components/resume/download-pdf-button', () => ({ DownloadPdfButton: () => <button>Download PDF</button> }))

import { apiClient } from '@/lib/api-client'
import { ResumeLauncher } from './resume-launcher'

const api = vi.mocked(apiClient)
const CONTENT = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const RESUME: GeneratedResume = {
  id: 'r1', createdAt: '2026-06-10T12:00:00.000Z', updatedAt: '', userId: 'u1',
  personaId: 'p1', jobId: 'j1', title: 'SWE — Acme', instructions: null, content: CONTENT,
}

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('ResumeLauncher', () => {
  it('shows an action button linking to the tailored generator when there is none', async () => {
    api.get.mockResolvedValue([])
    render(<ResumeLauncher jobId="j1" />, { wrapper })
    const link = await screen.findByRole('link', { name: /generate tailored résumé/i })
    expect(link).toHaveAttribute('href', '/app/resumes?job=j1')
  })

  it('lists existing résumés with quick Copy/Download and a link that opens it', async () => {
    api.get.mockResolvedValue([RESUME])
    render(<ResumeLauncher jobId="j1" />, { wrapper })
    const titleLink = await screen.findByRole('link', { name: /SWE — Acme/ })
    expect(titleLink).toHaveAttribute('href', '/app/resumes?resume=r1')
    // Per-row aria-label carries the document title (distinct from other rows).
    expect(screen.getByRole('button', { name: 'Copy SWE — Acme (LaTeX)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /generate another/i })).toHaveAttribute('href', '/app/resumes?job=j1')
  })
})
