import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { JobsWorkspace } from '@/components/jobs/jobs-workspace'
import { JobsSkeleton } from '@/components/layout/app/route-skeletons'
import { EMPTY_BOARD, EMPTY_JOBS_PAGE, EMPTY_STATS } from '@/lib/dashboard-defaults'
import { parseFilters, buildListQuery, buildBoardQuery } from '@/lib/filters'
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
    // Mirror useSearchParams().get() semantics so the SSR-seeded query key matches
    // the client key on first render even for a (malformed) duplicated param.
    if (typeof v === 'string') params.set(k, v)
    else if (Array.isArray(v) && typeof v[0] === 'string') params.set(k, v[0])
  }
  const filters = parseFilters(params)
  const view = sp['view']

  // Fetched in parallel — the list, the (when shown) board, and the headline
  // stats are independent reads, so one round-trip instead of three.
  const [initialJobs, initialBoard, initialStats] = await Promise.all([
    apiServer.getPage<Job>(`/api/jobs${buildListQuery(filters)}`).catch(() => EMPTY_JOBS_PAGE),
    view === 'board'
      ? apiServer
          .get<KanbanBoard>(
            `/api/dashboard/kanban${buildBoardQuery({ search: filters.search, ghost: filters.ghost })}`,
          )
          .catch(() => EMPTY_BOARD)
      : Promise.resolve(EMPTY_BOARD),
    apiServer.get<DashboardStats>('/api/dashboard/stats').catch(() => EMPTY_STATS),
  ])

  // useSearchParams() in JobsWorkspace requires a Suspense boundary. Its fallback
  // is the page skeleton, not null — on client navigation this boundary (not
  // loading.tsx) suspends while the workspace mounts, so a null fallback flashed
  // the whole content area blank.
  return (
    <Suspense fallback={<JobsSkeleton />}>
      <JobsWorkspace initialJobs={initialJobs} initialBoard={initialBoard} initialStats={initialStats} />
    </Suspense>
  )
}
