import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Persona } from '@/types/persona'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { PersonasWorkspace } from './personas-workspace'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
const DATA = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const PERSONA: Persona = { id: 'p1', createdAt: '', updatedAt: '', userId: 'u1', name: 'Backend', data: DATA, rawInput: null }

beforeEach(() => vi.clearAllMocks())

describe('PersonasWorkspace', () => {
  it('renders personas and the count against the cap', async () => {
    render(<PersonasWorkspace initialPersonas={[PERSONA]} initialStatus={{ enabled: true, maxPersonas: 5 }} />, { wrapper })
    expect(await screen.findByText('Backend')).toBeInTheDocument()
    expect(screen.getByText(/1\s*\/\s*5/)).toBeInTheDocument()
  })

  it('disables New persona when at the cap', async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ ...PERSONA, id: `p${i}`, name: `P${i}` }))
    render(<PersonasWorkspace initialPersonas={five} initialStatus={{ enabled: true, maxPersonas: 5 }} />, { wrapper })
    expect(screen.getByRole('button', { name: /new persona/i })).toBeDisabled()
  })

  it('shows the AI-disabled notice when not configured', async () => {
    render(<PersonasWorkspace initialPersonas={[]} initialStatus={{ enabled: false, maxPersonas: 5 }} />, { wrapper })
    expect(screen.getByText(/ai features are not configured|not configured/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new persona/i })).toBeDisabled()
  })

  it('deletes a persona', async () => {
    api.delete.mockResolvedValue(undefined)
    api.get.mockResolvedValue([])
    render(<PersonasWorkspace initialPersonas={[PERSONA]} initialStatus={{ enabled: true, maxPersonas: 5 }} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /delete backend/i }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/personas/p1'))
  })
})
