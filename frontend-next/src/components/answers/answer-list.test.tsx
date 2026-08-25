import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnswerList } from './answer-list'
import type { Answer } from '@/types/answer'

const base: Answer = {
  id: 'a1',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  userId: 'u1',
  question: 'Why are you leaving?',
  answerShort: 'Growth.',
  answerLong: 'A much longer explanation of the same thing.',
  lastUsedAt: null,
}

const noop = { onSelect: vi.fn(), onDelete: vi.fn(), onCopied: vi.fn() }

describe('AnswerList', () => {
  it('renders the editorial empty state when there is nothing', () => {
    render(<AnswerList answers={[]} {...noop} />)
    expect(screen.getByText(/no saved answers yet/i)).toBeInTheDocument()
  })

  it('renders one chip per present variant', () => {
    render(<AnswerList answers={[base]} {...noop} />)
    expect(screen.getByRole('button', { name: /copy the short answer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy the long answer/i })).toBeInTheDocument()
  })

  it('omits the chip for an absent variant', () => {
    render(<AnswerList answers={[{ ...base, answerLong: null }]} {...noop} />)
    expect(screen.queryByRole('button', { name: /copy the long answer/i })).not.toBeInTheDocument()
  })

  it('selects the row when the row itself is clicked', async () => {
    const onSelect = vi.fn()
    render(<AnswerList answers={[base]} {...noop} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Why are you leaving?'))
    expect(onSelect).toHaveBeenCalledWith('a1')
  })

  it('does not select the row when a copy chip is clicked', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const onSelect = vi.fn()
    render(<AnswerList answers={[base]} {...noop} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /copy the short answer/i }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not select the row when delete is clicked', async () => {
    const onSelect = vi.fn()
    const onDelete = vi.fn()
    render(<AnswerList answers={[base]} {...noop} onSelect={onSelect} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('a1')
    expect(onSelect).not.toHaveBeenCalled()
  })
})
