import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { JobsWorkspace } from '@/components/jobs/jobs-workspace'
import { EMPTY_BOARD } from '@/lib/dashboard-defaults'
import type { Job } from '@/types/job'
import type { KanbanBoard } from '@/types/dashboard'

export const metadata: Metadata = { title: 'Jobs' }

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams

  let initialJobs: Job[] = []
  try {
    initialJobs = await apiServer.get<Job[]>('/api/jobs')
  } catch {
    initialJobs = []
  }

  let initialBoard: KanbanBoard = EMPTY_BOARD
  if (view === 'board') {
    try {
      initialBoard = await apiServer.get<KanbanBoard>('/api/dashboard/kanban')
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
