import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

vi.mock('@/lib/storage', () => ({
  getToken: vi.fn().mockResolvedValue('key-123'),
  getSettings: vi.fn().mockResolvedValue({ serverUrl: 'http://localhost:8080' }),
  clearToken: vi.fn(),
}))
vi.mock('@/lib/api', () => ({
  verifyKey: vi.fn().mockResolvedValue({ ok: true, user: { email: 'a@b.c' } }),
  listAnswers: vi.fn().mockResolvedValue([]),
  markAnswerUsed: vi.fn(),
  checkUrl: vi.fn().mockResolvedValue({ isDuplicate: false }),
  quickCreate: vi.fn(),
}))
vi.mock('./capture', () => ({ readPage: vi.fn(), insertAnswer: vi.fn() }))

const { readPage } = await import('./capture')
const { listAnswers, checkUrl } = await import('@/lib/api')

const job = {
  title: 'Engineer',
  company: 'Acme',
  sourceUrl: 'https://x',
  platform: 'generic',
  confidence: 'ok',
} as const

beforeEach(() => vi.clearAllMocks())

describe('App tab preselection', () => {
  it('opens on Answers when the page has essay fields', async () => {
    vi.mocked(readPage).mockResolvedValue({
      job: { ...job },
      fields: [{ fieldId: 'jv-1', question: 'Why us?', maxLength: null }],
      tabId: 7,
    })
    render(<App />)
    expect(await screen.findByRole('tab', { name: 'Answers' })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens on Save job when the page has none', async () => {
    vi.mocked(readPage).mockResolvedValue({ job: { ...job }, fields: [], tabId: 7 })
    render(<App />)
    expect(await screen.findByRole('tab', { name: 'Save job' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows both tabs regardless of context', async () => {
    vi.mocked(readPage).mockResolvedValue({ job: { ...job }, fields: [], tabId: 7 })
    render(<App />)
    expect(await screen.findByRole('tab', { name: 'Answers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Save job' })).toBeInTheDocument()
  })
})

describe('App shell', () => {
  beforeEach(() => {
    vi.mocked(readPage).mockResolvedValue({ job: { ...job }, fields: [], tabId: 7 })
  })

  it('renders the JobVault header above the tab strip', async () => {
    render(<App />)
    const tabs = await screen.findByRole('tablist')
    const header = screen.getByText('JobVault')
    // Exactly FOLLOWING, not a bitmask test: a detached node also reports
    // FOLLOWING|DISCONNECTED, which would pass while proving nothing.
    // The strip belongs under the header, not above it (mockup 4a/4b).
    expect(header.compareDocumentPosition(tabs)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('renders exactly one header', async () => {
    render(<App />)
    await screen.findByRole('tab', { name: 'Save job' })
    expect(screen.getAllByText('JobVault')).toHaveLength(1)
  })

  it('keeps a typed capture edit across a tab switch', async () => {
    render(<App />)
    const title = await screen.findByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Staff Engineer')

    await userEvent.click(screen.getByRole('tab', { name: 'Answers' }))
    // hidden, not unmounted — that is what keeps the edit alive
    expect(title).toBeInTheDocument()
    expect(title).not.toBeVisible()

    await userEvent.click(screen.getByRole('tab', { name: 'Save job' }))
    expect(title).toHaveValue('Staff Engineer')
  })

  it('costs no answers request until the Answers tab is first shown', async () => {
    render(<App />)
    await screen.findByLabelText('Title')
    // Mounted behind <Activity mode="hidden">, whose effects React does not mount.
    expect(listAnswers).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('tab', { name: 'Answers' }))
    await waitFor(() => expect(listAnswers).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('tab', { name: 'Save job' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Answers' }))
    expect(listAnswers).toHaveBeenCalledTimes(1)
  })

  it('checks the URL for a duplicate once, not again on every return', async () => {
    render(<App />)
    await screen.findByLabelText('Title')
    await waitFor(() => expect(checkUrl).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('tab', { name: 'Answers' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Save job' }))

    expect(checkUrl).toHaveBeenCalledTimes(1)
  })
})
