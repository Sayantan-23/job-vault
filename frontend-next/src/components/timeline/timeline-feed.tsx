'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/app/page-header'
import { TimelineEntry } from '@/components/jobs/timeline/timeline-entry'
import { JobsPagination } from '@/components/jobs/jobs-pagination'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useGlobalTimeline } from '@/hooks/use-global-timeline'
import type { GlobalTimelineEvent } from '@/types/timeline'
import type { Paginated } from '@/types/filters'

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

function LoadingRows() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Timeline" description="Everything that’s happened across your job pipeline." />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {isError ? <MutationErrorAlert error={error} /> : null}
          {isLoading && events.length === 0 ? (
            <LoadingRows />
          ) : events.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <ol className="space-y-4">
                {events.map((event) => (
                  <TimelineEntry
                    key={event.id}
                    event={event}
                    jobLink={{
                      href: `/app/jobs?job=${event.jobId}`,
                      label: `${event.jobCompany} — ${event.jobTitle}`,
                    }}
                  />
                ))}
              </ol>
              {data ? <JobsPagination meta={data.meta} onPage={setPage} /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
