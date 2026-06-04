'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useUpdateJob, useDeleteJob } from '@/hooks/use-jobs'
import { JOB_STATUSES, STATUS_META, type JobStatus } from '@/lib/job-status'
import { StatusChip } from '@/components/kanban/status-chip'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Job } from '@/types/job'

// The <select> only renders valid options, but `e.target.value` is a plain
// string — guard it so an unexpected value never reaches the mutation.
function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value)
}

export function JobDetails({
  job,
  onDeleted,
  onClose,
}: {
  job: Job
  onDeleted: () => void
  onClose?: () => void
}) {
  const update = useUpdateJob(job.id)
  const remove = useDeleteJob()
  const [notes, setNotes] = useState(job.notes ?? '')
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="space-y-5">
      {/* Sticky drawer header: identity (title + status badge + ghost days) grouped
          on the left, close on the right, aligned in one row. -mx-6/-mt-6 negate the
          drawer body's p-6 so the bar is full-bleed and stays pinned to the top of
          the scroll area on long content (snapshot/timeline/reminders). */}
      <header className="sticky top-0 z-10 -mx-6 -mt-6 flex items-start justify-between gap-3 border-b border-border bg-card px-6 py-4">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight">{job.title}</h2>
            <StatusChip status={job.status} />
            <GhostMeter days={job.ghostDays} />
          </div>
          <p className="text-sm text-muted-foreground">{job.company}</p>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 size-8 shrink-0 text-muted-foreground"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </header>

      {job.location || job.salaryRange ? (
        <div className="space-y-0.5">
          {job.location ? <p className="text-sm text-muted-foreground">{job.location}</p> : null}
          {job.salaryRange ? <p className="font-mono text-xs text-muted-foreground">{job.salaryRange}</p> : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="job-status">Status</Label>
        <Select
          id="job-status"
          value={job.status}
          onChange={(e) => {
            if (isJobStatus(e.target.value)) update.mutate({ status: e.target.value })
          }}
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="job-notes">Notes</Label>
        <Textarea id="job-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={update.isPending || notes === (job.notes ?? '')}
          onClick={() => update.mutate({ notes })}
        >
          Save notes
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete this job?</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate(job.id, { onSuccess: onDeleted })}
            >
              Confirm delete
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button type="button" variant="destructive" size="sm" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}
