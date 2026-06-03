import { Bot, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/relative-time'
import type { TimelineEvent } from '@/types/timeline'

const TYPE_ICON = {
  AUTO: Bot,
  MANUAL: PencilLine,
} as const

const TYPE_ICON_STYLES = {
  AUTO: 'text-muted-foreground',
  MANUAL: 'text-primary',
} as const

export function TimelineEntry({ event }: { event: TimelineEvent }) {
  const Icon = TYPE_ICON[event.type]
  return (
    <li data-testid="timeline-entry" data-type={event.type} className="flex gap-3">
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background',
          TYPE_ICON_STYLES[event.type],
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium leading-tight text-foreground">{event.title}</p>
          <time className="shrink-0 font-mono text-xs text-muted-foreground" dateTime={event.createdAt}>
            {relativeTime(event.createdAt)}
          </time>
        </div>
        {event.description ? <p className="text-sm text-muted-foreground">{event.description}</p> : null}
      </div>
    </li>
  )
}
