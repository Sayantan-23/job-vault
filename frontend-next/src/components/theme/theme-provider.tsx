'use client'

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { applyTheme, readThemeCookie, writeThemeCookie, type Theme } from '@/lib/theme'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server and first client render both start at 'system' to avoid a hydration
  // mismatch; the actual value is read from the cookie in the effect below. The
  // inline ThemeScript has already applied the correct class pre-paint, so this
  // only syncs React state — it never causes a visible flash.
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    setThemeState(readThemeCookie())
  }, [])

  // While following the OS, re-apply when the OS preference flips.
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    writeThemeCookie(next)
    applyTheme(next)
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
