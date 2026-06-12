import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Persona } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'
import type { CoverLetter } from '@/types/cover-letter'

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
// react-pdf download is browser-only — stub it.
vi.mock('@/components/resume/download-cover-letter-pdf-button', () => ({ DownloadCoverLetterPdfButton: () => <button>Download PDF</button> }))

import { apiClient } from '@/lib/api-client'
import { CoverLettersWorkspace } from './cover-letters-workspace'

const api = vi.mocked(apiClient)
const PROFILE: ProfileContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const PERSONAS: Persona[] = [{ id: 'p1', createdAt: '', updatedAt: '', userId: 'u1', name: 'Backend', data: PROFILE, rawInput: null }]
const AI_ON = { enabled: true, maxPersonas: 5 }
const AI_OFF = { enabled: false, maxPersonas: 5 }
const TRACKED: CoverLetter = {
  id: 'cl1', createdAt: '2026-06-10T12:00:00.000Z', updatedAt: '', userId: 'u1',
  jobId: 'j1', adhocJob: null, personaId: 'p1', title: 'Acme — cover letter', instructions: null, bodyMarkdown: 'Dear Acme',
}
const ADHOC: CoverLetter = {
  id: 'cl2', createdAt: '2026-06-11T12:00:00.000Z', updatedAt: '', userId: 'u1',
  jobId: null, adhocJob: { title: 'Staff Eng', company: 'Initech' }, personaId: null, title: 'Initech — cover letter', instructions: null, bodyMarkdown: 'Dear Initech',
}
const LETTERS = [ADHOC, TRACKED]
const JOBS = [{ id: 'j1', title: 'SWE', company: 'Acme' }]

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}

function mockGets(letters: CoverLetter[], personas: Persona[] = PERSONAS) {
  api.get.mockImplementation((path: string) => {
    if (path.startsWith('/api/jobs')) return Promise.resolve(JOBS)
    if (path.startsWith('/api/cover-letters')) return Promise.resolve(letters)
    if (path.startsWith('/api/personas')) return Promise.resolve(personas)
    return Promise.resolve([])
  })
}

beforeEach(() => vi.clearAllMocks())

