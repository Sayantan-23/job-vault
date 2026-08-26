'use client'

import { createContext, useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { applyTheme, readThemeCookie, writeThemeCookie, type Theme } from '@/lib/theme'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

// The `theme` cookie is the store React subscribes to. `setTheme` below is its
// only writer, so a plain listener set is all the notification it needs.
const listeners = new Set<() => void>()
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
// Server render (and therefore hydration) resolves to 'system' so the markup
// never mismatches; React re-reads the cookie snapshot right after hydrating.
const getServerSnapshot = (): Theme => 'system'

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline ThemeScript already applied the correct `.dark` class pre-paint,
  // so there is no color flash. The only residual is cosmetic: on a *hard load*
  // of a page that displays the selected theme (Settings), the control briefly
  // highlights 'system' until the post-hydration snapshot lands. Eliminating
  // that would require reading the cookie server-side in the root layout
  // (making it dynamic and hurting static generation of the marketing pages) —
  // not worth it.
  const theme = useSyncExternalStore(subscribe, readThemeCookie, getServerSnapshot)

  // While following the OS, re-apply when the OS preference flips.
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    writeThemeCookie(next)
    applyTheme(next)
    for (const listener of listeners) listener()
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
