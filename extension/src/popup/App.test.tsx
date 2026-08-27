import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
