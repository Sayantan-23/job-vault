import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const connect = vi.fn()

// Stub the heavy shell + the socket so the layout test stays a unit test.
vi.mock('@/components/layout/app/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}))
vi.mock('@/lib/socket', () => ({
  connectSocket: () => {
    connect()
    return { on: vi.fn(), off: vi.fn() }
  },
  disconnectSocket: vi.fn(),
  getSocket: () => ({ on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }),
}))

import AuthenticatedLayout from './layout'

describe('AuthenticatedLayout', () => {
  it('renders the shell and its children inside the realtime provider', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <AuthenticatedLayout>
          <span data-testid="page">page</span>
        </AuthenticatedLayout>
      </QueryClientProvider>,
    )
    expect(screen.getByTestId('shell')).toBeInTheDocument()
    expect(screen.getByTestId('page')).toHaveTextContent('page')
    // RealtimeProvider must be mounted by the layout, so the socket connects.
    expect(connect).toHaveBeenCalledTimes(1)
  })
})
