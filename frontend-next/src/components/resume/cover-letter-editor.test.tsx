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
  it('edits the body and emits onChange', async () => {
    const onChange = vi.fn()
    render(<CoverLetterEditor value="Dear" onChange={onChange} fileName="cl.pdf" />)
    await userEvent.type(screen.getByLabelText(/cover letter body/i), '!')
    expect(onChange).toHaveBeenCalled()
  })
  it('copies the body text', async () => {
    render(<CoverLetterEditor value="Dear hiring manager" onChange={vi.fn()} fileName="cl.pdf" />)
    await userEvent.click(screen.getByRole('button', { name: /copy text/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Dear hiring manager'))
  })
})
