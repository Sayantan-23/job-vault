import type { Metadata } from 'next'
import { Suspense } from 'react'
import { JobsWorkspace } from '@/components/jobs/jobs-workspace'
import { JobsSkeleton } from '@/components/layout/app/route-skeletons'
import { Hydrate, prefetch, prefetchPage, serverQueryClient } from '@/lib/query-hydration'
import { jobsListQuery, kanbanQuery, statsQuery } from '@/lib/queries'
import { parseFilters } from '@/lib/filters'
import type { Job } from '@/types/job'
import type { KanbanBoard, DashboardStats } from '@/types/dashboard'

export const metadata: Metadata = { title: 'Jobs' }

const FILTER_PARAMS = ['search', 'status', 'ghost', 'sort', 'dir', 'page', 'from', 'to'] as const

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = new URLSearchParams()
  for (const k of FILTER_PARAMS) {
    const v = sp[k]
    // Mirror useSearchParams().get() semantics so the prefetched query key matches
    // the client key on first render even for a (malformed) duplicated param.
    if (typeof v === 'string') params.set(k, v)
    else if (Array.isArray(v) && typeof v[0] === 'string') params.set(k, v[0])
  }
  const filters = parseFilters(params)
  const view = sp['view']

  // Prefetched in parallel — the list, the (when shown) board, and the headline
  // stats are independent reads, so one round-trip instead of three. A read that
  // fails is simply left out of the dehydrated payload; the client hook then
  // fetches it on mount with a real loading state.
  const qc = serverQueryClient()
  await Promise.all([
    prefetchPage<Job>(qc, jobsListQuery(filters)),
    view === 'board'
      ? prefetch<KanbanBoard>(qc, kanbanQuery({ search: filters.search, ghost: filters.ghost }))
      : Promise.resolve(),
    prefetch<DashboardStats>(qc, statsQuery),
  ])

  // useSearchParams() in JobsWorkspace requires a Suspense boundary. Its fallback
  // is the page skeleton, not null — on client navigation this boundary (not
  // loading.tsx) suspends while the workspace mounts, so a null fallback flashed
  // the whole content area blank.
  return (
    <Hydrate client={qc}>
      <Suspense fallback={<JobsSkeleton />}>
        <JobsWorkspace />
      </Suspense>
    </Hydrate>
  )
}
