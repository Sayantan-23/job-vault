// Cookie-based theme, no external dep. The cookie is the source of truth and is
// readable both client-side (here) and, in future, server-side. The `.dark`
// class on <html> drives the dark tokens declared in styles/app/theme.css
// (`.dark [data-theme-scope='app']`). 'system' follows the OS preference.

export type Theme = 'light' | 'dark' | 'system'

export const THEME_COOKIE = 'theme'
export const THEMES: readonly Theme[] = ['light', 'dark', 'system'] as const

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return theme
}

// Toggle the `.dark` class on <html> to match the resolved theme.
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark')
}

export function readThemeCookie(): Theme {
  if (typeof document === 'undefined') return 'system'
  const value = document.cookie.match(/(?:^|;\s*)theme=([^;]+)/)?.[1]
  return isTheme(value) ? value : 'system'
}

export function writeThemeCookie(theme: Theme): void {
  if (typeof document === 'undefined') return
  // 1-year, root-path cookie so any route (incl. server renders) can read it.
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

// Runs as a blocking inline <script> before first paint (see ThemeScript) so the
// correct theme class is on <html> before the body renders — no flash. Kept tiny
// and self-contained; it cannot import anything.
export const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)theme=([^;]+)/);var t=m?m[1]:'system';var d=t==='dark'||((t==='system'||!t)&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`
