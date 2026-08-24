// frontend-next/src/components/profile/profile-workspace.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ProfileContent } from '@/types/profile'
import { PROFILE_KEY } from '@/lib/query-keys'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { ProfileWorkspace } from './profile-workspace'

const api = vi.mocked(apiClient)
const EMPTY: ProfileContent = { basics: { name: '', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

// Stands in for the server prefetch the page hydrates before this renders.
function seeded(profile: ProfileContent) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
  client.setQueryData(PROFILE_KEY, profile)
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

beforeEach(() => vi.clearAllMocks())

describe('ProfileWorkspace', () => {
  it('renders the server-hydrated profile immediately (no fetch flash)', () => {
    render(<ProfileWorkspace />, { wrapper: seeded({ ...EMPTY, basics: { name: 'Grace Hopper', links: [] } }) })
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Grace Hopper')
    expect(api.get).not.toHaveBeenCalled() // seeded from SSR, no client read needed
  })

  it('disables Save until a name is entered, then saves', async () => {
    api.put.mockImplementation(async (_p, body) => (body as { content: ProfileContent }).content)
    render(<ProfileWorkspace />, { wrapper: seeded(EMPTY) })

    const save = await screen.findByRole('button', { name: /save/i })
    expect(save).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Full name'), 'Ada')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/profile', { content: expect.objectContaining({ basics: expect.objectContaining({ name: 'Ada' }) }) }))
  })

  it('surfaces validation errors and blocks save', async () => {
    const invalid: ProfileContent = {
      ...EMPTY,
      basics: { name: 'Ada', links: [] },
      experience: [{ company: '', role: '', startDate: null, endDate: null, current: false, bullets: [] }],
    }
    render(<ProfileWorkspace />, { wrapper: seeded(invalid) })
    await userEvent.click(await screen.findByRole('button', { name: /save/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })
})
