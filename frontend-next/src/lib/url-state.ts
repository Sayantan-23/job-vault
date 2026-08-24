'use client'

// Client-only URL updates for state the server does not need to re-render:
// the Board/List toggle, filters, sort, paging. Next patches the native history
// methods, so usePathname()/useSearchParams() still update — but the Server
// Component does NOT re-run. router.replace() would re-run the whole page on the
// server (middleware + every prefetch) and then throw the result away, because
// React Query already owns this data client-side.
export function replaceUrl(url: string): void {
  window.history.replaceState(null, '', url)
}
