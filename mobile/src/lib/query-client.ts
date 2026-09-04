import { QueryClient } from '@tanstack/react-query'

// Mirrors frontend-next/src/lib/query-client.ts. The web's
// refetchOnWindowFocus concern is N/A on native — there is no window to blur,
// and no AppState focus manager is wired here either. A later task may add one
// if stale data bites.
// ponytail: no AppState refocus — add if stale data bites
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let singleton: QueryClient | null = null
export function getQueryClient(): QueryClient {
  if (!singleton) singleton = makeQueryClient()
  return singleton
}
