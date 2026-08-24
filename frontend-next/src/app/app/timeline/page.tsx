import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TimelineFeed } from '@/components/timeline/timeline-feed'
import { TimelineSkeleton } from '@/components/layout/app/route-skeletons'
import { Hydrate, prefetchPage, serverQueryClient } from '@/lib/query-hydration'
import { globalTimelineQuery } from '@/lib/queries'
import type { GlobalTimelineEvent } from '@/types/timeline'

export const metadata: Metadata = { title: 'Timeline' }

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  // Paging is client-side (see TimelineFeed), so only the page the URL actually
  // asks for is worth prefetching. A failed read is left unseeded and refetched
  // on the client with a real loading state.
  const qc = serverQueryClient()
  await prefetchPage<GlobalTimelineEvent>(qc, globalTimelineQuery(page))

  return (
    <Hydrate client={qc}>
      <Suspense fallback={<TimelineSkeleton />}>
        <TimelineFeed />
      </Suspense>
    </Hydrate>
  )
}
