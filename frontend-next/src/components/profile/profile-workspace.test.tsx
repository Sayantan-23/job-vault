// frontend-next/src/components/profile/profile-workspace.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ProfileContent } from '@/types/profile'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { ProfileWorkspace } from './profile-workspace'

const api = vi.mocked(apiClient)
const EMPTY: ProfileContent = { basics: { name: '', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('ProfileWorkspace', () => {
  it('disables Save until a name is entered, then saves', async () => {
    api.get.mockResolvedValue(EMPTY)
    api.put.mockImplementation(async (_p, body) => (body as { content: ProfileContent }).content)
    render(<ProfileWorkspace />, { wrapper })

    const save = await screen.findByRole('button', { name: /save/i })
    expect(save).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Full name'), 'Ada')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/profile', { content: expect.objectContaining({ basics: expect.objectContaining({ name: 'Ada' }) }) }))
  })

  it('surfaces validation errors and blocks save', async () => {
    api.get.mockResolvedValue({ ...EMPTY, basics: { name: 'Ada', links: [] }, experience: [{ company: '', role: '', startDate: null, endDate: null, current: false, bullets: [] }] })
    render(<ProfileWorkspace />, { wrapper })
    await userEvent.click(await screen.findByRole('button', { name: /save/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })
})
