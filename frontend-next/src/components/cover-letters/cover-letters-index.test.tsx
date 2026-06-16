import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Persona } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'
import type { CoverLetter } from '@/types/cover-letter'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))

import { apiClient } from '@/lib/api-client'
import { CoverLettersIndex } from './cover-letters-index'

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

describe('CoverLettersIndex', () => {
  it('lists tracked and adhoc letters with job context + persona names, and no generator on the page', async () => {
    mockGets(LETTERS)
    render(<CoverLettersIndex initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    expect(screen.getByText('Initech — cover letter')).toBeInTheDocument()
    expect(screen.getByText('Initech · Staff Eng')).toBeInTheDocument()
    expect(await screen.findByText('Acme · SWE')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Cover letters' })).getByText('Backend')).toBeInTheDocument()
    // The generator is NOT on the page until the New sheet is opened.
    expect(screen.queryByRole('button', { name: 'Generate cover letter' })).not.toBeInTheDocument()
  })

  it('navigates to the editor route when a row is selected', async () => {
    mockGets(LETTERS)
    render(<CoverLettersIndex initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    await userEvent.click(screen.getByText('Acme — cover letter'))
    expect(push).toHaveBeenCalledWith('/app/cover-letters/cl1')
  })

  it('opens the New sheet and generates, then routes to the new letter', async () => {
    const NEW: CoverLetter = { ...TRACKED, id: 'cl3', bodyMarkdown: 'Fresh draft' }
    mockGets(LETTERS)
    api.post.mockResolvedValue(NEW)
    render(<CoverLettersIndex initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /new cover letter/i }))
    await screen.findByRole('option', { name: 'SWE — Acme' })
    await userEvent.selectOptions(screen.getByLabelText('Job'), 'j1')
    await userEvent.click(screen.getByRole('button', { name: 'Generate cover letter' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/cover-letters', { personaId: 'p1', jobId: 'j1' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/cover-letters/cl3'))
  })

  it('deletes a letter from its row', async () => {
    mockGets(LETTERS)
    api.delete.mockResolvedValue(undefined)
    render(<CoverLettersIndex initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'Delete Acme — cover letter' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/cover-letters/cl1'))
  })

  it('shows the AI-off hint inside the New sheet but still lists the library', async () => {
    mockGets(LETTERS)
    render(<CoverLettersIndex initialPersonas={PERSONAS} initialLetters={LETTERS} aiStatus={AI_OFF} />, { wrapper })
    expect(screen.getByText('Acme — cover letter')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /new cover letter/i }))
    expect(screen.getByText(/not configured/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate cover letter' })).not.toBeInTheDocument()
  })

  it('shows a create-persona hint in the sheet when there are no personas', async () => {
    mockGets(LETTERS, [])
    render(<CoverLettersIndex initialPersonas={[]} initialLetters={LETTERS} aiStatus={AI_ON} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /new cover letter/i }))
    expect(screen.getByRole('link', { name: /create a persona/i })).toHaveAttribute('href', '/app/personas')
  })

  it('uses generator-aware empty copy and heals from failed SSR (undefined initial data)', async () => {
    mockGets([])
    render(<CoverLettersIndex aiStatus={AI_ON} />, { wrapper })
    expect(await screen.findByText('No cover letters yet — create your first one.')).toBeInTheDocument()
  })
})
