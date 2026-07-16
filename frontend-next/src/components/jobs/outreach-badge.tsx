import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

// Outreach aggregate badge shared by the jobs list rows and kanban cards.
// Renders nothing when the job has no outreach — no clutter on untouched jobs.
export function OutreachBadge({
  variant,
  count = 0,
  replies = 0,
}: {
  variant: 'list' | 'card'
  count?: number
  replies?: number
}) {
  if (count <= 0) return null

  if (variant === 'list') {
    // Jobs-list row is width-crushed below sm; the badge yields to title/company there.
    return (
      <span
        data-testid="outreach-badge"
        className="hidden sm:flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground"
      >
        <Mail className="size-3.5" aria-hidden="true" />
        <span>{count}</span>
        {replies > 0 ? <span>{`· ${replies} replied`}</span> : null}
      </span>
    )
  }

  return (
    <span
      data-testid="outreach-badge"
      title={`${count} contacted · ${replies} replied`}
      className={cn(
        'flex items-center gap-1 font-mono text-[11px] tabular-nums',
        replies > 0 ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Mail className="size-3" aria-hidden="true" />
      <span>{count}</span>
    </span>
  )
}
