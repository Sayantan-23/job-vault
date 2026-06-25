// Collapsible sidebar state, mirroring the theme's cookie + pre-paint approach.
// The `sidebar` cookie is the source of truth; a blocking inline script sets the
// `data-sidebar` attribute on <html> before paint so there's no expand→collapse
// flash on load. CSS variables keyed on that attribute flip the rail/content
// split (the centered 1240px frame total stays constant).

export type SidebarState = 'expanded' | 'collapsed'

export const SIDEBAR_COOKIE = 'sidebar'

export function readSidebar(): SidebarState {
  if (typeof document === 'undefined') return 'expanded'
  const value = document.cookie.match(/(?:^|;\s*)sidebar=([^;]+)/)?.[1]
  return value === 'collapsed' ? 'collapsed' : 'expanded'
}

export function writeSidebar(state: SidebarState): void {
  if (typeof document === 'undefined') return
  document.cookie = `${SIDEBAR_COOKIE}=${state}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export function applySidebar(state: SidebarState): void {
  if (typeof document === 'undefined') return
  if (state === 'collapsed') document.documentElement.setAttribute('data-sidebar', 'collapsed')
  else document.documentElement.removeAttribute('data-sidebar')
}

// Blocking inline <script> (see SidebarScript) — tiny, self-contained, cannot import.
export const SIDEBAR_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)sidebar=([^;]+)/);if(m&&m[1]==='collapsed'){document.documentElement.dataset.sidebar='collapsed';}}catch(e){}})();`