describe('CoverLettersWorkspace', () => {
  it('lists tracked and adhoc letters with job context + persona names, and no auto-selected letter', async () => {
    mockGets(LETTERS)
    render(<CoverLettersWorkspace initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    expect(screen.getByText('Initech — cover letter')).toBeInTheDocument()
    expect(screen.getByText('Acme — cover letter')).toBeInTheDocument()
    // Adhoc context comes from the stored adhocJob; tracked is joined via the jobs query.
    expect(screen.getByText('Initech · Staff Eng')).toBeInTheDocument()
    expect(await screen.findByText('Acme · SWE')).toBeInTheDocument()
    // Persona name mapped for the tracked letter (scoped to the list — the
    // generate bar's persona select also says 'Backend').
    expect(within(screen.getByRole('list', { name: 'Cover letters' })).getByText('Backend')).toBeInTheDocument()
    // No auto-select on load (decision 10): the right pane shows the muted hint.
    expect(screen.getByText('Select a letter or generate a new one.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Cover letter body')).not.toBeInTheDocument()
  })

  it('opens the editor with the letter body when a row is selected', async () => {
    mockGets(LETTERS)
    render(<CoverLettersWorkspace initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    await userEvent.click(screen.getByText('Acme — cover letter'))
    expect(screen.getByLabelText('Cover letter body')).toHaveValue('Dear Acme')
    expect(screen.queryByText('Select a letter or generate a new one.')).not.toBeInTheDocument()
  })

  it('generates a tracked-job letter and activates the new one in the editor', async () => {
    const NEW: CoverLetter = { ...TRACKED, id: 'cl3', bodyMarkdown: 'Fresh draft' }
    mockGets([NEW, ...LETTERS])
    api.post.mockResolvedValue(NEW)
    render(<CoverLettersWorkspace initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    await screen.findByRole('option', { name: 'SWE — Acme' })
    await userEvent.selectOptions(screen.getByLabelText('Job'), 'j1')
    await userEvent.click(screen.getByRole('button', { name: 'Generate cover letter' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/cover-letters', { personaId: 'p1', jobId: 'j1' }))
    expect(await screen.findByLabelText('Cover letter body')).toHaveValue('Fresh draft')
  })

  it('clears the editor pane when the active letter is deleted', async () => {
    mockGets(LETTERS)
    api.delete.mockResolvedValue(undefined)
    render(<CoverLettersWorkspace initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    await userEvent.click(screen.getByText('Acme — cover letter'))
    expect(screen.getByLabelText('Cover letter body')).toHaveValue('Dear Acme')
    await userEvent.click(screen.getByRole('button', { name: 'Delete Acme — cover letter' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/cover-letters/cl1'))
    // The clear happens in the mutation's onSuccess, so wait for it to settle.
    await waitFor(() => expect(screen.queryByLabelText('Cover letter body')).not.toBeInTheDocument())
    expect(screen.getByText('Select a letter or generate a new one.')).toBeInTheDocument()
  })

  it('surfaces a delete failure and keeps the active letter open', async () => {
    mockGets(LETTERS)
    api.delete.mockRejectedValue(new Error('Delete failed'))
    render(<CoverLettersWorkspace initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    await userEvent.click(screen.getByText('Acme — cover letter'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Acme — cover letter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Delete failed')
    expect(screen.getByLabelText('Cover letter body')).toHaveValue('Dear Acme')
  })

  it('surfaces a save failure next to the editor', async () => {
    mockGets(LETTERS)
    api.patch.mockRejectedValue(new Error('Save failed'))
    render(<CoverLettersWorkspace initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    await userEvent.click(screen.getByText('Acme — cover letter'))
    await userEvent.click(screen.getByRole('button', { name: 'Save edits' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed')
    expect(screen.getByLabelText('Cover letter body')).toHaveValue('Dear Acme')
  })

  it('shows the AI-off hint but still lists the library', () => {
    mockGets(LETTERS)
    render(<CoverLettersWorkspace initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_OFF} />, { wrapper })
    expect(screen.getByText(/not configured/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate cover letter' })).not.toBeInTheDocument()
    expect(screen.getByText('Acme — cover letter')).toBeInTheDocument()
    expect(screen.getByText('Initech — cover letter')).toBeInTheDocument()
  })

  it('shows a create-persona hint with a link when there are no personas, keeping the library', () => {
    mockGets(LETTERS, [])
    render(<CoverLettersWorkspace initialPersonas={[]} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    expect(screen.getByRole('link', { name: /create a persona/i })).toHaveAttribute('href', '/app/personas')
    expect(screen.queryByRole('button', { name: 'Generate cover letter' })).not.toBeInTheDocument()
    expect(screen.getByText('Acme — cover letter')).toBeInTheDocument()
  })

  it('uses generate-first empty/hint copy when the generator is available', () => {
    mockGets([])
    render(<CoverLettersWorkspace initialPersonas={PERSONAS} initialLetters={[]} aiStatus={AI_ON} />, { wrapper })
    expect(screen.getByText('No cover letters yet — generate your first one above.')).toBeInTheDocument()
    expect(screen.getByText('Select a letter or generate a new one.')).toBeInTheDocument()
  })

  it('uses neutral empty/hint copy when the generator is gated (AI off)', () => {
    mockGets([])
    render(<CoverLettersWorkspace initialPersonas={PERSONAS} initialLetters={[]} aiStatus={AI_OFF} />, { wrapper })
    expect(screen.getByText('No cover letters yet.')).toBeInTheDocument()
    expect(screen.getByText('Select a letter to view and edit it.')).toBeInTheDocument()
  })

  it('heals client-side when the SSR fetches failed (undefined initial data)', async () => {
    mockGets(LETTERS)
    render(<CoverLettersWorkspace aiStatus={AI_ON} />, { wrapper })
    // No initialData installed → the hooks fetch on mount and fill in
    // both the library and the persona-gated generator.
    expect(await screen.findByText('Acme — cover letter')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Generate cover letter' })).toBeInTheDocument()
  })
})
