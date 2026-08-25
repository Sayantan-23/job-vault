import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnswersIndex } from './answers-index'
import type { Answer } from '@/types/answer'

const push = vi.fn()
let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/app/answers',
  useSearchParams: () => searchParams,
}))

const answers: Answer[] = [
  {
    id: 'a1',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    userId: 'u1',
    question: 'Why are you leaving?',
    answerShort: 'Growth.',
    answerLong: null,
    lastUsedAt: null,
  },
  {
    id: 'a2',
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-02T10:00:00.000Z',
    userId: 'u1',
    question: 'Describe your responsibilities',
    answerShort: 'I owned the billing service.',
    answerLong: null,
    lastUsedAt: null,
  },
]

const removeMutate = vi.fn()
const markUsedMutate = vi.fn()

vi.mock('@/hooks/use-answers', () => ({
  useAnswers: () => ({ data: answers }),
  useDeleteAnswer: () => ({ mutate: removeMutate }),
  useMarkAnswerUsed: () => ({ mutate: markUsedMutate }),
  useCreateAnswer: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useUpdateAnswer: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
  useGenerateAnswer: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@/hooks/use-personas', () => ({ usePersonas: () => ({ data: [{ id: 'p1', name: 'Backend' }] }) }))
vi.mock('@/hooks/use-ai-status', () => ({ useAiStatus: () => ({ data: { enabled: true, maxPersonas: 5 } }) }))

beforeEach(() => {
  vi.clearAllMocks()
  searchParams = new URLSearchParams()
})

describe('AnswersIndex', () => {
  it('lists every saved answer', () => {
    render(<AnswersIndex />)
    expect(screen.getByText('Why are you leaving?')).toBeInTheDocument()
    expect(screen.getByText('Describe your responsibilities')).toBeInTheDocument()
  })

  it('narrows the list as the filter is typed', async () => {
    render(<AnswersIndex />)
    await userEvent.type(screen.getByPlaceholderText(/search answers/i), 'leaving')
    // SearchInput debounces by 300ms, so the filter lands asynchronously.
    await waitFor(() => expect(screen.queryByText('Describe your responsibilities')).not.toBeInTheDocument())
    expect(screen.getByText('Why are you leaving?')).toBeInTheDocument()
  })

  it('matches the filter against answer bodies too, not just the question', async () => {
    render(<AnswersIndex />)
    await userEvent.type(screen.getByPlaceholderText(/search answers/i), 'billing')
    await waitFor(() => expect(screen.queryByText('Why are you leaving?')).not.toBeInTheDocument())
    expect(screen.getByText('Describe your responsibilities')).toBeInTheDocument()
  })

  it('opens a row by pushing ?answer=<id>', async () => {
    render(<AnswersIndex />)
    await userEvent.click(screen.getByText('Why are you leaving?'))
    expect(push).toHaveBeenCalledWith('/app/answers?answer=a1')
  })

  it('confirms before deleting', async () => {
    render(<AnswersIndex />)
    await userEvent.click(screen.getByRole('button', { name: /delete “Why are you leaving\?”/i }))
    expect(removeMutate).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(removeMutate).toHaveBeenCalledWith('a1')
  })

  it('stamps the answer as used when a copy chip is clicked', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    render(<AnswersIndex />)
    await userEvent.click(screen.getByRole('button', { name: /copy the short answer to “Why are you leaving\?”/i }))
    expect(markUsedMutate).toHaveBeenCalledWith('a1')
  })
})
