import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
const { insertAnswer } = await import('@/popup/capture')

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

const twoFields: AnswerField[] = [
  field(),
  field({ fieldId: 'jv-2', question: 'What are your salary expectations for this role?' }),
]

beforeEach(() => {
  vi.mocked(listAnswers).mockResolvedValue(answers)
  vi.mocked(insertAnswer).mockResolvedValue(true)
  vi.stubGlobal('chrome', { tabs: { create: vi.fn() } })
})
afterEach(() => vi.unstubAllGlobals())

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

  it('lists every detected question as a chip and selects the first', async () => {
    render(<AnswersView fields={twoFields} tabId={7} onSettings={() => {}} />)
    const chips = await screen.findAllByRole('tab')
    expect(chips).toHaveLength(2)
    expect(chips[0]!).toHaveTextContent('Why do you want to work at Acme?')
    expect(chips[1]!).toHaveTextContent('What are your salary expectations for this role?')
    expect(chips[0]!).toHaveAttribute('aria-selected', 'true')
  })

  it('re-ranks the list against the picked question', async () => {
    render(<AnswersView fields={twoFields} tabId={7} onSettings={() => {}} />)
    const before = await screen.findAllByRole('article')
    expect(before[0]!).toHaveTextContent('Why do you want to work at this company?')

    await userEvent.click(screen.getByRole('tab', { name: /salary expectations/i }))
    expect(screen.getAllByRole('article')[0]!).toHaveTextContent('What are your salary expectations?')
  })

  it('re-targets insert at the picked question’s field', async () => {
    render(<AnswersView fields={twoFields} tabId={7} onSettings={() => {}} />)
    await screen.findAllByRole('article')
    await userEvent.click(screen.getByRole('tab', { name: /salary expectations/i }))
    await userEvent.click(screen.getAllByRole('button', { name: /^insert$/i })[0]!)

    expect(insertAnswer).toHaveBeenCalledWith(7, 'jv-2', expect.any(String))
  })

  it('renders no switcher when the page asks a single question', async () => {
    render(<AnswersView fields={[field()]} tabId={7} onSettings={() => {}} />)
    expect(await screen.findByText('Why do you want to work at Acme?')).toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
  })

  it('confirms an insert on the row and keeps the popup open', async () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    render(<AnswersView fields={[field()]} tabId={7} onSettings={() => {}} />)
    const inserts = await screen.findAllByRole('button', { name: /^insert$/i })
    await userEvent.click(inserts[0]!)

    expect(await screen.findByRole('button', { name: /inserted/i })).toBeInTheDocument()
    expect(close).not.toHaveBeenCalled()
    close.mockRestore()
  })

  it('drops a variant override when the question changes, so a capped field re-defaults', async () => {
    const capped: AnswerField[] = [
      field(),
      field({
        fieldId: 'jv-2',
        question: 'What are your salary expectations for this role?',
        maxLength: 15,
      }),
    ]
    render(<AnswersView fields={capped} tabId={7} onSettings={() => {}} />)
    await screen.findAllByRole('article')

    const row = () => screen.getByText('Why do you want to work at this company?').closest('article')!
    await userEvent.click(within(row()).getByRole('radio', { name: /long/i }))
    expect(within(row()).getByRole('radio', { name: /long/i })).toBeChecked()

    await userEvent.click(screen.getByRole('tab', { name: /salary expectations/i }))
    expect(within(row()).getByRole('radio', { name: /short/i })).toBeChecked()
  })

  it('opens the web app in a tab rather than navigating the popup', async () => {
    render(<AnswersView fields={[]} tabId={7} onSettings={() => {}} />)
    await userEvent.click(await screen.findByRole('link', { name: /browse all/i }))
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'http://localhost:8080/app/answers' })
  })
})
