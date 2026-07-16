import { cn } from '@/lib/utils'
import type { ContactStatus } from '@/types/contact'

const STATUS_META: Record<ContactStatus, { label: string; className: string }> = {
  NO_RESPONSE: { label: 'No response', className: 'bg-muted text-muted-foreground' },
  HEARD_BACK: { label: 'Heard back', className: 'bg-primary/10 text-primary' },
  REFERRED: { label: 'Referred', className: 'bg-primary text-primary-foreground' },
  DECLINED: { label: 'Declined', className: 'bg-muted text-muted-foreground opacity-70' },
}

export function OutreachStatusChip({ status }: { status: ContactStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      data-testid="outreach-status-chip"
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}
