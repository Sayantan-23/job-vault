import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Paginated } from '@/types/filters'
import type { GlobalTimelineEvent } from '@/types/timeline'

const { replaceUrl } = vi.hoisted(() => ({ replaceUrl: vi.fn() }))
const { searchParams } = vi.hoisted(() => ({ searchParams: { value: new URLSearchParams('') } }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => searchParams.value,
}))
// Paging updates the URL through history.replaceState — React Query fetches the
// page, so the server component must not re-run.
vi.mock('@/lib/url-state', () => ({ replaceUrl }))

vi.mock('@/lib/api-client', () => ({
  apiClient: { getPage: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { TimelineFeed } from './timeline-feed'

const api = vi.mocked(apiClient)

function event(over: Partial<GlobalTimelineEvent> = {}): GlobalTimelineEvent {
  return {
    id: 't1', jobId: 'j1', userId: 'u1', type: 'AUTO', title: 'Status changed to Applied',
    description: null, createdAt: '2026-06-16T10:00:00.000Z', jobTitle: 'SWE', jobCompany: 'Acme', ...over,
  }
}

function page(events: GlobalTimelineEvent[], over: Partial<Paginated<GlobalTimelineEvent>['meta']> = {}): Paginated<GlobalTimelineEvent> {
  return { data: events, meta: { total: events.length, page: 1, limit: 50, totalPages: 1, ...over } }
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  searchParams.value = new URLSearchParams('')
})

describe('TimelineFeed', () => {
  it('renders an event with a link to its job', async () => {
    const initial = page([event({ title: 'Job added to vault', jobCompany: 'Acme', jobTitle: 'SWE' })])
    api.getPage.mockResolvedValue(initial)
    render(<TimelineFeed />, { wrapper })

    expect(await screen.findByText('Job added to vault')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Acme — SWE' })
    expect(link).toHaveAttribute('href', '/app/jobs?job=j1')
  })

  it('shows the empty state when there is no activity', async () => {
    const empty = page([])
    api.getPage.mockResolvedValue(empty)
    render(<TimelineFeed />, { wrapper })
    expect(await screen.findByText(/no activity yet/i)).toBeInTheDocument()
  })

  it('pages forward by updating the page query param', async () => {
    const initial = page([event()], { total: 80, totalPages: 2 })
    api.getPage.mockResolvedValue(initial)
    render(<TimelineFeed />, { wrapper })

    await screen.findByText('Status changed to Applied')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(replaceUrl).toHaveBeenCalledWith('/app/timeline?page=2')
  })
})
