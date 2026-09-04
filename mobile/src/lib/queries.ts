import { buildListQuery } from './filters'
import { jobsInfiniteKey } from './query-keys'
import type { JobFilters } from '@/types/filters'

// A cache key paired with the endpoint that fills it. Server prefetches and
// client hooks both read from here, so the two can never drift: a key that no
// longer matches its path hydrates nothing — a silent cache miss that looks
// exactly like "the data didn't load", which is the failure mode this file
// exists to make impossible.
//
// Isomorphic on purpose — keys and paths only, no fetcher. The transport
// (apiClient) stays with the caller.
export interface QueryDesc {
  key: readonly unknown[]
  path: string
}

// The infinite list path builder. Mobile keys by jobsInfiniteKey (drops page —
// useInfiniteJobs pages are keyed internally by pageParam) and sends `limit: 30`
// per page (the web never sends limit, stuck at the backend's default 20).
export const jobsListQuery = (f: JobFilters): QueryDesc => ({
  key: jobsInfiniteKey(f),
  path: `/api/jobs${buildListQuery(f)}`,
})
