'use client'

import { useState } from 'react'
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

export function JobDetails({ job, onDeleted }: { job: Job; onDeleted: () => void }) {
  const update = useUpdateJob(job.id)
  const remove = useDeleteJob()
  const [notes, setNotes] = useState(job.notes ?? '')
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        {/* pr-8 keeps the status chip + ghost meter clear of the drawer's
            absolutely-positioned close (✕) button in the top-right corner. */}
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold leading-tight">{job.title}</h2>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip status={job.status} />
            <GhostMeter days={job.ghostDays} />
          </div>
        </div>
        {job.location ? <p className="text-sm text-muted-foreground">{job.location}</p> : null}
        {job.salaryRange ? <p className="font-mono text-xs text-muted-foreground">{job.salaryRange}</p> : null}
      </header>

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
