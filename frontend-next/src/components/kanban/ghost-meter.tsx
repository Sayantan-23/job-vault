import { Clock, Timer, Ghost } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ghostLevel, ghostLabel, type GhostLevel } from '@/lib/ghost'

const LEVEL_STYLES: Record<GhostLevel, string> = {
  active: 'text-ghost-active',
  stale: 'text-ghost-stale',
  ghosted: 'text-ghost-ghosted',
}

const LEVEL_ICON = {
  active: Clock,
  stale: Timer,
  ghosted: Ghost,
} as const

export function GhostMeter({ days }: { days: number }) {
  const level = ghostLevel(days)
  const Icon = LEVEL_ICON[level]
  return (
    <div
      data-testid="ghost-meter"
      aria-label={ghostLabel(days)}
      className={cn('inline-flex items-center gap-1', LEVEL_STYLES[level])}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="font-mono text-xs font-medium tabular-nums">{days}d</span>
    </div>
  )
}
