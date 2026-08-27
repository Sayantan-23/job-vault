import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnswersView } from './AnswersView'
import type { SavedAnswer } from '@/lib/api'
import type { AnswerField } from '@/content/answer-fields'

vi.mock('@/lib/api', async () => ({
  ...(await vi.importActual<typeof import('@/lib/api')>('@/lib/api')),
  listAnswers: vi.fn(),
  markAnswerUsed: vi.fn().mockResolvedValue({ id: '1' }),
}))
vi.mock('@/lib/storage', () => ({
  getToken: vi.fn().mockResolvedValue('key-123'),
  getSettings: vi.fn().mockResolvedValue({ serverUrl: 'http://localhost:8080' }),
}))
// Importing capture.ts for real pulls in the content script (chrome APIs at load).
vi.mock('@/popup/capture', () => ({ insertAnswer: vi.fn().mockResolvedValue(true) }))

const { listAnswers, markAnswerUsed } = await import('@/lib/api')

const answers: SavedAnswer[] = [
  {
    id: '1',
    question: 'Why do you want to work at this company?',
    answerShort: 'Short one.',
    answerLong: 'Long one, much longer.',
    lastUsedAt: null,
  },
  {
    id: '2',
    question: 'What are your salary expectations?',
    answerShort: 'Market rate.',
    answerLong: null,
    lastUsedAt: null,
  },
]

const field = (over: Partial<AnswerField> = {}): AnswerField => ({
  fieldId: 'jv-1',
  question: 'Why do you want to work at Acme?',
  maxLength: null,
  ...over,
})

beforeEach(() => {
  vi.mocked(listAnswers).mockResolvedValue(answers)
})

describe('AnswersView', () => {
  it('floats the matching answer to the top and marks it', async () => {
    render(<AnswersView fields={[field()]} tabId={7} onSettings={() => {}} />)
    const rows = await screen.findAllByRole('article')
    expect(rows[0]!).toHaveTextContent('Why do you want to work at this company?')
    expect(rows[0]!).toHaveTextContent(/match/i)
  })

  it('shows the detected question', async () => {
    render(<AnswersView fields={[field()]} tabId={7} onSettings={() => {}} />)
    expect(await screen.findByText('Why do you want to work at Acme?')).toBeInTheDocument()
  })

  it('offers copy only when no field was detected', async () => {
    render(<AnswersView fields={[]} tabId={7} onSettings={() => {}} />)
    await screen.findAllByRole('article')
    expect(screen.queryByRole('button', { name: /insert/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /copy/i }).length).toBeGreaterThan(0)
  })

  it('preselects the short variant when the field caps below the long one', async () => {
    render(<AnswersView fields={[field({ maxLength: 15 })]} tabId={7} onSettings={() => {}} />)
    const short = (await screen.findAllByRole('radio', { name: /short/i }))[0]!
    expect(short).toBeChecked()
  })

  it('stamps last-used after a copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<AnswersView fields={[]} tabId={7} onSettings={() => {}} />)
    const copies = await screen.findAllByRole('button', { name: /copy/i })
    await userEvent.click(copies[0]!)

    expect(writeText).toHaveBeenCalled()
    expect(markAnswerUsed).toHaveBeenCalled()
  })

  it('filters the list by the search box', async () => {
    render(<AnswersView fields={[]} tabId={7} onSettings={() => {}} />)
    await screen.findAllByRole('article')
    await userEvent.type(screen.getByRole('searchbox'), 'salary')
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('offers a way out when nothing matches well', async () => {
    render(
      <AnswersView
        fields={[field({ question: 'Describe your favourite programming language.' })]}
        tabId={7}
        onSettings={() => {}}
      />,
    )
    expect(await screen.findByRole('link', { name: /write an answer/i })).toBeInTheDocument()
  })

  it('shows an empty state with a CTA when nothing is saved', async () => {
    vi.mocked(listAnswers).mockResolvedValue([])
    render(<AnswersView fields={[]} tabId={7} onSettings={() => {}} />)
    expect(await screen.findByText(/nothing saved yet/i)).toBeInTheDocument()
  })
})
