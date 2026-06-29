import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyButton } from './copy-button'

const writeText = vi.fn().mockResolvedValue(undefined)
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(navigator, { clipboard: { writeText } })
})

describe('CopyButton', () => {
  it('copies the resolved text and flips to the copied label', async () => {
    render(<CopyButton getText={() => 'hello'} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith('hello')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('awaits an async getText before writing, with custom labels', async () => {
    render(<CopyButton getText={async () => 'tex-source'} label="Copy LaTeX" copiedLabel="Copied" />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy LaTeX' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('tex-source'))
  })

  it('swallows a clipboard rejection without flipping the label', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    render(<CopyButton getText={() => 'x'} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))
    // Still the idle label — the error is caught, nothing thrown.
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })
})
