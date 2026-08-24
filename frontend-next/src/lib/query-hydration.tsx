import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiServer } from './api-server'
import type { QueryDesc } from './queries'
import type { Paginated } from '@/types/filters'

// Server-only (it reaches `apiServer`, which reads `next/headers`) — import it
// from Server Components, never from a `'use client'` file.
//
// Why hydration instead of passing server data down as `initialData`:
// `initialData` only seeds a cache slot that is still empty, so from the second
// render on the server's payload is silently discarded. `dehydrate`/`hydrate`
// carries `dataUpdatedAt`, and hydration overwrites an existing entry whenever
// the incoming snapshot is newer — so a re-run of the page actually lands.

// Mirrors the browser defaults (see makeQueryClient) so hydrated data arrives
// with the same freshness window instead of being refetched the moment it lands.
export function serverQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })
}

// `prefetchQuery` swallows rejections, and `dehydrate` ships only successful
// queries. So a failed server fetch leaves the key *unseeded* rather than
// caching an empty fallback as though it were real data: the client hook then
// fetches on mount (where api-client's silent token refresh can heal an expired
// access cookie) and renders a real loading/error state.
export function prefetch<T>(qc: QueryClient, d: QueryDesc): Promise<void> {
  return qc.prefetchQuery({ queryKey: d.key, queryFn: () => apiServer.get<T>(d.path) })
}

// Paginated endpoints return the whole `{ data, meta }` envelope, not `data`.
export function prefetchPage<T>(qc: QueryClient, d: QueryDesc): Promise<void> {
  return qc.prefetchQuery({
    queryKey: d.key,
    queryFn: (): Promise<Paginated<T>> => apiServer.getPage<T>(d.path),
  })
}

export function Hydrate({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>
}
