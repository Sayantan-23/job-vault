import { cn } from '@/lib/utils'
import { STATUS_META, type JobStatus } from '@/lib/job-status'

export function StatusChip({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      data-testid="status-chip"
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}
