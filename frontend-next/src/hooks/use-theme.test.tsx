import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { useTheme } from './use-theme'

// Controllable matchMedia: `matches` toggles the simulated OS preference and
// `listeners` lets a test fire a system-preference change.
let media: { matches: boolean; listeners: Set<() => void> }

function setupMatchMedia() {
  media = { matches: false, listeners: new Set() }
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return media.matches
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, cb: () => void) => media.listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => media.listeners.delete(cb),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function Harness() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('light')}>light</button>
      <button onClick={() => setTheme('system')}>system</button>
    </div>
  )
}

function withProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

beforeEach(() => {
  setupMatchMedia()
  document.documentElement.className = ''
  document.cookie = 'theme=; path=/; max-age=0'
})

describe('useTheme', () => {
  it('applies the dark class and persists the cookie when set to dark', async () => {
    render(<Harness />, { wrapper: withProvider })
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.cookie).toContain('theme=dark')
    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })

  it('removes the dark class when switched to light', async () => {
    render(<Harness />, { wrapper: withProvider })
    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    await userEvent.click(screen.getByRole('button', { name: 'light' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.cookie).toContain('theme=light')
  })

  it('follows the OS preference when set to system', async () => {
    media.matches = true // OS prefers dark
    render(<Harness />, { wrapper: withProvider })
    await userEvent.click(screen.getByRole('button', { name: 'system' }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('reacts to OS preference changes while following the system', async () => {
    render(<Harness />, { wrapper: withProvider })
    await userEvent.click(screen.getByRole('button', { name: 'system' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    media.matches = true
    media.listeners.forEach((cb) => cb())
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('adopts the theme already persisted in the cookie', async () => {
    document.cookie = 'theme=dark; path=/'
    render(<Harness />, { wrapper: withProvider })
    await waitFor(() => expect(screen.getByTestId('theme').textContent).toBe('dark'))
  })

  it('throws when used outside a ThemeProvider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/)
  })
})
