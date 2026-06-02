import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { JobsBoard } from '@/components/jobs/jobs-board'
import type { Job } from '@/types/job'

export const metadata: Metadata = { title: 'Jobs' }

export default async function JobsPage() {
  let initialJobs: Job[] = []
  try {
    initialJobs = await apiServer.get<Job[]>('/api/jobs')
  } catch {
    // The client hook re-fetches and surfaces errors; render an empty board on SSR failure.
    initialJobs = []
  }

  // useSearchParams() in JobsBoard requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <JobsBoard initialJobs={initialJobs} />
    </Suspense>
  )
}
