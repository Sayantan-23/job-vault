import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Persona } from '@/types/persona'
import type { GeneratedResume } from '@/types/resume'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
// react-pdf is browser-only; stub the preview + download to keep the test in jsdom.
vi.mock('./resume-preview', () => ({ ResumePreview: () => <div data-testid="preview" /> }))
vi.mock('./download-pdf-button', () => ({ DownloadPdfButton: () => <button>Download PDF</button> }))

import { apiClient } from '@/lib/api-client'
import { ResumeWorkspace } from './resume-workspace'

const api = vi.mocked(apiClient)
const C = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const PERSONA: Persona = { id: 'p1', userId: 'u1', name: 'Backend', data: C, rawInput: null, createdAt: '', updatedAt: '' }
const JOBS = [{ id: 'job1', title: 'SWE', company: 'Acme' }]
const TAILORED: GeneratedResume = {
  id: 'r1', createdAt: '2026-06-10T12:00:00.000Z', updatedAt: '', userId: 'u1',
  personaId: 'p1', jobId: 'job1', title: 'SWE — Acme', instructions: null,
  content: { ...C, summary: 'Tailored to Acme' },
}
const GENERAL: GeneratedResume = {
  id: 'r2', createdAt: '2026-06-11T12:00:00.000Z', updatedAt: '', userId: 'u1',
  personaId: 'p1', jobId: null, title: 'General draft', instructions: null, content: C,
}

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}

// useResumes refetches on mount, so the get mock must serve both endpoints.
function mockGets({ resumes = [] as GeneratedResume[], jobs = [] as typeof JOBS } = {}) {
  api.get.mockImplementation((path: string) => {
    if (path.startsWith('/api/jobs')) return Promise.resolve(jobs)
    if (path.startsWith('/api/resumes')) return Promise.resolve(resumes)
    return Promise.resolve([])
  })
}

beforeEach(() => vi.clearAllMocks())

describe('ResumeWorkspace', () => {
  it('generates a résumé for the selected persona and shows the preview', async () => {
    mockGets()
    api.post.mockResolvedValue({ id: 'res1', personaId: 'p1', jobId: null, title: 'Backend', instructions: null, content: C, userId: 'u1', createdAt: '', updatedAt: '' })
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" initialResumes={[]} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /generate résumé|generate resume/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/resumes', { personaId: 'p1' }))
    expect(await screen.findByTestId('preview')).toBeInTheDocument()
  })

  it('includes jobId in the generate call when given', async () => {
    mockGets()
    api.post.mockResolvedValue({ id: 'res1', personaId: 'p1', jobId: 'job1', title: 'SWE — Acme', instructions: null, content: C, userId: 'u1', createdAt: '', updatedAt: '' })
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" initialJobId="job1" initialResumes={[]} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /generate résumé|generate resume/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/resumes', { personaId: 'p1', jobId: 'job1' }))
  })

  it('lets you pick a job to tailor to from the form', async () => {
    mockGets({ jobs: JOBS })
    api.post.mockResolvedValue({ id: 'res1', personaId: 'p1', jobId: 'job1', title: 'SWE — Acme', instructions: null, content: C, userId: 'u1', createdAt: '', updatedAt: '' })
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" initialResumes={[]} />, { wrapper })
    await screen.findByRole('option', { name: /SWE — Acme/i })
    await userEvent.selectOptions(screen.getByLabelText(/tailor to a job/i), 'job1')
    await userEvent.click(screen.getByRole('button', { name: /generate résumé|generate resume/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/resumes', { personaId: 'p1', jobId: 'job1' }))
  })

  it('lists past résumés with job context and persona names, none auto-selected', async () => {
    mockGets({ resumes: [GENERAL, TAILORED], jobs: JOBS })
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" initialResumes={[GENERAL, TAILORED]} />, { wrapper })
    const list = screen.getByRole('list', { name: 'Résumés' })
    expect(within(list).getByText('SWE — Acme')).toBeInTheDocument()
    expect(within(list).getByText('General draft')).toBeInTheDocument()
    // Tracked ones join the jobs query client-side; once joined, only the
    // jobless generation reads 'General'.
    expect(await within(list).findByText('Acme · SWE')).toBeInTheDocument()
    expect(within(list).getByText('General')).toBeInTheDocument()
    expect(within(list).getAllByText('Backend')).toHaveLength(2)
    // No auto-select on load: the editor/preview only opens on click or generation.
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument()
  })

  it('opens a past résumé in the editor when its row is selected', async () => {
    mockGets({ resumes: [TAILORED], jobs: JOBS })
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" initialResumes={[TAILORED]} />, { wrapper })
    await userEvent.click(within(screen.getByRole('list', { name: 'Résumés' })).getByText('SWE — Acme'))
    expect(screen.getByLabelText('Summary')).toHaveValue('Tailored to Acme')
    expect(screen.getByTestId('preview')).toBeInTheDocument()
  })

  it('clears the editor when the open résumé is deleted', async () => {
    mockGets({ resumes: [TAILORED] })
    api.delete.mockResolvedValue(undefined)
    render(<ResumeWorkspace personas={[PERSONA]} initialPersonaId="p1" initialResumes={[TAILORED]} />, { wrapper })
    await userEvent.click(within(screen.getByRole('list', { name: 'Résumés' })).getByText('SWE — Acme'))
    expect(screen.getByTestId('preview')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete SWE — Acme' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/resumes/r1'))
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument()
  })

  it('shows a create-persona hint when there are no personas, keeping the library', () => {
    mockGets({ resumes: [TAILORED] })
    render(<ResumeWorkspace personas={[]} initialPersonaId="" initialResumes={[TAILORED]} />, { wrapper })
    expect(screen.getByRole('link', { name: /create a persona/i })).toHaveAttribute('href', '/app/personas')
    expect(screen.queryByRole('button', { name: /generate résumé|generate resume/i })).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Résumés' })).getByText('SWE — Acme')).toBeInTheDocument()
  })
})
