import Link from 'next/link'
import { Bot, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/relative-time'
import type { GlobalTimelineEvent } from '@/types/timeline'

const TYPE_ICON = {
  AUTO: Bot,
  MANUAL: PencilLine,
} as const

const TYPE_ICON_STYLES = {
  AUTO: 'text-muted-foreground',
  MANUAL: 'text-primary',
} as const

// One row in the full-width global timeline: a connected rail node on the left,
// the event title + description filling the available width, and the job + time
// pinned to the far right (so a wide screen reads edge-to-edge, not centered).
// `isLast` drops the trailing rail segment so the line stops at the final node.
export function TimelineRow({ event, isLast }: { event: GlobalTimelineEvent; isLast: boolean }) {
  const Icon = TYPE_ICON[event.type]
  return (
    <li data-testid="timeline-entry" data-type={event.type} className="relative flex gap-4">
      <div className="relative flex w-7 shrink-0 justify-center">
        {!isLast ? (
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 top-4 w-px -translate-x-1/2 bg-border"
          />
        ) : null}
        <span
          className={cn(
            'relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background',
            TYPE_ICON_STYLES[event.type],
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-1 pb-6 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_max-content] sm:items-baseline">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium leading-tight text-foreground">{event.title}</p>
          {event.description ? <p className="text-sm text-muted-foreground">{event.description}</p> : null}
        </div>
        <Link
          href={`/app/jobs?job=${event.jobId}`}
          className="min-w-0 truncate text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
        >
          {event.jobCompany} — {event.jobTitle}
        </Link>
        <time
          className="font-mono text-xs tabular-nums text-muted-foreground sm:justify-self-end sm:text-right"
          dateTime={event.createdAt}
        >
          {relativeTime(event.createdAt)}
        </time>
      </div>
    </li>
  )
}
