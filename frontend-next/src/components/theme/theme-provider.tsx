'use client'

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { applyTheme, readThemeCookie, writeThemeCookie, type Theme } from '@/lib/theme'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start at 'system' on both server and client first render so hydration never
  // mismatches; the real value is read from the cookie in the effect below. The
  // inline ThemeScript already applied the correct `.dark` class pre-paint, so
  // there is no color flash. The only residual is cosmetic: on a *hard load* of
  // a page that displays the selected theme (Settings), the control briefly
  // highlights 'system' until this effect runs. Eliminating that would require
  // reading the cookie server-side in the root layout (making it dynamic and
  // hurting static generation of the marketing pages) — not worth it.
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
