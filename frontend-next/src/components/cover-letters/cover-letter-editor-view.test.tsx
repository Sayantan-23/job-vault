import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { CoverLetter } from '@/types/cover-letter'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError: class extends Error {} }))
// Stub the heavy editor (react-pdf etc.) and surface the props we care about.
vi.mock('@/components/resume/cover-letter-editor', () => ({
  CoverLetterEditor: (props: { value: string; coverLetterId?: string }) => (
    <div data-testid="editor" data-id={props.coverLetterId ?? ''}>{props.value}</div>
  ),
}))

import { apiClient } from '@/lib/api-client'
import { CoverLetterEditorView } from './cover-letter-editor-view'

const api = vi.mocked(apiClient)
const LETTER: CoverLetter = {
  id: 'cl1', createdAt: '', updatedAt: '', userId: 'u1',
  jobId: null, adhocJob: { title: 'Staff Eng', company: 'Acme' }, personaId: 'p1',
  title: 'Acme — cover letter', instructions: null, bodyMarkdown: 'Dear Acme team,',
}
const AI_ON = { enabled: true, maxPersonas: 5 }
const AI_OFF = { enabled: false, maxPersonas: 5 }

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockResolvedValue(LETTER)
})

describe('CoverLetterEditorView', () => {
  it('renders the letter title and body, with AI refine enabled when AI is on', () => {
    render(<CoverLetterEditorView initialLetter={LETTER} aiStatus={AI_ON} />, { wrapper })
    expect(screen.getByRole('heading', { name: 'Acme — cover letter' })).toBeInTheDocument()
    const editor = screen.getByTestId('editor')
    expect(editor).toHaveTextContent('Dear Acme team,')
    expect(editor).toHaveAttribute('data-id', 'cl1') // coverLetterId passed → refine on
  })

  it('omits the coverLetterId (AI refine) when AI is disabled', () => {
    render(<CoverLetterEditorView initialLetter={LETTER} aiStatus={AI_OFF} />, { wrapper })
    expect(screen.getByTestId('editor')).toHaveAttribute('data-id', '')
  })

  it('saves the edited body via PATCH', async () => {
    api.patch.mockResolvedValue(LETTER)
    render(<CoverLetterEditorView initialLetter={LETTER} aiStatus={AI_ON} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'Save edits' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/cover-letters/cl1', { bodyMarkdown: 'Dear Acme team,' }))
  })

  it('deletes and routes back to the index', async () => {
    api.delete.mockResolvedValue(undefined)
    render(<CoverLetterEditorView initialLetter={LETTER} aiStatus={AI_ON} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/cover-letters/cl1'))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/cover-letters'))
  })

  it('links back to the cover-letters index', () => {
    render(<CoverLetterEditorView initialLetter={LETTER} aiStatus={AI_ON} />, { wrapper })
    expect(screen.getByRole('link', { name: /cover letters/i })).toHaveAttribute('href', '/app/cover-letters')
  })
})
