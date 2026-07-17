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
import { useConfirm } from '@/hooks/use-confirm'
import type { Job } from '@/types/job'

// The <select> only renders valid options, but `e.target.value` is a plain
// string — guard it so an unexpected value never reaches the mutation.
function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value)
}

// Sticky drawer header: identity (title + status badge + ghost days) grouped on
// the left, close on the right, in one row. Lives as a direct child of the
// drawer's scroll container so it stays pinned across ALL content (a nested
// sticky only sticks within its own short section and un-pins once scrolled past).
export function JobDrawerHeader({ job, onClose }: { job: Job; onClose: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-border bg-card px-6 py-4">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold leading-tight">{job.title}</h2>
          <StatusChip status={job.status} />
          <GhostMeter days={job.ghostDays} />
        </div>
        <p className="text-sm text-muted-foreground">{job.company}</p>
      </div>
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
    </header>
  )
}

// Sticky drawer footer: the one destructive action, pinned to the bottom of the
// scroll area so it's always reachable without scrolling to the end.
export function JobDrawerFooter({ job, onDeleted }: { job: Job; onDeleted: () => void }) {
  const remove = useDeleteJob()
  const { confirm, confirmDialog } = useConfirm()

  const onDelete = async () => {
    if (
      await confirm({
        title: 'Delete job?',
        description: `"${job.title}" at ${job.company} will be permanently deleted, along with its timeline, reminders, and any cover letters generated from it.`,
        confirmLabel: 'Delete',
        destructive: true,
      })
    ) {
      remove.mutate(job.id, { onSuccess: onDeleted })
    }
  }

  return (
    <footer className="sticky bottom-0 z-20 mt-auto flex justify-end border-t border-border bg-card px-6 py-3">
      <Button type="button" variant="destructive" size="sm" disabled={remove.isPending} onClick={onDelete}>
        Delete job
      </Button>
      {confirmDialog}
    </footer>
  )
}

export function JobDetails({ job }: { job: Job }) {
  const update = useUpdateJob(job.id)
  const [notes, setNotes] = useState(job.notes ?? '')

  return (
    <div className="space-y-5">
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
    </div>
  )
}
