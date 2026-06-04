'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JOB_STATUSES, STATUS_META, type JobStatus } from '@/lib/job-status'

const OPTIONS: ReadonlyArray<{ value: JobStatus | undefined; label: string }> = [
  { value: undefined, label: 'All statuses' },
  ...JOB_STATUSES.map((s) => ({ value: s as JobStatus, label: STATUS_META[s].label })),
]

export function StatusFilterMenu({
  value,
  onChange,
}: {
  value: JobStatus | undefined
  onChange: (value: JobStatus | undefined) => void
}) {
  return (
    <div role="listbox" aria-label="Filter by status" className="flex flex-col">
      {OPTIONS.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.label}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent',
              selected ? 'font-medium' : '',
            )}
          >
            {o.label}
            {selected ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
          </button>
        )
      })}
    </div>
  )
}
