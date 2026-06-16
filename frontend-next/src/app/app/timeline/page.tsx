import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { TimelineFeed } from '@/components/timeline/timeline-feed'
import { TimelineSkeleton } from '@/components/layout/app/route-skeletons'
import { TIMELINE_PAGE_SIZE } from '@/hooks/use-global-timeline'
import type { GlobalTimelineEvent } from '@/types/timeline'
import type { Paginated } from '@/types/filters'

export const metadata: Metadata = { title: 'Timeline' }

// A failed server fetch falls back to undefined (never an empty page) — the
// client hook then fetches on mount, where the api-client's silent token
// refresh can heal an expired access cookie.
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const initial = await apiServer
    .getPage<GlobalTimelineEvent>(`/api/timeline?page=${page}&limit=${TIMELINE_PAGE_SIZE}`)
    .catch(() => undefined)

  // Only the first page seeds the query cache (the hook keys initialData to page 1).
  const initialData: Paginated<GlobalTimelineEvent> | undefined = page === 1 ? initial : undefined

  return (
    <Suspense fallback={<TimelineSkeleton />}>
      <TimelineFeed initialData={initialData} />
    </Suspense>
  )
}
