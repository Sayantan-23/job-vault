import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', accent && 'text-ghost-ghosted')}>
        {value}
      </p>
    </div>
  )
}
