'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/app/page-header'
import { TimelineRow } from '@/components/timeline/timeline-row'
import { JobsPagination } from '@/components/jobs/jobs-pagination'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import { TimelineSkeletonBody } from '@/components/layout/app/route-skeletons'
import { useGlobalTimeline } from '@/hooks/use-global-timeline'
import { dayGroupLabel, dayKey } from '@/lib/relative-time'
import type { GlobalTimelineEvent } from '@/types/timeline'
import type { Paginated } from '@/types/filters'

interface DayGroup {
  key: string
  label: string
  events: GlobalTimelineEvent[]
}

// Bucket the (already newest-first) feed into consecutive same-day runs so each
// gets a date heading. The feed is pre-sorted, so a single linear pass suffices.
function groupByDay(events: GlobalTimelineEvent[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const event of events) {
    const key = dayKey(event.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.events.push(event)
    else groups.push({ key, label: dayGroupLabel(event.createdAt), events: [event] })
  }
  return groups
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium">No activity yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Add a job and your applications’ activity will show up here.
      </p>
      <Link
        href="/app/jobs"
        className="mt-4 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        Go to Jobs →
      </Link>
    </div>
  )
}

export function TimelineFeed({ initialData }: { initialData?: Paginated<GlobalTimelineEvent> | undefined }) {
  const router = useRouter()
  const params = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, isLoading, isError, error } = useGlobalTimeline(page, initialData)

  const setPage = (next: number) => {
    const sp = new URLSearchParams(params.toString())
    if (next <= 1) sp.delete('page')
    else sp.set('page', String(next))
    const qs = sp.toString()
    router.replace(qs ? `/app/timeline?${qs}` : '/app/timeline', { scroll: false })
  }

  const events = data?.data ?? []
  const groups = groupByDay(events)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Timeline" description="Everything that’s happened across your job pipeline." />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="space-y-10">
          {isError ? <MutationErrorAlert error={error} /> : null}
          {isLoading && events.length === 0 ? (
            <TimelineSkeletonBody />
          ) : events.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {groups.map((group) => (
                <section key={group.key} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h2 className="shrink-0 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </h2>
                    <span aria-hidden="true" className="h-px flex-1 bg-border" />
                  </div>
                  <ol>
                    {group.events.map((event, i) => (
                      <TimelineRow key={event.id} event={event} isLast={i === group.events.length - 1} />
                    ))}
                  </ol>
                </section>
              ))}
              {data ? <JobsPagination meta={data.meta} onPage={setPage} /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
