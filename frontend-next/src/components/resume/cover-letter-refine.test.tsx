import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { CoverLetterRefine } from './cover-letter-refine'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}

const CURRENT = 'Dear hiring manager, I am writing to apply.'

beforeEach(() => vi.clearAllMocks())

describe('CoverLetterRefine', () => {
  it('clicking Humanize calls the refine mutation with { action: humanize }', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'Hey there, I would love to apply.' })
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={vi.fn()} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /humanize/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/cover-letters/cl1/refine', { action: 'humanize' }))
  })

  it('disables the custom submit until text is entered, then sends { action: custom, instructions }', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'Rewritten.' })
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={vi.fn()} />, { wrapper })
    const submit = screen.getByRole('button', { name: /^improve$/i })
    expect(submit).toBeDisabled()
    await userEvent.type(screen.getByPlaceholderText(/tell the ai what to change/i), 'Make it warmer')
    expect(submit).toBeEnabled()
    await userEvent.click(submit)
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/cover-letters/cl1/refine', { action: 'custom', instructions: 'Make it warmer' }),
    )
  })

  it('shows the returned candidate in a proposal with Keep / Try again / Discard and signals staged', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'A warmer, friendlier opener.' })
    const onStagedChange = vi.fn()
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={vi.fn()} onStagedChange={onStagedChange} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /shorten/i }))
    expect(await screen.findByText('A warmer, friendlier opener.')).toBeInTheDocument()
    expect(screen.getByText(/proposed rewrite/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^keep$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^try again$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^discard$/i })).toBeInTheDocument()
    await waitFor(() => expect(onStagedChange).toHaveBeenLastCalledWith(true))
  })

  it('Keep applies the candidate, signals un-staged, then offers Undo to restore', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'The committed rewrite.' })
    const onApply = vi.fn()
    const onStagedChange = vi.fn()
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={onApply} onStagedChange={onStagedChange} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /fix grammar/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^keep$/i }))
    expect(onApply).toHaveBeenCalledWith('The committed rewrite.')
    await waitFor(() => expect(onStagedChange).toHaveBeenLastCalledWith(false))
    expect(screen.getByText(/save edits to keep it/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /undo/i }))
    expect(onApply).toHaveBeenLastCalledWith(CURRENT)
  })

  it('Discard removes the proposal without applying', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'A discarded candidate.' })
    const onApply = vi.fn()
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={onApply} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /humanize/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^discard$/i }))
    expect(screen.queryByText('A discarded candidate.')).not.toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('discards a staged candidate when the target letter changes', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'Candidate for letter one.' })
    const { rerender } = render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={vi.fn()} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /humanize/i }))
    expect(await screen.findByText('Candidate for letter one.')).toBeInTheDocument()
    rerender(<CoverLetterRefine coverLetterId="cl2" currentBody="A different letter." onApply={vi.fn()} />)
    expect(screen.queryByText('Candidate for letter one.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^keep$/i })).not.toBeInTheDocument()
  })

  it('resets the proposal view (back to diff) when Try again returns a fresh grammar candidate', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'I have five years of experience.' })
    render(<CoverLetterRefine coverLetterId="cl1" currentBody="I has five year of experience." onApply={vi.fn()} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /fix grammar/i }))
    // Grammar defaults to the diff → toggle offers "Show clean".
    expect(await screen.findByRole('button', { name: /show clean/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /show clean/i }))
    expect(screen.getByRole('button', { name: /show diff/i })).toBeInTheDocument()
    // Try again → fresh candidate remounts the proposal back to the diff view.
    await userEvent.click(screen.getByRole('button', { name: /^try again$/i }))
    expect(await screen.findByRole('button', { name: /show clean/i })).toBeInTheDocument()
  })

  it('renders an alert when the refine mutation fails', async () => {
    api.post.mockRejectedValue(new Error('AI is unavailable'))
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={vi.fn()} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /humanize/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('AI is unavailable')
  })
})
