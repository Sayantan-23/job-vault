import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { JobsWorkspace } from '@/components/jobs/jobs-workspace'
import { EMPTY_BOARD, EMPTY_JOBS_PAGE } from '@/lib/dashboard-defaults'
import { parseFilters, buildListQuery, buildBoardQuery } from '@/lib/filters'
import type { Paginated } from '@/types/filters'
import type { Job } from '@/types/job'
import type { KanbanBoard } from '@/types/dashboard'

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

  let initialJobs: Paginated<Job> = EMPTY_JOBS_PAGE
  try {
    initialJobs = await apiServer.getPage<Job>(`/api/jobs${buildListQuery(filters)}`)
  } catch {
    initialJobs = EMPTY_JOBS_PAGE
  }

  let initialBoard: KanbanBoard = EMPTY_BOARD
  if (view === 'board') {
    try {
      initialBoard = await apiServer.get<KanbanBoard>(
        `/api/dashboard/kanban${buildBoardQuery({ search: filters.search, ghost: filters.ghost })}`,
      )
    } catch {
      initialBoard = EMPTY_BOARD
    }
  }

  // useSearchParams() in JobsWorkspace requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <JobsWorkspace initialJobs={initialJobs} initialBoard={initialBoard} />
    </Suspense>
  )
}
