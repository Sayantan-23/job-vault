'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useJobs } from '@/hooks/use-jobs'
import { StatusChip } from '@/components/kanban/status-chip'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import { Button } from '@/components/ui/button'
import { AddJobModal } from './add-job-modal'
import { JobDrawer } from './job-drawer'
import type { Job } from '@/types/job'

export function JobsBoard({ initialJobs }: { initialJobs: Job[] }) {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job')
  const { data: jobs = [] } = useJobs(initialJobs)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">{jobs.length}</span> tracked
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No jobs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first application — paste a URL or enter it manually.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/app/jobs?job=${job.id}`}
                scroll={false}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate font-medium">{job.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <GhostMeter days={job.ghostDays} />
                  <StatusChip status={job.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <AddJobModal open={addOpen} onOpenChange={setAddOpen} />
      <JobDrawer jobId={jobId} />
    </section>
  )
}
