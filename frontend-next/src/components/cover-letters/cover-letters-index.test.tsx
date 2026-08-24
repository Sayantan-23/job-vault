import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Persona, AiStatus } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'
import type { CoverLetter } from '@/types/cover-letter'
import { AI_STATUS_KEY, COVER_LETTERS_KEY, PERSONAS_KEY } from '@/lib/query-keys'

// The New sheet is URL-driven (?new=1 / ?job=), so navigation is mocked with a
// mutable params holder a test can set before render.
const nav = vi.hoisted(() => ({ push: vi.fn(), params: new URLSearchParams() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  usePathname: () => '/app/cover-letters',
  useSearchParams: () => nav.params,
}))
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

// Stands in for the server prefetch the page hydrates before this renders.
// Anything left unseeded is fetched by the hook, exactly as it would be after a
// failed server read. staleTime mirrors production so seeded data isn't
// immediately refetched.
function seeded({
  personas,
  letters,
  status = AI_ON,
}: { personas?: Persona[]; letters?: CoverLetter[]; status?: AiStatus } = {}) {
  const c = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  })
  c.setQueryData(AI_STATUS_KEY, status)
  if (personas) c.setQueryData(PERSONAS_KEY, personas)
  if (letters) c.setQueryData(COVER_LETTERS_KEY, letters)
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={c}>{children}</QueryClientProvider>
  }
}

function mockGets(letters: CoverLetter[], personas: Persona[] = PERSONAS) {
  api.get.mockImplementation((path: string) => {
    if (path.startsWith('/api/jobs')) return Promise.resolve(JOBS)
    if (path.startsWith('/api/cover-letters')) return Promise.resolve(letters)
    if (path.startsWith('/api/personas')) return Promise.resolve(personas)
    return Promise.resolve([])
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  nav.params = new URLSearchParams()
})

describe('CoverLettersIndex', () => {
  it('lists tracked and adhoc letters with job context + persona names, and no generator on the page', async () => {
    mockGets(LETTERS)
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: PERSONAS, letters: LETTERS }) })
    expect(screen.getByText('Initech — cover letter')).toBeInTheDocument()
    expect(screen.getByText('Initech · Staff Eng')).toBeInTheDocument()
    expect(await screen.findByText('Acme · SWE')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Cover letters' })).getByText('Backend')).toBeInTheDocument()
    // The generator lives in the (closed) sheet — not mounted on the page.
    expect(screen.queryByRole('button', { name: 'Generate cover letter' })).not.toBeInTheDocument()
  })

  it('navigates to the editor route when a row is selected', async () => {
    mockGets(LETTERS)
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: PERSONAS, letters: LETTERS }) })
    await userEvent.click(screen.getByText('Acme — cover letter'))
    expect(nav.push).toHaveBeenCalledWith('/app/cover-letters/cl1')
  })

  it('opens the New sheet by routing to ?new=1', async () => {
    mockGets(LETTERS)
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: PERSONAS, letters: LETTERS }) })
    await userEvent.click(screen.getByRole('button', { name: /new cover letter/i }))
    expect(nav.push).toHaveBeenCalledWith('/app/cover-letters?new=1')
  })

  it('renders the generator when the URL carries ?new=1', async () => {
    nav.params = new URLSearchParams('new=1')
    mockGets(LETTERS)
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: PERSONAS, letters: LETTERS }) })
    expect(await screen.findByRole('button', { name: 'Generate cover letter' })).toBeInTheDocument()
  })

  it('pre-selects the tracked job from ?job= when the sheet is opened', async () => {
    nav.params = new URLSearchParams('new=1&job=j1')
    mockGets(LETTERS)
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: PERSONAS, letters: LETTERS }) })
    await screen.findByRole('option', { name: 'SWE — Acme' })
    expect(screen.getByLabelText('Job')).toHaveValue('j1')
  })

  it('generates from the open sheet, then routes to the new letter', async () => {
    nav.params = new URLSearchParams('new=1')
    const NEW: CoverLetter = { ...TRACKED, id: 'cl3', bodyMarkdown: 'Fresh draft' }
    mockGets(LETTERS)
    api.post.mockResolvedValue(NEW)
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: PERSONAS, letters: LETTERS }) })

    await screen.findByRole('option', { name: 'SWE — Acme' })
    await userEvent.selectOptions(screen.getByLabelText('Job'), 'j1')
    await userEvent.click(screen.getByRole('button', { name: 'Generate cover letter' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/cover-letters', { personaId: 'p1', jobId: 'j1' }))
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/app/cover-letters/cl3'))
  })

  it('routes back to the bare path when the sheet is dismissed', async () => {
    nav.params = new URLSearchParams('new=1')
    mockGets(LETTERS)
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: PERSONAS, letters: LETTERS }) })
    await screen.findByRole('button', { name: 'Generate cover letter' })
    await userEvent.keyboard('{Escape}')
    expect(nav.push).toHaveBeenCalledWith('/app/cover-letters')
  })

  it('deletes a letter from its row', async () => {
    mockGets(LETTERS)
    api.delete.mockResolvedValue(undefined)
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: PERSONAS, letters: LETTERS }) })
    await userEvent.click(screen.getByRole('button', { name: 'Delete Acme — cover letter' }))
    // A confirmation dialog gates the delete.
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/cover-letters/cl1'))
  })

  it('shows the AI-off hint inside the New sheet but still lists the library', async () => {
    nav.params = new URLSearchParams('new=1')
    mockGets(LETTERS)
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: PERSONAS, letters: LETTERS, status: AI_OFF }) })
    expect(screen.getByText('Acme — cover letter')).toBeInTheDocument()
    expect(screen.getByText(/not configured/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate cover letter' })).not.toBeInTheDocument()
  })

  it('shows a create-persona hint in the sheet when there are no personas', async () => {
    nav.params = new URLSearchParams('new=1')
    mockGets(LETTERS, [])
    render(<CoverLettersIndex />, { wrapper: seeded({ personas: [], letters: LETTERS }) })
    expect(screen.getByRole('link', { name: /create a persona/i })).toHaveAttribute('href', '/app/personas')
  })

  it('uses generator-aware empty copy and heals when the server prefetch failed', async () => {
    mockGets([])
    render(<CoverLettersIndex />, { wrapper: seeded() })
    expect(await screen.findByText('No cover letters yet — create your first one.')).toBeInTheDocument()
  })
})
