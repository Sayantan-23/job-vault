import Link from 'next/link'
import { StatusChip } from '@/components/kanban/status-chip'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import type { Job } from '@/types/job'

export function JobsList({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">No jobs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your first application — paste a URL or enter it manually.
        </p>
      </div>
    )
  }

  return (
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
  )
}
