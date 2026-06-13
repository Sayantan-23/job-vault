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

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/cover-letters/cl1/refine', { action: 'humanize' }),
    )
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
      expect(api.post).toHaveBeenCalledWith('/api/cover-letters/cl1/refine', {
        action: 'custom',
        instructions: 'Make it warmer',
      }),
    )
  })

  it('shows the returned candidate in a preview with Replace / Try again / Discard', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'A warmer, friendlier opener.' })
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={vi.fn()} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /shorten/i }))

    expect(await screen.findByText('A warmer, friendlier opener.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^replace$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument()
  })

  it('Replace calls onApply(candidate) then reveals an Undo control that restores currentBody', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'The committed rewrite.' })
    const onApply = vi.fn()
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={onApply} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /fix grammar/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^replace$/i }))

    expect(onApply).toHaveBeenCalledWith('The committed rewrite.')
    // The staged preview is cleared.
    expect(screen.queryByText('The committed rewrite.')).not.toBeInTheDocument()

    const undo = await screen.findByRole('button', { name: /undo/i })
    await userEvent.click(undo)
    expect(onApply).toHaveBeenLastCalledWith(CURRENT)
  })

  it('Discard removes the preview without calling onApply', async () => {
    api.post.mockResolvedValue({ bodyMarkdown: 'A discarded candidate.' })
    const onApply = vi.fn()
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={onApply} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /humanize/i }))
    await userEvent.click(await screen.findByRole('button', { name: /discard/i }))

    expect(screen.queryByText('A discarded candidate.')).not.toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('renders an alert when the refine mutation fails', async () => {
    api.post.mockRejectedValue(new Error('AI is unavailable'))
    render(<CoverLetterRefine coverLetterId="cl1" currentBody={CURRENT} onApply={vi.fn()} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /humanize/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('AI is unavailable')
  })
})
