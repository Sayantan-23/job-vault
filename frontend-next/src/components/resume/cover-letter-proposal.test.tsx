import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoverLetterProposal } from './cover-letter-proposal'

const CURRENT = 'I has five year of experience.'
const PROPOSED = 'I have five years of experience.'

function setup(action: 'humanize' | 'fix-grammar', overrides: Partial<Parameters<typeof CoverLetterProposal>[0]> = {}) {
  const onKeep = vi.fn()
  const onDiscard = vi.fn()
  const onTryAgain = vi.fn()
  render(
    <CoverLetterProposal
      action={action}
      candidate={PROPOSED}
      currentBody={CURRENT}
      busy={false}
      onKeep={onKeep}
      onDiscard={onDiscard}
      onTryAgain={onTryAgain}
      {...overrides}
    />,
  )
  return { onKeep, onDiscard, onTryAgain }
}

describe('CoverLetterProposal', () => {
  it('shows the proposed letter labeled as a proposal with Keep / Show original / Try again / Discard', () => {
    setup('humanize')
    expect(screen.getByText(/proposed rewrite/i)).toBeInTheDocument()
    expect(screen.getByText(PROPOSED)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^keep$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show original/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^try again$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^discard$/i })).toBeInTheDocument()
  })

  it('Show original swaps to the current letter and hides Keep (compare-only)', async () => {
    setup('humanize')
    await userEvent.click(screen.getByRole('button', { name: /show original/i }))
    expect(screen.getByText('Current letter')).toBeInTheDocument()
    expect(screen.getByText(CURRENT)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^keep$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show proposed/i })).toBeInTheDocument()
  })

  it('Keep and Discard call their handlers', async () => {
    const { onKeep, onDiscard } = setup('humanize')
    await userEvent.click(screen.getByRole('button', { name: /^keep$/i }))
    expect(onKeep).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /^discard$/i }))
    expect(onDiscard).toHaveBeenCalled()
  })

  it('Try again re-rolls the same action (no second instruction input here)', async () => {
    const { onTryAgain } = setup('humanize')
    await userEvent.click(screen.getByRole('button', { name: /^try again$/i }))
    expect(onTryAgain).toHaveBeenCalledTimes(1)
    // The proposal has no instruction input — steering lives in the top panel.
    expect(screen.queryByLabelText(/new instructions/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument()
  })

  it('Fix grammar shows a word-diff by default (removed + added words), toggle to clean', async () => {
    setup('fix-grammar')
    // The diff keeps the unchanged words and marks the change.
    expect(screen.getByText('has')).toBeInTheDocument() // removed (struck through)
    expect(screen.getByText('have')).toBeInTheDocument() // inserted
    // Keep stays available in diff view.
    expect(screen.getByRole('button', { name: /^keep$/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /show clean/i }))
    expect(screen.getByText(PROPOSED)).toBeInTheDocument()
  })
})
