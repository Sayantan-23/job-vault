import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnswerDrawer } from './answer-drawer'
import type { Answer } from '@/types/answer'

const generateMutate = vi.fn(
  (_input: unknown, opts?: { onSuccess?: (draft: { short: string; long: string }) => void }) =>
    opts?.onSuccess?.({ short: 'A-draft-short', long: 'A-draft-long' }),
)

vi.mock('@/hooks/use-answers', () => ({
  useCreateAnswer: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useUpdateAnswer: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useGenerateAnswer: () => ({ mutate: generateMutate, reset: vi.fn(), isPending: false, error: null }),
}))

const answerA: Answer = {
  id: 'a1',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  userId: 'u1',
  question: 'Why are you leaving?',
  answerShort: 'Growth.',
  answerLong: null,
  lastUsedAt: null,
}

const answerB: Answer = { ...answerA, id: 'a2', question: 'Describe your responsibilities', answerShort: 'Billing.' }

const props = {
  isNew: false,
  personas: [{ id: 'p1', name: 'Backend' }],
  aiEnabled: true,
  onClose: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('AnswerDrawer', () => {
  it('announces the heading once — the visible title IS the sheet title', () => {
    render(<AnswerDrawer {...props} answer={answerA} />)
    expect(screen.getAllByRole('heading', { name: 'Edit answer' })).toHaveLength(1)
  })

  it('opens without selecting the question text', () => {
    render(<AnswerDrawer {...props} answer={answerA} />)
    const question = screen.getByLabelText('Question') as HTMLInputElement
    expect(document.activeElement).not.toBe(question)
    expect(question.selectionStart).toBe(question.selectionEnd)
  })

  it('drops the previous answer’s draft when a different answer is opened', async () => {
    const { rerender } = render(<AnswerDrawer {...props} answer={answerA} />)
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(screen.getByText('A-draft-short')).toBeInTheDocument()

    rerender(<AnswerDrawer {...props} answer={answerB} />)

    expect(screen.queryByText('A-draft-short')).not.toBeInTheDocument()
    expect(screen.queryByText('A-draft-long')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Short answer')).toHaveValue('Billing.')
    expect(screen.getByLabelText('Long answer')).toHaveValue('')
  })
})
