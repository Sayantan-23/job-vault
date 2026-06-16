import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { SettingsWorkspace } from './settings-workspace'

const api = vi.mocked(apiClient)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
  document.documentElement.className = ''
  document.cookie = 'theme=; path=/; max-age=0'
  api.get.mockResolvedValue({
    id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', isEmailVerified: true, preferences: null,
  })
})

describe('SettingsWorkspace', () => {
  it('renders the appearance, account, and notifications sections with user details', async () => {
    render(<SettingsWorkspace />, { wrapper })
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })

  it('switches the theme via the appearance control', async () => {
    render(<SettingsWorkspace />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /dark/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.cookie).toContain('theme=dark')
  })

  it('links to the full profile editor', () => {
    render(<SettingsWorkspace />, { wrapper })
    expect(screen.getByRole('link', { name: /edit profile/i })).toHaveAttribute('href', '/app/profile')
  })
})
