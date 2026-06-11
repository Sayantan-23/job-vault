// frontend-next/src/components/personas/create-persona-sheet.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ProfileContent } from '@/types/profile'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), postForm: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { emptyProfileContent } from '@/lib/profile'
import { CreatePersonaSheet } from './create-persona-sheet'

const api = vi.mocked(apiClient)

const buildProfile = (): ProfileContent => ({
  basics: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '', location: 'London', links: [] },
  summary: 'Engineer with a math habit.',
  experience: [
    {
      id: 'exp1',
      company: 'Stripe',
      role: 'Senior Engineer',
      startDate: { month: 1, year: 2022 },
      endDate: null,
      current: true,
      bullets: [],
    },
  ],
  projects: [],
  skills: [],
  education: [],
})

const PARSED: ProfileContent = {
  basics: { name: 'Grace Hopper', email: 'grace@example.com', phone: '', location: '', links: [] },
  summary: 'Compiler pioneer.',
  experience: [],
  projects: [],
  skills: [],
  education: [],
}

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('CreatePersonaSheet', () => {
  it('Build from profile seeds basics + summary, then save posts rawInput null and closes', async () => {
    api.post.mockResolvedValue({ id: 'p1' })
    const onOpenChange = vi.fn()
    render(<CreatePersonaSheet open onOpenChange={onOpenChange} profile={buildProfile()} aiEnabled />, {
      wrapper,
    })

    await userEvent.type(screen.getByLabelText('Persona name'), 'Backend')
    await userEvent.click(screen.getByRole('button', { name: /build from profile/i }))

    // Lands in the edit step with basics + summary copied from the profile;
    // the pickable sections start empty (nothing auto-picked).
    expect(screen.getByLabelText('Full name')).toHaveValue('Ada Lovelace')
    expect(screen.getByLabelText('Professional summary')).toHaveValue('Engineer with a math habit.')
    expect(screen.queryByLabelText('Experience 1 company')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/api/personas',
        expect.objectContaining({
          name: 'Backend',
          rawInput: null,
          data: expect.objectContaining({
            summary: 'Engineer with a math habit.',
            basics: expect.objectContaining({ name: 'Ada Lovelace' }),
            experience: [],
          }),
        }),
      ),
    )
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('seeding deep-copies basics so editing the draft never mutates the profile', async () => {
    const profile = buildProfile()
    render(<CreatePersonaSheet open onOpenChange={vi.fn()} profile={profile} aiEnabled />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /build from profile/i }))
    await userEvent.type(screen.getByLabelText('Full name'), ' X')

    expect(screen.getByLabelText('Full name')).toHaveValue('Ada Lovelace X')
    expect(profile.basics.name).toBe('Ada Lovelace')
  })

  it('Import parses text with AI, lands in edit with parsed data, and save posts the rawText', async () => {
    api.postForm.mockResolvedValue({ content: PARSED, rawText: 'RAW EXTRACTED' })
    api.post.mockResolvedValue({ id: 'p2' })
    render(<CreatePersonaSheet open onOpenChange={vi.fn()} profile={buildProfile()} aiEnabled />, {
      wrapper,
    })

    await userEvent.type(screen.getByLabelText('Persona name'), 'Imported')
    await userEvent.click(screen.getByRole('button', { name: /import a résumé/i }))
    await userEvent.type(screen.getByLabelText(/paste your résumé/i), 'RESUME TEXT')
    await userEvent.click(screen.getByRole('button', { name: /parse with ai/i }))

    expect(await screen.findByLabelText('Full name')).toHaveValue('Grace Hopper')
    expect(api.postForm.mock.calls[0]?.[0]).toBe('/api/personas/parse-resume')
    const form = api.postForm.mock.calls[0]?.[1] as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('text')).toBe('RESUME TEXT')

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/api/personas',
        expect.objectContaining({
          name: 'Imported',
          rawInput: 'RAW EXTRACTED',
          data: expect.objectContaining({ summary: 'Compiler pioneer.' }),
        }),
      ),
    )
  })

  it('surfaces a parse error message (e.g. the hourly rate limit)', async () => {
    api.postForm.mockRejectedValue(new Error('Hourly AI limit reached. Try again later.'))
    render(<CreatePersonaSheet open onOpenChange={vi.fn()} profile={buildProfile()} aiEnabled />, {
      wrapper,
    })

    await userEvent.click(screen.getByRole('button', { name: /import a résumé/i }))
    await userEvent.type(screen.getByLabelText(/paste your résumé/i), 'RESUME TEXT')
    await userEvent.click(screen.getByRole('button', { name: /parse with ai/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/hourly ai limit/i)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('disables the import card (with a hint) when AI is off; build stays enabled', () => {
    render(<CreatePersonaSheet open onOpenChange={vi.fn()} profile={buildProfile()} aiEnabled={false} />, {
      wrapper,
    })
    expect(screen.getByRole('button', { name: /import a résumé/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /build from profile/i })).toBeEnabled()
  })

  it('validation errors block save', async () => {
    render(<CreatePersonaSheet open onOpenChange={vi.fn()} profile={emptyProfileContent()} aiEnabled />, {
      wrapper,
    })

    await userEvent.type(screen.getByLabelText('Persona name'), 'Backend')
    await userEvent.click(screen.getByRole('button', { name: /build from profile/i }))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/your name is required/i)
    expect(api.post).not.toHaveBeenCalled()
  })
})
