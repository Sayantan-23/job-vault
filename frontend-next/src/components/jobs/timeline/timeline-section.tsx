'use client'

import { useTimeline } from '@/hooks/use-timeline'
import { TimelineList } from './timeline-list'
import { TimelineAddForm } from './timeline-add-form'

export function TimelineSection({ jobId }: { jobId: string }) {
  const { data: events, isLoading } = useTimeline(jobId)

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Timeline</h3>
      <TimelineAddForm jobId={jobId} />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : events && events.length > 0 ? (
        <TimelineList events={events} />
      ) : (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      )}
    </div>
  )
}
