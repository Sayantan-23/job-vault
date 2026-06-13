import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// react-pdf's PDFDownloadLink resolves to its node build under jsdom and throws
// ("web specific API"); the plan forbids rendering a PDF in a vitest test, so we
// stub the download button (its real behavior is covered by the live smoke test).
vi.mock('./download-cover-letter-pdf-button', () => ({
  DownloadCoverLetterPdfButton: () => null,
}))

import { CoverLetterEditor } from './cover-letter-editor'

const writeText = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

describe('CoverLetterEditor', () => {
  it('starts in edit mode and emits onChange', async () => {
    const onChange = vi.fn()
    render(<CoverLetterEditor value="Dear" onChange={onChange} fileName="cl.pdf" />)
    await userEvent.type(screen.getByLabelText(/cover letter body/i), '!')
    expect(onChange).toHaveBeenCalled()
  })

  it('copies the body text and shows copied feedback', async () => {
    render(<CoverLetterEditor value="Dear hiring manager" onChange={vi.fn()} fileName="cl.pdf" />)
    await userEvent.click(screen.getByRole('button', { name: /copy text/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Dear hiring manager'))
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  })

  it('switches to preview mode and renders parsed markdown (paragraphs, bold, links)', async () => {
    const md = 'Dear **Hiring** Team,\n\nVisit [my site](https://example.com).'
    render(<CoverLetterEditor value={md} onChange={vi.fn()} fileName="cl.pdf" />)
    // Edit mode shows the raw markdown textarea.
    expect(screen.getByLabelText(/cover letter body/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^preview$/i }))

    // The textarea is gone; the rendered prose is shown instead.
    expect(screen.queryByLabelText(/cover letter body/i)).not.toBeInTheDocument()
    expect(screen.getByText('Hiring').tagName).toBe('STRONG')
    const link = screen.getByRole('link', { name: 'my site' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    // No raw markdown syntax leaks into the preview.
    expect(screen.queryByText(/\*\*Hiring\*\*/)).not.toBeInTheDocument()
  })

  it('marks the active view mode as pressed', async () => {
    render(<CoverLetterEditor value="Dear" onChange={vi.fn()} fileName="cl.pdf" />)
    expect(screen.getByRole('button', { name: /^edit$/i })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /^preview$/i }))
    expect(screen.getByRole('button', { name: /^preview$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^edit$/i })).toHaveAttribute('aria-pressed', 'false')
  })
})
