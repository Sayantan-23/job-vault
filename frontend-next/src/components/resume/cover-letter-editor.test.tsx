import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// react-pdf's PDFDownloadLink resolves to its node build under jsdom and throws
// ("web specific API"); stub the download button (covered by the live smoke test).
vi.mock('./download-cover-letter-pdf-button', () => ({ DownloadCoverLetterPdfButton: () => null }))

// The refine workflow has its own hook + component tests; mock the hook so this
// unit test drives the editor's own wiring (rail vs body, staged vs not).
vi.mock('@/hooks/use-cover-letter-refine', () => ({ useCoverLetterRefine: vi.fn() }))

import { useCoverLetterRefine } from '@/hooks/use-cover-letter-refine'
import { CoverLetterEditor } from './cover-letter-editor'

const mockRefine = vi.mocked(useCoverLetterRefine)
type RefineState = ReturnType<typeof useCoverLetterRefine>
const inert = (): RefineState => ({
  busy: false, error: null, staged: false, candidate: null, lastAction: null, undoBody: null, proposalSeq: 0,
  run: vi.fn(), tryAgain: vi.fn(), keep: vi.fn(), discard: vi.fn(), undo: vi.fn(),
})

const writeText = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  mockRefine.mockReturnValue(inert())
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

describe('CoverLetterEditor', () => {
  it('starts in edit mode and emits onChange', async () => {
    const onChange = vi.fn()
    render(<CoverLetterEditor value="Dear" onChange={onChange} fileName="cl.pdf" />)
    await userEvent.type(screen.getByLabelText(/cover letter body/i), '!')
    expect(onChange).toHaveBeenCalled()
  })

  it('copies clean plain text (no markdown syntax) and shows copied feedback', async () => {
    render(<CoverLetterEditor value="Dear **hiring** manager" onChange={vi.fn()} fileName="cl.pdf" />)
    await userEvent.click(screen.getByRole('button', { name: /copy text/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Dear hiring manager'))
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  })

  it('switches to preview mode and renders parsed markdown', async () => {
    render(<CoverLetterEditor value={'Dear **Hiring** Team,\n\nVisit [my site](https://example.com).'} onChange={vi.fn()} fileName="cl.pdf" />)
    expect(screen.getByLabelText(/cover letter body/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^preview$/i }))
    expect(screen.queryByLabelText(/cover letter body/i)).not.toBeInTheDocument()
    expect(screen.getByText('Hiring').tagName).toBe('STRONG')
    expect(screen.getByRole('link', { name: 'my site' })).toHaveAttribute('href', 'https://example.com')
  })

  it('shows the AI refine controls only when a coverLetterId is provided', () => {
    const { rerender } = render(<CoverLetterEditor value="Dear" onChange={vi.fn()} fileName="cl.pdf" />)
    expect(screen.queryByText(/improve with ai/i)).not.toBeInTheDocument()
    rerender(<CoverLetterEditor value="Dear" onChange={vi.fn()} fileName="cl.pdf" coverLetterId="cl_1" />)
    expect(screen.getByText(/improve with ai/i)).toBeInTheDocument()
    // Not staged → the editor body (textarea) is still shown alongside the controls.
    expect(screen.getByLabelText(/cover letter body/i)).toBeInTheDocument()
  })

  it('hides the editor body and shows the proposal while a rewrite is staged', () => {
    mockRefine.mockReturnValue({ ...inert(), staged: true, candidate: 'A friendlier opener.', lastAction: 'humanize' })
    render(<CoverLetterEditor value="Dear team" onChange={vi.fn()} fileName="cl.pdf" coverLetterId="cl_1" />)
    expect(screen.getByText(/proposed rewrite/i)).toBeInTheDocument()
    expect(screen.getByText('A friendlier opener.')).toBeInTheDocument()
    // The editor's own toolbar + textarea are hidden so only one letter is shown.
    expect(screen.queryByLabelText(/cover letter body/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy text/i })).not.toBeInTheDocument()
  })
})
