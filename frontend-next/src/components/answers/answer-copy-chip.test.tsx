import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnswerCopyChip } from './answer-copy-chip'

describe('AnswerCopyChip', () => {
  it('shows the variant label and its character count', () => {
    render(<AnswerCopyChip variant="short" text="12345" question="Why?" onCopied={vi.fn()} />)
    expect(screen.getByRole('button', { name: /copy the short answer to “Why\?”/i })).toBeInTheDocument()
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  it('copies the text and reports the copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const onCopied = vi.fn()

    render(<AnswerCopyChip variant="long" text="the long answer" question="Why?" onCopied={onCopied} />)
    await userEvent.click(screen.getByRole('button', { name: /copy the long answer/i }))

    expect(writeText).toHaveBeenCalledWith('the long answer')
    expect(onCopied).toHaveBeenCalledTimes(1)
  })
})
