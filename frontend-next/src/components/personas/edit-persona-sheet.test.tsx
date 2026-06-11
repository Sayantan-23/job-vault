import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Persona } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), postForm: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { EditPersonaSheet } from './edit-persona-sheet'

const api = vi.mocked(apiClient)
const DATA: ProfileContent = {
  basics: { name: 'A', links: [] },
  summary: 'Backend engineer.',
  experience: [],
  projects: [],
  skills: [],
  education: [],
}
const PERSONA: Persona = { id: 'p1', userId: 'u1', name: 'Backend', data: DATA, rawInput: null, createdAt: '', updatedAt: '' }
const PROFILE: ProfileContent = {
  basics: { name: 'Ada Lovelace', email: 'ada@example.com', links: [] },
  summary: 'Engineer.',
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
}

function wrapper({ children }: { children: ReactNode }) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('EditPersonaSheet', () => {
  it('seeds the persona name and saves name + data via PATCH, then closes', async () => {
    api.patch.mockResolvedValue({ ...PERSONA, name: 'Backend X' })
    const onOpenChange = vi.fn()
    render(<EditPersonaSheet persona={PERSONA} profile={PROFILE} open onOpenChange={onOpenChange} />, { wrapper })

    const nameInput = screen.getByLabelText('Persona name')
    expect(nameInput).toHaveValue('Backend')
    await userEvent.type(nameInput, ' X')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/api/personas/p1', expect.objectContaining({ name: 'Backend X', data: DATA })),
    )
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('renders the rich persona editor with profile pickers', () => {
    render(<EditPersonaSheet persona={PERSONA} profile={PROFILE} open onOpenChange={vi.fn()} />, { wrapper })

    expect(screen.getByLabelText('Professional summary')).toHaveValue('Backend engineer.')
    expect(screen.getByRole('group', { name: 'Profile experience picker' })).toBeInTheDocument()
    expect(screen.getByText('Senior Engineer @ Stripe')).toBeInTheDocument()
  })

  it('blocks save and lists errors when the draft fails validation', async () => {
    const invalid: Persona = { ...PERSONA, data: { ...DATA, basics: { name: '', links: [] } } }
    render(<EditPersonaSheet persona={invalid} profile={PROFILE} open onOpenChange={vi.fn()} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/your name is required/i)
    expect(api.patch).not.toHaveBeenCalled()
  })
})
