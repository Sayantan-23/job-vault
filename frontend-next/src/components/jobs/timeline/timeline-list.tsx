import { TimelineEntry } from './timeline-entry'
import type { TimelineEvent } from '@/types/timeline'

export function TimelineList({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <TimelineEntry key={event.id} event={event} />
      ))}
    </ol>
  )
}
