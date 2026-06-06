import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Persona } from '@/types/persona'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
// react-pdf is browser-only; stub the preview + download to keep the test in jsdom.
vi.mock('./resume-preview', () => ({ ResumePreview: () => <div data-testid="preview" /> }))
vi.mock('./download-pdf-button', () => ({ DownloadPdfButton: () => <button>Download PDF</button> }))

import { apiClient } from '@/lib/api-client'
import { ResumeWorkspace } from './resume-workspace'

const api = vi.mocked(apiClient)
const C = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const PERSONA: Persona = { id: 'p1', userId: 'u1', name: 'Backend', data: C, rawInput: null, createdAt: '', updatedAt: '' }
function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('ResumeWorkspace', () => {
  it('generates a résumé for the selected persona and shows the preview', async () => {
    api.post.mockResolvedValue({ id: 'res1', personaId: 'p1', jobId: null, title: 'Backend', instructions: null, content: C, userId: 'u1', createdAt: '', updatedAt: '' })
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /generate résumé|generate resume/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/resumes', { personaId: 'p1' }))
    expect(await screen.findByTestId('preview')).toBeInTheDocument()
  })

  it('includes jobId in the generate call when given', async () => {
    api.post.mockResolvedValue({ id: 'res1', personaId: 'p1', jobId: 'job1', title: 'SWE — Acme', instructions: null, content: C, userId: 'u1', createdAt: '', updatedAt: '' })
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" initialJobId="job1" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /generate résumé|generate resume/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/resumes', { personaId: 'p1', jobId: 'job1' }))
  })
})
