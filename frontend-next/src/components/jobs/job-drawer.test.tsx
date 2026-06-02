import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/app/dashboard',
  useSearchParams: () => new URLSearchParams('job=j1'),
}))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({ id: 'j1', title: 'Role', company: 'Acme', status: 'APPLIED', ghostDays: 0, notes: null, snapshotMarkdown: null, sourceUrl: null, location: null, salaryRange: null }), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { JobDrawer } from './job-drawer'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('JobDrawer', () => {
  it('closes back to the current page without the job param', async () => {
    render(<JobDrawer jobId="j1" />, { wrapper })
    await userEvent.keyboard('{Escape}')
    expect(push).toHaveBeenCalledWith('/app/dashboard')
  })
})
