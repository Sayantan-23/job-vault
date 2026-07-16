import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
import { PersonasWorkspace } from './personas-workspace'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
const DATA: ProfileContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const PERSONA: Persona = { id: 'p1', createdAt: '', updatedAt: '', userId: 'u1', name: 'Backend', data: DATA, rawInput: null }
const PROFILE: ProfileContent = {
  basics: { name: 'Ada Lovelace', email: 'ada@example.com', links: [] },
  summary: 'Engineer.',
  experience: [],
  projects: [],
  skills: [],
  education: [],
}

beforeEach(() => vi.clearAllMocks())

describe('PersonasWorkspace', () => {
  it('renders personas and the count against the cap', async () => {
    render(
      <PersonasWorkspace initialPersonas={[PERSONA]} initialStatus={{ enabled: true, maxPersonas: 5 }} initialProfile={PROFILE} />,
      { wrapper },
    )
    expect(await screen.findByText('Backend')).toBeInTheDocument()
    expect(screen.getByText(/1\s*\/\s*5/)).toBeInTheDocument()
  })

  it('disables New persona when at the cap', async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ ...PERSONA, id: `p${i}`, name: `P${i}` }))
    render(
      <PersonasWorkspace initialPersonas={five} initialStatus={{ enabled: true, maxPersonas: 5 }} initialProfile={PROFILE} />,
      { wrapper },
    )
    expect(screen.getByRole('button', { name: /new persona/i })).toBeDisabled()
  })

  it('keeps New persona enabled when AI is off and hints that only résumé import needs it', async () => {
    render(
      <PersonasWorkspace initialPersonas={[]} initialStatus={{ enabled: false, maxPersonas: 5 }} initialProfile={PROFILE} />,
      { wrapper },
    )
    expect(screen.getByRole('status')).toHaveTextContent(/résumé import is disabled/i)
    expect(screen.getByRole('button', { name: /new persona/i })).toBeEnabled()
  })

  it('shows both the AI-off hint and the at-cap explanation when both apply', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ ...PERSONA, id: `p${i}`, name: `P${i}` }))
    render(
      <PersonasWorkspace initialPersonas={five} initialStatus={{ enabled: false, maxPersonas: 5 }} initialProfile={PROFILE} />,
      { wrapper },
    )
    const statuses = screen.getAllByRole('status')
    expect(statuses.some((s) => /résumé import is disabled/i.test(s.textContent ?? ''))).toBe(true)
    expect(statuses.some((s) => /maximum of 5 personas/i.test(s.textContent ?? ''))).toBe(true)
    expect(screen.getByRole('button', { name: /new persona/i })).toBeDisabled()
  })

  it('opens the create sheet with both modes from New persona', async () => {
    render(
      <PersonasWorkspace initialPersonas={[]} initialStatus={{ enabled: true, maxPersonas: 5 }} initialProfile={PROFILE} />,
      { wrapper },
    )
    await userEvent.click(screen.getByRole('button', { name: /new persona/i }))
    expect(await screen.findByRole('heading', { name: /new persona/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /build from profile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import a résumé/i })).toBeInTheDocument()
  })

  it('deletes a persona', async () => {
    api.delete.mockResolvedValue(undefined)
    api.get.mockResolvedValue([])
    render(
      <PersonasWorkspace initialPersonas={[PERSONA]} initialStatus={{ enabled: true, maxPersonas: 5 }} initialProfile={PROFILE} />,
      { wrapper },
    )
    await userEvent.click(screen.getByRole('button', { name: /delete backend/i }))
    // A confirmation dialog gates the delete.
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/personas/p1'))
  })

  it('opens the edit sheet for a persona', async () => {
    render(
      <PersonasWorkspace initialPersonas={[PERSONA]} initialStatus={{ enabled: true, maxPersonas: 5 }} initialProfile={PROFILE} />,
      { wrapper },
    )
    await userEvent.click(screen.getByRole('button', { name: /edit backend/i }))
    expect(await screen.findByRole('heading', { name: /edit persona/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Persona name')).toHaveValue('Backend')
  })
})
